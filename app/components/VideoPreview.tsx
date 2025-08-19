"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
    renderCanvasOverlays,
    findOverlayAtPoint,
    isPointInOverlayBounds,
    clearTextMeasurementCache
} from "../../lib/canvas-overlay-renderer";
import { TextOverlay, pixelsToNormalized } from "../../lib/text-overlay";

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
    selectedOverlayId
}: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOverlayId, setDraggedOverlayId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [renderedOverlays, setRenderedOverlays] = useState<Array<{ overlay: TextOverlay; bounds: { x: number; y: number; width: number; height: number } }>>([]);

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
            }
        }
    }, [trimBounds.end, onTimeUpdate]);

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

    // Render overlays on canvas using the enhanced rendering system
    const renderOverlays = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;

        const currentVideoTime = video.currentTime;

        // Use the enhanced canvas rendering system
        const rendered = renderCanvasOverlays(
            {
                canvas,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                currentTime: currentVideoTime,
                devicePixelRatio: window.devicePixelRatio || 1
            },
            textOverlays,
            subtitles
        );

        setRenderedOverlays(rendered);
    }, [textOverlays, subtitles]);

    // Update canvas overlays when video time changes
    useEffect(() => {
        renderOverlays();
    }, [videoCurrentTime, renderOverlays]);

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

    // Set up canvas dimensions and clear cache when metadata changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Clear text measurement cache when video changes
            clearTextMeasurementCache();
        }
    }, [metadata]);

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                // Ensure we start from trim start if at the beginning
                if (videoRef.current.currentTime < trimBounds.start) {
                    videoRef.current.currentTime = trimBounds.start;
                }
                videoRef.current.play().catch(err => {
                    setError('Failed to play video');
                    console.error('Video play error:', err);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

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
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
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

                {/* Drag Instructions */}
                {textOverlays.length > 0 && (
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        Click and drag text overlays to reposition
                    </div>
                )}
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                <button
                    onClick={togglePlayPause}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                    disabled={!!error}
                >
                    {isPlaying ? (
                        <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Pause
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Play
                        </>
                    )}
                </button>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                        {formatTime(videoCurrentTime)} / {formatTime(metadata.duration)}
                    </span>
                    <span>
                        {metadata.width}x{metadata.height} • {metadata.format.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
        </div>
    );
}