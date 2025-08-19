"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface PreviewQualitySettings {
    renderQuality: 'low' | 'medium' | 'high';
    updateFrequency: number;
    enableSubtitles: boolean;
    enableTextOverlays: boolean;
    enablePerformanceMode: boolean;
}

interface PreviewControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    trimBounds: { start: number; end: number };
    qualitySettings: PreviewQualitySettings;
    onPlayPause: () => void;
    onTimeSeek: (time: number) => void;
    onQualityChange: (settings: PreviewQualitySettings) => void;
    onGoToStart: () => void;
    onGoToEnd: () => void;
    onSkipBackward: (seconds: number) => void;
    onSkipForward: (seconds: number) => void;
    onFrameStep: (direction: 'forward' | 'backward') => void;
    disabled?: boolean;
}

export default function PreviewControls({
    isPlaying,
    currentTime,
    duration,
    trimBounds,
    qualitySettings,
    onPlayPause,
    onTimeSeek,
    onQualityChange,
    onGoToStart,
    onGoToEnd,
    onSkipBackward,
    onSkipForward,
    onFrameStep,
    disabled = false
}: PreviewControlsProps) {
    const [showQualitySettings, setShowQualitySettings] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const scrubberRef = useRef<HTMLInputElement>(null);
    const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

    // Format time display
    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }, []);

    // Handle scrubber changes
    const handleScrubberChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(event.target.value);
        onTimeSeek(newTime);
    }, [onTimeSeek]);

    const handleScrubberMouseDown = useCallback(() => {
        setIsDraggingScrubber(true);
    }, []);

    const handleScrubberMouseUp = useCallback(() => {
        setIsDraggingScrubber(false);
    }, []);

    // Quality preset functions
    const setQualityPreset = useCallback((preset: 'performance' | 'balanced' | 'quality') => {
        let newSettings: PreviewQualitySettings;

        switch (preset) {
            case 'performance':
                newSettings = {
                    renderQuality: 'low',
                    updateFrequency: 33, // ~30fps
                    enableSubtitles: true,
                    enableTextOverlays: true,
                    enablePerformanceMode: true
                };
                break;
            case 'balanced':
                newSettings = {
                    renderQuality: 'medium',
                    updateFrequency: 16, // ~60fps
                    enableSubtitles: true,
                    enableTextOverlays: true,
                    enablePerformanceMode: false
                };
                break;
            case 'quality':
                newSettings = {
                    renderQuality: 'high',
                    updateFrequency: 16, // ~60fps
                    enableSubtitles: true,
                    enableTextOverlays: true,
                    enablePerformanceMode: false
                };
                break;
        }

        onQualityChange(newSettings);
        setShowQualitySettings(false);
    }, [onQualityChange]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle shortcuts when no input is focused
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            );

            if (isInputFocused || disabled) return;

            switch (event.code) {
                case 'Space':
                case 'KeyK':
                    event.preventDefault();
                    onPlayPause();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    if (event.shiftKey) {
                        onFrameStep('backward');
                    } else {
                        onSkipBackward(5);
                    }
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (event.shiftKey) {
                        onFrameStep('forward');
                    } else {
                        onSkipForward(5);
                    }
                    break;
                case 'Comma':
                    event.preventDefault();
                    onFrameStep('backward');
                    break;
                case 'Period':
                    event.preventDefault();
                    onFrameStep('forward');
                    break;
                case 'Home':
                    event.preventDefault();
                    onGoToStart();
                    break;
                case 'End':
                    event.preventDefault();
                    onGoToEnd();
                    break;
                case 'KeyJ':
                    event.preventDefault();
                    onSkipBackward(10);
                    break;
                case 'KeyL':
                    event.preventDefault();
                    onSkipForward(10);
                    break;
                case 'Digit1':
                    event.preventDefault();
                    setQualityPreset('performance');
                    break;
                case 'Digit2':
                    event.preventDefault();
                    setQualityPreset('balanced');
                    break;
                case 'Digit3':
                    event.preventDefault();
                    setQualityPreset('quality');
                    break;
                case 'Slash':
                    if (event.shiftKey) {
                        event.preventDefault();
                        setShowKeyboardHelp(!showKeyboardHelp);
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        onPlayPause, onSkipBackward, onSkipForward, onFrameStep, onGoToStart, onGoToEnd,
        setQualityPreset, showKeyboardHelp, disabled
    ]);

    return (
        <div className="bg-gray-100 rounded-lg p-4 space-y-4">
            {/* Primary Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Transport Controls */}
                    <button
                        onClick={onGoToStart}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        title="Go to start (Home)"
                    >
                        ⏮
                    </button>

                    <button
                        onClick={() => onSkipBackward(10)}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        title="Skip back 10s (J)"
                    >
                        -10s
                    </button>

                    <button
                        onClick={() => onFrameStep('backward')}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        title="Previous frame (,)"
                    >
                        ⏪
                    </button>

                    <button
                        onClick={onPlayPause}
                        disabled={disabled}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
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

                    <button
                        onClick={() => onFrameStep('forward')}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        title="Next frame (.)"
                    >
                        ⏩
                    </button>

                    <button
                        onClick={() => onSkipForward(10)}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        title="Skip forward 10s (L)"
                    >
                        +10s
                    </button>

                    <button
                        onClick={onGoToEnd}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        title="Go to end (End)"
                    >
                        ⏭
                    </button>
                </div>

                {/* Settings and Help */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowQualitySettings(!showQualitySettings)}
                            disabled={disabled}
                            className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                            title="Quality settings"
                        >
                            ⚙️
                        </button>

                        {showQualitySettings && (
                            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-4 z-10 min-w-64">
                                <h4 className="font-medium mb-3">Preview Quality Settings</h4>

                                {/* Quality Presets */}
                                <div className="space-y-2 mb-4">
                                    <div className="text-sm text-gray-600 mb-2">Quick Presets:</div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setQualityPreset('performance')}
                                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                            title="Performance mode (1)"
                                        >
                                            Performance
                                        </button>
                                        <button
                                            onClick={() => setQualityPreset('balanced')}
                                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                            title="Balanced mode (2)"
                                        >
                                            Balanced
                                        </button>
                                        <button
                                            onClick={() => setQualityPreset('quality')}
                                            className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                                            title="Quality mode (3)"
                                        >
                                            Quality
                                        </button>
                                    </div>
                                </div>

                                {/* Individual Settings */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Render Quality:</label>
                                        <select
                                            value={qualitySettings.renderQuality}
                                            onChange={(e) => onQualityChange({
                                                ...qualitySettings,
                                                renderQuality: e.target.value as 'low' | 'medium' | 'high'
                                            })}
                                            className="w-full border rounded px-2 py-1 text-sm"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Update Rate: {Math.round(1000 / qualitySettings.updateFrequency)}fps
                                        </label>
                                        <input
                                            type="range"
                                            min="16"
                                            max="100"
                                            step="1"
                                            value={qualitySettings.updateFrequency}
                                            onChange={(e) => onQualityChange({
                                                ...qualitySettings,
                                                updateFrequency: parseInt(e.target.value)
                                            })}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={qualitySettings.enableSubtitles}
                                                onChange={(e) => onQualityChange({
                                                    ...qualitySettings,
                                                    enableSubtitles: e.target.checked
                                                })}
                                            />
                                            <span className="text-sm">Enable Subtitles</span>
                                        </label>

                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={qualitySettings.enableTextOverlays}
                                                onChange={(e) => onQualityChange({
                                                    ...qualitySettings,
                                                    enableTextOverlays: e.target.checked
                                                })}
                                            />
                                            <span className="text-sm">Enable Text Overlays</span>
                                        </label>

                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={qualitySettings.enablePerformanceMode}
                                                onChange={(e) => onQualityChange({
                                                    ...qualitySettings,
                                                    enablePerformanceMode: e.target.checked
                                                })}
                                            />
                                            <span className="text-sm">Performance Mode</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                        disabled={disabled}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        title="Keyboard shortcuts (?)"
                    >
                        ?
                    </button>
                </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{formatTime(currentTime)}</span>
                    <span>
                        Trim: {formatTime(trimBounds.start)} - {formatTime(trimBounds.end)}
                    </span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="relative">
                    <input
                        ref={scrubberRef}
                        type="range"
                        min={0}
                        max={duration}
                        step={0.01}
                        value={currentTime}
                        onChange={handleScrubberChange}
                        onMouseDown={handleScrubberMouseDown}
                        onMouseUp={handleScrubberMouseUp}
                        disabled={disabled}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                        style={{
                            background: `linear-gradient(to right, 
                                #d1d5db 0%, 
                                #d1d5db ${(trimBounds.start / duration) * 100}%, 
                                #3b82f6 ${(trimBounds.start / duration) * 100}%, 
                                #3b82f6 ${(trimBounds.end / duration) * 100}%, 
                                #d1d5db ${(trimBounds.end / duration) * 100}%, 
                                #d1d5db 100%)`
                        }}
                    />

                    {/* Playhead indicator */}
                    <div
                        className="absolute top-0 w-1 h-2 bg-red-500 rounded pointer-events-none"
                        style={{
                            left: `${(currentTime / duration) * 100}%`,
                            transform: 'translateX(-50%)'
                        }}
                    />
                </div>
            </div>

            {/* Keyboard Help */}
            {showKeyboardHelp && (
                <div className="bg-white border rounded-lg p-4 text-sm">
                    <h4 className="font-medium mb-3">Keyboard Shortcuts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">Space</kbd> or <kbd className="bg-gray-200 px-2 py-1 rounded">K</kbd> - Play/Pause</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">←/→</kbd> - Skip 5s</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">Shift+←/→</kbd> - Frame step</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">,/.</kbd> - Frame step</div>
                        </div>
                        <div className="space-y-1">
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">J/L</kbd> - Skip 10s</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">Home/End</kbd> - Go to start/end</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">1/2/3</kbd> - Quality presets</div>
                            <div><kbd className="bg-gray-200 px-2 py-1 rounded">?</kbd> - Toggle this help</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Indicators */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                    <span>Quality: {qualitySettings.renderQuality}</span>
                    <span>FPS: {Math.round(1000 / qualitySettings.updateFrequency)}</span>
                    {qualitySettings.enablePerformanceMode && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Performance Mode</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isDraggingScrubber && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Scrubbing</span>
                    )}
                    {isPlaying && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Playing</span>
                    )}
                </div>
            </div>
        </div>
    );
}