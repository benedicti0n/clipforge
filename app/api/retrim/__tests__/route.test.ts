import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');
jest.mock('node:fs/promises');
jest.mock('node:os');
jest.mock('node:crypto');

const mockFfmpeg = require('fluent-ffmpeg');
const mockFs = require('node:fs/promises');
const mockOs = require('node:os');
const mockCrypto = require('node:crypto');

// Mock implementations
mockOs.tmpdir.mockReturnValue('/tmp');
mockCrypto.randomUUID.mockReturnValue('test-uuid');
mockFs.writeFile.mockResolvedValue(undefined);
mockFs.readFile.mockResolvedValue(Buffer.from('mock-video-data'));
mockFs.unlink.mockResolvedValue(undefined);

// Mock ffmpeg chain
const mockFfmpegInstance = {
    inputOptions: jest.fn().mockReturnThis(),
    outputOptions: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    save: jest.fn()
};

mockFfmpeg.mockReturnValue(mockFfmpegInstance);
mockFfmpeg.setFfmpegPath = jest.fn();
mockFfmpeg.ffprobe = jest.fn();

describe('/api/retrim', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful ffprobe response
        mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
            callback(null, {
                format: { duration: 60 },
                streams: [{ codec_type: 'video', width: 1920, height: 1080 }]
            });
        });

        // Default successful ffmpeg processing
        mockFfmpegInstance.save.mockImplementation((outputPath: string) => {
            // Simulate successful processing
            const endHandler = mockFfmpegInstance.on.mock.calls.find(call => call[0] === 'end')?.[1];
            if (endHandler) {
                setTimeout(endHandler, 0);
            }
        });
    });

    describe('Form Data Requests', () => {
        const createFormDataRequest = (file: File, trimBounds: any, outputFormat?: string) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('trimBounds', JSON.stringify(trimBounds));
            if (outputFormat) {
                formData.append('outputFormat', outputFormat);
            }

            return new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });
        };

        it('should process valid trim request successfully', async () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const trimBounds = { start: 10, end: 30 };
            const request = createFormDataRequest(mockFile, trimBounds);

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('video/mp4');
            expect(response.headers.get('X-Trim-Start')).toBe('10');
            expect(response.headers.get('X-Trim-End')).toBe('30');
            expect(response.headers.get('X-Trim-Duration')).toBe('20');
        });

        it('should handle WebM output format', async () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const trimBounds = { start: 5, end: 25 };
            const request = createFormDataRequest(mockFile, trimBounds, 'webm');

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('video/webm');
            expect(mockFfmpegInstance.outputOptions).toHaveBeenCalledWith(
                expect.arrayContaining(['-c:v libvpx-vp9', '-c:a libopus'])
            );
        });

        it('should reject request without file', async () => {
            const formData = new FormData();
            formData.append('trimBounds', JSON.stringify({ start: 10, end: 30 }));

            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('No file uploaded');
        });

        it('should reject request without trim bounds', async () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const formData = new FormData();
            formData.append('file', mockFile);

            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Trim bounds are required');
        });

        it('should reject invalid trim bounds format', async () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const formData = new FormData();
            formData.append('file', mockFile);
            formData.append('trimBounds', 'invalid-json');

            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid trim bounds format');
        });
    });

    describe('Trim Bounds Validation', () => {
        const createValidRequest = (trimBounds: any) => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            return createFormDataRequest(mockFile, trimBounds);
        };

        const createFormDataRequest = (file: File, trimBounds: any) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('trimBounds', JSON.stringify(trimBounds));

            return new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });
        };

        it('should reject negative start time', async () => {
            const request = createValidRequest({ start: -5, end: 30 });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid trim bounds');
            expect(data.details).toContain('Start time must be a non-negative number');
        });

        it('should reject start time >= end time', async () => {
            const request = createValidRequest({ start: 30, end: 20 });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid trim bounds');
            expect(data.details).toContain('Start time must be less than end time');
        });

        it('should reject duration less than 0.1 seconds', async () => {
            const request = createValidRequest({ start: 10, end: 10.05 });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid trim bounds');
            expect(data.details).toContain('Minimum clip duration is 0.1 seconds');
        });

        it('should reject end time exceeding video duration', async () => {
            const request = createValidRequest({ start: 10, end: 70 }); // Video duration is 60s
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid trim bounds');
            expect(data.details).toContain('End time cannot exceed video duration of 60 seconds');
        });

        it('should accept valid trim bounds', async () => {
            const request = createValidRequest({ start: 10, end: 30 });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('FFmpeg Integration', () => {
        const createValidRequest = () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const trimBounds = { start: 10.5, end: 30.25 };
            const formData = new FormData();
            formData.append('file', mockFile);
            formData.append('trimBounds', JSON.stringify(trimBounds));

            return new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });
        };

        it('should use precise timestamps with millisecond accuracy', async () => {
            const request = createValidRequest();
            await POST(request);

            expect(mockFfmpegInstance.inputOptions).toHaveBeenCalledWith(['-ss 10.500']);
            expect(mockFfmpegInstance.outputOptions).toHaveBeenCalledWith(
                expect.arrayContaining(['-t 19.750'])
            );
        });

        it('should handle FFmpeg processing errors', async () => {
            mockFfmpegInstance.save.mockImplementation(() => {
                const errorHandler = mockFfmpegInstance.on.mock.calls.find(call => call[0] === 'error')?.[1];
                if (errorHandler) {
                    setTimeout(() => errorHandler(new Error('FFmpeg failed')), 0);
                }
            });

            const request = createValidRequest();
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toContain('Video processing failed');
        });

        it('should handle video metadata extraction errors', async () => {
            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(new Error('Failed to probe video'));
            });

            const request = createValidRequest();
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Failed to analyze video');
        });
    });

    describe('File Cleanup', () => {
        it('should cleanup temp files on success', async () => {
            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const trimBounds = { start: 10, end: 30 };
            const formData = new FormData();
            formData.append('file', mockFile);
            formData.append('trimBounds', JSON.stringify(trimBounds));

            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });

            await POST(request);

            expect(mockFs.unlink).toHaveBeenCalledTimes(2); // Input and output files
        });

        it('should cleanup temp files on error', async () => {
            mockFfmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
                callback(new Error('Failed to probe video'));
            });

            const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
            const trimBounds = { start: 10, end: 30 };
            const formData = new FormData();
            formData.append('file', mockFile);
            formData.append('trimBounds', JSON.stringify(trimBounds));

            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                body: formData
            });

            await POST(request);

            expect(mockFs.unlink).toHaveBeenCalled();
        });
    });

    describe('JSON Requests', () => {
        it('should reject video URL requests (not implemented)', async () => {
            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl: 'http://example.com/video.mp4',
                    trimBounds: { start: 10, end: 30 }
                })
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Video URL processing not yet implemented');
        });

        it('should handle invalid JSON', async () => {
            const request = new NextRequest('http://localhost/api/retrim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json'
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid JSON request body');
        });
    });
});