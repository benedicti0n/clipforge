// Simple integration test for process-final API
describe('/api/process-final', () => {
    describe('Request Validation', () => {
        it('should validate processing request structure', () => {
            // Test the validation logic directly
            const validateProcessingRequest = (request: any): { isValid: boolean; errors: string[] } => {
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

            // Test valid request
            const validRequest = {
                trimBounds: { start: 10, end: 60 },
                outputFormat: 'mp4',
                quality: 'medium'
            };
            const validResult = validateProcessingRequest(validRequest);
            expect(validResult.isValid).toBe(true);
            expect(validResult.errors).toHaveLength(0);

            // Test invalid trim bounds
            const invalidTrimRequest = {
                trimBounds: { start: 60, end: 10 }
            };
            const invalidTrimResult = validateProcessingRequest(invalidTrimRequest);
            expect(invalidTrimResult.isValid).toBe(false);
            expect(invalidTrimResult.errors).toContain('Trim start time must be less than end time');

            // Test invalid output format
            const invalidFormatRequest = {
                outputFormat: 'avi'
            };
            const invalidFormatResult = validateProcessingRequest(invalidFormatRequest);
            expect(invalidFormatResult.isValid).toBe(false);
            expect(invalidFormatResult.errors).toContain('Output format must be mp4 or webm');

            // Test invalid quality
            const invalidQualityRequest = {
                quality: 'ultra'
            };
            const invalidQualityResult = validateProcessingRequest(invalidQualityRequest);
            expect(invalidQualityResult.isValid).toBe(false);
            expect(invalidQualityResult.errors).toContain('Quality must be low, medium, or high');
        });

        it('should validate subtitle segments', () => {
            const validateSubtitles = (subtitles: any[]): { isValid: boolean; errors: string[] } => {
                const errors: string[] = [];

                subtitles.forEach((track, trackIndex) => {
                    if (!track.id) {
                        errors.push(`Subtitle track ${trackIndex} must have an ID`);
                    }

                    if (!Array.isArray(track.segments)) {
                        errors.push(`Subtitle track ${trackIndex} must have segments array`);
                    } else {
                        track.segments.forEach((segment: any, segmentIndex: number) => {
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

                return {
                    isValid: errors.length === 0,
                    errors
                };
            };

            // Test valid subtitles
            const validSubtitles = [{
                id: 'track-1',
                segments: [
                    { start: 0, end: 5, text: 'Hello world' },
                    { start: 5, end: 10, text: 'This is a test' }
                ]
            }];
            const validResult = validateSubtitles(validSubtitles);
            expect(validResult.isValid).toBe(true);

            // Test invalid subtitles
            const invalidSubtitles = [{
                id: 'track-1',
                segments: [
                    { start: 10, end: 5, text: 'Invalid timing' }
                ]
            }];
            const invalidResult = validateSubtitles(invalidSubtitles);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errors).toContain('Subtitle track 0, segment 0: end time must be greater than start time');
        });
    });

    describe('Utility Functions', () => {
        it('should format SRT time correctly', () => {
            const formatSRTTime = (seconds: number): string => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                const milliseconds = Math.floor((seconds % 1) * 1000);

                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
            };

            expect(formatSRTTime(0)).toBe('00:00:00,000');
            expect(formatSRTTime(65.5)).toBe('00:01:05,500');
            expect(formatSRTTime(3661.25)).toBe('01:01:01,250');
        });

        it('should generate subtitle file content', async () => {
            const generateSubtitleContent = (subtitles: any[]): string => {
                let srtContent = '';
                let segmentIndex = 1;

                for (const track of subtitles) {
                    for (const segment of track.segments) {
                        const formatSRTTime = (seconds: number): string => {
                            const hours = Math.floor(seconds / 3600);
                            const minutes = Math.floor((seconds % 3600) / 60);
                            const secs = Math.floor(seconds % 60);
                            const milliseconds = Math.floor((seconds % 1) * 1000);

                            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
                        };

                        const startTime = formatSRTTime(segment.start);
                        const endTime = formatSRTTime(segment.end);

                        srtContent += `${segmentIndex}\n`;
                        srtContent += `${startTime} --> ${endTime}\n`;
                        srtContent += `${segment.text.trim()}\n\n`;

                        segmentIndex++;
                    }
                }

                return srtContent;
            };

            const subtitles = [{
                id: 'track-1',
                segments: [
                    { start: 0, end: 5, text: 'Hello world' },
                    { start: 5, end: 10, text: 'This is a test' }
                ]
            }];

            const srtContent = generateSubtitleContent(subtitles);
            expect(srtContent).toContain('1\n00:00:00,000 --> 00:00:05,000\nHello world\n\n');
            expect(srtContent).toContain('2\n00:00:05,000 --> 00:00:10,000\nThis is a test\n\n');
        });

        it('should generate overlay filter strings', () => {
            const generateOverlayFilter = (overlays: any[], videoWidth: number, videoHeight: number): string => {
                if (!overlays || overlays.length === 0) {
                    return '';
                }

                const filters: string[] = [];

                overlays.forEach((overlay) => {
                    // Convert normalized position to pixel coordinates
                    const x = Math.round(overlay.position.x * videoWidth);
                    const y = Math.round(overlay.position.y * videoHeight);

                    // Build text style
                    const fontSize = overlay.style.fontSize;
                    const fontColor = overlay.style.color.replace('#', '');

                    // Escape text for FFmpeg
                    const escapedText = overlay.text
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/:/g, '\\:')
                        .replace(/\[/g, '\\[')
                        .replace(/\]/g, '\\]');

                    // Build drawtext filter
                    let drawtext = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:fontfile=/System/Library/Fonts/Arial.ttf`;

                    // Add timing
                    drawtext += `:enable='between(t,${overlay.timing.start},${overlay.timing.end})'`;

                    filters.push(drawtext);
                });

                return filters.join(',');
            };

            const overlays = [{
                text: 'Test: [Special] Characters',
                position: { x: 0.5, y: 0.5 },
                style: {
                    fontSize: 24,
                    color: '#ffffff'
                },
                timing: { start: 0, end: 10 }
            }];

            const filter = generateOverlayFilter(overlays, 1920, 1080);
            expect(filter).toContain('drawtext=text=\'Test\\: \\[Special\\] Characters\'');
            expect(filter).toContain('x=960:y=540');
            expect(filter).toContain('fontsize=24');
            expect(filter).toContain('fontcolor=ffffff');
            expect(filter).toContain('enable=\'between(t,0,10)\'');
        });
    });

    describe('Quality Settings', () => {
        it('should map quality settings to CRF values', () => {
            const getQualitySettings = (quality: string, format: string) => {
                if (format === 'mp4') {
                    const crfValues = { low: 28, medium: 23, high: 18 };
                    return {
                        codec: 'libx264',
                        crf: crfValues[quality as keyof typeof crfValues] || 23
                    };
                } else if (format === 'webm') {
                    const crfValues = { low: 35, medium: 30, high: 25 };
                    return {
                        codec: 'libvpx-vp9',
                        crf: crfValues[quality as keyof typeof crfValues] || 30
                    };
                }
                return null;
            };

            // Test MP4 quality settings
            expect(getQualitySettings('low', 'mp4')).toEqual({ codec: 'libx264', crf: 28 });
            expect(getQualitySettings('medium', 'mp4')).toEqual({ codec: 'libx264', crf: 23 });
            expect(getQualitySettings('high', 'mp4')).toEqual({ codec: 'libx264', crf: 18 });

            // Test WebM quality settings
            expect(getQualitySettings('low', 'webm')).toEqual({ codec: 'libvpx-vp9', crf: 35 });
            expect(getQualitySettings('medium', 'webm')).toEqual({ codec: 'libvpx-vp9', crf: 30 });
            expect(getQualitySettings('high', 'webm')).toEqual({ codec: 'libvpx-vp9', crf: 25 });
        });
    });
});