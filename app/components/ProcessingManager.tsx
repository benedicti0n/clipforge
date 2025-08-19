'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Download, AlertCircle, CheckCircle, Loader2, X, RotateCcw } from 'lucide-react';
import { TextOverlay } from '../../lib/text-overlay';

// Interfaces for processing
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

interface TrimBounds {
    start: number;
    end: number;
}

interface ProcessingRequest {
    videoFile: File;
    trimBounds?: TrimBounds;
    subtitles?: SubtitleTrack[];
    textOverlays?: TextOverlay[];
    outputFormat?: 'mp4' | 'webm';
    quality?: 'low' | 'medium' | 'high';
}

interface ProcessingProgress {
    stage: 'initializing' | 'extracting_metadata' | 'preparing_subtitles' | 'preparing_overlays' | 'processing_video' | 'finalizing' | 'completed' | 'error';
    progress: number; // 0-100
    message: string;
    timeElapsed?: number;
    estimatedTimeRemaining?: number;
}

interface ProcessingResult {
    success: boolean;
    videoBlob?: Blob;
    filename?: string;
    processingTime?: number;
    fileSize?: number;
    metadata?: {
        duration: number;
        width: number;
        height: number;
        format: string;
    };
    error?: string;
}

interface ProcessingManagerProps {
    isOpen: boolean;
    onClose: () => void;
    processingRequest: ProcessingRequest | null;
    onProcessingComplete?: (result: ProcessingResult) => void;
}

const ProcessingManager: React.FC<ProcessingManagerProps> = ({
    isOpen,
    onClose,
    processingRequest,
    onProcessingComplete
}) => {
    const [progress, setProgress] = useState<ProcessingProgress>({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing...'
    });
    const [result, setResult] = useState<ProcessingResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Format time for display
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    // Start processing
    const startProcessing = useCallback(async () => {
        if (!processingRequest) return;

        setIsProcessing(true);
        setResult(null);
        setProgress({
            stage: 'initializing',
            progress: 0,
            message: 'Starting video processing...'
        });

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('file', processingRequest.videoFile);
            formData.append('requestData', JSON.stringify({
                trimBounds: processingRequest.trimBounds,
                subtitles: processingRequest.subtitles,
                textOverlays: processingRequest.textOverlays,
                outputFormat: processingRequest.outputFormat || 'mp4',
                quality: processingRequest.quality || 'medium'
            }));

            // Start processing
            const response = await fetch('/api/process-final', {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Processing failed');
            }

            // Get processing ID from headers
            const newProcessingId = response.headers.get('X-Processing-Id');
            setProcessingId(newProcessingId);

            // Simulate progress updates (in a real implementation, you'd poll the status endpoint)
            const progressStages = [
                { stage: 'extracting_metadata' as const, progress: 10, message: 'Analyzing video...' },
                { stage: 'preparing_subtitles' as const, progress: 25, message: 'Preparing subtitles...' },
                { stage: 'preparing_overlays' as const, progress: 40, message: 'Preparing text overlays...' },
                { stage: 'processing_video' as const, progress: 70, message: 'Processing video...' },
                { stage: 'finalizing' as const, progress: 95, message: 'Finalizing...' }
            ];

            for (const stage of progressStages) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Processing cancelled');
                }

                setProgress(stage);
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
            }

            // Get the processed video
            const videoBlob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'processed-video.mp4';
            const processingTime = parseFloat(response.headers.get('X-Processing-Time') || '0');
            const fileSize = parseInt(response.headers.get('X-File-Size') || '0');

            const processingResult: ProcessingResult = {
                success: true,
                videoBlob,
                filename,
                processingTime,
                fileSize,
                metadata: {
                    duration: parseFloat(response.headers.get('X-Video-Duration') || '0'),
                    width: parseInt(response.headers.get('X-Video-Width') || '0'),
                    height: parseInt(response.headers.get('X-Video-Height') || '0'),
                    format: processingRequest.outputFormat || 'mp4'
                }
            };

            setResult(processingResult);
            setProgress({
                stage: 'completed',
                progress: 100,
                message: 'Processing completed successfully!',
                timeElapsed: processingTime
            });

            onProcessingComplete?.(processingResult);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setProgress({
                    stage: 'error',
                    progress: 0,
                    message: 'Processing cancelled'
                });
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                setResult({
                    success: false,
                    error: errorMessage
                });
                setProgress({
                    stage: 'error',
                    progress: 0,
                    message: `Error: ${errorMessage}`
                });
            }
        } finally {
            setIsProcessing(false);
            abortControllerRef.current = null;
        }
    }, [processingRequest, onProcessingComplete]);

    // Cancel processing
    const cancelProcessing = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Download processed video
    const downloadVideo = useCallback(() => {
        if (!result?.videoBlob || !result?.filename) return;

        const url = URL.createObjectURL(result.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [result]);

    // Retry processing
    const retryProcessing = useCallback(() => {
        setResult(null);
        setProgress({
            stage: 'initializing',
            progress: 0,
            message: 'Initializing...'
        });
        startProcessing();
    }, [startProcessing]);

    // Start processing when component opens with a request
    React.useEffect(() => {
        if (isOpen && processingRequest && !isProcessing && !result) {
            startProcessing();
        }
    }, [isOpen, processingRequest, isProcessing, result, startProcessing]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Processing Video
                    </h2>
                    {!isProcessing && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Progress Section */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                                {progress.message}
                            </span>
                            <span className="text-sm text-gray-500">
                                {progress.progress}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${progress.stage === 'error'
                                    ? 'bg-red-500'
                                    : progress.stage === 'completed'
                                        ? 'bg-green-500'
                                        : 'bg-blue-500'
                                    }`}
                                style={{ width: `${progress.progress}%` }}
                            />
                        </div>

                        {/* Time Information */}
                        {(progress.timeElapsed || progress.estimatedTimeRemaining) && (
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                {progress.timeElapsed && (
                                    <span>Elapsed: {formatTime(progress.timeElapsed)}</span>
                                )}
                                {progress.estimatedTimeRemaining && (
                                    <span>Remaining: ~{formatTime(progress.estimatedTimeRemaining)}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status Icons and Messages */}
                    <div className="flex items-center justify-center mb-6">
                        {isProcessing && (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-2" />
                                <p className="text-sm text-gray-600">Processing your video...</p>
                            </div>
                        )}

                        {progress.stage === 'completed' && result?.success && (
                            <div className="flex flex-col items-center">
                                <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                                <p className="text-sm text-gray-600">Video processed successfully!</p>
                                {result.fileSize && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        File size: {formatFileSize(result.fileSize)}
                                    </p>
                                )}
                            </div>
                        )}

                        {progress.stage === 'error' && (
                            <div className="flex flex-col items-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                                <p className="text-sm text-red-600 text-center">
                                    {result?.error || 'An error occurred during processing'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Processing Details */}
                    {processingRequest && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Processing Details</h3>
                            <div className="space-y-1 text-xs text-gray-600">
                                <div>File: {processingRequest.videoFile.name}</div>
                                <div>Format: {processingRequest.outputFormat?.toUpperCase() || 'MP4'}</div>
                                <div>Quality: {processingRequest.quality || 'Medium'}</div>
                                {processingRequest.trimBounds && (
                                    <div>
                                        Trim: {formatTime(processingRequest.trimBounds.start)} - {formatTime(processingRequest.trimBounds.end)}
                                    </div>
                                )}
                                {processingRequest.subtitles && processingRequest.subtitles.length > 0 && (
                                    <div>Subtitles: {processingRequest.subtitles.length} track(s)</div>
                                )}
                                {processingRequest.textOverlays && processingRequest.textOverlays.length > 0 && (
                                    <div>Text Overlays: {processingRequest.textOverlays.length} overlay(s)</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {isProcessing && (
                            <button
                                onClick={cancelProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        )}

                        {progress.stage === 'completed' && result?.success && (
                            <>
                                <button
                                    onClick={downloadVideo}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </>
                        )}

                        {progress.stage === 'error' && (
                            <>
                                <button
                                    onClick={retryProcessing}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Retry
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </>
                        )}

                        {!isProcessing && progress.stage !== 'completed' && progress.stage !== 'error' && (
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcessingManager;