"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    format: string;
}

interface SubtitleSegment {
    start: number;
    end: number;
    text: string;
    confidence?: number;
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

interface TimelineProps {
    duration: number;
    trimBounds: { start: number; end: number };
    onTrimChange: (bounds: { start: number; end: number }) => void;
    subtitles?: SubtitleSegment[];
    textOverlays?: TextOverlay[];
    currentTime?: number;
    onTimeSeek?: (time: number) => void;
    videoUrl?: string;
}

export default function Timeline({
    duration,
    trimBounds,
    onTrimChange,
    subtitles = [],
    textOverlays = [],
    currentTime = 0,
    onTimeSeek,
    videoUrl
}: TimelineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

    const TIMELINE_HEIGHT = 80;
    const MARKER_WIDTH = 12;
    const PLAYHEAD_WIDTH = 2;

    // Generate waveform data using Web Audio API
    const generateWaveform = useCallback(async (audioUrl: string) => {
        if (!audioUrl) return;

        setIsLoadingWaveform(true);
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);
            const samples = 200; // Number of waveform bars
            const blockSize = Math.floor(channelData.length / samples);
            const waveform: number[] = [];

            for (let i = 0; i < samples; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(channelData[i * blockSize + j]);
                }
                waveform.push(sum / blockSize);
            }

            // Normalize waveform data
            const max = Math.max(...waveform);
            const normalizedWaveform = waveform.map(value => value / max);

            setWaveformData(normalizedWaveform);
        } catch (error) {
            console.warn('Failed to generate waveform:', error);
            // Generate placeholder waveform
            const placeholderWaveform = Array.from({ length: 200 }, () => Math.random() * 0.5 + 0.1);
            setWaveformData(placeholderWaveform);
        } finally {
            setIsLoadingWaveform(false);
        }
    }, []);

    // Load waveform when video URL changes
    useEffect(() => {
        if (videoUrl) {
            generateWaveform(videoUrl);
        }
    }, [videoUrl, generateWaveform]);

    // Convert time to pixel position
    const timeToPixel = useCallback((time: number, canvasWidth: number): number => {
        return (time / duration) * canvasWidth;
    }, [duration]);

    // Convert pixel position to time
    const pixelToTime = useCallback((pixel: number, canvasWidth: number): number => {
        return (pixel / canvasWidth) * duration;
    }, [duration]);

    // Draw timeline
    const drawTimeline = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, height);

        // Draw waveform
        if (waveformData.length > 0) {
            const barWidth = width / waveformData.length;
            ctx.fillStyle = '#d1d5db';

            waveformData.forEach((amplitude, index) => {
                const barHeight = amplitude * (height - 20);
                const x = index * barWidth;
                const y = (height - barHeight) / 2;
                ctx.fillRect(x, y, barWidth - 1, barHeight);
            });
        }

        // Draw trim bounds (highlighted region)
        const startX = timeToPixel(trimBounds.start, width);
        const endX = timeToPixel(trimBounds.end, width);

        // Highlight trimmed region
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(startX, 0, endX - startX, height);

        // Draw subtitle segments
        subtitles.forEach(subtitle => {
            const segmentStartX = timeToPixel(subtitle.start, width);
            const segmentEndX = timeToPixel(subtitle.end, width);

            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.fillRect(segmentStartX, height - 8, segmentEndX - segmentStartX, 4);
        });

        // Draw text overlay segments
        textOverlays.forEach(overlay => {
            const overlayStartX = timeToPixel(overlay.timing.start, width);
            const overlayEndX = timeToPixel(overlay.timing.end, width);

            ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
            ctx.fillRect(overlayStartX, height - 4, overlayEndX - overlayStartX, 4);
        });

        // Draw time markers
        const timeInterval = duration > 60 ? 10 : duration > 30 ? 5 : 1;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        for (let time = 0; time <= duration; time += timeInterval) {
            const x = timeToPixel(time, width);
            ctx.fillRect(x, height - 15, 1, 10);

            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            ctx.fillText(timeLabel, x, height - 2);
        }

        // Draw trim markers
        ctx.fillStyle = '#3b82f6';

        // Start marker
        ctx.fillRect(startX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, height);
        ctx.fillStyle = 'white';
        ctx.fillRect(startX - 1, height / 2 - 8, 2, 16);

        // End marker
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(endX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, height);
        ctx.fillStyle = 'white';
        ctx.fillRect(endX - 1, height / 2 - 8, 2, 16);

        // Draw playhead
        const playheadX = timeToPixel(currentTime, width);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(playheadX - PLAYHEAD_WIDTH / 2, 0, PLAYHEAD_WIDTH, height);

        // Playhead circle
        ctx.beginPath();
        ctx.arc(playheadX, 8, 6, 0, 2 * Math.PI);
        ctx.fill();

    }, [waveformData, trimBounds, subtitles, textOverlays, currentTime, timeToPixel, duration]);

    // Redraw timeline when dependencies change
    useEffect(() => {
        drawTimeline();
    }, [drawTimeline]);

    // Handle mouse events
    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const canvasWidth = canvas.width;

        const startX = timeToPixel(trimBounds.start, canvasWidth);
        const endX = timeToPixel(trimBounds.end, canvasWidth);
        const playheadX = timeToPixel(currentTime, canvasWidth);

        // Check if clicking on start marker
        if (Math.abs(x - startX) <= MARKER_WIDTH / 2) {
            setIsDragging('start');
        }
        // Check if clicking on end marker
        else if (Math.abs(x - endX) <= MARKER_WIDTH / 2) {
            setIsDragging('end');
        }
        // Check if clicking on playhead
        else if (Math.abs(x - playheadX) <= 10) {
            setIsDragging('playhead');
        }
        // Otherwise, seek to clicked position
        else {
            const clickedTime = pixelToTime(x, canvasWidth);
            onTimeSeek?.(Math.max(0, Math.min(duration, clickedTime)));
        }
    }, [trimBounds, currentTime, timeToPixel, pixelToTime, duration, onTimeSeek]);

    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isDragging || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const canvasWidth = canvasRef.current.width;
        const newTime = Math.max(0, Math.min(duration, pixelToTime(x, canvasWidth)));

        if (isDragging === 'start') {
            const newStart = Math.min(newTime, trimBounds.end - 0.1);
            onTrimChange({ start: newStart, end: trimBounds.end });
        } else if (isDragging === 'end') {
            const newEnd = Math.max(newTime, trimBounds.start + 0.1);
            onTrimChange({ start: trimBounds.start, end: newEnd });
        } else if (isDragging === 'playhead') {
            onTimeSeek?.(newTime);
        }
    }, [isDragging, trimBounds, duration, pixelToTime, onTrimChange, onTimeSeek]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    // Set up canvas dimensions
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;

        if (canvas && container) {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = TIMELINE_HEIGHT;
            drawTimeline();
        }
    }, [drawTimeline]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;

            if (canvas && container) {
                const rect = container.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = TIMELINE_HEIGHT;
                drawTimeline();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawTimeline]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (start: number, end: number): string => {
        const duration = end - start;
        return formatTime(duration);
    };

    return (
        <div className="space-y-4">
            {/* Timeline Info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                    <span>Current: {formatTime(currentTime)}</span>
                    <span>Duration: {formatTime(duration)}</span>
                    <span>Trim Duration: {formatDuration(trimBounds.start, trimBounds.end)}</span>
                </div>
                {isLoadingWaveform && (
                    <span className="text-blue-600">Loading waveform...</span>
                )}
            </div>

            {/* Timeline Canvas */}
            <div
                ref={containerRef}
                className="relative bg-white border rounded-lg overflow-hidden cursor-pointer"
                style={{ height: TIMELINE_HEIGHT }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="w-full h-full"
                />
            </div>

            {/* Timeline Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm text-gray-600">Trim Bounds</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Subtitles</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span className="text-sm text-gray-600">Text Overlays</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-600">Playhead</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Trim:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {formatTime(trimBounds.start)} - {formatTime(trimBounds.end)}
                    </span>
                </div>
            </div>
        </div>
    );
}