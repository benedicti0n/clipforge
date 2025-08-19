import { NextRequest } from "next/server";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic.toString());
}

// Validation utilities
interface TrimBounds {
    start: number;
    end: number;
}

interface RetrimRequest {
    videoUrl?: string;
    trimBounds: TrimBounds;
    outputFormat?: 'mp4' | 'webm';
}

const validateTrimBounds = (bounds: TrimBounds, maxDuration?: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (typeof bounds.start !== 'number' || bounds.start < 0) {
        errors.push('Start time must be a non-negative number');
    }

    if (typeof bounds.end !== 'number' || bounds.end <= 0) {
        errors.push('End time must be a positive number');
    }

    if (bounds.start >= bounds.end) {
        errors.push('Start time must be less than end time');
    }

    if (bounds.end - bounds.start < 0.1) {
        errors.push('Minimum clip duration is 0.1 seconds');
    }

    if (maxDuration && bounds.end > maxDuration) {
        errors.push(`End time cannot exceed video duration of ${maxDuration} seconds`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const getVideoMetadata = (inputPath: string): Promise<{ duration: number; width: number; height: number }> => {
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

            resolve({ duration, width, height });
        });
    });
};

const processVideoTrim = (
    inputPath: string,
    outputPath: string,
    bounds: TrimBounds,
    format: 'mp4' | 'webm' = 'mp4'
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const duration = bounds.end - bounds.start;

        let command = ffmpeg(inputPath)
            .inputOptions([`-ss ${bounds.start.toFixed(3)}`]) // Precise seeking with millisecond accuracy
            .outputOptions([
                `-t ${duration.toFixed(3)}`, // Precise duration
                "-movflags +faststart" // Fast start for web playback
            ]);

        // Set codec options based on format
        if (format === 'mp4') {
            command = command.outputOptions([
                "-c:v libx264", // H.264 video codec
                "-c:a aac", // AAC audio codec
                "-preset fast", // Fast encoding preset
                "-crf 23" // Good quality/size balance
            ]);
        } else if (format === 'webm') {
            command = command.outputOptions([
                "-c:v libvpx-vp9", // VP9 video codec
                "-c:a libopus", // Opus audio codec
                "-crf 30", // Good quality for WebM
                "-b:v 0" // Variable bitrate
            ]);
        }

        command
            .on("error", (err) => {
                reject(new Error(`FFmpeg processing failed: ${err.message}`));
            })
            .on("end", () => {
                resolve();
            })
            .save(outputPath);
    });
};

export async function POST(req: NextRequest) {
    let inputPath: string | null = null;
    let outputPath: string | null = null;

    try {
        const contentType = req.headers.get('content-type');
        let requestData: RetrimRequest;

        if (contentType?.includes('multipart/form-data')) {
            // Handle file upload
            const form = await req.formData();
            const file = form.get("file");
            const trimBoundsStr = form.get("trimBounds");
            const outputFormat = (form.get("outputFormat") as 'mp4' | 'webm') || 'mp4';

            if (!(file instanceof File)) {
                return new Response(JSON.stringify({ error: "No file uploaded" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (!trimBoundsStr) {
                return new Response(JSON.stringify({ error: "Trim bounds are required" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                const trimBounds = JSON.parse(trimBoundsStr.toString());
                requestData = { trimBounds, outputFormat };
            } catch {
                return new Response(JSON.stringify({ error: "Invalid trim bounds format" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Save uploaded file to temp location
            const bytes = Buffer.from(await file.arrayBuffer());
            const inputName = `retrim-input-${crypto.randomUUID()}.mp4`;
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
                // For now, we'll require file upload. URL processing can be added later.
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

        // Get video metadata for validation
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

        // Validate trim bounds
        const validation = validateTrimBounds(requestData.trimBounds, metadata.duration);
        if (!validation.isValid) {
            return new Response(JSON.stringify({
                error: "Invalid trim bounds",
                details: validation.errors
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Set up output file
        const outputFormat = requestData.outputFormat || 'mp4';
        const outputName = `retrim-output-${crypto.randomUUID()}.${outputFormat}`;
        outputPath = path.join(os.tmpdir(), outputName);

        // Process video with FFmpeg
        try {
            await processVideoTrim(inputPath, outputPath, requestData.trimBounds, outputFormat);
        } catch (err) {
            return new Response(JSON.stringify({
                error: `Video processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Read processed video
        const outputBuffer = await readFile(outputPath);

        // Return processed video
        const mimeType = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
        return new Response(outputBuffer as BodyInit, {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                "Content-Disposition": `attachment; filename="retrimmed.${outputFormat}"`,
                "Cache-Control": "no-store",
                "X-Video-Duration": metadata.duration.toString(),
                "X-Trim-Start": requestData.trimBounds.start.toString(),
                "X-Trim-End": requestData.trimBounds.end.toString(),
                "X-Trim-Duration": (requestData.trimBounds.end - requestData.trimBounds.start).toString()
            },
        });

    } catch (err: unknown) {
        console.error('Retrim API error:', err);
        const message = err instanceof Error ? err.message : "Failed to process video retrim";
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
    }
}