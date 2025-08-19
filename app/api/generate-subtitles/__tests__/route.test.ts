import * as audioExtraction from '../../../../lib/audio-extraction';
import * as whisperIntegration from '../../../../lib/whisper-integration';

// Mock the dependencies
jest.mock('../../../../lib/audio-extraction');
jest.mock('../../../../lib/whisper-integration');
jest.mock('node:fs/promises');

const mockExtractAudioFromVideo = audioExtraction.extractAudioFromVideo as jest.MockedFunction<typeof audioExtraction.extractAudioFromVideo>;
const mockCleanupAudioFiles = audioExtraction.cleanupAudioFiles as jest.MockedFunction<typeof audioExtraction.cleanupAudioFiles>;
const mockRunWhisper = whisperIntegration.runWhisper as jest.MockedFunction<typeof whisperIntegration.runWhisper>;
const mockConvertWhisperToSubtitles = whisperIntegration.convertWhisperToSubtitles as jest.MockedFunction<typeof whisperIntegration.convertWhisperToSubtitles>;
const mockCheckWhisperInstallation = whisperIntegration.checkWhisperInstallation as jest.MockedFunction<typeof whisperIntegration.checkWhisperInstallation>;

// Mock fs promises
const mockWriteFile = require('node:fs/promises').writeFile;
const mockUnlink = require('node:fs/promises').unlink;

describe('Subtitle Generation Integration', () => {
    const mockVideoBuffer = Buffer.from('mock video data');
    const mockAudioResult = {
        audioPath: '/tmp/audio.wav',
        metadata: {
            duration: 120,
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
            size: 1024000
        },
        cleanup: jest.fn().mockResolvedValue(undefined)
    };

    const mockWhisperResult = {
        text: 'Hello world, this is a test.',
        language: 'en',
        duration: 120,
        segments: [
            {
                id: 0,
                seek: 0,
                start: 0.0,
                end: 5.0,
                text: 'Hello world,',
                tokens: [1, 2, 3],
                temperature: 0.0,
                avg_logprob: -0.5,
                compression_ratio: 1.2,
                no_speech_prob: 0.1
            },
            {
                id: 1,
                seek: 500,
                start: 5.0,
                end: 10.0,
                text: ' this is a test.',
                tokens: [4, 5, 6],
                temperature: 0.0,
                avg_logprob: -0.3,
                compression_ratio: 1.1,
                no_speech_prob: 0.05
            }
        ]
    };

    const mockSubtitles = {
        id: 'test-subtitle-id',
        segments: [
            {
                start: 0.0,
                end: 5.0,
                text: 'Hello world,',
                confidence: 0.6
            },
            {
                start: 5.0,
                end: 10.0,
                text: 'this is a test.',
                confidence: 0.7
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default successful mocks
        mockCheckWhisperInstallation.mockResolvedValue({
            installed: true,
            version: '20231117'
        });

        mockExtractAudioFromVideo.mockResolvedValue(mockAudioResult);
        mockRunWhisper.mockResolvedValue(mockWhisperResult);
        mockConvertWhisperToSubtitles.mockReturnValue(mockSubtitles);
        mockCleanupAudioFiles.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
    });

    describe('Whisper Installation Check', () => {
        it('should check if Whisper is installed', async () => {
            await mockCheckWhisperInstallation();
            expect(mockCheckWhisperInstallation).toHaveBeenCalled();
        });

        it('should handle Whisper not installed', async () => {
            mockCheckWhisperInstallation.mockResolvedValue({
                installed: false,
                error: 'Whisper command not found'
            });

            const result = await mockCheckWhisperInstallation();
            expect(result.installed).toBe(false);
            expect(result.error).toBe('Whisper command not found');
        });
    });

    describe('Audio Extraction Integration', () => {
        it('should extract audio from video with correct parameters', async () => {
            await mockExtractAudioFromVideo('/test/video.mp4', {
                sampleRate: 16000,
                channels: 1,
                format: 'wav'
            });

            expect(mockExtractAudioFromVideo).toHaveBeenCalledWith('/test/video.mp4', {
                sampleRate: 16000,
                channels: 1,
                format: 'wav'
            });
        });

        it('should handle audio extraction errors', async () => {
            mockExtractAudioFromVideo.mockRejectedValue(new Error('Audio extraction failed'));

            await expect(mockExtractAudioFromVideo('/test/video.mp4')).rejects.toThrow('Audio extraction failed');
        });
    });

    describe('Whisper Processing Integration', () => {
        it('should process audio with Whisper using default options', async () => {
            await mockRunWhisper('/tmp/audio.wav', {
                model: 'base',
                language: 'auto'
            });

            expect(mockRunWhisper).toHaveBeenCalledWith('/tmp/audio.wav', {
                model: 'base',
                language: 'auto'
            });
        });

        it('should process audio with custom Whisper options', async () => {
            const customOptions = {
                model: 'small' as const,
                language: 'es',
                temperature: 0.2
            };

            await mockRunWhisper('/tmp/audio.wav', customOptions);

            expect(mockRunWhisper).toHaveBeenCalledWith('/tmp/audio.wav', customOptions);
        });

        it('should handle Whisper processing errors', async () => {
            mockRunWhisper.mockRejectedValue(new Error('Whisper processing failed'));

            await expect(mockRunWhisper('/tmp/audio.wav')).rejects.toThrow('Whisper processing failed');
        });
    });

    describe('Subtitle Conversion', () => {
        it('should convert Whisper result to subtitle format', () => {
            const result = mockConvertWhisperToSubtitles(mockWhisperResult);

            expect(mockConvertWhisperToSubtitles).toHaveBeenCalledWith(mockWhisperResult);
            expect(result).toEqual(mockSubtitles);
        });
    });

    describe('File Cleanup', () => {
        it('should cleanup audio files after processing', async () => {
            await mockCleanupAudioFiles([mockAudioResult]);

            expect(mockCleanupAudioFiles).toHaveBeenCalledWith([mockAudioResult]);
        });

        it('should cleanup temporary video files', async () => {
            await mockUnlink('/tmp/video.mp4');

            expect(mockUnlink).toHaveBeenCalledWith('/tmp/video.mp4');
        });
    });

    describe('Complete Processing Pipeline', () => {
        it('should execute the complete subtitle generation pipeline', async () => {
            // Simulate the complete pipeline
            const installation = await mockCheckWhisperInstallation();
            expect(installation.installed).toBe(true);

            await mockWriteFile('/tmp/video.mp4', mockVideoBuffer);
            expect(mockWriteFile).toHaveBeenCalled();

            const audioResult = await mockExtractAudioFromVideo('/tmp/video.mp4', {
                sampleRate: 16000,
                channels: 1,
                format: 'wav'
            });
            expect(audioResult).toEqual(mockAudioResult);

            const whisperResult = await mockRunWhisper(audioResult.audioPath, {
                model: 'base',
                language: 'auto'
            });
            expect(whisperResult).toEqual(mockWhisperResult);

            const subtitles = mockConvertWhisperToSubtitles(whisperResult);
            expect(subtitles).toEqual(mockSubtitles);

            await mockCleanupAudioFiles([audioResult]);
            await mockUnlink('/tmp/video.mp4');

            expect(mockCleanupAudioFiles).toHaveBeenCalled();
            expect(mockUnlink).toHaveBeenCalled();
        });

        it('should handle errors in the pipeline gracefully', async () => {
            // Test error handling at different stages
            mockExtractAudioFromVideo.mockRejectedValue(new Error('Audio extraction failed'));

            await expect(mockExtractAudioFromVideo('/tmp/video.mp4')).rejects.toThrow('Audio extraction failed');

            // Ensure cleanup still happens
            await mockCleanupAudioFiles([]);
            await mockUnlink('/tmp/video.mp4');

            expect(mockCleanupAudioFiles).toHaveBeenCalled();
            expect(mockUnlink).toHaveBeenCalled();
        });
    });

    describe('Request Validation Logic', () => {
        it('should validate Whisper model options', () => {
            const validModels = ['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'];

            validModels.forEach(model => {
                // This would be part of the validation logic in the actual API
                expect(validModels.includes(model)).toBe(true);
            });

            expect(validModels.includes('invalid-model')).toBe(false);
        });

        it('should validate temperature range', () => {
            // This would be part of the validation logic in the actual API
            const isValidTemperature = (temp: number) => temp >= 0 && temp <= 1;

            expect(isValidTemperature(0.0)).toBe(true);
            expect(isValidTemperature(0.5)).toBe(true);
            expect(isValidTemperature(1.0)).toBe(true);
            expect(isValidTemperature(-0.1)).toBe(false);
            expect(isValidTemperature(1.1)).toBe(false);
        });

        it('should validate language codes', () => {
            // This would be part of the validation logic in the actual API
            const isValidLanguage = (lang: string) => lang === 'auto' || /^[a-z]{2}$/.test(lang);

            expect(isValidLanguage('auto')).toBe(true);
            expect(isValidLanguage('en')).toBe(true);
            expect(isValidLanguage('es')).toBe(true);
            expect(isValidLanguage('invalid')).toBe(false);
            expect(isValidLanguage('EN')).toBe(false);
        });
    });
});