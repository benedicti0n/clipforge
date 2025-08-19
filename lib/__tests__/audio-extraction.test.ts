import {
    extractAudioFromVideo,
    convertAudioFormat,
    getAudioMetadata,
    createTempAudioFile,
    cleanupAudioFiles,
    AudioExtractionOptions,
    AudioMetadata,
    ExtractionResult
} from '../audio-extraction';
import { writeFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// Mock ffmpeg and related modules
jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static', () => '/mock/ffmpeg/path');
jest.mock('node:fs/promises');

const mockFfmpeg = require('fluent-ffmpeg');
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockAccess = access as jest.MockedFunction<typeof access>;

describe('Audio Extraction Utilities', () => {
    let mockCommand: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock ffmpeg command chain
        mockCommand = {
            noVideo: jest.fn().mockReturnThis(),
            audioChannels: jest.fn().mockReturnThis(),
            audioFrequency: jest.fn().mockReturnThis(),
            audioCodec: jest.fn().mockReturnThis(),
            audioBitrate: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            save: jest.fn()
        };

        mockFfmpeg.mockReturnValue(mockCommand);
        mockFfmpeg.setFfmpegPath = jest.fn();
        mockFfmpeg.ffprobe = jest.fn();

        // Mock file system operations
        mockAccess.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
    });

    describe('getAudioMetadata', () => {
        it('should extract audio metadata successfully', async () => {
            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 44100,
                    channels: 2,
                    codec_name: 'aac'
                }],
                format: {
                    duration: 120.5,
                    size: 1024000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await getAudioMetadata('/test/input.mp4');

            expect(result).toEqual({
                duration: 120.5,
                sampleRate: 44100,
                channels: 2,
                format: 'aac',
                size: 1024000
            });
        });

        it('should handle missing audio stream', async () => {
            const mockMetadata = {
                streams: [{
                    codec_type: 'video'
                }],
                format: {}
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            await expect(getAudioMetadata('/test/input.mp4'))
                .rejects.toThrow('No audio stream found in input file');
        });

        it('should handle ffprobe errors', async () => {
            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(new Error('FFprobe failed'));
            });

            await expect(getAudioMetadata('/test/input.mp4'))
                .rejects.toThrow('Failed to get audio metadata: FFprobe failed');
        });
    });

    describe('extractAudioFromVideo', () => {
        it('should extract audio with default options', async () => {
            const inputPath = '/test/input.mp4';

            // Mock successful extraction
            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    // Simulate successful completion
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            // Mock metadata for extracted audio
            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 16000,
                    channels: 1,
                    codec_name: 'pcm_s16le'
                }],
                format: {
                    duration: 120.5,
                    size: 512000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await extractAudioFromVideo(inputPath);

            expect(mockAccess).toHaveBeenCalledWith(inputPath);
            expect(mockCommand.noVideo).toHaveBeenCalled();
            expect(mockCommand.audioChannels).toHaveBeenCalledWith(1);
            expect(mockCommand.audioFrequency).toHaveBeenCalledWith(16000);
            expect(mockCommand.audioCodec).toHaveBeenCalledWith('pcm_s16le');
            expect(result.audioPath).toMatch(/audio-extract-.*\.wav$/);
            expect(result.metadata.sampleRate).toBe(16000);
            expect(result.metadata.channels).toBe(1);
            expect(typeof result.cleanup).toBe('function');
        });

        it('should extract audio with custom options', async () => {
            const inputPath = '/test/input.mp4';
            const options: AudioExtractionOptions = {
                sampleRate: 44100,
                channels: 2,
                format: 'mp3',
                bitrate: '192k'
            };

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 44100,
                    channels: 2,
                    codec_name: 'mp3'
                }],
                format: {
                    duration: 120.5,
                    size: 768000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await extractAudioFromVideo(inputPath, options);

            expect(mockCommand.audioChannels).toHaveBeenCalledWith(2);
            expect(mockCommand.audioFrequency).toHaveBeenCalledWith(44100);
            expect(mockCommand.audioCodec).toHaveBeenCalledWith('libmp3lame');
            expect(mockCommand.audioBitrate).toHaveBeenCalledWith('192k');
            expect(result.audioPath).toMatch(/audio-extract-.*\.mp3$/);
        });

        it('should handle input file validation errors', async () => {
            mockAccess.mockRejectedValue(new Error('File not found'));

            await expect(extractAudioFromVideo('/nonexistent/file.mp4'))
                .rejects.toThrow('Input file not accessible: /nonexistent/file.mp4');
        });

        it('should handle FFmpeg extraction errors', async () => {
            const inputPath = '/test/input.mp4';

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(new Error('Extraction failed')), 0);
                }
                return mockCommand;
            });

            await expect(extractAudioFromVideo(inputPath))
                .rejects.toThrow('Audio extraction failed: Extraction failed');
        });

        it('should handle unsupported audio formats', async () => {
            const inputPath = '/test/input.mp4';
            const options: AudioExtractionOptions = {
                format: 'ogg' as any // Invalid format
            };

            await expect(extractAudioFromVideo(inputPath, options))
                .rejects.toThrow('Unsupported audio format: ogg');
        });
    });

    describe('convertAudioFormat', () => {
        it('should convert audio to WAV format', async () => {
            const inputPath = '/test/input.mp3';

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 16000,
                    channels: 1,
                    codec_name: 'pcm_s16le'
                }],
                format: {
                    duration: 60.0,
                    size: 256000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await convertAudioFormat(inputPath, 'wav');

            expect(mockCommand.audioCodec).toHaveBeenCalledWith('pcm_s16le');
            expect(result.audioPath).toMatch(/audio-convert-.*\.wav$/);
        });

        it('should convert audio to FLAC format', async () => {
            const inputPath = '/test/input.mp3';

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 44100,
                    channels: 2,
                    codec_name: 'flac'
                }],
                format: {
                    duration: 180.0,
                    size: 1024000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await convertAudioFormat(inputPath, 'flac');

            expect(mockCommand.audioCodec).toHaveBeenCalledWith('flac');
            expect(result.audioPath).toMatch(/audio-convert-.*\.flac$/);
        });
    });

    describe('createTempAudioFile', () => {
        it('should create temporary audio file from buffer', async () => {
            const buffer = Buffer.from('mock audio data');

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 44100,
                    channels: 2,
                    codec_name: 'wav'
                }],
                format: {
                    duration: 30.0,
                    size: 128000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await createTempAudioFile(buffer, 'wav');

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringMatching(/temp-audio-.*\.wav$/),
                buffer
            );
            expect(result.audioPath).toMatch(/temp-audio-.*\.wav$/);
            expect(result.metadata.duration).toBe(30.0);
            expect(typeof result.cleanup).toBe('function');
        });

        it('should cleanup on error', async () => {
            const buffer = Buffer.from('mock audio data');

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(new Error('Metadata extraction failed'));
            });

            await expect(createTempAudioFile(buffer))
                .rejects.toThrow('Failed to get audio metadata: Metadata extraction failed');

            expect(mockUnlink).toHaveBeenCalled();
        });
    });

    describe('cleanupAudioFiles', () => {
        it('should cleanup multiple audio files', async () => {
            const mockCleanup1 = jest.fn().mockResolvedValue(undefined);
            const mockCleanup2 = jest.fn().mockResolvedValue(undefined);
            const mockCleanup3 = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

            const results: ExtractionResult[] = [
                {
                    audioPath: '/tmp/audio1.wav',
                    metadata: {} as AudioMetadata,
                    cleanup: mockCleanup1
                },
                {
                    audioPath: '/tmp/audio2.wav',
                    metadata: {} as AudioMetadata,
                    cleanup: mockCleanup2
                },
                {
                    audioPath: '/tmp/audio3.wav',
                    metadata: {} as AudioMetadata,
                    cleanup: mockCleanup3
                }
            ];

            await cleanupAudioFiles(results);

            expect(mockCleanup1).toHaveBeenCalled();
            expect(mockCleanup2).toHaveBeenCalled();
            expect(mockCleanup3).toHaveBeenCalled();
        });
    });

    describe('cleanup function', () => {
        it('should cleanup temporary files', async () => {
            const inputPath = '/test/input.mp4';

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 16000,
                    channels: 1,
                    codec_name: 'pcm_s16le'
                }],
                format: {
                    duration: 60.0,
                    size: 256000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            const result = await extractAudioFromVideo(inputPath);
            await result.cleanup();

            expect(mockUnlink).toHaveBeenCalledWith(result.audioPath);
        });

        it('should handle cleanup errors gracefully', async () => {
            const inputPath = '/test/input.mp4';

            mockCommand.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
                return mockCommand;
            });

            const mockMetadata = {
                streams: [{
                    codec_type: 'audio',
                    sample_rate: 16000,
                    channels: 1,
                    codec_name: 'pcm_s16le'
                }],
                format: {
                    duration: 60.0,
                    size: 256000
                }
            };

            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(null, mockMetadata);
            });

            mockUnlink.mockRejectedValue(new Error('File not found'));

            const result = await extractAudioFromVideo(inputPath);

            // Should not throw error
            await expect(result.cleanup()).resolves.toBeUndefined();
        });
    });
});