"use client";

import { useState, useEffect } from "react";
import { TextOverlay, TextStyle, DEFAULT_TEXT_STYLE } from "../../lib/text-overlay";
import { UseTextOverlaysReturn } from "../../lib/hooks/useTextOverlays";

interface TextOverlayManagerProps {
    textOverlayManager: UseTextOverlaysReturn;
    currentTime: number;
    videoDuration: number;
    onTimeSeek?: (time: number) => void;
}

const FONT_FAMILIES = [
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Times New Roman, serif',
    'Georgia, serif',
    'Courier New, monospace',
    'Verdana, sans-serif',
    'Impact, sans-serif',
    'Comic Sans MS, cursive',
    'Trebuchet MS, sans-serif',
    'Palatino, serif'
];

const FONT_WEIGHTS = [
    { value: 'normal', label: 'Normal' },
    { value: 'bold', label: 'Bold' },
    { value: '100', label: 'Thin' },
    { value: '300', label: 'Light' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' }
];

const TEXT_ALIGN_OPTIONS = [
    { value: 'left', label: 'Left', icon: '⬅️' },
    { value: 'center', label: 'Center', icon: '↔️' },
    { value: 'right', label: 'Right', icon: '➡️' }
];

const PRESET_COLORS = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080'
];

export default function TextOverlayManager({
    textOverlayManager,
    currentTime,
    videoDuration,
    onTimeSeek
}: TextOverlayManagerProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const selectedOverlay = textOverlayManager.getSelectedOverlay();

    // Local state for editing to avoid constant updates
    const [editingText, setEditingText] = useState('');
    const [editingStyle, setEditingStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
    const [editingTiming, setEditingTiming] = useState({ start: 0, end: 5 });

    // Update local state when selection changes
    useEffect(() => {
        if (selectedOverlay) {
            setEditingText(selectedOverlay.text);
            setEditingStyle(selectedOverlay.style);
            setEditingTiming(selectedOverlay.timing);
        } else {
            setEditingText('');
            setEditingStyle(DEFAULT_TEXT_STYLE);
            setEditingTiming({ start: currentTime, end: currentTime + 5 });
        }
    }, [selectedOverlay, currentTime]);

    const handleTextChange = (text: string) => {
        setEditingText(text);
        if (selectedOverlay) {
            textOverlayManager.updateOverlayText(selectedOverlay.id, text);
        }
    };

    const handleStyleChange = (styleUpdates: Partial<TextStyle>) => {
        const newStyle = { ...editingStyle, ...styleUpdates };
        setEditingStyle(newStyle);
        if (selectedOverlay) {
            textOverlayManager.updateOverlayStyle(selectedOverlay.id, styleUpdates);
        }
    };

    const handleTimingChange = (timing: { start: number; end: number }) => {
        setEditingTiming(timing);
        if (selectedOverlay) {
            textOverlayManager.updateOverlayTiming(selectedOverlay.id, timing);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;

        const [minStr, secStr] = parts;
        const mins = parseInt(minStr) || 0;
        const secs = parseFloat(secStr) || 0;

        return mins * 60 + secs;
    };

    if (!selectedOverlay) {
        return (
            <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Text Overlay Editor</h3>
                <div className="bg-gray-100 h-32 rounded flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-gray-500 block mb-2">No overlay selected</span>
                        <span className="text-sm text-gray-400">Select an overlay to edit its properties</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Text Overlay Editor</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        {showAdvanced ? 'Basic' : 'Advanced'}
                    </button>
                    <button
                        onClick={() => textOverlayManager.selectOverlay(null)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Text Content */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text Content
                    </label>
                    <textarea
                        value={editingText}
                        onChange={(e) => handleTextChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Enter overlay text..."
                    />
                </div>

                {/* Basic Style Controls */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Font Size */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Font Size
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="12"
                                max="72"
                                value={editingStyle.fontSize}
                                onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value) })}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 w-8">{editingStyle.fontSize}px</span>
                        </div>
                    </div>

                    {/* Text Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={editingStyle.color}
                                onChange={(e) => handleStyleChange({ color: e.target.value })}
                                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={editingStyle.color}
                                onChange={(e) => handleStyleChange({ color: e.target.value })}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="#ffffff"
                            />
                        </div>
                    </div>
                </div>

                {/* Color Presets */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Presets
                    </label>
                    <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleStyleChange({ color })}
                                className={`w-6 h-6 rounded border-2 ${editingStyle.color === color ? 'border-blue-500' : 'border-gray-300'
                                    }`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>

                {/* Font Family and Weight */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Font Family
                        </label>
                        <select
                            value={editingStyle.fontFamily}
                            onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {FONT_FAMILIES.map((font) => (
                                <option key={font} value={font}>
                                    {font.split(',')[0]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Font Weight
                        </label>
                        <select
                            value={editingStyle.fontWeight || 'normal'}
                            onChange={(e) => handleStyleChange({ fontWeight: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {FONT_WEIGHTS.map((weight) => (
                                <option key={weight.value} value={weight.value}>
                                    {weight.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Text Alignment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Alignment
                    </label>
                    <div className="flex gap-1">
                        {TEXT_ALIGN_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleStyleChange({ textAlign: option.value as any })}
                                className={`px-3 py-2 text-sm border rounded ${editingStyle.textAlign === option.value
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                title={option.label}
                            >
                                {option.icon} {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced Controls */}
                {showAdvanced && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        {/* Background Color */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Background Color
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!editingStyle.backgroundColor}
                                    onChange={(e) => handleStyleChange({
                                        backgroundColor: e.target.checked ? 'rgba(0, 0, 0, 0.7)' : undefined
                                    })}
                                    className="rounded"
                                />
                                <input
                                    type="color"
                                    value={editingStyle.backgroundColor?.replace(/rgba?\([^)]+\)/, '#000000') || '#000000'}
                                    onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                                    disabled={!editingStyle.backgroundColor}
                                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    value={editingStyle.backgroundColor || ''}
                                    onChange={(e) => handleStyleChange({ backgroundColor: e.target.value || undefined })}
                                    disabled={!editingStyle.backgroundColor}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                    placeholder="rgba(0, 0, 0, 0.7)"
                                />
                            </div>
                        </div>

                        {/* Border */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Border Width
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={editingStyle.borderWidth || 0}
                                    onChange={(e) => handleStyleChange({ borderWidth: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                                <span className="text-sm text-gray-600">{editingStyle.borderWidth || 0}px</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Border Color
                                </label>
                                <input
                                    type="color"
                                    value={editingStyle.borderColor || '#000000'}
                                    onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                                    disabled={!editingStyle.borderWidth}
                                    className="w-full h-8 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Opacity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Opacity
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={editingStyle.opacity || 1}
                                    onChange={(e) => handleStyleChange({ opacity: parseFloat(e.target.value) })}
                                    className="flex-1"
                                />
                                <span className="text-sm text-gray-600 w-8">{Math.round((editingStyle.opacity || 1) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timing Controls */}
                <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timing
                    </label>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                            <input
                                type="text"
                                value={formatTime(editingTiming.start)}
                                onChange={(e) => {
                                    const newStart = parseTime(e.target.value);
                                    if (newStart < editingTiming.end) {
                                        handleTimingChange({ ...editingTiming, start: newStart });
                                    }
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="0:00.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">End Time</label>
                            <input
                                type="text"
                                value={formatTime(editingTiming.end)}
                                onChange={(e) => {
                                    const newEnd = parseTime(e.target.value);
                                    if (newEnd > editingTiming.start && newEnd <= videoDuration) {
                                        handleTimingChange({ ...editingTiming, end: newEnd });
                                    }
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="0:05.00"
                            />
                        </div>
                    </div>

                    {/* Quick Timing Actions */}
                    <div className="flex gap-2 text-sm">
                        <button
                            onClick={() => handleTimingChange({ start: currentTime, end: editingTiming.end })}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                            Start Now
                        </button>
                        <button
                            onClick={() => handleTimingChange({ ...editingTiming, end: currentTime })}
                            disabled={currentTime <= editingTiming.start}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            End Now
                        </button>
                        <button
                            onClick={() => onTimeSeek?.(editingTiming.start)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Go to Start
                        </button>
                    </div>

                    {/* Duration Display */}
                    <div className="mt-2 text-xs text-gray-600">
                        Duration: {formatTime(editingTiming.end - editingTiming.start)}
                        {textOverlayManager.isOverlayActiveAtTime(selectedOverlay.id, currentTime) && (
                            <span className="ml-2 text-green-600">● Active</span>
                        )}
                    </div>
                </div>

                {/* Validation Errors */}
                {textOverlayManager.validationErrors[selectedOverlay.id] && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-medium text-red-800 mb-1">Validation Errors:</div>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {textOverlayManager.validationErrors[selectedOverlay.id].map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => textOverlayManager.duplicateOverlay(selectedOverlay.id)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                        Duplicate
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this overlay?')) {
                                textOverlayManager.removeOverlay(selectedOverlay.id);
                            }
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}