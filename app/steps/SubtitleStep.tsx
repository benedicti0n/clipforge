"use client";

import { useState, useEffect } from "react";
import VideoPreview from "../components/VideoPreview";
import Timeline from "../components/Timeline";

// State management interfaces for editor functionality
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

interface SubtitleTrack {
    id: string;
    segments: SubtitleSegment[];
}

interface TextStyle {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    borderColor?: string;
}

interface TextOverlay {
    id: string;
    text: string;
    position: { x: number; y: number };
    style: TextStyle;
    timing: { start: number; end: number };
}

interface EditorState {
    subtitles: SubtitleTrack[];
    trimBounds: { start: number; end: number };
    textOverlays: TextOverlay[];
    isProcessing: boolean;
    previewTime: number;
}

interface SubtitleStepProps {
    onBack: () => void;
    clippedVideoUrl: string;
    originalVideoMetadata: VideoMetadata;
}

// Custom hook for video editor state management
const useVideoEditor = (initialMetadata: VideoMetadata) => {
    const [editorState, setEditorState] = useState<EditorState>({
        subtitles: [],
        trimBounds: { start: 0, end: initialMetadata.duration },
        textOverlays: [],
        isProcessing: false,
        previewTime: 0,
    });

    const updateTrimBounds = (bounds: { start: number; end: number }) => {
        setEditorState(prev => ({ ...prev, trimBounds: bounds }));
    };

    const updateSubtitles = (subtitles: SubtitleTrack[]) => {
        setEditorState(prev => ({ ...prev, subtitles }));
    };

    const updateTextOverlays = (textOverlays: TextOverlay[]) => {
        setEditorState(prev => ({ ...prev, textOverlays }));
    };

    const setProcessing = (isProcessing: boolean) => {
        setEditorState(prev => ({ ...prev, isProcessing }));
    };

    const setPreviewTime = (previewTime: number) => {
        setEditorState(prev => ({ ...prev, previewTime }));
    };

    return {
        editorState,
        updateTrimBounds,
        updateSubtitles,
        updateTextOverlays,
        setProcessing,
        setPreviewTime,
    };
};

// Video metadata extraction utility
const extractVideoMetadata = async (videoUrl: string): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            const metadata: VideoMetadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                format: 'mp4', // Default format, could be enhanced to detect actual format
            };
            resolve(metadata);
        };

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
        };

        video.src = videoUrl;
    });
};

export default function SubtitleStep({ onBack, clippedVideoUrl, originalVideoMetadata }: SubtitleStepProps) {
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(originalVideoMetadata || null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(!originalVideoMetadata);
    const [error, setError] = useState<string | null>(null);

    const {
        editorState,
        updateTrimBounds,
        updateSubtitles,
        updateTextOverlays,
        setProcessing,
        setPreviewTime,
    } = useVideoEditor(videoMetadata || { duration: 0, width: 1920, height: 1080, format: 'mp4' });

    // Initialize video metadata if not provided
    useEffect(() => {
        if (!originalVideoMetadata && clippedVideoUrl) {
            setIsLoadingMetadata(true);
            extractVideoMetadata(clippedVideoUrl)
                .then((metadata) => {
                    setVideoMetadata(metadata);
                    setIsLoadingMetadata(false);
                })
                .catch((err) => {
                    setError('Failed to load video metadata');
                    setIsLoadingMetadata(false);
                    console.error('Video metadata extraction failed:', err);
                });
        }
    }, [clippedVideoUrl, originalVideoMetadata]);

    if (isLoadingMetadata) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Step 2: Video Editor</h1>
                <div className="flex items-center justify-center p-8">
                    <div className="text-gray-600">Loading video metadata...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Step 2: Video Editor</h1>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>{error}</p>
                    <button
                        onClick={onBack}
                        className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        ← Back to Step 1
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Step 2: Video Editor</h1>
                <button
                    onClick={onBack}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    ← Back
                </button>
            </div>

            {/* Video metadata display */}
            {videoMetadata && (
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Video Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Duration:</span>
                            <div className="font-medium">{Math.round(videoMetadata.duration)}s</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Resolution:</span>
                            <div className="font-medium">{videoMetadata.width}x{videoMetadata.height}</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Format:</span>
                            <div className="font-medium">{videoMetadata.format.toUpperCase()}</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Current Trim:</span>
                            <div className="font-medium">
                                {Math.round(editorState.trimBounds.start)}s - {Math.round(editorState.trimBounds.end)}s
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modular editor container - placeholder for future components */}
            <div className="space-y-6">
                {/* Video Preview Section */}
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Video Preview</h3>
                    {videoMetadata && (
                        <VideoPreview
                            videoUrl={clippedVideoUrl}
                            metadata={videoMetadata}
                            trimBounds={editorState.trimBounds}
                            textOverlays={editorState.textOverlays}
                            subtitles={editorState.subtitles.flatMap(track => track.segments)}
                            currentTime={editorState.previewTime}
                            onTimeUpdate={setPreviewTime}
                            onLoadedMetadata={(metadata) => setVideoMetadata(metadata)}
                        />
                    )}
                </div>

                {/* Timeline and Trimming Controls Section */}
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Timeline & Trimming</h3>
                    {videoMetadata && (
                        <Timeline
                            duration={videoMetadata.duration}
                            trimBounds={editorState.trimBounds}
                            onTrimChange={updateTrimBounds}
                            subtitles={editorState.subtitles.flatMap(track => track.segments)}
                            textOverlays={editorState.textOverlays}
                            currentTime={editorState.previewTime}
                            onTimeSeek={setPreviewTime}
                            videoUrl={clippedVideoUrl}
                        />
                    )}
                </div>

                {/* Subtitle Generation Section */}
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Subtitles</h3>
                    <div className="bg-gray-100 h-32 rounded flex items-center justify-center">
                        <span className="text-gray-500">Subtitle generation and editing will be implemented here</span>
                    </div>
                </div>

                {/* Text Overlay Section */}
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Text Overlays</h3>
                    <div className="bg-gray-100 h-32 rounded flex items-center justify-center">
                        <span className="text-gray-500">Text overlay management will be implemented here</span>
                    </div>
                </div>

                {/* Processing Section */}
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Final Processing</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Ready to process your edited video</span>
                        <button
                            disabled={editorState.isProcessing}
                            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {editorState.isProcessing ? 'Processing...' : 'Process Final Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
