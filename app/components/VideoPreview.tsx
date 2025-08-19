"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
    renderCanvasOverlays,
    findOverlayAtPoint,
    clearTextMeasurementCache
} from "../../lib/canvas-overlay-renderer";
import { TextOverlay, pixelsToNormalized } from "../../lib/text-overlay";
import PreviewControls from "./PreviewControls";

interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    format: string;
}

// TextOverlay interface is now imported from the dedicated module

interface SubtitleSegment {
    start: number;
    end: number;
    text: string;
    confidence?: number;
}

interface PreviewQualitySettings {
    renderQuality: 'low' | 'medium' | 'high';
    updateFrequency: number; // milliseconds between updates
    enableSubtitles: boolean;
    enableTextOverlays: boolean;
    enablePerformanceMode: boolean;
}

interface VideoPreviewProps {
    videoUrl: string;
    metadata: VideoMetadata;
    trimBounds: { start: number; end: number };
    textOverlays?: TextOverlay[];
    subtitles?: SubtitleSegment[];
    currentTime?: number;
    onTimeUpdate?: (time: number) => void;
    onLoadedMetadata?: (metadata: VideoMetadata) => void;
    onOverlayPositionChange?: (overlayId: string, position: { x: number; y: number }) => void;
    onOverlaySelect?: (overlayId: string | null) => void;
    selectedOverlayId?: string | null;
    qualitySettings?: PreviewQualitySettings;
    isPlaying?: boolean;
    onPlayStateChange?: (isPlaying: boolean) => void;
    showAdvancedControls?: boolean;
}

export default function VideoPreview({
    videoUrl,
    metadata,
    trimBounds,
    textOverlays = [],
    subtitles = [],
    currentTime = 0,
    onTimeUpdate,
    onLoadedMetadata,
    onOverlayPositionChange,
    onOverlaySelect,
    selectedOverlayId,
    qualitySettings = {
        renderQuality: 'high',
        updateFrequency: 16, // ~60fps
        enableSubtitles: true,
        enableTextOverlays: true,
        enablePerformanceMode: false
    },
    isPlaying: externalIsPlaying,
    onPlayStateChange,
    showAdvancedControls = true
}: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastRenderTimeRef = useRef<number>(0);
    const performanceMetricsRef = useRef({
        frameCount: 0,
        lastFpsUpdate: 0,
        currentFps: 0,
        renderTime: 0
    });

    const [isPlaying, setIsPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [performanceStats, setPerformanceStats] = useState({
        fps: 0,
        renderTime: 0,
        overlayCount: 0
    });

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOverlayId, setDraggedOverlayId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [renderedOverlays, setRenderedOverlays] = useState<Array<{ overlay: TextOverlay; bounds: { x: number; y: number; width: number; height: number } }>>([]);

    // Multi-layer preview state
    const [layerVisibility, setLayerVisibility] = useState({
        video: true,
        subtitles: true,
        textOverlays: true
    });

    // Sync external playing state
    useEffect(() => {
        if (externalIsPlaying !== undefined && externalIsPlaying !== isPlaying) {
            setIsPlaying(externalIsPlaying);
            if (videoRef.current) {
                if (externalIsPlaying) {
                    videoRef.current.play().catch(err => {
                        setError('Failed to play video');
                        console.error('Video play error:', err);
                    });
                } else {
                    videoRef.current.pause();
                }
            }
        }
    }, [externalIsPlaying, isPlaying]);

    // Update video time when currentTime prop changes
    useEffect(() => {
        if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime]);

    // Handle video time updates
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            setVideoCurrentTime(time);
            onTimeUpdate?.(time);

            // Auto-pause at trim end boundary
            if (time >= trimBounds.end) {
                videoRef.current.pause();
                setIsPlaying(false);
                onPlayStateChange?.(false);
            }
        }
    }, [trimBounds.end, onTimeUpdate, onPlayStateChange]);

    // Handle video metadata loaded
    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            const video = videoRef.current;
            const extractedMetadata: VideoMetadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                format: metadata.format || 'mp4'
            };
            onLoadedMetadata?.(extractedMetadata);
        }
    }, [metadata.format, onLoadedMetadata]);

    // Memoized filtered overlays and subtitles for performance
    const activeOverlays = useMemo(() => {
        if (!currentQualitySettings.enableTextOverlays || !layerVisibility.textOverlays) return [];
        return textOverlays.filter(overlay =>
            overlay.visible !== false &&
            videoCurrentTime >= overlay.timing.start &&
            videoCurrentTime <= overlay.timing.end
        );
    }, [textOverlays, videoCurrentTime, currentQualitySettings.enableTextOverlays, layerVisibility.textOverlays]);

    const activeSubtitles = useMemo(() => {
        if (!currentQualitySettings.enableSubtitles || !layerVisibility.subtitles) return [];
        return subtitles.filter(subtitle =>
            videoCurrentTime >= subtitle.start &&
            videoCurrentTime <= subtitle.end
        );
    }, [subtitles, videoCurrentTime, currentQualitySettings.enableSubtitles, layerVisibility.subtitles]);

    // Enhanced multi-layer rendering with performance optimizations
    const renderMultiLayerPreview = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;

        const startTime = performance.now();
        const currentVideoTime = video.currentTime;

        // Performance optimization: skip rendering if not enough time has passed
        if (currentQualitySettings.enablePerformanceMode &&
            startTime - lastRenderTimeRef.current < currentQualitySettings.updateFrequency) {
            return;
        }

        // Get device pixel ratio for high-DPI displays
        const devicePixelRatio = currentQualitySettings.renderQuality === 'low' ? 1 :
            currentQualitySettings.renderQuality === 'medium' ? Math.min(window.devicePixelRatio || 1, 2) :
                window.devicePixelRatio || 1;

        // Use the enhanced canvas rendering system with filtered data
        const rendered = renderCanvasOverlays(
            {
                canvas,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                currentTime: currentVideoTime,
                devicePixelRatio
            },
            activeOverlays,
            activeSubtitles
        );

        setRenderedOverlays(rendered);

        // Update performance metrics
        const renderTime = performance.now() - startTime;
        performanceMetricsRef.current.renderTime = renderTime;
        performanceMetricsRef.current.frameCount++;

        // Update FPS counter every second
        if (startTime - performanceMetricsRef.current.lastFpsUpdate > 1000) {
            const fps = performanceMetricsRef.current.frameCount;
            performanceMetricsRef.current.currentFps = fps;
            performanceMetricsRef.current.frameCount = 0;
            performanceMetricsRef.current.lastFpsUpdate = startTime;

            setPerformanceStats({
                fps,
                renderTime: Math.round(renderTime * 100) / 100,
                overlayCount: activeOverlays.length + activeSubtitles.length
            });
        }

        lastRenderTimeRef.current = startTime;
    }, [activeOverlays, activeSubtitles, currentQualitySettings]);

    // Animation frame loop for smooth rendering
    const startRenderLoop = useCallback(() => {
        const renderFrame = () => {
            renderMultiLayerPreview();
            if (isPlaying || isDragging) {
                animationFrameRef.current = requestAnimationFrame(renderFrame);
            }
        };

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(renderFrame);
    }, [renderMultiLayerPreview, isPlaying, isDragging]);

    const stopRenderLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    // Start/stop render loop based on playing state
    useEffect(() => {
        if (isPlaying || isDragging) {
            startRenderLoop();
        } else {
            stopRenderLoop();
            // Render one final frame when stopped
            renderMultiLayerPreview();
        }

        return () => stopRenderLoop();
    }, [isPlaying, isDragging, startRenderLoop, stopRenderLoop, renderMultiLayerPreview]);

    // Update canvas overlays when dependencies change (for static rendering)
    useEffect(() => {
        if (!isPlaying && !isDragging) {
            renderMultiLayerPreview();
        }
    }, [videoCurrentTime, activeOverlays, activeSubtitles, renderMultiLayerPreview, isPlaying, isDragging]);

    // Mouse event handlers for drag and drop
    const getMousePosition = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }, []);

    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const mousePos = getMousePosition(event);
        const clickedOverlay = findOverlayAtPoint(mousePos, renderedOverlays);

        if (clickedOverlay) {
            setIsDragging(true);
            setDraggedOverlayId(clickedOverlay.id);

            // Calculate offset from overlay position to mouse position
            const overlayBounds = renderedOverlays.find(r => r.overlay.id === clickedOverlay.id)?.bounds;
            if (overlayBounds) {
                setDragOffset({
                    x: mousePos.x - overlayBounds.x,
                    y: mousePos.y - overlayBounds.y
                });
            }

            // Select the overlay
            onOverlaySelect?.(clickedOverlay.id);

            event.preventDefault();
        } else {
            // Clicked on empty area, deselect
            onOverlaySelect?.(null);
        }
    }, [renderedOverlays, getMousePosition, onOverlaySelect]);

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !draggedOverlayId || !videoRef.current) return;

        const mousePos = getMousePosition(event);
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Calculate new position accounting for drag offset
        const newCanvasX = mousePos.x - dragOffset.x;
        const newCanvasY = mousePos.y - dragOffset.y;

        // Convert canvas coordinates to video coordinates
        const video = videoRef.current;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        const scaleX = displayWidth / video.videoWidth;
        const scaleY = displayHeight / video.videoHeight;
        const scaleFactor = Math.min(scaleX, scaleY);

        const scaledVideoWidth = video.videoWidth * scaleFactor;
        const scaledVideoHeight = video.videoHeight * scaleFactor;
        const offsetX = (displayWidth - scaledVideoWidth) / 2;
        const offsetY = (displayHeight - scaledVideoHeight) / 2;

        // Convert to video coordinates
        const videoX = (newCanvasX - offsetX) / scaleFactor;
        const videoY = (newCanvasY - offsetY) / scaleFactor;

        // Convert to normalized coordinates
        const normalizedPosition = pixelsToNormalized(
            { x: videoX, y: videoY },
            video.videoWidth,
            video.videoHeight
        );

        // Update overlay position
        onOverlayPositionChange?.(draggedOverlayId, normalizedPosition);

        event.preventDefault();
    }, [isDragging, draggedOverlayId, dragOffset, getMousePosition, onOverlayPositionChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDraggedOverlayId(null);
        setDragOffset({ x: 0, y: 0 });
    }, []);

    // Add global mouse up listener for drag operations
    useEffect(() => {
        if (isDragging) {
            const handleGlobalMouseUp = () => handleMouseUp();
            document.addEventListener('mouseup', handleGlobalMouseUp);
            return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }, [isDragging, handleMouseUp]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle shortcuts when the video container is focused or no input is focused
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            );

            if (isInputFocused) return;

            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    togglePlayPause();
                    break;
                case 'KeyK':
                    event.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    if (videoRef.current) {
                        const newTime = Math.max(trimBounds.start, videoRef.current.currentTime - 5);
                        videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (videoRef.current) {
                        const newTime = Math.min(trimBounds.end, videoRef.current.currentTime + 5);
                        videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'Comma':
                    event.preventDefault();
                    if (videoRef.current) {
                        const newTime = Math.max(trimBounds.start, videoRef.current.currentTime - 0.1);
                        videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'Period':
                    event.preventDefault();
                    if (videoRef.current) {
                        const newTime = Math.min(trimBounds.end, videoRef.current.currentTime + 0.1);
                        videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'Home':
                    event.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime = trimBounds.start;
                    }
                    break;
                case 'End':
                    event.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime = trimBounds.end;
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause, trimBounds]);

    // Set up canvas dimensions and clear cache when metadata changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Clear text measurement cache when video changes
            clearTextMeasurementCache();
        }
    }, [metadata]);

    const togglePlayPause = useCallback(() => {
        if (videoRef.current) {
            const newPlayingState = !isPlaying;

            if (newPlayingState) {
                // Ensure we start from trim start if at the beginning
                if (videoRef.current.currentTime < trimBounds.start) {
                    videoRef.current.currentTime = trimBounds.start;
                }
                videoRef.current.play().catch(err => {
                    setError('Failed to play video');
                    console.error('Video play error:', err);
                });
            } else {
                videoRef.current.pause();
            }

            setIsPlaying(newPlayingState);
            onPlayStateChange?.(newPlayingState);
        }
    }, [isPlaying, trimBounds.start, onPlayStateChange]);

    // Layer visibility toggle functions
    const toggleLayerVisibility = useCallback((layer: keyof typeof layerVisibility) => {
        setLayerVisibility(prev => ({
            ...prev,
            [layer]: !prev[layer]
        }));
    }, []);

    // Enhanced navigation functions
    const goToStart = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = trimBounds.start;
        }
    }, [trimBounds.start]);

    const goToEnd = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = trimBounds.end;
        }
    }, [trimBounds.end]);

    const skipBackward = useCallback((seconds: number) => {
        if (videoRef.current) {
            const newTime = Math.max(trimBounds.start, videoRef.current.currentTime - seconds);
            videoRef.current.currentTime = newTime;
        }
    }, [trimBounds.start]);

    const skipForward = useCallback((seconds: number) => {
        if (videoRef.current) {
            const newTime = Math.min(trimBounds.end, videoRef.current.currentTime + seconds);
            videoRef.current.currentTime = newTime;
        }
    }, [trimBounds.end]);

    const frameStep = useCallback((direction: 'forward' | 'backward') => {
        if (videoRef.current) {
            const frameTime = 1 / 30; // Assume 30fps for frame stepping
            const delta = direction === 'forward' ? frameTime : -frameTime;
            const newTime = direction === 'forward'
                ? Math.min(trimBounds.end, videoRef.current.currentTime + delta)
                : Math.max(trimBounds.start, videoRef.current.currentTime + delta);
            videoRef.current.currentTime = newTime;
        }
    }, [trimBounds]);

    const seekToTime = useCallback((time: number) => {
        if (videoRef.current) {
            const constrainedTime = Math.max(trimBounds.start, Math.min(trimBounds.end, time));
            videoRef.current.currentTime = constrainedTime;
        }
    }, [trimBounds]);

    // Quality settings state
    const [currentQualitySettings, setCurrentQualitySettings] = useState(qualitySettings);

    const handleQualityChange = useCallback((newSettings: PreviewQualitySettings) => {
        setCurrentQualitySettings(newSettings);
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            {/* Video Container */}
            <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-auto"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => {
                        setIsPlaying(true);
                        onPlayStateChange?.(true);
                    }}
                    onPause={() => {
                        setIsPlaying(false);
                        onPlayStateChange?.(false);
                    }}
                    onError={() => setError('Failed to load video')}
                    preload="metadata"
                />

                {/* Interactive Overlay Canvas */}
                <canvas
                    ref={canvasRef}
                    className={`absolute top-0 left-0 w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                    style={{ objectFit: 'contain' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                />

                {/* Trim Bounds Indicators */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                    Trim: {formatTime(trimBounds.start)} - {formatTime(trimBounds.end)}
                </div>

                {/* Overlay Selection Indicator */}
                {selectedOverlayId && (
                    <div className="absolute top-2 right-2 bg-blue-500 bg-opacity-80 text-white px-2 py-1 rounded text-sm">
                        Overlay Selected
                    </div>
                )}

                {/* Layer Controls */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white p-2 rounded text-xs space-y-1">
                    <div className="font-medium mb-1">Preview Layers</div>
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={layerVisibility.subtitles}
                                onChange={() => toggleLayerVisibility('subtitles')}
                                className="w-3 h-3"
                            />
                            <span>Subtitles</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={layerVisibility.textOverlays}
                                onChange={() => toggleLayerVisibility('textOverlays')}
                                className="w-3 h-3"
                            />
                            <span>Text Overlays</span>
                        </label>
                    </div>
                    {textOverlays.length > 0 && layerVisibility.textOverlays && (
                        <div className="text-xs text-gray-300 mt-1 pt-1 border-t border-gray-600">
                            Click and drag overlays to reposition
                        </div>
                    )}
                </div>

                {/* Performance Stats (only in development or when performance mode is enabled) */}
                {(currentQualitySettings.enablePerformanceMode || process.env.NODE_ENV === 'development') && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white p-2 rounded text-xs">
                        <div className="font-medium mb-1">Performance</div>
                        <div className="space-y-1">
                            <div>FPS: {performanceStats.fps}</div>
                            <div>Render: {performanceStats.renderTime}ms</div>
                            <div>Layers: {performanceStats.overlayCount}</div>
                            <div>Quality: {currentQualitySettings.renderQuality}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Metadata Display */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <div className="flex items-center gap-4">
                    <span>
                        {formatTime(videoCurrentTime)} / {formatTime(metadata.duration)}
                    </span>
                    <span>
                        {metadata.width}x{metadata.height} • {metadata.format.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {activeOverlays.length > 0 && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            {activeOverlays.length} overlay{activeOverlays.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    {activeSubtitles.length > 0 && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            Subtitles active
                        </span>
                    )}
                </div>
            </div>

            {/* Enhanced Preview Controls */}
            {showAdvancedControls && (
                <PreviewControls
                    isPlaying={isPlaying}
                    currentTime={videoCurrentTime}
                    duration={metadata.duration}
                    trimBounds={trimBounds}
                    qualitySettings={currentQualitySettings}
                    onPlayPause={togglePlayPause}
                    onTimeSeek={seekToTime}
                    onQualityChange={handleQualityChange}
                    onGoToStart={goToStart}
                    onGoToEnd={goToEnd}
                    onSkipBackward={skipBackward}
                    onSkipForward={skipForward}
                    onFrameStep={frameStep}
                    disabled={!!error}
                />
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
        </div>
    );
}