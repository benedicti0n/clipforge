// Custom hook for text overlay state management with CRUD operations

import { useState, useCallback, useMemo } from 'react';
import {
    TextOverlay,
    TextStyle,
    createTextOverlay,
    cloneTextOverlay,
    updateOverlayPosition,
    updateOverlayTiming,
    updateOverlayStyle,
    validateTextOverlays,
    getActiveOverlaysAtTime,
    isOverlayActiveAtTime
} from '../text-overlay';

export interface UseTextOverlaysOptions {
    videoDuration: number;
    videoWidth: number;
    videoHeight: number;
    onValidationChange?: (isValid: boolean, errors: Record<string, string[]>) => void;
}

export interface UseTextOverlaysReturn {
    // State
    overlays: TextOverlay[];
    selectedOverlayId: string | null;
    validationErrors: Record<string, string[]>;
    isValid: boolean;

    // CRUD operations
    addOverlay: (overlay?: Partial<TextOverlay>) => string;
    removeOverlay: (id: string) => void;
    updateOverlay: (id: string, updates: Partial<TextOverlay>) => void;
    duplicateOverlay: (id: string) => string | null;
    clearAllOverlays: () => void;

    // Selection management
    selectOverlay: (id: string | null) => void;
    getSelectedOverlay: () => TextOverlay | null;

    // Position and timing updates
    updateOverlayPosition: (id: string, position: { x: number; y: number }) => void;
    updateOverlayTiming: (id: string, timing: { start: number; end: number }) => void;
    updateOverlayStyle: (id: string, styleUpdates: Partial<TextStyle>) => void;
    updateOverlayText: (id: string, text: string) => void;
    updateOverlayVisibility: (id: string, visible: boolean) => void;
    updateOverlayZIndex: (id: string, zIndex: number) => void;

    // Query operations
    getOverlayById: (id: string) => TextOverlay | null;
    getActiveOverlaysAtTime: (time: number) => TextOverlay[];
    isOverlayActiveAtTime: (id: string, time: number) => boolean;
    getOverlayCount: () => number;
    hasOverlays: () => boolean;

    // Bulk operations
    moveOverlayUp: (id: string) => void;
    moveOverlayDown: (id: string) => void;
    reorderOverlays: (fromIndex: number, toIndex: number) => void;
}

export const useTextOverlays = ({
    videoDuration,
    videoWidth,
    videoHeight,
    onValidationChange
}: UseTextOverlaysOptions): UseTextOverlaysReturn => {
    const [overlays, setOverlays] = useState<TextOverlay[]>([]);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

    // Validation state
    const validationResult = useMemo(() => {
        return validateTextOverlays(overlays, videoDuration, videoWidth, videoHeight);
    }, [overlays, videoDuration, videoWidth, videoHeight]);

    // Notify parent of validation changes
    useMemo(() => {
        if (onValidationChange) {
            onValidationChange(validationResult.isValid, validationResult.overlayErrors);
        }
    }, [validationResult.isValid, validationResult.overlayErrors, onValidationChange]);

    // CRUD operations
    const addOverlay = useCallback((overlayData?: Partial<TextOverlay>): string => {
        const newOverlay = createTextOverlay(
            overlayData?.text,
            overlayData?.position,
            overlayData?.timing,
            overlayData?.style
        );

        // Apply any additional properties
        if (overlayData) {
            Object.assign(newOverlay, {
                ...overlayData,
                id: newOverlay.id, // Preserve generated ID
                position: overlayData.position || newOverlay.position,
                style: { ...newOverlay.style, ...overlayData.style },
                timing: overlayData.timing || newOverlay.timing
            });
        }

        setOverlays(prev => [...prev, newOverlay]);
        setSelectedOverlayId(newOverlay.id);

        return newOverlay.id;
    }, []);

    const removeOverlay = useCallback((id: string) => {
        setOverlays(prev => prev.filter(overlay => overlay.id !== id));
        setSelectedOverlayId(prev => prev === id ? null : prev);
    }, []);

    const updateOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
        setOverlays(prev => prev.map(overlay =>
            overlay.id === id
                ? {
                    ...overlay,
                    ...updates,
                    // Preserve nested objects
                    position: updates.position ? { ...overlay.position, ...updates.position } : overlay.position,
                    style: updates.style ? { ...overlay.style, ...updates.style } : overlay.style,
                    timing: updates.timing ? { ...overlay.timing, ...updates.timing } : overlay.timing
                }
                : overlay
        ));
    }, []);

    const duplicateOverlay = useCallback((id: string): string | null => {
        const overlay = overlays.find(o => o.id === id);
        if (!overlay) return null;

        const duplicated = cloneTextOverlay(overlay);
        // Offset position slightly to avoid exact overlap
        duplicated.position = {
            x: Math.min(1, overlay.position.x + 0.05),
            y: Math.min(1, overlay.position.y + 0.05)
        };
        duplicated.text = `${overlay.text} (Copy)`;

        setOverlays(prev => [...prev, duplicated]);
        setSelectedOverlayId(duplicated.id);

        return duplicated.id;
    }, [overlays]);

    const clearAllOverlays = useCallback(() => {
        setOverlays([]);
        setSelectedOverlayId(null);
    }, []);

    // Selection management
    const selectOverlay = useCallback((id: string | null) => {
        setSelectedOverlayId(id);
    }, []);

    const getSelectedOverlay = useCallback((): TextOverlay | null => {
        if (!selectedOverlayId) return null;
        return overlays.find(overlay => overlay.id === selectedOverlayId) || null;
    }, [overlays, selectedOverlayId]);

    // Specific update operations
    const updateOverlayPositionCallback = useCallback((id: string, position: { x: number; y: number }) => {
        setOverlays(prev => prev.map(overlay =>
            overlay.id === id ? updateOverlayPosition(overlay, position) : overlay
        ));
    }, []);

    const updateOverlayTimingCallback = useCallback((id: string, timing: { start: number; end: number }) => {
        setOverlays(prev => prev.map(overlay =>
            overlay.id === id ? updateOverlayTiming(overlay, timing) : overlay
        ));
    }, []);

    const updateOverlayStyleCallback = useCallback((id: string, styleUpdates: Partial<TextStyle>) => {
        setOverlays(prev => prev.map(overlay =>
            overlay.id === id ? updateOverlayStyle(overlay, styleUpdates) : overlay
        ));
    }, []);

    const updateOverlayText = useCallback((id: string, text: string) => {
        updateOverlay(id, { text });
    }, [updateOverlay]);

    const updateOverlayVisibility = useCallback((id: string, visible: boolean) => {
        updateOverlay(id, { visible });
    }, [updateOverlay]);

    const updateOverlayZIndex = useCallback((id: string, zIndex: number) => {
        updateOverlay(id, { zIndex });
    }, [updateOverlay]);

    // Query operations
    const getOverlayById = useCallback((id: string): TextOverlay | null => {
        return overlays.find(overlay => overlay.id === id) || null;
    }, [overlays]);

    const getActiveOverlaysAtTimeCallback = useCallback((time: number): TextOverlay[] => {
        return getActiveOverlaysAtTime(overlays, time);
    }, [overlays]);

    const isOverlayActiveAtTimeCallback = useCallback((id: string, time: number): boolean => {
        const overlay = getOverlayById(id);
        return overlay ? isOverlayActiveAtTime(overlay, time) : false;
    }, [getOverlayById]);

    const getOverlayCount = useCallback((): number => {
        return overlays.length;
    }, [overlays]);

    const hasOverlays = useCallback((): boolean => {
        return overlays.length > 0;
    }, [overlays]);

    // Bulk operations
    const moveOverlayUp = useCallback((id: string) => {
        setOverlays(prev => {
            const index = prev.findIndex(overlay => overlay.id === id);
            if (index <= 0) return prev;

            const newOverlays = [...prev];
            [newOverlays[index - 1], newOverlays[index]] = [newOverlays[index], newOverlays[index - 1]];
            return newOverlays;
        });
    }, []);

    const moveOverlayDown = useCallback((id: string) => {
        setOverlays(prev => {
            const index = prev.findIndex(overlay => overlay.id === id);
            if (index < 0 || index >= prev.length - 1) return prev;

            const newOverlays = [...prev];
            [newOverlays[index], newOverlays[index + 1]] = [newOverlays[index + 1], newOverlays[index]];
            return newOverlays;
        });
    }, []);

    const reorderOverlays = useCallback((fromIndex: number, toIndex: number) => {
        setOverlays(prev => {
            if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
                return prev;
            }

            const newOverlays = [...prev];
            const [movedOverlay] = newOverlays.splice(fromIndex, 1);
            newOverlays.splice(toIndex, 0, movedOverlay);
            return newOverlays;
        });
    }, []);

    return {
        // State
        overlays,
        selectedOverlayId,
        validationErrors: validationResult.overlayErrors,
        isValid: validationResult.isValid,

        // CRUD operations
        addOverlay,
        removeOverlay,
        updateOverlay,
        duplicateOverlay,
        clearAllOverlays,

        // Selection management
        selectOverlay,
        getSelectedOverlay,

        // Position and timing updates
        updateOverlayPosition: updateOverlayPositionCallback,
        updateOverlayTiming: updateOverlayTimingCallback,
        updateOverlayStyle: updateOverlayStyleCallback,
        updateOverlayText,
        updateOverlayVisibility,
        updateOverlayZIndex,

        // Query operations
        getOverlayById,
        getActiveOverlaysAtTime: getActiveOverlaysAtTimeCallback,
        isOverlayActiveAtTime: isOverlayActiveAtTimeCallback,
        getOverlayCount,
        hasOverlays,

        // Bulk operations
        moveOverlayUp,
        moveOverlayDown,
        reorderOverlays
    };
};