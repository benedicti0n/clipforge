/**
 * @jest-environment jsdom
 */

import {
    renderCanvasOverlays,
    renderTextOverlay,
    renderTextOverlays,
    renderSubtitles,
    findOverlayAtPoint,
    isPointInOverlayBounds,
    clearTextMeasurementCache
} from '../canvas-overlay-renderer';
import { createTextOverlay, DEFAULT_TEXT_STYLE } from '../text-overlay';

// Mock canvas context factory
const createMockContext = () => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    set font(value: string) { this._font = value; },
    get font() { return this._font || '16px Arial'; },
    set fillStyle(value: string) { this._fillStyle = value; },
    get fillStyle() { return this._fillStyle || '#000000'; },
    set strokeStyle(value: string) { this._strokeStyle = value; },
    get strokeStyle() { return this._strokeStyle || '#000000'; },
    set lineWidth(value: number) { this._lineWidth = value; },
    get lineWidth() { return this._lineWidth || 1; },
    set textAlign(value: string) { this._textAlign = value; },
    get textAlign() { return this._textAlign || 'left'; },
    set textBaseline(value: string) { this._textBaseline = value; },
    get textBaseline() { return this._textBaseline || 'top'; },
    set globalAlpha(value: number) { this._globalAlpha = value; },
    get globalAlpha() { return this._globalAlpha || 1; },
    set filter(value: string) { this._filter = value; },
    get filter() { return this._filter || 'none'; },
    _font: '16px Arial',
    _fillStyle: '#000000',
    _strokeStyle: '#000000',
    _lineWidth: 1,
    _textAlign: 'left',
    _textBaseline: 'top',
    _globalAlpha: 1,
    _filter: 'none'
});

let mockContext: ReturnType<typeof createMockContext>;

// Mock canvas
let mockCanvas: HTMLCanvasElement;

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    value: 1
});

describe('Canvas Overlay Renderer', () => {
    beforeEach(() => {
        mockContext = createMockContext();
        mockCanvas = {
            getContext: jest.fn(() => mockContext),
            width: 800,
            height: 600,
            clientWidth: 800,
            clientHeight: 600
        } as unknown as HTMLCanvasElement;

        clearTextMeasurementCache();
    });

    describe('renderTextOverlay', () => {
        it('should render a visible text overlay', () => {
            const overlay = createTextOverlay('Test Text', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            const result = renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(result.rendered).toBe(true);
            expect(result.bounds).toBeDefined();
            expect(mockContext.fillText).toHaveBeenCalledWith('Test Text', 400, 300);
        });

        it('should not render overlay outside time bounds', () => {
            const overlay = createTextOverlay('Test Text', { x: 0.5, y: 0.5 }, { start: 10, end: 20 });
            const result = renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(result.rendered).toBe(false);
            expect(mockContext.fillText).not.toHaveBeenCalled();
        });

        it('should not render invisible overlay', () => {
            const overlay = createTextOverlay('Test Text', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            overlay.visible = false;
            const result = renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(result.rendered).toBe(false);
            expect(mockContext.fillText).not.toHaveBeenCalled();
        });

        it('should render background when specified', () => {
            const overlay = createTextOverlay(
                'Test Text',
                { x: 0.5, y: 0.5 },
                { start: 0, end: 10 },
                { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
            );
            renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(mockContext.fillRect).toHaveBeenCalled();
        });

        it('should render border when specified', () => {
            const overlay = createTextOverlay(
                'Test Text',
                { x: 0.5, y: 0.5 },
                { start: 0, end: 10 },
                { borderColor: '#ff0000', borderWidth: 2 }
            );
            renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(mockContext.strokeText).toHaveBeenCalledWith('Test Text', 400, 300);
        });

        it('should apply text alignment', () => {
            const overlay = createTextOverlay(
                'Test Text',
                { x: 0.5, y: 0.5 },
                { start: 0, end: 10 },
                { textAlign: 'center' }
            );
            renderTextOverlay(mockContext as any, overlay, 800, 600, 5);

            expect(mockContext.textAlign).toBe('center');
        });
    });

    describe('renderTextOverlays', () => {
        it('should render multiple overlays sorted by z-index', () => {
            // Clear previous calls
            jest.clearAllMocks();

            const overlay1 = createTextOverlay('Overlay 1', { x: 0.2, y: 0.2 }, { start: 0, end: 10 });
            overlay1.zIndex = 2;

            const overlay2 = createTextOverlay('Overlay 2', { x: 0.8, y: 0.8 }, { start: 0, end: 10 });
            overlay2.zIndex = 1;

            const overlays = [overlay1, overlay2];
            const result = renderTextOverlays(mockContext as any, overlays, 800, 600, 5);

            expect(result).toHaveLength(2);
            expect(mockContext.fillText).toHaveBeenCalledTimes(4); // 2 overlays * 2 calls each (shadow + main text)

            // Should render overlay2 first (lower z-index)
            // Each overlay calls fillText twice (shadow + main), so we check the main text calls
            const calls = (mockContext.fillText as jest.Mock).mock.calls;
            expect(calls[1]).toEqual(['Overlay 2', 640, 480]); // Main text for overlay2
            expect(calls[3]).toEqual(['Overlay 1', 160, 120]); // Main text for overlay1
        });

        it('should only render overlays active at current time', () => {
            // Clear previous calls
            jest.clearAllMocks();

            const overlay1 = createTextOverlay('Active', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            const overlay2 = createTextOverlay('Inactive', { x: 0.5, y: 0.5 }, { start: 15, end: 25 });

            const overlays = [overlay1, overlay2];
            const result = renderTextOverlays(mockContext as any, overlays, 800, 600, 5);

            expect(result).toHaveLength(1);
            expect(result[0].overlay.text).toBe('Active');
        });
    });

    describe('renderSubtitles', () => {
        it('should render active subtitle', () => {
            const subtitles = [
                { start: 0, end: 5, text: 'First subtitle' },
                { start: 10, end: 15, text: 'Second subtitle' }
            ];

            renderSubtitles(mockContext as any, subtitles, 800, 600, 2);

            expect(mockContext.fillText).toHaveBeenCalledWith('First subtitle', 400, 580);
            expect(mockContext.strokeText).toHaveBeenCalledWith('First subtitle', 400, 580);
        });

        it('should not render subtitle outside time bounds', () => {
            const subtitles = [
                { start: 10, end: 15, text: 'Future subtitle' }
            ];

            renderSubtitles(mockContext as any, subtitles, 800, 600, 2);

            expect(mockContext.fillText).not.toHaveBeenCalled();
        });
    });

    describe('renderCanvasOverlays', () => {
        it('should render overlays and subtitles on canvas', () => {
            const overlay = createTextOverlay('Test Overlay', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });
            const subtitles = [{ start: 0, end: 5, text: 'Test Subtitle' }];

            const result = renderCanvasOverlays(
                {
                    canvas: mockCanvas,
                    videoWidth: 800,
                    videoHeight: 600,
                    currentTime: 2
                },
                [overlay],
                subtitles
            );

            expect(mockContext.clearRect).toHaveBeenCalled();
            expect(mockContext.scale).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should handle high-DPI displays', () => {
            Object.defineProperty(window, 'devicePixelRatio', { value: 2 });

            const overlay = createTextOverlay('Test', { x: 0.5, y: 0.5 }, { start: 0, end: 10 });

            renderCanvasOverlays(
                {
                    canvas: mockCanvas,
                    videoWidth: 800,
                    videoHeight: 600,
                    currentTime: 2,
                    devicePixelRatio: 2
                },
                [overlay]
            );

            expect(mockCanvas.width).toBe(1600); // 800 * 2
            expect(mockCanvas.height).toBe(1200); // 600 * 2
            expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
        });
    });

    describe('utility functions', () => {
        describe('isPointInOverlayBounds', () => {
            it('should return true for point inside bounds', () => {
                const bounds = { x: 100, y: 100, width: 200, height: 50 };
                const point = { x: 150, y: 125 };

                expect(isPointInOverlayBounds(point, bounds)).toBe(true);
            });

            it('should return false for point outside bounds', () => {
                const bounds = { x: 100, y: 100, width: 200, height: 50 };
                const point = { x: 50, y: 125 };

                expect(isPointInOverlayBounds(point, bounds)).toBe(false);
            });

            it('should return true for point on bounds edge', () => {
                const bounds = { x: 100, y: 100, width: 200, height: 50 };
                const point = { x: 100, y: 100 }; // Top-left corner

                expect(isPointInOverlayBounds(point, bounds)).toBe(true);
            });
        });

        describe('findOverlayAtPoint', () => {
            it('should find overlay at point', () => {
                const overlay1 = createTextOverlay('Overlay 1');
                const overlay2 = createTextOverlay('Overlay 2');

                const renderedOverlays = [
                    { overlay: overlay1, bounds: { x: 100, y: 100, width: 200, height: 50 } },
                    { overlay: overlay2, bounds: { x: 200, y: 200, width: 200, height: 50 } }
                ];

                const point = { x: 150, y: 125 };
                const found = findOverlayAtPoint(point, renderedOverlays);

                expect(found).toBe(overlay1);
            });

            it('should return null if no overlay at point', () => {
                const overlay = createTextOverlay('Overlay');
                const renderedOverlays = [
                    { overlay, bounds: { x: 100, y: 100, width: 200, height: 50 } }
                ];

                const point = { x: 50, y: 50 };
                const found = findOverlayAtPoint(point, renderedOverlays);

                expect(found).toBeNull();
            });

            it('should return highest z-index overlay when overlapping', () => {
                const overlay1 = createTextOverlay('Lower');
                overlay1.zIndex = 1;

                const overlay2 = createTextOverlay('Higher');
                overlay2.zIndex = 2;

                // Both overlays at same position, overlay2 should be found (higher z-index rendered last)
                const renderedOverlays = [
                    { overlay: overlay1, bounds: { x: 100, y: 100, width: 200, height: 50 } },
                    { overlay: overlay2, bounds: { x: 100, y: 100, width: 200, height: 50 } }
                ];

                const point = { x: 150, y: 125 };
                const found = findOverlayAtPoint(point, renderedOverlays);

                expect(found).toBe(overlay2);
            });
        });
    });

    describe('clearTextMeasurementCache', () => {
        it('should clear the text measurement cache', () => {
            // This test mainly ensures the function exists and can be called
            expect(() => clearTextMeasurementCache()).not.toThrow();
        });
    });
});