import { NextRequest } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { TextOverlay, validateTextOverlays } from "../../../lib/text-overlay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic.toString());
}

// Interfaces for final processing
interface SubtitleSegment {
    start: number;
    end: number;
    text: string;
    confidence?: number;
}

interface SubtitleTrack {
    id: string;
    segments: SubtitleSegment[];
}

interface TrimBounds {
    start: number;
    end: number;
}

interface ProcessingRequest {
    videoUrl?: string;
    trimBounds?: TrimBounds;
    subtitles?: SubtitleTrack[];
    textOverlays?: TextOverlay[];
    outputFormat?: 'mp4' | 'webm';
    quality?: 'low' | 'medium' | 'high';
}

interface ProcessingProgress {
    stage: 'initializing' | 'extracting_metadata' | 'preparing_subtitles' | 'preparing_overlays' | 'processing_video' | 'finalizing' | 'completed' | 'error';
    progress: number; // 0-100
    message: string;
    timeElapsed?: number;
    estimatedTimeRemaining?: number;
}

interface ProcessingResponse {
    processedVideoUrl?: string;
    processingTime: number;
    fileSize?: number;
    metadata?: {
        duration: number;
        width: number;
        height: number;
        format: string;
    };
    error?: string;
}

// Progress tracking for long-running processes
const processingStatus = new Map<string, ProcessingProgress>();

// Validation utilities
const validateProcessingRequest = (request: ProcessingRequest): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate trim bounds if provided
    if (request.trimBounds) {
        if (typeof request.trimBounds.start !== 'number' || request.trimBounds.start < 0) {
            errors.push('Trim start time must be a non-negative number');
        }

        if (typeof request.trimBounds.end !== 'number' || request.trimBounds.end <= 0) {
            errors.push('Trim end time must be a positive number');
        }

        if (request.trimBounds.start >= request.trimBounds.end) {
            errors.push('Trim start time must be less than end time');
        }

        if (request.trimBounds.end - request.trimBounds.start < 0.1) {
            errors.push('Minimum clip duration is 0.1 seconds');
        }
    }

    // Validate subtitles if provided
    if (request.subtitles) {
        request.subtitles.forEach((track, trackIndex) => {
            if (!track.id) {
                errors.push(`Subtitle track ${trackIndex} must have an ID`);
            }

            if (!Array.isArray(track.segments)) {
                errors.push(`Subtitle track ${trackIndex} must have segments array`);
            } else {
                track.segments.forEach((segment, segmentIndex) => {
                    if (typeof segment.start !== 'number' || segment.start < 0) {
                        errors.push(`Subtitle track ${trackIndex}, segment ${segmentIndex}: start time must be non-negative`);
                    }

                    if (typeof segment.end !== 'number' || segment.end <= segment.start) {
                        errors.push(`Subtitle track ${trackIndex}, segment ${segmentIndex}: end time must be greater than start time`);
                    }

                    if (!segment.text || segment.text.trim().length === 0) {
                        errors.push(`Subtitle track ${trackIndex}, segment ${segmentIndex}: text cannot be empty`);
                    }
                });
            }
        });
    }

    // Validate output format
    if (request.outputFormat && !['mp4', 'webm'].includes(request.outputFormat)) {
        errors.push('Output format must be mp4 or webm');
    }

    // Validate quality setting
    if (request.quality && !['low', 'medium', 'high'].includes(request.quality)) {
        errors.push('Quality must be low, medium, or high');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Get video metadata
const getVideoMetadata = (inputPath: string): Promise<{ duration: number; width: number; height: number; format: string }> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get video metadata: ${err.message}`));
                return;
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                reject(new Error('No video stream found'));
                return;
            }

            const duration = metadata.format.duration || 0;
            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            const format = metadata.format.format_name || 'unknown';

            resolve({ duration, width, height, format });
        });
    });
};

// Generate SRT subtitle file
const generateSubtitleFile = async (subtitles: SubtitleTrack[], outputPath: string): Promise<void> => {
    let srtContent = '';
    let segmentIndex = 1;

    for (const track of subtitles) {
        for (const segment of track.segments) {
            const startTime = formatSRTTime(segment.start);
            const endTime = formatSRTTime(segment.end);

            srtContent += `${segmentIndex}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${segment.text.trim()}\n\n`;

            segmentIndex++;
        }
    }

    await writeFile(outputPath, srtContent, 'utf-8');
};

// Format time for SRT format (HH:MM:SS,mmm)
const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

// Generate text overlay filter for FFmpeg
const generateOverlayFilter = (overlays: TextOverlay[], videoWidth: number, videoHeight: number): string => {
    if (!overlays || overlays.length === 0) {
        return '';
    }

    const filters: string[] = [];

    overlays.forEach((overlay, index) => {
        // Convert normalized position to pixel coordinates
        const x = Math.round(overlay.position.x * videoWidth);
        const y = Math.round(overlay.position.y * videoHeight);

        // Build text style
        const fontSize = overlay.style.fontSize;
        const fontColor = overlay.style.color.replace('#', '');
        const fontFamily = overlay.style.fontFamily.split(',')[0].replace(/['"]/g, '');

        // Escape text for FFmpeg
        const escapedText = overlay.text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');

        // Build drawtext filter
        let drawtext = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:fontfile=/System/Library/Fonts/Arial.ttf`;

        // Add background if specified
        if (overlay.style.backgroundColor && overlay.style.backgroundColor !== 'transparent') {
            const bgColor = overlay.style.backgroundColor.replace('#', '').replace('rgba(', '').replace('rgb(', '').replace(')', '');
            drawtext += `:box=1:boxcolor=${bgColor}`;
        }

        // Add timing
        drawtext += `:enable='between(t,${overlay.timing.start},${overlay.timing.end})'`;

        filters.push(drawtext);
    });

    return filters.join(',');
};

// Process video with all enhancements
const processVideo = (
    inputPath: string,
    outputPath: string,
    request: ProcessingRequest,
    videoMetadata: { duration: number; width: number; height: number; format: string },
    progressCallback?: (progress: ProcessingProgress) => void
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const startTime = Date.now();
            const outputFormat = request.outputFormat || 'mp4';
            const quality = request.quality || 'medium';

            // Initialize FFmpeg command
            let command = ffmpeg(inputPath);

            // Apply trimming if specified
            if (request.trimBounds) {
                const duration = request.trimBounds.end - request.trimBounds.start;
                command = command
                    .inputOptions([`-ss ${request.trimBounds.start.toFixed(3)}`])
                    .outputOptions([`-t ${duration.toFixed(3)}`]);
            }

            // Prepare subtitle file if subtitles are provided
            let subtitlePath: string | null = null;
            if (request.subtitles && request.subtitles.length > 0) {
                subtitlePath = path.join(os.tmpdir(), `subtitles-${crypto.randomUUID()}.srt`);
                await generateSubtitleFile(request.subtitles, subtitlePath);

                progressCallback?.({
                    stage: 'preparing_subtitles',
                    progress: 20,
                    message: 'Preparing subtitles...'
                });
            }

            // Build video filters
            const videoFilters: string[] = [];

            // Add text overlays
            if (request.textOverlays && request.textOverlays.length > 0) {
                progressCallback?.({
                    stage: 'preparing_overlays',
                    progress: 30,
                    message: 'Preparing text overlays...'
                });

                const overlayFilter = generateOverlayFilter(request.textOverlays, videoMetadata.width, videoMetadata.height);
                if (overlayFilter) {
                    videoFilters.push(overlayFilter);
                }
            }

            // Apply video filters
            if (videoFilters.length > 0) {
                command = command.videoFilters(videoFilters);
            }

            // Add subtitles if available
            if (subtitlePath) {
                command = command.outputOptions([
                    `-vf subtitles=${subtitlePath}:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`
                ]);
            }

            // Set codec options based on format and quality
            if (outputFormat === 'mp4') {
                const crfValues = { low: 28, medium: 23, high: 18 };
                command = command.outputOptions([
                    "-c:v libx264",
                    "-c:a aac",
                    "-preset fast",
                    `-crf ${crfValues[quality]}`,
                    "-movflags +faststart"
                ]);
            } else if (outputFormat === 'webm') {
                const crfValues = { low: 35, medium: 30, high: 25 };
                command = command.outputOptions([
                    "-c:v libvpx-vp9",
                    "-c:a libopus",
                    `-crf ${crfValues[quality]}`,
                    "-b:v 0"
                ]);
            }

            progressCallback?.({
                stage: 'processing_video',
                progress: 40,
                message: 'Processing video...'
            });

            // Track progress during processing
            command.on('progress', (progress) => {
                const percent = Math.min(90, 40 + (progress.percent || 0) * 0.5);
                const timeElapsed = (Date.now() - startTime) / 1000;

                progressCallback?.({
                    stage: 'processing_video',
                    progress: percent,
                    message: `Processing video... ${Math.round(percent)}%`,
                    timeElapsed
                });
            });

            command.on('error', async (err) => {
                // Cleanup subtitle file
                if (subtitlePath) {
                    await unlink(subtitlePath).catch(() => { });
                }
                reject(new Error(`FFmpeg processing failed: ${err.message}`));
            });

            command.on('end', async () => {
                // Cleanup subtitle file
                if (subtitlePath) {
                    await unlink(subtitlePath).catch(() => { });
                }

                progressCallback?.({
                    stage: 'finalizing',
                    progress: 95,
                    message: 'Finalizing...'
                });

                resolve();
            });

            command.save(outputPath);

        } catch (error) {
            reject(error);
        }
    });
};

export async function POST(req: NextRequest) {
    let inputPath: string | null = null;
    let outputPath: string | null = null;
    const processingId = crypto.randomUUID();

    try {
        const startTime = Date.now();

        // Parse request
        const contentType = req.headers.get('content-type');
        let requestData: ProcessingRequest;

        if (contentType?.includes('multipart/form-data')) {
            // Handle file upload
            const form = await req.formData();
            const file = form.get("file");
            const requestDataStr = form.get("requestData");

            if (!(file instanceof File)) {
                return new Response(JSON.stringify({ error: "No file uploaded" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (!requestDataStr) {
                return new Response(JSON.stringify({ error: "Request data is required" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                requestData = JSON.parse(requestDataStr.toString());
            } catch {
                return new Response(JSON.stringify({ error: "Invalid request data format" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Save uploaded file to temp location
            const bytes = Buffer.from(await file.arrayBuffer());
            const inputName = `process-input-${crypto.randomUUID()}.mp4`;
            inputPath = path.join(os.tmpdir(), inputName);
            await writeFile(inputPath, bytes);

        } else {
            // Handle JSON request
            try {
                requestData = await req.json();
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON request body" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (requestData.videoUrl) {
                return new Response(JSON.stringify({ error: "Video URL processing not yet implemented. Please upload file directly." }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if (!inputPath) {
            return new Response(JSON.stringify({ error: "No input video provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate request
        const validation = validateProcessingRequest(requestData);
        if (!validation.isValid) {
            return new Response(JSON.stringify({
                error: "Invalid processing request",
                details: validation.errors
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Progress callback
        const updateProgress = (progress: ProcessingProgress) => {
            processingStatus.set(processingId, progress);
        };

        updateProgress({
            stage: 'initializing',
            progress: 0,
            message: 'Initializing processing...'
        });

        // Get video metadata
        updateProgress({
            stage: 'extracting_metadata',
            progress: 5,
            message: 'Extracting video metadata...'
        });

        let metadata;
        try {
            metadata = await getVideoMetadata(inputPath);
        } catch (err) {
            return new Response(JSON.stringify({
                error: `Failed to analyze video: ${err instanceof Error ? err.message : 'Unknown error'}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate text overlays against video dimensions
        if (requestData.textOverlays && requestData.textOverlays.length > 0) {
            const overlayValidation = validateTextOverlays(
                requestData.textOverlays,
                metadata.duration,
                metadata.width,
                metadata.height
            );

            if (!overlayValidation.isValid) {
                return new Response(JSON.stringify({
                    error: "Invalid text overlays",
                    details: overlayValidation.overlayErrors
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Set up output file
        const outputFormat = requestData.outputFormat || 'mp4';
        const outputName = `processed-${crypto.randomUUID()}.${outputFormat}`;
        outputPath = path.join(os.tmpdir(), outputName);

        // Process video
        try {
            await processVideo(inputPath, outputPath, requestData, metadata, updateProgress);
        } catch (err) {
            return new Response(JSON.stringify({
                error: `Video processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        updateProgress({
            stage: 'completed',
            progress: 100,
            message: 'Processing completed successfully',
            timeElapsed: (Date.now() - startTime) / 1000
        });

        // Read processed video
        const outputBuffer = await readFile(outputPath);
        const fileSize = outputBuffer.length;

        // Return processed video
        const mimeType = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
        const processingTime = (Date.now() - startTime) / 1000;

        return new Response(outputBuffer as BodyInit, {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                "Content-Disposition": `attachment; filename="processed.${outputFormat}"`,
                "Cache-Control": "no-store",
                "X-Processing-Time": processingTime.toString(),
                "X-File-Size": fileSize.toString(),
                "X-Video-Duration": metadata.duration.toString(),
                "X-Video-Width": metadata.width.toString(),
                "X-Video-Height": metadata.height.toString(),
                "X-Processing-Id": processingId
            },
        });

    } catch (err: unknown) {
        console.error('Process final API error:', err);
        const message = err instanceof Error ? err.message : "Failed to process video";

        processingStatus.set(processingId, {
            stage: 'error',
            progress: 0,
            message
        });

        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        // Cleanup temp files
        if (inputPath) {
            await unlink(inputPath).catch(() => { });
        }
        if (outputPath) {
            await unlink(outputPath).catch(() => { });
        }

        // Clean up processing status after 5 minutes
        setTimeout(() => {
            processingStatus.delete(processingId);
        }, 5 * 60 * 1000);
    }
}

// GET endpoint for checking processing status
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const processingId = url.searchParams.get('id');

    if (!processingId) {
        return new Response(JSON.stringify({ error: "Processing ID is required" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const status = processingStatus.get(processingId);
    if (!status) {
        return new Response(JSON.stringify({ error: "Processing ID not found or expired" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(status), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}