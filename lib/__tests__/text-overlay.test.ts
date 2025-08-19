import {
    TextOverlay,
    TextStyle,
    DEFAULT_TEXT_STYLE,
    validateTextOverlay,
    createTextOverlay,
    cloneTextOverlay,
    updateOverlayPosition,
    updateOverlayTiming,
    updateOverlayStyle,
    isOverlayActiveAtTime,
    getActiveOverlaysAtTime,
    validateTextOverlays,
    pixelsToNormalized,
    normalizedToPixels
} from '../text-overlay';

describe('Text Overlay Data Models and Validation', () => {
    const mockVideoDuration = 120; // 2 minutes
    const mockVideoWidth = 1920;
    const mockVideoHeight = 1080;

    describe('createTextOverlay', () => {
        it('should create a text overlay with default values', () => {
            const overlay = createTextOverlay();

            expect(overlay.id).toBeDefined();
            expect(overlay.text).toBe('New Text Overlay');
            expect(overlay.position).toEqual({ x: 0.5, y: 0.5 });
            expect(overlay.timing).toEqual({ start: 0, end: 5 });
            expect(overlay.style).toEqual(DEFAULT_TEXT_STYLE);
            expect(overlay.zIndex).toBe(1);
            expect(overlay.visible).toBe(true);
        });

        it('should create a text overlay with custom values', () => {
            const customText = 'Custom Text';
            const customPosition = { x: 0.2, y: 0.8 };
            const customTiming = { start: 10, end: 20 };
            const customStyle = { fontSize: 32, color: '#ff0000' };

            const overlay = createTextOverlay(customText, customPosition, customTiming, customStyle);

            expect(overlay.text).toBe(customText);
            expect(overlay.position).toEqual(customPosition);
            expect(overlay.timing).toEqual(customTiming);
            expect(overlay.style.fontSize).toBe(32);
            expect(overlay.style.color).toBe('#ff0000');
            // Should merge with defaults
            expect(overlay.style.fontFamily).toBe(DEFAULT_TEXT_STYLE.fontFamily);
        });

        it('should generate unique IDs for different overlays', () => {
            const overlay1 = createTextOverlay();
            const overlay2 = createTextOverlay();

            expect(overlay1.id).not.toBe(overlay2.id);
        });
    });

    describe('cloneTextOverlay', () => {
        it('should create a deep copy with a new ID', () => {
            const original = createTextOverlay('Original Text', { x: 0.3, y: 0.7 });
            const cloned = cloneTextOverlay(original);

            expect(cloned.id).not.toBe(original.id);
            expect(cloned.text).toBe(original.text);
            expect(cloned.position).toEqual(original.position);
            expect(cloned.position).not.toBe(original.position); // Different object reference
            expect(cloned.style).toEqual(original.style);
            expect(cloned.style).not.toBe(original.style); // Different object reference
        });
    });

    describe('updateOverlayPosition', () => {
        it('should update position while preserving other properties', () => {
            const original = createTextOverlay();
            const newPosition = { x: 0.8, y: 0.2 };
            const updated = updateOverlayPosition(original, newPosition);

            expect(updated.position).toEqual(newPosition);
            expect(updated.text).toBe(original.text);
            expect(updated.style).toBe(original.style);
            expect(updated.timing).toBe(original.timing);
        });
    });

    describe('updateOverlayTiming', () => {
        it('should update timing while preserving other properties', () => {
            const original = createTextOverlay();
            const newTiming = { start: 15, end: 25 };
            const updated = updateOverlayTiming(original, newTiming);

            expect(updated.timing).toEqual(newTiming);
            expect(updated.text).toBe(original.text);
            expect(updated.style).toBe(original.style);
            expect(updated.position).toBe(original.position);
        });
    });

    describe('updateOverlayStyle', () => {
        it('should merge style updates with existing style', () => {
            const original = createTextOverlay();
            const styleUpdates = { fontSize: 48, color: '#00ff00' };
            const updated = updateOverlayStyle(original, styleUpdates);

            expect(updated.style.fontSize).toBe(48);
            expect(updated.style.color).toBe('#00ff00');
            expect(updated.style.fontFamily).toBe(original.style.fontFamily); // Preserved
            expect(updated.text).toBe(original.text);
        });
    });

    describe('validateTextOverlay', () => {
        it('should validate a correct text overlay', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty text', () => {
            const overlay = createTextOverlay('', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Text content cannot be empty');
        });

        it('should reject text that is too long', () => {
            const longText = 'a'.repeat(501);
            const overlay = createTextOverlay(longText, { x: 0.5, y: 0.5 }, { start: 10, end: 20 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Text content cannot exceed 500 characters');
        });

        it('should reject negative start time', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: -5, end: 20 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Start time cannot be negative');
        });

        it('should reject end time beyond video duration', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 150 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('End time cannot exceed video duration');
        });

        it('should reject start time >= end time', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 20, end: 15 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Start time must be less than end time');
        });

        it('should reject duration that is too short', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 10.05 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Minimum overlay duration is 0.1 seconds');
        });

        it('should reject invalid position coordinates', () => {
            const overlay1 = createTextOverlay('Valid Text', { x: -0.1, y: 0.5 }, { start: 10, end: 20 });
            const result1 = validateTextOverlay(overlay1, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result1.isValid).toBe(false);
            expect(result1.errors).toContain('X position must be between 0 and 1');

            const overlay2 = createTextOverlay('Valid Text', { x: 0.5, y: 1.1 }, { start: 10, end: 20 });
            const result2 = validateTextOverlay(overlay2, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result2.isValid).toBe(false);
            expect(result2.errors).toContain('Y position must be between 0 and 1');
        });

        it('should reject invalid font size', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 }, { fontSize: 0 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Font size must be between 1 and 200 pixels');
        });

        it('should reject invalid opacity', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 }, { opacity: 1.5 });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Opacity must be between 0 and 1');
        });

        it('should reject invalid color formats', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 }, { color: 'invalid-color' });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Text color must be a valid hex color or rgba value');
        });

        it('should accept valid hex colors', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 }, { color: '#ff0000' });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(true);
        });

        it('should accept valid rgba colors', () => {
            const overlay = createTextOverlay('Valid Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 }, { color: 'rgba(255, 0, 0, 0.8)' });
            const result = validateTextOverlay(overlay, mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(true);
        });
    });

    describe('isOverlayActiveAtTime', () => {
        it('should return true when time is within overlay timing', () => {
            const overlay = createTextOverlay('Test', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });

            expect(isOverlayActiveAtTime(overlay, 15)).toBe(true);
            expect(isOverlayActiveAtTime(overlay, 10)).toBe(true); // Start time
            expect(isOverlayActiveAtTime(overlay, 20)).toBe(true); // End time
        });

        it('should return false when time is outside overlay timing', () => {
            const overlay = createTextOverlay('Test', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });

            expect(isOverlayActiveAtTime(overlay, 5)).toBe(false);
            expect(isOverlayActiveAtTime(overlay, 25)).toBe(false);
        });

        it('should return false when overlay is not visible', () => {
            const overlay = createTextOverlay('Test', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });
            overlay.visible = false;

            expect(isOverlayActiveAtTime(overlay, 15)).toBe(false);
        });
    });

    describe('getActiveOverlaysAtTime', () => {
        it('should return overlays active at the given time', () => {
            const overlay1 = createTextOverlay('Overlay 1', { x: 0.2, y: 0.2 }, { start: 5, end: 15 });
            const overlay2 = createTextOverlay('Overlay 2', { x: 0.8, y: 0.8 }, { start: 10, end: 25 });
            const overlay3 = createTextOverlay('Overlay 3', { x: 0.5, y: 0.5 }, { start: 20, end: 30 });

            const overlays = [overlay1, overlay2, overlay3];

            const activeAt12 = getActiveOverlaysAtTime(overlays, 12);
            expect(activeAt12).toHaveLength(2);
            expect(activeAt12.map(o => o.text)).toContain('Overlay 1');
            expect(activeAt12.map(o => o.text)).toContain('Overlay 2');

            const activeAt22 = getActiveOverlaysAtTime(overlays, 22);
            expect(activeAt22).toHaveLength(2);
            expect(activeAt22.map(o => o.text)).toContain('Overlay 2');
            expect(activeAt22.map(o => o.text)).toContain('Overlay 3');
        });

        it('should sort overlays by zIndex', () => {
            const overlay1 = createTextOverlay('Overlay 1', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            overlay1.zIndex = 3;

            const overlay2 = createTextOverlay('Overlay 2', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            overlay2.zIndex = 1;

            const overlay3 = createTextOverlay('Overlay 3', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            overlay3.zIndex = 2;

            const overlays = [overlay1, overlay2, overlay3];
            const activeOverlays = getActiveOverlaysAtTime(overlays, 5);

            expect(activeOverlays[0].text).toBe('Overlay 2'); // zIndex 1
            expect(activeOverlays[1].text).toBe('Overlay 3'); // zIndex 2
            expect(activeOverlays[2].text).toBe('Overlay 1'); // zIndex 3
        });
    });

    describe('validateTextOverlays', () => {
        it('should validate multiple overlays', () => {
            const overlay1 = createTextOverlay('Valid 1', { x: 0.2, y: 0.2 }, { start: 5, end: 15 });
            const overlay2 = createTextOverlay('Valid 2', { x: 0.8, y: 0.8 }, { start: 10, end: 25 });

            const result = validateTextOverlays([overlay1, overlay2], mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(true);
            expect(Object.keys(result.overlayErrors)).toHaveLength(0);
        });

        it('should return errors for invalid overlays', () => {
            const validOverlay = createTextOverlay('Valid', { x: 0.5, y: 0.5 }, { start: 5, end: 15 });
            const invalidOverlay = createTextOverlay('', { x: -0.1, y: 0.5 }, { start: 20, end: 10 });

            const result = validateTextOverlays([validOverlay, invalidOverlay], mockVideoDuration, mockVideoWidth, mockVideoHeight);

            expect(result.isValid).toBe(false);
            expect(Object.keys(result.overlayErrors)).toHaveLength(1);
            expect(result.overlayErrors[invalidOverlay.id]).toContain('Text content cannot be empty');
            expect(result.overlayErrors[invalidOverlay.id]).toContain('X position must be between 0 and 1');
            expect(result.overlayErrors[invalidOverlay.id]).toContain('Start time must be less than end time');
        });
    });

    describe('coordinate conversion utilities', () => {
        describe('pixelsToNormalized', () => {
            it('should convert pixel coordinates to normalized coordinates', () => {
                const pixelPos = { x: 960, y: 540 }; // Center of 1920x1080
                const normalized = pixelsToNormalized(pixelPos, mockVideoWidth, mockVideoHeight);

                expect(normalized.x).toBe(0.5);
                expect(normalized.y).toBe(0.5);
            });

            it('should clamp coordinates to valid range', () => {
                const pixelPos = { x: -100, y: 2000 };
                const normalized = pixelsToNormalized(pixelPos, mockVideoWidth, mockVideoHeight);

                expect(normalized.x).toBe(0);
                expect(normalized.y).toBe(1);
            });
        });

        describe('normalizedToPixels', () => {
            it('should convert normalized coordinates to pixel coordinates', () => {
                const normalizedPos = { x: 0.5, y: 0.5 };
                const pixels = normalizedToPixels(normalizedPos, mockVideoWidth, mockVideoHeight);

                expect(pixels.x).toBe(960);
                expect(pixels.y).toBe(540);
            });

            it('should handle edge coordinates', () => {
                const topLeft = normalizedToPixels({ x: 0, y: 0 }, mockVideoWidth, mockVideoHeight);
                const bottomRight = normalizedToPixels({ x: 1, y: 1 }, mockVideoWidth, mockVideoHeight);

                expect(topLeft.x).toBe(0);
                expect(topLeft.y).toBe(0);
                expect(bottomRight.x).toBe(mockVideoWidth);
                expect(bottomRight.y).toBe(mockVideoHeight);
            });
        });
    });
});