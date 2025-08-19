// Text overlay data models and validation utilities

export interface TextStyle {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
    textShadow?: {
        offsetX: number;
        offsetY: number;
        blur: number;
        color: string;
    };
}

export interface TextOverlay {
    id: string;
    text: string;
    position: { x: number; y: number };
    style: TextStyle;
    timing: { start: number; end: number };
    zIndex?: number;
    visible?: boolean;
}

export interface TextOverlayValidationResult {
    isValid: boolean;
    errors: string[];
}

// Default text style
export const DEFAULT_TEXT_STYLE: TextStyle = {
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#000000',
    borderWidth: 0,
    opacity: 1,
    fontWeight: 'bold',
    fontStyle: 'normal',
    textAlign: 'center',
    textShadow: {
        offsetX: 1,
        offsetY: 1,
        blur: 2,
        color: 'rgba(0, 0, 0, 0.8)'
    }
};

// Text overlay validation functions
export const validateTextOverlay = (overlay: TextOverlay, videoDuration: number, videoWidth: number, videoHeight: number): TextOverlayValidationResult => {
    const errors: string[] = [];

    // Validate text content
    if (!overlay.text || overlay.text.trim().length === 0) {
        errors.push('Text content cannot be empty');
    }

    if (overlay.text && overlay.text.length > 500) {
        errors.push('Text content cannot exceed 500 characters');
    }

    // Validate timing
    if (overlay.timing.start < 0) {
        errors.push('Start time cannot be negative');
    }

    if (overlay.timing.end > videoDuration) {
        errors.push('End time cannot exceed video duration');
    }

    if (overlay.timing.start >= overlay.timing.end) {
        errors.push('Start time must be less than end time');
    }

    if (overlay.timing.end - overlay.timing.start < 0.1) {
        errors.push('Minimum overlay duration is 0.1 seconds');
    }

    // Validate position (normalized coordinates 0-1)
    if (overlay.position.x < 0 || overlay.position.x > 1) {
        errors.push('X position must be between 0 and 1');
    }

    if (overlay.position.y < 0 || overlay.position.y > 1) {
        errors.push('Y position must be between 0 and 1');
    }

    // Validate style properties
    if (overlay.style.fontSize <= 0 || overlay.style.fontSize > 200) {
        errors.push('Font size must be between 1 and 200 pixels');
    }

    if (overlay.style.opacity !== undefined && (overlay.style.opacity < 0 || overlay.style.opacity > 1)) {
        errors.push('Opacity must be between 0 and 1');
    }

    if (overlay.style.borderWidth !== undefined && (overlay.style.borderWidth < 0 || overlay.style.borderWidth > 20)) {
        errors.push('Border width must be between 0 and 20 pixels');
    }

    // Validate color formats (basic hex color validation)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbaRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/;

    if (!colorRegex.test(overlay.style.color) && !rgbaRegex.test(overlay.style.color)) {
        errors.push('Text color must be a valid hex color or rgba value');
    }

    if (overlay.style.backgroundColor &&
        !colorRegex.test(overlay.style.backgroundColor) &&
        !rgbaRegex.test(overlay.style.backgroundColor)) {
        errors.push('Background color must be a valid hex color or rgba value');
    }

    if (overlay.style.borderColor &&
        !colorRegex.test(overlay.style.borderColor) &&
        !rgbaRegex.test(overlay.style.borderColor)) {
        errors.push('Border color must be a valid hex color or rgba value');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Utility function to create a new text overlay with default values
export const createTextOverlay = (
    text: string = 'New Text Overlay',
    position: { x: number; y: number } = { x: 0.5, y: 0.5 },
    timing: { start: number; end: number } = { start: 0, end: 5 },
    style: Partial<TextStyle> = {}
): TextOverlay => {
    return {
        id: `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        position,
        style: { ...DEFAULT_TEXT_STYLE, ...style },
        timing,
        zIndex: 1,
        visible: true
    };
};

// Utility function to clone a text overlay
export const cloneTextOverlay = (overlay: TextOverlay): TextOverlay => {
    return {
        ...overlay,
        id: `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: { ...overlay.position },
        style: { ...overlay.style },
        timing: { ...overlay.timing }
    };
};

// Utility function to update text overlay position
export const updateOverlayPosition = (overlay: TextOverlay, newPosition: { x: number; y: number }): TextOverlay => {
    return {
        ...overlay,
        position: { ...newPosition }
    };
};

// Utility function to update text overlay timing
export const updateOverlayTiming = (overlay: TextOverlay, newTiming: { start: number; end: number }): TextOverlay => {
    return {
        ...overlay,
        timing: { ...newTiming }
    };
};

// Utility function to update text overlay style
export const updateOverlayStyle = (overlay: TextOverlay, styleUpdates: Partial<TextStyle>): TextOverlay => {
    return {
        ...overlay,
        style: { ...overlay.style, ...styleUpdates }
    };
};

// Utility function to check if overlay is active at a given time
export const isOverlayActiveAtTime = (overlay: TextOverlay, time: number): boolean => {
    return time >= overlay.timing.start && time <= overlay.timing.end && overlay.visible !== false;
};

// Utility function to get active overlays at a specific time
export const getActiveOverlaysAtTime = (overlays: TextOverlay[], time: number): TextOverlay[] => {
    return overlays
        .filter(overlay => isOverlayActiveAtTime(overlay, time))
        .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
};

// Utility function to validate multiple overlays
export const validateTextOverlays = (
    overlays: TextOverlay[],
    videoDuration: number,
    videoWidth: number,
    videoHeight: number
): { isValid: boolean; overlayErrors: Record<string, string[]> } => {
    const overlayErrors: Record<string, string[]> = {};
    let isValid = true;

    overlays.forEach(overlay => {
        const validation = validateTextOverlay(overlay, videoDuration, videoWidth, videoHeight);
        if (!validation.isValid) {
            overlayErrors[overlay.id] = validation.errors;
            isValid = false;
        }
    });

    return { isValid, overlayErrors };
};

// Utility function to convert position from pixels to normalized coordinates
export const pixelsToNormalized = (
    pixelPosition: { x: number; y: number },
    videoWidth: number,
    videoHeight: number
): { x: number; y: number } => {
    return {
        x: Math.max(0, Math.min(1, pixelPosition.x / videoWidth)),
        y: Math.max(0, Math.min(1, pixelPosition.y / videoHeight))
    };
};

// Utility function to convert position from normalized coordinates to pixels
export const normalizedToPixels = (
    normalizedPosition: { x: number; y: number },
    videoWidth: number,
    videoHeight: number
): { x: number; y: number } => {
    return {
        x: normalizedPosition.x * videoWidth,
        y: normalizedPosition.y * videoHeight
    };
};