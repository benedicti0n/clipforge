"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    format: string;
}

interface TextOverlay {
    id: string;
    text: string;
    position: { x: number; y: number };
    style: {
        fontSize: number;
        fontFamily: string;
        color: string;
        backgroundColor?: string;
        borderColor?: string;
    };
    timing: { start: number; end: number };
}

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
}

export default function VideoPreview({
    videoUrl,
    metadata,
    trimBounds,
    textOverlays = [],
    subtitles = [],
    currentTime = 0,
    onTimeUpdate,
    onLoadedMetadata
}: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

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

    // Render overlays on canvas
    const renderOverlays = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentVideoTime = video.currentTime;

        // Render text overlays
        textOverlays.forEach(overlay => {
            if (currentVideoTime >= overlay.timing.start && currentVideoTime <= overlay.timing.end) {
                ctx.save();

                // Set text style
                ctx.font = `${overlay.style.fontSize}px ${overlay.style.fontFamily}`;
                ctx.fillStyle = overlay.style.color;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                // Draw background if specified
                if (overlay.style.backgroundColor) {
                    const textMetrics = ctx.measureText(overlay.text);
                    const textHeight = overlay.style.fontSize;

                    ctx.fillStyle = overlay.style.backgroundColor;
                    ctx.fillRect(
                        overlay.position.x - 4,
                        overlay.position.y - 4,
                        textMetrics.width + 8,
                        textHeight + 8
                    );
                }

                // Draw border if specified
                if (overlay.style.borderColor) {
                    ctx.strokeStyle = overlay.style.borderColor;
                    ctx.lineWidth = 2;
                    ctx.strokeText(overlay.text, overlay.position.x, overlay.position.y);
                }

                // Draw text
                ctx.fillStyle = overlay.style.color;
                ctx.fillText(overlay.text, overlay.position.x, overlay.position.y);

                ctx.restore();
            }
        });

        // Render subtitles
        const currentSubtitle = subtitles.find(
            sub => currentVideoTime >= sub.start && currentVideoTime <= sub.end
        );

        if (currentSubtitle) {
            ctx.save();

            // Subtitle styling
            const fontSize = Math.max(16, canvas.width * 0.03);
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Position at bottom center
            const x = canvas.width / 2;
            const y = canvas.height - 20;

            // Draw subtitle with outline
            ctx.strokeText(currentSubtitle.text, x, y);
            ctx.fillText(currentSubtitle.text, x, y);

            ctx.restore();
        }
    }, [textOverlays, subtitles]);

    // Update canvas overlays when video time changes
    useEffect(() => {
        renderOverlays();
    }, [videoCurrentTime, renderOverlays]);

    // Set up canvas dimensions to match video
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (canvas && video && video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
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
            <div className="relative bg-black rounded-lg overflow-hidden">
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

                {/* Overlay Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'contain' }}
                />

                {/* Trim Bounds Indicators */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                    Trim: {formatTime(trimBounds.start)} - {formatTime(trimBounds.end)}
                </div>
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