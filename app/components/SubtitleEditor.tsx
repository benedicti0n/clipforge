"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { LoadingState } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';
import { SubtitleEditorSkeleton } from './SkeletonLoader';

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

interface SubtitleEditorProps {
    subtitles: SubtitleTrack[];
    onSubtitlesChange: (subtitles: SubtitleTrack[]) => void;
    currentTime: number;
    onTimeSeek: (time: number) => void;
    videoDuration: number;
    isGenerating?: boolean;
    onGenerateSubtitles?: () => void;
}

interface EditingSegment {
    trackId: string;
    segmentIndex: number;
    field: 'text' | 'start' | 'end';
}

export default function SubtitleEditor({
    subtitles,
    onSubtitlesChange,
    currentTime,
    onTimeSeek,
    videoDuration,
    isGenerating = false,
    onGenerateSubtitles
}: SubtitleEditorProps) {
    const [editingSegment, setEditingSegment] = useState<EditingSegment | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (editingSegment && editInputRef.current) {
            editInputRef.current.focus();
            if (editingSegment.field === 'text') {
                editInputRef.current.select();
            }
        }
    }, [editingSegment]);

    // Format time for display (MM:SS.mmm)
    const formatTime = useCallback((seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    }, []);

    // Parse time from string input (supports MM:SS.mmm or just seconds)
    const parseTime = useCallback((timeStr: string): number => {
        const trimmed = timeStr.trim();

        // Check if it's in MM:SS.mmm format
        const timeMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})\.(\d{1,3})$/);
        if (timeMatch) {
            const [, minutes, seconds, milliseconds] = timeMatch;
            return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds.padEnd(3, '0')) / 1000;
        }

        // Otherwise treat as seconds
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, videoDuration));
    }, [videoDuration]);

    // Start editing a segment field
    const startEditing = useCallback((trackId: string, segmentIndex: number, field: 'text' | 'start' | 'end') => {
        const track = subtitles.find(t => t.id === trackId);
        if (!track || !track.segments[segmentIndex]) return;

        const segment = track.segments[segmentIndex];
        let value = '';

        switch (field) {
            case 'text':
                value = segment.text;
                break;
            case 'start':
                value = formatTime(segment.start);
                break;
            case 'end':
                value = formatTime(segment.end);
                break;
        }

        setEditingSegment({ trackId, segmentIndex, field });
        setEditValue(value);
    }, [subtitles, formatTime]);

    // Save editing changes
    const saveEdit = useCallback(() => {
        if (!editingSegment) return;

        const { trackId, segmentIndex, field } = editingSegment;
        const updatedSubtitles = subtitles.map(track => {
            if (track.id !== trackId) return track;

            const updatedSegments = track.segments.map((segment, index) => {
                if (index !== segmentIndex) return segment;

                switch (field) {
                    case 'text':
                        return { ...segment, text: editValue.trim() };
                    case 'start':
                        const newStart = parseTime(editValue);
                        return { ...segment, start: Math.min(newStart, segment.end - 0.1) };
                    case 'end':
                        const newEnd = parseTime(editValue);
                        return { ...segment, end: Math.max(newEnd, segment.start + 0.1) };
                    default:
                        return segment;
                }
            });

            return { ...track, segments: updatedSegments };
        });

        onSubtitlesChange(updatedSubtitles);
        setEditingSegment(null);
        setEditValue('');
    }, [editingSegment, editValue, subtitles, onSubtitlesChange, parseTime]);

    // Cancel editing
    const cancelEdit = useCallback(() => {
        setEditingSegment(null);
        setEditValue('');
    }, []);

    // Handle key presses in edit mode
    const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    }, [saveEdit, cancelEdit]);

    // Delete a subtitle segment
    const deleteSegment = useCallback((trackId: string, segmentIndex: number) => {
        const updatedSubtitles = subtitles.map(track => {
            if (track.id !== trackId) return track;

            return {
                ...track,
                segments: track.segments.filter((_, index) => index !== segmentIndex)
            };
        });

        onSubtitlesChange(updatedSubtitles);
    }, [subtitles, onSubtitlesChange]);

    // Add a new subtitle segment
    const addSegment = useCallback((trackId: string, afterIndex?: number) => {
        const track = subtitles.find(t => t.id === trackId);
        if (!track) return;

        const insertIndex = afterIndex !== undefined ? afterIndex + 1 : track.segments.length;

        // Calculate default timing for new segment
        let startTime = currentTime;
        let endTime = Math.min(currentTime + 3, videoDuration);

        if (afterIndex !== undefined && track.segments[afterIndex]) {
            startTime = track.segments[afterIndex].end;
            endTime = Math.min(startTime + 3, videoDuration);

            // If there's a next segment, don't overlap
            if (track.segments[afterIndex + 1]) {
                endTime = Math.min(endTime, track.segments[afterIndex + 1].start);
            }
        }

        const newSegment: SubtitleSegment = {
            start: startTime,
            end: endTime,
            text: "New subtitle"
        };

        const updatedSubtitles = subtitles.map(track => {
            if (track.id !== trackId) return track;

            const newSegments = [...track.segments];
            newSegments.splice(insertIndex, 0, newSegment);

            return { ...track, segments: newSegments };
        });

        onSubtitlesChange(updatedSubtitles);
    }, [subtitles, onSubtitlesChange, currentTime, videoDuration]);

    // Check if a segment is currently active (being played)
    const isSegmentActive = useCallback((segment: SubtitleSegment): boolean => {
        return currentTime >= segment.start && currentTime <= segment.end;
    }, [currentTime]);

    // Seek to segment start time
    const seekToSegment = useCallback((segment: SubtitleSegment) => {
        onTimeSeek(segment.start);
    }, [onTimeSeek]);

    if (subtitles.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Subtitles</h3>
                    {onGenerateSubtitles && (
                        <button
                            onClick={onGenerateSubtitles}
                            disabled={isGenerating}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Subtitles'}
                        </button>
                    )}
                </div>

                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-gray-500 mb-4">
                        {isGenerating ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Generating subtitles...</span>
                            </div>
                        ) : (
                            <>
                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V3a1 1 0 011 1v1M7 4V3a1 1 0 011-1h8a1 1 0 011 1v1m-9 4h10m-10 0V7a1 1 0 011-1h8a1 1 0 011 1v1M7 8v10a1 1 0 001 1h8a1 1 0 001-1V8" />
                                </svg>
                                <p>No subtitles available</p>
                                <p className="text-sm mt-1">Generate subtitles automatically or add them manually</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Subtitles ({subtitles.reduce((acc, track) => acc + track.segments.length, 0)} segments)</h3>
                <div className="flex gap-2">
                    {onGenerateSubtitles && (
                        <button
                            onClick={onGenerateSubtitles}
                            disabled={isGenerating}
                            className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                    )}
                    <button
                        onClick={() => addSegment(subtitles[0]?.id || 'default')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                        + Add Segment
                    </button>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
                {subtitles.map((track) => (
                    <div key={track.id} className="divide-y divide-gray-200">
                        {track.segments.map((segment, segmentIndex) => {
                            const isActive = isSegmentActive(segment);
                            const isEditing = editingSegment?.trackId === track.id && editingSegment?.segmentIndex === segmentIndex;

                            return (
                                <div
                                    key={`${track.id}-${segmentIndex}`}
                                    className={`p-4 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Timing Controls */}
                                        <div className="flex-shrink-0 space-y-2">
                                            <div className="text-xs text-gray-500">Start</div>
                                            {isEditing && editingSegment.field === 'start' ? (
                                                <input
                                                    ref={editInputRef as React.RefObject<HTMLInputElement>}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={handleEditKeyDown}
                                                    onBlur={saveEdit}
                                                    className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(track.id, segmentIndex, 'start')}
                                                    className="text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    {formatTime(segment.start)}
                                                </button>
                                            )}

                                            <div className="text-xs text-gray-500">End</div>
                                            {isEditing && editingSegment.field === 'end' ? (
                                                <input
                                                    ref={editInputRef as React.RefObject<HTMLInputElement>}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={handleEditKeyDown}
                                                    onBlur={saveEdit}
                                                    className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(track.id, segmentIndex, 'end')}
                                                    className="text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    {formatTime(segment.end)}
                                                </button>
                                            )}
                                        </div>

                                        {/* Subtitle Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-500 mb-1">Text</div>
                                            {isEditing && editingSegment.field === 'text' ? (
                                                <textarea
                                                    ref={editInputRef as React.RefObject<HTMLTextAreaElement>}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={handleEditKeyDown}
                                                    onBlur={saveEdit}
                                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    rows={2}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEditing(track.id, segmentIndex, 'text')}
                                                    className="px-3 py-2 bg-gray-50 rounded cursor-text hover:bg-gray-100 transition-colors min-h-[2.5rem] flex items-center"
                                                >
                                                    <span className={`${segment.text.trim() ? '' : 'text-gray-400 italic'}`}>
                                                        {segment.text.trim() || 'Click to edit text...'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Confidence indicator */}
                                            {segment.confidence !== undefined && (
                                                <div className="mt-1 text-xs text-gray-500">
                                                    Confidence: {Math.round(segment.confidence * 100)}%
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex-shrink-0 flex flex-col gap-1">
                                            <button
                                                onClick={() => seekToSegment(segment)}
                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                title="Seek to segment"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V7a3 3 0 00-3-3H6a3 3 0 00-3 3v1" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={() => addSegment(track.id, segmentIndex)}
                                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                                title="Add segment after this one"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={() => deleteSegment(track.id, segmentIndex)}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                title="Delete segment"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Subtitle Editor Help */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <div className="font-medium mb-1">Editing Tips:</div>
                <ul className="space-y-1">
                    <li>• Click on text to edit subtitle content</li>
                    <li>• Click on timestamps to adjust timing (format: MM:SS.mmm or seconds)</li>
                    <li>• Press Enter to save, Escape to cancel</li>
                    <li>• Use the play button to seek to segment start</li>
                    <li>• Active segments are highlighted in blue during playback</li>
                </ul>
            </div>
        </div>
    );
}