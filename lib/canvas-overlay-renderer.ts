// Canvas-based text overlay rendering utilities

import { TextOverlay, TextStyle, normalizedToPixels } from './text-overlay';

export interface CanvasRenderingOptions {
    canvas: HTMLCanvasElement;
    videoWidth: number;
    videoHeight: number;
    currentTime: number;
    devicePixelRatio?: number;
}

export interface SubtitleSegment {
    start: number;
    end: number;
    text: string;
    confidence?: number;
}

// Text measurement cache for performance
const textMeasurementCache = new Map<string, TextMetrics>();

// Get cached text measurements or measure and cache
const getCachedTextMetrics = (ctx: CanvasRenderingContext2D, text: string, font: string): TextMetrics => {
    const cacheKey = `${font}:${text}`;

    if (textMeasurementCache.has(cacheKey)) {
        return textMeasurementCache.get(cacheKey)!;
    }

    ctx.font = font;
    const metrics = ctx.measureText(text);
    textMeasurementCache.set(cacheKey, metrics);

    return metrics;
};

// Clear text measurement cache (call when font styles change significantly)
export const clearTextMeasurementCache = () => {
    textMeasurementCache.clear();
};

// Apply text style to canvas context
const applyTextStyle = (ctx: CanvasRenderingContext2D, style: TextStyle, scaleFactor: number = 1) => {
    const fontSize = Math.round(style.fontSize * scaleFactor);
    const fontWeight = style.fontWeight || 'normal';
    const fontStyle = style.fontStyle || 'normal';

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.globalAlpha = style.opacity !== undefined ? style.opacity : 1;

    // Set text alignment
    switch (style.textAlign) {
        case 'left':
            ctx.textAlign = 'left';
            break;
        case 'center':
            ctx.textAlign = 'center';
            break;
        case 'right':
            ctx.textAlign = 'right';
            break;
        default:
            ctx.textAlign = 'left';
    }

    ctx.textBaseline = 'top';
};

// Draw text with background and border
const drawStyledText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    style: TextStyle,
    scaleFactor: number = 1
) => {
    ctx.save();

    applyTextStyle(ctx, style, scaleFactor);

    const metrics = getCachedTextMetrics(ctx, text, ctx.font);
    const fontSize = Math.round(style.fontSize * scaleFactor);

    // Calculate text dimensions
    let textWidth = metrics.width;
    let textHeight = fontSize;

    // Adjust position based on text alignment
    let drawX = x;
    if (style.textAlign === 'center') {
        drawX = x - textWidth / 2;
    } else if (style.textAlign === 'right') {
        drawX = x - textWidth;
    }

    // Draw background if specified
    if (style.backgroundColor) {
        const padding = 4 * scaleFactor;
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(
            drawX - padding,
            y - padding,
            textWidth + (padding * 2),
            textHeight + (padding * 2)
        );
    }

    // Draw text shadow if specified
    if (style.textShadow) {
        ctx.save();
        ctx.fillStyle = style.textShadow.color;
        ctx.filter = `blur(${style.textShadow.blur * scaleFactor}px)`;
        ctx.fillText(
            text,
            x + (style.textShadow.offsetX * scaleFactor),
            y + (style.textShadow.offsetY * scaleFactor)
        );
        ctx.restore();

        // Restore text style for main text
        applyTextStyle(ctx, style, scaleFactor);
    }

    // Draw border if specified
    if (style.borderColor && style.borderWidth && style.borderWidth > 0) {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = style.borderWidth * scaleFactor;
        ctx.strokeText(text, x, y);
    }

    // Draw main text
    ctx.fillStyle = style.color;
    ctx.fillText(text, x, y);

    ctx.restore();

    return {
        width: textWidth,
        height: textHeight,
        x: drawX,
        y: y
    };
};

// Render a single text overlay
export const renderTextOverlay = (
    ctx: CanvasRenderingContext2D,
    overlay: TextOverlay,
    videoWidth: number,
    videoHeight: number,
    currentTime: number,
    scaleFactor: number = 1
): { rendered: boolean; bounds?: { x: number; y: number; width: number; height: number } } => {
    // Check if overlay should be visible at current time
    if (currentTime < overlay.timing.start ||
        currentTime > overlay.timing.end ||
        overlay.visible === false) {
        return { rendered: false };
    }

    // Convert normalized position to pixel coordinates
    const pixelPosition = normalizedToPixels(overlay.position, videoWidth, videoHeight);

    // Draw the text overlay
    const bounds = drawStyledText(
        ctx,
        overlay.text,
        pixelPosition.x * scaleFactor,
        pixelPosition.y * scaleFactor,
        overlay.style,
        scaleFactor
    );

    return {
        rendered: true,
        bounds: {
            x: bounds.x / scaleFactor,
            y: bounds.y / scaleFactor,
            width: bounds.width / scaleFactor,
            height: bounds.height / scaleFactor
        }
    };
};

// Render all text overlays
export const renderTextOverlays = (
    ctx: CanvasRenderingContext2D,
    overlays: TextOverlay[],
    videoWidth: number,
    videoHeight: number,
    currentTime: number,
    scaleFactor: number = 1
): Array<{ overlay: TextOverlay; bounds: { x: number; y: number; width: number; height: number } }> => {
    const renderedOverlays: Array<{ overlay: TextOverlay; bounds: { x: number; y: number; width: number; height: number } }> = [];

    // Sort overlays by z-index
    const sortedOverlays = [...overlays].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    sortedOverlays.forEach(overlay => {
        const result = renderTextOverlay(ctx, overlay, videoWidth, videoHeight, currentTime, scaleFactor);
        if (result.rendered && result.bounds) {
            renderedOverlays.push({
                overlay,
                bounds: result.bounds
            });
        }
    });

    return renderedOverlays;
};

// Render subtitles with default styling
export const renderSubtitles = (
    ctx: CanvasRenderingContext2D,
    subtitles: SubtitleSegment[],
    videoWidth: number,
    videoHeight: number,
    currentTime: number,
    scaleFactor: number = 1
) => {
    const currentSubtitle = subtitles.find(
        sub => currentTime >= sub.start && currentTime <= sub.end
    );

    if (!currentSubtitle) return;

    ctx.save();

    // Default subtitle styling
    const fontSize = Math.max(16, videoWidth * 0.03) * scaleFactor;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2 * scaleFactor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Position at bottom center
    const x = (videoWidth / 2) * scaleFactor;
    const y = (videoHeight - 20) * scaleFactor;

    // Draw subtitle with outline
    ctx.strokeText(currentSubtitle.text, x, y);
    ctx.fillText(currentSubtitle.text, x, y);

    ctx.restore();
};

// Main rendering function
export const renderCanvasOverlays = (options: CanvasRenderingOptions, overlays: TextOverlay[], subtitles: SubtitleSegment[] = []) => {
    const { canvas, videoWidth, videoHeight, currentTime, devicePixelRatio = window.devicePixelRatio || 1 } = options;

    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Set up high-DPI canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;

    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Calculate scale factor for video to canvas
    const scaleX = displayWidth / videoWidth;
    const scaleY = displayHeight / videoHeight;
    const scaleFactor = Math.min(scaleX, scaleY);

    // Calculate video position within canvas (for letterboxing)
    const scaledVideoWidth = videoWidth * scaleFactor;
    const scaledVideoHeight = videoHeight * scaleFactor;
    const offsetX = (displayWidth - scaledVideoWidth) / 2;
    const offsetY = (displayHeight - scaledVideoHeight) / 2;

    // Set up coordinate system for video content
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Render text overlays
    const renderedOverlays = renderTextOverlays(ctx, overlays, videoWidth, videoHeight, currentTime, scaleFactor);

    // Render subtitles
    renderSubtitles(ctx, subtitles, videoWidth, videoHeight, currentTime, scaleFactor);

    ctx.restore();

    return renderedOverlays.map(item => ({
        ...item,
        bounds: {
            x: item.bounds.x * scaleFactor + offsetX,
            y: item.bounds.y * scaleFactor + offsetY,
            width: item.bounds.width * scaleFactor,
            height: item.bounds.height * scaleFactor
        }
    }));
};

// Utility function to check if a point is within overlay bounds
export const isPointInOverlayBounds = (
    point: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
): boolean => {
    return point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height;
};

// Utility function to find overlay at a specific point
export const findOverlayAtPoint = (
    point: { x: number; y: number },
    renderedOverlays: Array<{ overlay: TextOverlay; bounds: { x: number; y: number; width: number; height: number } }>
): TextOverlay | null => {
    // Search from highest z-index to lowest (reverse order)
    for (let i = renderedOverlays.length - 1; i >= 0; i--) {
        const item = renderedOverlays[i];
        if (isPointInOverlayBounds(point, item.bounds)) {
            return item.overlay;
        }
    }
    return null;
};