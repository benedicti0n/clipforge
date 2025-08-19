import { NextRequest } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { extractAudioFromVideo, cleanupAudioFiles } from "../../../lib/audio-extraction";
import { runWhisper, convertWhisperToSubtitles, checkWhisperInstallation, WhisperOptions } from "../../../lib/whisper-integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validation interfaces
interface SubtitleGenerationRequest {
    videoUrl?: string;
    whisperOptions?: WhisperOptions;
}

interface SubtitleGenerationResponse {
    success: boolean;
    subtitles?: {
        id: string;
        segments: Array<{
            start: number;
            end: number;
            text: string;
            confidence?: number;
        }>;
    };
    language?: string;
    duration?: number;
    processingTime?: number;
    error?: string;
    details?: string[];
}

/**
 * Validates subtitle generation request
 */
function validateRequest(request: SubtitleGenerationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // For now, we only support file upload, not URL processing
    if (request.videoUrl) {
        errors.push('Video URL processing not yet implemented. Please upload file directly.');
    }

    // Validate Whisper options if provided
    if (request.whisperOptions) {
        const { model, temperature, language } = request.whisperOptions;

        if (model && !['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'].includes(model)) {
            errors.push(`Invalid Whisper model: ${model}`);
        }

        if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
            errors.push('Temperature must be between 0 and 1');
        }

        if (language && language !== 'auto' && !/^[a-z]{2}$/.test(language)) {
            errors.push('Language must be "auto" or a valid 2-letter language code');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Processes video file for subtitle generation
 */
async function processVideoForSubtitles(
    videoBuffer: Buffer,
    whisperOptions: WhisperOptions = {}
): Promise<SubtitleGenerationResponse> {
    const startTime = Date.now();
    let inputVideoPath: string | null = null;
    const extractionResults: any[] = [];

    try {
        // Save uploaded video to temporary file
        const videoName = `subtitle-input-${crypto.randomUUID()}.mp4`;
        inputVideoPath = path.join(os.tmpdir(), videoName);
        await writeFile(inputVideoPath, videoBuffer);

        // Extract audio from video
        const audioResult = await extractAudioFromVideo(inputVideoPath, {
            sampleRate: 16000, // Whisper's preferred sample rate
            channels: 1, // Mono for speech recognition
            format: 'wav'
        });
        extractionResults.push(audioResult);

        // Run Whisper on extracted audio
        const whisperResult = await runWhisper(audioResult.audioPath, {
            model: 'base', // Default to base model for good balance of speed/accuracy
            language: 'auto', // Auto-detect language
            ...whisperOptions
        });

        // Convert Whisper result to application format
        const subtitles = convertWhisperToSubtitles(whisperResult);

        const processingTime = (Date.now() - startTime) / 1000;

        return {
            success: true,
            subtitles,
            language: whisperResult.language,
            duration: whisperResult.duration,
            processingTime
        };

    } catch (error) {
        const processingTime = (Date.now() - startTime) / 1000;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return {
            success: false,
            error: `Subtitle generation failed: ${errorMessage}`,
            processingTime
        };
    } finally {
        // Cleanup temporary files
        if (inputVideoPath) {
            await unlink(inputVideoPath).catch(() => { });
        }
        if (extractionResults.length > 0) {
            await cleanupAudioFiles(extractionResults);
        }
    }
}

export async function POST(req: NextRequest) {
    try {
        // Check Whisper installation first
        const installation = await checkWhisperInstallation();
        if (!installation.installed) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Whisper not installed',
                details: [
                    'OpenAI Whisper is required for subtitle generation',
                    'Please install it using: pip install openai-whisper',
                    installation.error || 'Installation check failed'
                ]
            } as SubtitleGenerationResponse), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const contentType = req.headers.get('content-type');
        let requestData: SubtitleGenerationRequest = {};
        let videoBuffer: Buffer | null = null;

        if (contentType?.includes('multipart/form-data')) {
            // Handle file upload
            const form = await req.formData();
            const file = form.get("file");
            const whisperOptionsStr = form.get("whisperOptions");

            if (!(file instanceof File)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "No video file uploaded"
                } as SubtitleGenerationResponse), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Validate file type
            if (!file.type.startsWith('video/')) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "Invalid file type. Please upload a video file."
                } as SubtitleGenerationResponse), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Parse Whisper options if provided
            if (whisperOptionsStr) {
                try {
                    requestData.whisperOptions = JSON.parse(whisperOptionsStr.toString());
                } catch {
                    return new Response(JSON.stringify({
                        success: false,
                        error: "Invalid whisperOptions format"
                    } as SubtitleGenerationResponse), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            videoBuffer = Buffer.from(await file.arrayBuffer());

        } else {
            // Handle JSON request
            try {
                requestData = await req.json();
            } catch {
                return new Response(JSON.stringify({
                    success: false,
                    error: "Invalid JSON request body"
                } as SubtitleGenerationResponse), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Validate request
        const validation = validateRequest(requestData);
        if (!validation.isValid) {
            return new Response(JSON.stringify({
                success: false,
                error: "Invalid request parameters",
                details: validation.errors
            } as SubtitleGenerationResponse), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Process video for subtitle generation
        if (!videoBuffer) {
            return new Response(JSON.stringify({
                success: false,
                error: "No video data provided"
            } as SubtitleGenerationResponse), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await processVideoForSubtitles(videoBuffer, requestData.whisperOptions);

        const statusCode = result.success ? 200 : 500;
        return new Response(JSON.stringify(result), {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (error: unknown) {
        console.error('Subtitle generation API error:', error);
        const message = error instanceof Error ? error.message : "Failed to generate subtitles";

        return new Response(JSON.stringify({
            success: false,
            error: message
        } as SubtitleGenerationResponse), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * GET endpoint to check Whisper installation status
 */
export async function GET() {
    try {
        const installation = await checkWhisperInstallation();

        return new Response(JSON.stringify({
            installed: installation.installed,
            version: installation.version,
            error: installation.error
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            installed: false,
            error: error instanceof Error ? error.message : 'Installation check failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}