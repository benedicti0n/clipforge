import { renderHook, act } from '@testing-library/react';
import { useTextOverlays } from '../useTextOverlays';
import { createTextOverlay } from '../../text-overlay';

describe('useTextOverlays Hook', () => {
    const mockOptions = {
        videoDuration: 120,
        videoWidth: 1920,
        videoHeight: 1080
    };

    describe('initialization', () => {
        it('should initialize with empty state', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            expect(result.current.overlays).toEqual([]);
            expect(result.current.selectedOverlayId).toBeNull();
            expect(result.current.validationErrors).toEqual({});
            expect(result.current.isValid).toBe(true);
            expect(result.current.getOverlayCount()).toBe(0);
            expect(result.current.hasOverlays()).toBe(false);
        });

        it('should call onValidationChange when provided', () => {
            const onValidationChange = jest.fn();
            const options = { ...mockOptions, onValidationChange };

            renderHook(() => useTextOverlays(options));

            expect(onValidationChange).toHaveBeenCalledWith(true, {});
        });
    });

    describe('CRUD operations', () => {
        describe('addOverlay', () => {
            it('should add a new overlay with default values', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let overlayId: string;
                act(() => {
                    overlayId = result.current.addOverlay();
                });

                expect(result.current.overlays).toHaveLength(1);
                expect(result.current.selectedOverlayId).toBe(overlayId!);
                expect(result.current.getOverlayCount()).toBe(1);
                expect(result.current.hasOverlays()).toBe(true);

                const overlay = result.current.overlays[0];
                expect(overlay.text).toBe('New Text Overlay');
                expect(overlay.position).toEqual({ x: 0.5, y: 0.5 });
            });

            it('should add a new overlay with custom values', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                const customOverlay = {
                    text: 'Custom Text',
                    position: { x: 0.2, y: 0.8 },
                    timing: { start: 10, end: 20 },
                    style: { fontSize: 32, color: '#ff0000' }
                };

                act(() => {
                    result.current.addOverlay(customOverlay);
                });

                const overlay = result.current.overlays[0];
                expect(overlay.text).toBe('Custom Text');
                expect(overlay.position).toEqual({ x: 0.2, y: 0.8 });
                expect(overlay.timing).toEqual({ start: 10, end: 20 });
                expect(overlay.style.fontSize).toBe(32);
                expect(overlay.style.color).toBe('#ff0000');
            });
        });

        describe('removeOverlay', () => {
            it('should remove an overlay by id', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let overlayId: string;
                act(() => {
                    overlayId = result.current.addOverlay();
                });

                expect(result.current.overlays).toHaveLength(1);

                act(() => {
                    result.current.removeOverlay(overlayId!);
                });

                expect(result.current.overlays).toHaveLength(0);
                expect(result.current.selectedOverlayId).toBeNull();
            });

            it('should clear selection if removed overlay was selected', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let overlayId: string;
                act(() => {
                    overlayId = result.current.addOverlay();
                });

                expect(result.current.selectedOverlayId).toBe(overlayId!);

                act(() => {
                    result.current.removeOverlay(overlayId!);
                });

                expect(result.current.selectedOverlayId).toBeNull();
            });
        });

        describe('updateOverlay', () => {
            it('should update overlay properties', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let overlayId: string;
                act(() => {
                    overlayId = result.current.addOverlay();
                });

                act(() => {
                    result.current.updateOverlay(overlayId!, {
                        text: 'Updated Text',
                        position: { x: 0.8, y: 0.2 }
                    });
                });

                const overlay = result.current.overlays[0];
                expect(overlay.text).toBe('Updated Text');
                expect(overlay.position).toEqual({ x: 0.8, y: 0.2 });
            });

            it('should preserve nested object properties when updating', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let overlayId: string;
                act(() => {
                    overlayId = result.current.addOverlay();
                });

                const originalStyle = result.current.overlays[0].style;

                act(() => {
                    result.current.updateOverlay(overlayId!, {
                        style: { fontSize: 48 }
                    });
                });

                const overlay = result.current.overlays[0];
                expect(overlay.style.fontSize).toBe(48);
                expect(overlay.style.color).toBe(originalStyle.color); // Preserved
                expect(overlay.style.fontFamily).toBe(originalStyle.fontFamily); // Preserved
            });
        });

        describe('duplicateOverlay', () => {
            it('should create a duplicate with a new id and offset position', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let originalId: string;
                act(() => {
                    originalId = result.current.addOverlay({ text: 'Original' });
                });

                let duplicateId: string | null;
                act(() => {
                    duplicateId = result.current.duplicateOverlay(originalId!);
                });

                expect(duplicateId).not.toBeNull();
                expect(result.current.overlays).toHaveLength(2);
                expect(result.current.selectedOverlayId).toBe(duplicateId);

                const original = result.current.getOverlayById(originalId!);
                const duplicate = result.current.getOverlayById(duplicateId!);

                expect(duplicate!.id).not.toBe(original!.id);
                expect(duplicate!.text).toBe('Original (Copy)');
                expect(duplicate!.position.x).toBe(0.55); // 0.5 + 0.05 offset
                expect(duplicate!.position.y).toBe(0.55); // 0.5 + 0.05 offset
            });

            it('should return null for non-existent overlay', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                let duplicateId: string | null;
                act(() => {
                    duplicateId = result.current.duplicateOverlay('non-existent-id');
                });

                expect(duplicateId).toBeNull();
            });
        });

        describe('clearAllOverlays', () => {
            it('should remove all overlays and clear selection', () => {
                const { result } = renderHook(() => useTextOverlays(mockOptions));

                act(() => {
                    result.current.addOverlay();
                    result.current.addOverlay();
                    result.current.addOverlay();
                });

                expect(result.current.overlays).toHaveLength(3);

                act(() => {
                    result.current.clearAllOverlays();
                });

                expect(result.current.overlays).toHaveLength(0);
                expect(result.current.selectedOverlayId).toBeNull();
            });
        });
    });

    describe('selection management', () => {
        it('should select and get selected overlay', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            let overlayId: string;
            act(() => {
                overlayId = result.current.addOverlay({ text: 'Test Overlay' });
            });

            expect(result.current.selectedOverlayId).toBe(overlayId!);

            const selectedOverlay = result.current.getSelectedOverlay();
            expect(selectedOverlay).not.toBeNull();
            expect(selectedOverlay!.text).toBe('Test Overlay');

            act(() => {
                result.current.selectOverlay(null);
            });

            expect(result.current.selectedOverlayId).toBeNull();
            expect(result.current.getSelectedOverlay()).toBeNull();
        });
    });

    describe('specific update operations', () => {
        let overlayId: string;

        beforeEach(() => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));
            act(() => {
                overlayId = result.current.addOverlay();
            });
        });

        it('should update overlay position', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            const newPosition = { x: 0.8, y: 0.2 };
            act(() => {
                result.current.updateOverlayPosition(overlayId, newPosition);
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.position).toEqual(newPosition);
        });

        it('should update overlay timing', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            const newTiming = { start: 15, end: 25 };
            act(() => {
                result.current.updateOverlayTiming(overlayId, newTiming);
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.timing).toEqual(newTiming);
        });

        it('should update overlay style', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            const styleUpdates = { fontSize: 48, color: '#ff0000' };
            act(() => {
                result.current.updateOverlayStyle(overlayId, styleUpdates);
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.style.fontSize).toBe(48);
            expect(overlay!.style.color).toBe('#ff0000');
        });

        it('should update overlay text', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            act(() => {
                result.current.updateOverlayText(overlayId, 'Updated Text');
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.text).toBe('Updated Text');
        });

        it('should update overlay visibility', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            act(() => {
                result.current.updateOverlayVisibility(overlayId, false);
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.visible).toBe(false);
        });

        it('should update overlay z-index', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                overlayId = result.current.addOverlay();
            });

            act(() => {
                result.current.updateOverlayZIndex(overlayId, 5);
            });

            const overlay = result.current.getOverlayById(overlayId);
            expect(overlay!.zIndex).toBe(5);
        });
    });

    describe('query operations', () => {
        it('should get active overlays at specific time', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            let overlay1Id: string, overlay2Id: string, overlay3Id: string;

            act(() => {
                overlay1Id = result.current.addOverlay({
                    text: 'Overlay 1',
                    timing: { start: 5, end: 15 }
                });
                overlay2Id = result.current.addOverlay({
                    text: 'Overlay 2',
                    timing: { start: 10, end: 25 }
                });
                overlay3Id = result.current.addOverlay({
                    text: 'Overlay 3',
                    timing: { start: 20, end: 30 }
                });
            });

            const activeAt12 = result.current.getActiveOverlaysAtTime(12);
            expect(activeAt12).toHaveLength(2);
            expect(activeAt12.map(o => o.text)).toContain('Overlay 1');
            expect(activeAt12.map(o => o.text)).toContain('Overlay 2');

            const activeAt22 = result.current.getActiveOverlaysAtTime(22);
            expect(activeAt22).toHaveLength(2);
            expect(activeAt22.map(o => o.text)).toContain('Overlay 2');
            expect(activeAt22.map(o => o.text)).toContain('Overlay 3');
        });

        it('should check if overlay is active at specific time', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            let overlayId: string;
            act(() => {
                overlayId = result.current.addOverlay({
                    timing: { start: 10, end: 20 }
                });
            });

            expect(result.current.isOverlayActiveAtTime(overlayId!, 15)).toBe(true);
            expect(result.current.isOverlayActiveAtTime(overlayId!, 5)).toBe(false);
            expect(result.current.isOverlayActiveAtTime(overlayId!, 25)).toBe(false);
        });
    });

    describe('bulk operations', () => {
        it('should move overlay up in the list', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            let overlay1Id: string, overlay2Id: string;
            act(() => {
                overlay1Id = result.current.addOverlay({ text: 'First' });
                overlay2Id = result.current.addOverlay({ text: 'Second' });
            });

            expect(result.current.overlays[0].text).toBe('First');
            expect(result.current.overlays[1].text).toBe('Second');

            act(() => {
                result.current.moveOverlayUp(overlay2Id!);
            });

            expect(result.current.overlays[0].text).toBe('Second');
            expect(result.current.overlays[1].text).toBe('First');
        });

        it('should move overlay down in the list', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            let overlay1Id: string, overlay2Id: string;
            act(() => {
                overlay1Id = result.current.addOverlay({ text: 'First' });
                overlay2Id = result.current.addOverlay({ text: 'Second' });
            });

            expect(result.current.overlays[0].text).toBe('First');
            expect(result.current.overlays[1].text).toBe('Second');

            act(() => {
                result.current.moveOverlayDown(overlay1Id!);
            });

            expect(result.current.overlays[0].text).toBe('Second');
            expect(result.current.overlays[1].text).toBe('First');
        });

        it('should reorder overlays', () => {
            const { result } = renderHook(() => useTextOverlays(mockOptions));

            act(() => {
                result.current.addOverlay({ text: 'First' });
                result.current.addOverlay({ text: 'Second' });
                result.current.addOverlay({ text: 'Third' });
            });

            expect(result.current.overlays.map(o => o.text)).toEqual(['First', 'Second', 'Third']);

            act(() => {
                result.current.reorderOverlays(0, 2); // Move first to third position
            });

            expect(result.current.overlays.map(o => o.text)).toEqual(['Second', 'Third', 'First']);
        });
    });

    describe('validation', () => {
        it('should validate overlays and update validation state', () => {
            const onValidationChange = jest.fn();
            const options = { ...mockOptions, onValidationChange };
            const { result } = renderHook(() => useTextOverlays(options));

            // Add valid overlay
            act(() => {
                result.current.addOverlay({ text: 'Valid Text' });
            });

            expect(result.current.isValid).toBe(true);
            expect(Object.keys(result.current.validationErrors)).toHaveLength(0);

            // Add invalid overlay
            let invalidId: string;
            act(() => {
                invalidId = result.current.addOverlay({
                    text: '', // Invalid: empty text
                    timing: { start: 20, end: 10 } // Invalid: start > end
                });
            });

            expect(result.current.isValid).toBe(false);
            expect(result.current.validationErrors[invalidId!]).toBeDefined();
            expect(result.current.validationErrors[invalidId!]).toContain('Text content cannot be empty');
            expect(result.current.validationErrors[invalidId!]).toContain('Start time must be less than end time');

            // Validation change callback should be called
            expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Object));
        });
    });
});