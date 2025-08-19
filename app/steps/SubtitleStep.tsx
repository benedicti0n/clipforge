"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// Trim bounds validation utility
const validateTrimBounds = (bounds: { start: number; end: number }, duration: number) => {
    const errors: string[] = [];

    if (bounds.start < 0) {
        errors.push('Start time cannot be negative');
    }

    if (bounds.end > duration) {
        errors.push('End time cannot exceed video duration');
    }

    if (bounds.start >= bounds.end) {
        errors.push('Start time must be less than end time');
    }

    if (bounds.end - bounds.start < 0.1) {
        errors.push('Minimum clip duration is 0.1 seconds');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Custom hook for trim control state management with validation and debouncing
const useTrimControls = (initialBounds: { start: number; end: number }, duration: number) => {
    const [trimBounds, setTrimBounds] = useState(initialBounds);
    const [pendingBounds, setPendingBounds] = useState<{ start: number; end: number } | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced update function
    const debouncedUpdate = useCallback((bounds: { start: number; end: number }) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        setIsValidating(true);
        setPendingBounds(bounds);

        debounceTimeoutRef.current = setTimeout(() => {
            const validation = validateTrimBounds(bounds, duration);

            if (validation.isValid) {
                setTrimBounds(bounds);
                setValidationErrors([]);
            } else {
                setValidationErrors(validation.errors);
            }

            setIsValidating(false);
            setPendingBounds(null);
        }, 300); // 300ms debounce delay
    }, [duration]);

    // Immediate update for real-time preview (without validation delay)
    const updateTrimBoundsImmediate = useCallback((bounds: { start: number; end: number }) => {
        // Apply basic constraints for immediate feedback
        const constrainedBounds = {
            start: Math.max(0, Math.min(bounds.start, duration - 0.1)),
            end: Math.min(duration, Math.max(bounds.end, 0.1))
        };

        // Ensure start < end
        if (constrainedBounds.start >= constrainedBounds.end) {
            constrainedBounds.start = Math.max(0, constrainedBounds.end - 0.1);
        }

        debouncedUpdate(constrainedBounds);
    }, [duration, debouncedUpdate]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Update bounds when duration changes
    useEffect(() => {
        if (trimBounds.end > duration) {
            updateTrimBoundsImmediate({ start: trimBounds.start, end: duration });
        }
    }, [duration, trimBounds, updateTrimBoundsImmediate]);

    return {
        trimBounds: pendingBounds || trimBounds,
        validatedTrimBounds: trimBounds,
        updateTrimBounds: updateTrimBoundsImmediate,
        validationErrors,
        isValidating,
        isValid: validationErrors.length === 0
    };
};

// Custom hook for video editor state management
const useVideoEditor = (initialMetadata: VideoMetadata) => {
    const [editorState, setEditorState] = useState<EditorState>({
        subtitles: [],
        trimBounds: { start: 0, end: initialMetadata.duration },
        textOverlays: [],
        isProcessing: false,
        previewTime: 0,
    });

    // Use enhanced trim controls
    const trimControls = useTrimControls(
        { start: 0, end: initialMetadata.duration },
        initialMetadata.duration
    );

    // Update editor state when validated trim bounds change
    useEffect(() => {
        setEditorState(prev => ({
            ...prev,
            trimBounds: trimControls.validatedTrimBounds
        }));
    }, [trimControls.validatedTrimBounds]);

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
        editorState: {
            ...editorState,
            trimBounds: trimControls.trimBounds // Use real-time bounds for preview
        },
        validatedEditorState: editorState, // Use validated bounds for processing
        trimControls,
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
    const [retrimProgress, setRetrimProgress] = useState<string | null>(null);

    const {
        editorState,
        validatedEditorState,
        trimControls,
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

    // Handle retrim functionality
    const handleRetrim = async () => {
        if (!trimControls.isValid || !videoMetadata) {
            return;
        }

        setProcessing(true);
        setRetrimProgress('Preparing video for retrim...');
        setError(null);

        try {
            // Fetch the current video file
            setRetrimProgress('Downloading current video...');
            const videoResponse = await fetch(clippedVideoUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to fetch current video');
            }

            const videoBlob = await videoResponse.blob();
            const videoFile = new File([videoBlob], 'current-video.mp4', { type: 'video/mp4' });

            // Prepare form data for retrim API
            const formData = new FormData();
            formData.append('file', videoFile);
            formData.append('trimBounds', JSON.stringify(validatedEditorState.trimBounds));
            formData.append('outputFormat', 'mp4');

            setRetrimProgress('Processing video with new trim bounds...');

            // Call retrim API
            const retrimResponse = await fetch('/api/retrim', {
                method: 'POST',
                body: formData
            });

            if (!retrimResponse.ok) {
                const errorData = await retrimResponse.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Retrim failed with status ${retrimResponse.status}`);
            }

            setRetrimProgress('Creating download link...');

            // Create download link for the retrimmed video
            const retrimmedBlob = await retrimResponse.blob();
            const downloadUrl = URL.createObjectURL(retrimmedBlob);

            // Get trim info from response headers
            const trimStart = retrimResponse.headers.get('X-Trim-Start');
            const trimEnd = retrimResponse.headers.get('X-Trim-End');
            const trimDuration = retrimResponse.headers.get('X-Trim-Duration');

            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `retrimmed-${trimStart}s-${trimEnd}s.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            URL.revokeObjectURL(downloadUrl);

            setRetrimProgress(null);
            setProcessing(false);

            // Show success message
            alert(`Video successfully retrimmed!\nNew duration: ${trimDuration}s\nDownload started automatically.`);

        } catch (err) {
            console.error('Retrim failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to retrim video');
            setRetrimProgress(null);
            setProcessing(false);
        }
    };

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
                        onClick={() => {
                            setError(null);
                            setRetrimProgress(null);
                            setProcessing(false);
                        }}
                        className="mt-2 mr-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Try Again
                    </button>
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
                            <span className="text-gray-600">Validated Trim:</span>
                            <div className="font-medium">
                                {Math.round(validatedEditorState.trimBounds.start)}s - {Math.round(validatedEditorState.trimBounds.end)}s
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Retrim Progress Display */}
            {retrimProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                            <div className="font-medium text-blue-800">Processing Video Retrim</div>
                            <div className="text-sm text-blue-600">{retrimProgress}</div>
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
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Timeline & Trimming</h3>
                        <div className="flex items-center gap-2">
                            {trimControls.isValidating && (
                                <div className="flex items-center gap-1 text-sm text-blue-600">
                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Validating...</span>
                                </div>
                            )}
                            {!trimControls.isValid && !trimControls.isValidating && (
                                <div className="flex items-center gap-1 text-sm text-red-600">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Invalid trim bounds</span>
                                </div>
                            )}
                            {trimControls.isValid && !trimControls.isValidating && (
                                <div className="flex items-center gap-1 text-sm text-green-600">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Valid</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validation Errors */}
                    {trimControls.validationErrors.length > 0 && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-sm text-red-800">
                                <div className="font-medium mb-1">Trim validation errors:</div>
                                <ul className="list-disc list-inside space-y-1">
                                    {trimControls.validationErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {videoMetadata && (
                        <Timeline
                            duration={videoMetadata.duration}
                            trimBounds={editorState.trimBounds}
                            onTrimChange={trimControls.updateTrimBounds}
                            subtitles={editorState.subtitles.flatMap(track => track.segments)}
                            textOverlays={editorState.textOverlays}
                            currentTime={editorState.previewTime}
                            onTimeSeek={setPreviewTime}
                            videoUrl={clippedVideoUrl}
                        />
                    )}

                    {/* Trim Controls Info */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Current Trim:</span>
                                <div className="font-mono font-medium">
                                    {Math.round(editorState.trimBounds.start * 100) / 100}s - {Math.round(editorState.trimBounds.end * 100) / 100}s
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Trim Duration:</span>
                                <div className="font-mono font-medium">
                                    {Math.round((editorState.trimBounds.end - editorState.trimBounds.start) * 100) / 100}s
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Status:</span>
                                <div className={`font-medium ${trimControls.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                    {trimControls.isValidating ? 'Validating...' : trimControls.isValid ? 'Ready' : 'Invalid'}
                                </div>
                            </div>
                        </div>

                        {/* Retrim Action Button */}
                        {trimControls.isValid && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Apply these trim bounds to create a new video clip
                                    </div>
                                    <button
                                        onClick={handleRetrim}
                                        disabled={editorState.isProcessing || !trimControls.isValid}
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                                    >
                                        {editorState.isProcessing ? 'Processing...' : 'Apply Trim'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
                        <div className="flex flex-col">
                            <span className="text-gray-600">
                                {trimControls.isValid ? 'Ready to process your edited video' : 'Fix trim bounds validation errors to continue'}
                            </span>
                            {!trimControls.isValid && (
                                <span className="text-sm text-red-600 mt-1">
                                    Processing is disabled until trim bounds are valid
                                </span>
                            )}
                        </div>
                        <button
                            disabled={editorState.isProcessing || !trimControls.isValid || trimControls.isValidating}
                            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {editorState.isProcessing ? 'Processing...' : 'Process Final Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
