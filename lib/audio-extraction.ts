import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { writeFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

// Set FFmpeg path
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic.toString());
}

export interface AudioExtractionOptions {
    sampleRate?: number;
    channels?: number;
    format?: 'wav' | 'mp3' | 'flac';
    bitrate?: string;
}

export interface AudioMetadata {
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    size: number;
}

export interface ExtractionResult {
    audioPath: string;
    metadata: AudioMetadata;
    cleanup: () => Promise<void>;
}

/**
 * Default audio extraction options optimized for Whisper
 */
const DEFAULT_OPTIONS: Required<AudioExtractionOptions> = {
    sampleRate: 16000, // Whisper's preferred sample rate
    channels: 1, // Mono audio for speech recognition
    format: 'wav',
    bitrate: '128k'
};

/**
 * Validates if a file exists and is accessible
 */
async function validateInputFile(filePath: string): Promise<void> {
    try {
        await access(filePath);
    } catch (error) {
        throw new Error(`Input file not accessible: ${filePath}`);
    }
}

/**
 * Gets audio metadata from a video or audio file
 */
export function getAudioMetadata(inputPath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get audio metadata: ${err.message}`));
                return;
            }

            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
            if (!audioStream) {
                reject(new Error('No audio stream found in input file'));
                return;
            }

            const duration = metadata.format.duration || 0;
            const sampleRate = audioStream.sample_rate || 0;
            const channels = audioStream.channels || 0;
            const format = audioStream.codec_name || 'unknown';
            const size = metadata.format.size || 0;

            resolve({
                duration,
                sampleRate,
                channels,
                format,
                size
            });
        });
    });
}

/**
 * Extracts audio from video file with specified options
 */
export function extractAudioFromVideo(
    inputPath: string,
    options: AudioExtractionOptions = {}
): Promise<ExtractionResult> {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate input file
            await validateInputFile(inputPath);

            // Merge options with defaults
            const config = { ...DEFAULT_OPTIONS, ...options };

            // Generate unique output filename
            const outputName = `audio-extract-${crypto.randomUUID()}.${config.format}`;
            const outputPath = path.join(os.tmpdir(), outputName);

            // Configure FFmpeg command
            let command = ffmpeg(inputPath)
                .noVideo() // Remove video stream
                .audioChannels(config.channels)
                .audioFrequency(config.sampleRate);

            // Set audio codec based on format
            switch (config.format) {
                case 'wav':
                    command = command.audioCodec('pcm_s16le');
                    break;
                case 'mp3':
                    command = command.audioCodec('libmp3lame').audioBitrate(config.bitrate);
                    break;
                case 'flac':
                    command = command.audioCodec('flac');
                    break;
                default:
                    throw new Error(`Unsupported audio format: ${config.format}`);
            }

            // Execute extraction
            command
                .on('error', (err) => {
                    reject(new Error(`Audio extraction failed: ${err.message}`));
                })
                .on('end', async () => {
                    try {
                        // Get metadata of extracted audio
                        const metadata = await getAudioMetadata(outputPath);

                        // Create cleanup function
                        const cleanup = async () => {
                            try {
                                await unlink(outputPath);
                            } catch (error) {
                                console.warn(`Failed to cleanup audio file ${outputPath}:`, error);
                            }
                        };

                        resolve({
                            audioPath: outputPath,
                            metadata,
                            cleanup
                        });
                    } catch (error) {
                        // Cleanup on metadata error
                        await unlink(outputPath).catch(() => { });
                        reject(error);
                    }
                })
                .save(outputPath);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Converts audio file to different format
 */
export function convertAudioFormat(
    inputPath: string,
    targetFormat: 'wav' | 'mp3' | 'flac',
    options: AudioExtractionOptions = {}
): Promise<ExtractionResult> {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate input file
            await validateInputFile(inputPath);

            // Merge options with defaults
            const config = { ...DEFAULT_OPTIONS, ...options, format: targetFormat };

            // Generate unique output filename
            const outputName = `audio-convert-${crypto.randomUUID()}.${targetFormat}`;
            const outputPath = path.join(os.tmpdir(), outputName);

            // Configure FFmpeg command
            let command = ffmpeg(inputPath)
                .audioChannels(config.channels)
                .audioFrequency(config.sampleRate);

            // Set audio codec based on target format
            switch (targetFormat) {
                case 'wav':
                    command = command.audioCodec('pcm_s16le');
                    break;
                case 'mp3':
                    command = command.audioCodec('libmp3lame').audioBitrate(config.bitrate);
                    break;
                case 'flac':
                    command = command.audioCodec('flac');
                    break;
                default:
                    throw new Error(`Unsupported target format: ${targetFormat}`);
            }

            // Execute conversion
            command
                .on('error', (err) => {
                    reject(new Error(`Audio conversion failed: ${err.message}`));
                })
                .on('end', async () => {
                    try {
                        // Get metadata of converted audio
                        const metadata = await getAudioMetadata(outputPath);

                        // Create cleanup function
                        const cleanup = async () => {
                            try {
                                await unlink(outputPath);
                            } catch (error) {
                                console.warn(`Failed to cleanup audio file ${outputPath}:`, error);
                            }
                        };

                        resolve({
                            audioPath: outputPath,
                            metadata,
                            cleanup
                        });
                    } catch (error) {
                        // Cleanup on metadata error
                        await unlink(outputPath).catch(() => { });
                        reject(error);
                    }
                })
                .save(outputPath);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Utility function to create audio file from buffer with proper cleanup
 */
export async function createTempAudioFile(
    buffer: Buffer,
    format: 'wav' | 'mp3' | 'flac' = 'wav'
): Promise<ExtractionResult> {
    const fileName = `temp-audio-${crypto.randomUUID()}.${format}`;
    const filePath = path.join(os.tmpdir(), fileName);

    try {
        await writeFile(filePath, buffer);
        const metadata = await getAudioMetadata(filePath);

        const cleanup = async () => {
            try {
                await unlink(filePath);
            } catch (error) {
                console.warn(`Failed to cleanup temp audio file ${filePath}:`, error);
            }
        };

        return {
            audioPath: filePath,
            metadata,
            cleanup
        };
    } catch (error) {
        // Cleanup on error
        await unlink(filePath).catch(() => { });
        throw error;
    }
}

/**
 * Batch cleanup utility for multiple audio files
 */
export async function cleanupAudioFiles(results: ExtractionResult[]): Promise<void> {
    const cleanupPromises = results.map(result => result.cleanup());
    await Promise.allSettled(cleanupPromises);
}