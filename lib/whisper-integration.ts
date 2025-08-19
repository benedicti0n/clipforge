import { spawn, ChildProcess } from "node:child_process";
import { access, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export interface WhisperOptions {
    model?: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3';
    language?: string; // 'auto' for auto-detection or specific language code
    outputFormat?: 'json' | 'srt' | 'vtt' | 'txt';
    temperature?: number;
    bestOf?: number;
    beamSize?: number;
    patience?: number;
    lengthPenalty?: number;
    suppressTokens?: string;
    initialPrompt?: string;
    condition_on_previous_text?: boolean;
    fp16?: boolean;
    compressionRatioThreshold?: number;
    logprobThreshold?: number;
    noSpeechThreshold?: number;
}

export interface WhisperSegment {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
}

export interface WhisperWord {
    word: string;
    start: number;
    end: number;
    probability: number;
}

export interface WhisperResult {
    text: string;
    segments: WhisperSegment[];
    language: string;
    duration: number;
}

export interface WhisperProgress {
    stage: 'initializing' | 'loading_model' | 'processing' | 'completed' | 'error';
    progress: number; // 0-100
    message: string;
    timeElapsed?: number;
    estimatedTimeRemaining?: number;
}

export type WhisperProgressCallback = (progress: WhisperProgress) => void;

/**
 * Default Whisper options optimized for subtitle generation
 */
const DEFAULT_OPTIONS: Required<Omit<WhisperOptions, 'initialPrompt' | 'suppressTokens'>> = {
    model: 'base',
    language: 'auto',
    outputFormat: 'json',
    temperature: 0.0,
    bestOf: 5,
    beamSize: 5,
    patience: 1.0,
    lengthPenalty: 1.0,
    condition_on_previous_text: true,
    fp16: true,
    compressionRatioThreshold: 2.4,
    logprobThreshold: -1.0,
    noSpeechThreshold: 0.6
};

/**
 * Checks if Whisper is installed and accessible
 */
export async function checkWhisperInstallation(): Promise<{
    installed: boolean;
    version?: string;
    error?: string;
}> {
    return new Promise((resolve) => {
        const whisper = spawn('whisper', ['--version'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        whisper.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        whisper.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        whisper.on('close', (code) => {
            if (code === 0) {
                const versionMatch = stdout.match(/whisper\s+(\d+\.\d+\.\d+)/i);
                resolve({
                    installed: true,
                    version: versionMatch ? versionMatch[1] : 'unknown'
                });
            } else {
                resolve({
                    installed: false,
                    error: stderr || stdout || 'Whisper command not found'
                });
            }
        });

        whisper.on('error', (error) => {
            resolve({
                installed: false,
                error: error.message
            });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            whisper.kill();
            resolve({
                installed: false,
                error: 'Whisper installation check timed out'
            });
        }, 10000);
    });
}

/**
 * Validates Whisper options
 */
function validateWhisperOptions(options: WhisperOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.model && !['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'].includes(options.model)) {
        errors.push(`Invalid model: ${options.model}`);
    }

    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 1)) {
        errors.push('Temperature must be between 0 and 1');
    }

    if (options.bestOf !== undefined && options.bestOf < 1) {
        errors.push('bestOf must be at least 1');
    }

    if (options.beamSize !== undefined && options.beamSize < 1) {
        errors.push('beamSize must be at least 1');
    }

    if (options.patience !== undefined && options.patience < 0) {
        errors.push('patience must be non-negative');
    }

    if (options.lengthPenalty !== undefined && options.lengthPenalty < 0) {
        errors.push('lengthPenalty must be non-negative');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Builds Whisper command arguments from options
 */
function buildWhisperArgs(audioPath: string, outputDir: string, options: WhisperOptions): string[] {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const args: string[] = [audioPath];

    // Model selection
    args.push('--model', config.model);

    // Language
    if (config.language === 'auto') {
        // Let Whisper auto-detect language
    } else {
        args.push('--language', config.language);
    }

    // Output format and directory
    args.push('--output_format', config.outputFormat);
    args.push('--output_dir', outputDir);

    // Advanced options
    args.push('--temperature', config.temperature.toString());
    args.push('--best_of', config.bestOf.toString());
    args.push('--beam_size', config.beamSize.toString());
    args.push('--patience', config.patience.toString());
    args.push('--length_penalty', config.lengthPenalty.toString());

    if (config.condition_on_previous_text) {
        args.push('--condition_on_previous_text', 'True');
    } else {
        args.push('--condition_on_previous_text', 'False');
    }

    if (config.fp16) {
        args.push('--fp16', 'True');
    } else {
        args.push('--fp16', 'False');
    }

    args.push('--compression_ratio_threshold', config.compressionRatioThreshold.toString());
    args.push('--logprob_threshold', config.logprobThreshold.toString());
    args.push('--no_speech_threshold', config.noSpeechThreshold.toString());

    // Optional parameters
    if (options.initialPrompt) {
        args.push('--initial_prompt', options.initialPrompt);
    }

    if (options.suppressTokens) {
        args.push('--suppress_tokens', options.suppressTokens);
    }

    return args;
}

/**
 * Parses Whisper progress from stderr output
 */
function parseWhisperProgress(line: string): WhisperProgress | null {
    // Whisper progress patterns
    const patterns = [
        /Loading model\s+(\w+)/i,
        /Processing\s+(\d+)%/i,
        /(\d+)%\|.*?\|\s*(\d+:\d+)<(\d+:\d+)/,
        /Detected language:\s+(\w+)/i
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            if (pattern.source.includes('Loading model')) {
                return {
                    stage: 'loading_model',
                    progress: 10,
                    message: `Loading model ${match[1]}...`
                };
            } else if (pattern.source.includes('Processing')) {
                const progress = parseInt(match[1]);
                return {
                    stage: 'processing',
                    progress: Math.min(progress, 90),
                    message: `Processing audio... ${progress}%`
                };
            } else if (pattern.source.includes('Detected language')) {
                return {
                    stage: 'processing',
                    progress: 20,
                    message: `Detected language: ${match[1]}`
                };
            }
        }
    }

    return null;
}

/**
 * Runs Whisper on audio file and returns transcription results
 */
export async function runWhisper(
    audioPath: string,
    options: WhisperOptions = {},
    progressCallback?: WhisperProgressCallback
): Promise<WhisperResult> {
    // Validate input file
    try {
        await access(audioPath);
    } catch (error) {
        throw new Error(`Audio file not accessible: ${audioPath}`);
    }

    // Validate options
    const validation = validateWhisperOptions(options);
    if (!validation.isValid) {
        throw new Error(`Invalid Whisper options: ${validation.errors.join(', ')}`);
    }

    // Check Whisper installation
    const installation = await checkWhisperInstallation();
    if (!installation.installed) {
        throw new Error(`Whisper not installed: ${installation.error}`);
    }

    // Create temporary output directory
    const outputDir = path.join(os.tmpdir(), `whisper-output-${crypto.randomUUID()}`);
    const args = buildWhisperArgs(audioPath, outputDir, options);

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let lastProgress = 0;

        // Initial progress
        progressCallback?.({
            stage: 'initializing',
            progress: 0,
            message: 'Initializing Whisper...'
        });

        const whisper = spawn('whisper', args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        whisper.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        whisper.stderr?.on('data', (data) => {
            const chunk = data.toString();
            stderr += chunk;

            // Parse progress from stderr
            const lines = chunk.split('\n');
            for (const line of lines) {
                const progress = parseWhisperProgress(line);
                if (progress && progress.progress > lastProgress) {
                    lastProgress = progress.progress;
                    const timeElapsed = (Date.now() - startTime) / 1000;

                    if (progress.progress > 0) {
                        const estimatedTotal = (timeElapsed / progress.progress) * 100;
                        progress.estimatedTimeRemaining = Math.max(0, estimatedTotal - timeElapsed);
                    }

                    progress.timeElapsed = timeElapsed;
                    progressCallback?.(progress);
                }
            }
        });

        whisper.on('close', async (code) => {
            try {
                if (code !== 0) {
                    progressCallback?.({
                        stage: 'error',
                        progress: 0,
                        message: `Whisper process failed with code ${code}`
                    });
                    reject(new Error(`Whisper process failed with code ${code}: ${stderr}`));
                    return;
                }

                // Find and read the JSON output file
                const audioBasename = path.basename(audioPath, path.extname(audioPath));
                const jsonPath = path.join(outputDir, `${audioBasename}.json`);

                try {
                    await access(jsonPath);
                } catch (error) {
                    reject(new Error(`Whisper output file not found: ${jsonPath}`));
                    return;
                }

                const jsonContent = await readFile(jsonPath, 'utf-8');
                const result: WhisperResult = JSON.parse(jsonContent);

                // Cleanup output directory
                await unlink(jsonPath).catch(() => { });

                progressCallback?.({
                    stage: 'completed',
                    progress: 100,
                    message: 'Transcription completed successfully',
                    timeElapsed: (Date.now() - startTime) / 1000
                });

                resolve(result);

            } catch (error) {
                progressCallback?.({
                    stage: 'error',
                    progress: 0,
                    message: `Failed to process Whisper output: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                reject(error);
            }
        });

        whisper.on('error', (error) => {
            progressCallback?.({
                stage: 'error',
                progress: 0,
                message: `Whisper process error: ${error.message}`
            });
            reject(new Error(`Failed to start Whisper process: ${error.message}`));
        });

        // Timeout after 10 minutes for very long audio files
        const timeout = setTimeout(() => {
            whisper.kill();
            progressCallback?.({
                stage: 'error',
                progress: 0,
                message: 'Whisper process timed out'
            });
            reject(new Error('Whisper process timed out after 10 minutes'));
        }, 10 * 60 * 1000);

        whisper.on('close', () => {
            clearTimeout(timeout);
        });
    });
}

/**
 * Converts WhisperResult to subtitle format for the application
 */
export function convertWhisperToSubtitles(whisperResult: WhisperResult): {
    id: string;
    segments: Array<{
        start: number;
        end: number;
        text: string;
        confidence?: number;
    }>;
} {
    return {
        id: crypto.randomUUID(),
        segments: whisperResult.segments.map(segment => ({
            start: segment.start,
            end: segment.end,
            text: segment.text.trim(),
            confidence: Math.exp(segment.avg_logprob) // Convert log probability to confidence
        }))
    };
}

/**
 * Utility function to estimate processing time based on audio duration
 */
export function estimateProcessingTime(audioDurationSeconds: number, model: string = 'base'): number {
    // Rough estimates based on model complexity (in seconds per minute of audio)
    const processingRates = {
        'tiny': 2,
        'base': 4,
        'small': 8,
        'medium': 15,
        'large': 25,
        'large-v2': 30,
        'large-v3': 35
    };

    const rate = processingRates[model as keyof typeof processingRates] || 4;
    return (audioDurationSeconds / 60) * rate;
}