"use client";

import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

import type { SubtitleStyle, CustomText } from "../../../../types/subtitleTypes";

interface Preset {
    name: string;
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
}

interface PresetPanelProps {
    subtitleStyle: SubtitleStyle;
    setSubtitleStyle: (s: SubtitleStyle) => void;
    customTexts: CustomText[];
    setCustomTexts: (t: CustomText[]) => void;
}

export default function PresetPanel({
    subtitleStyle,
    setSubtitleStyle,
    customTexts,
    setCustomTexts,
}: PresetPanelProps) {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [newPresetName, setNewPresetName] = useState("");

    // 🔹 Load presets from disk on mount
    useEffect(() => {
        window.electron?.ipcRenderer
            .invoke("presets:list")
            .then((data: Preset[]) => setPresets(data))
            .catch((err) => console.error("[Presets] Failed to load:", err));
    }, []);

    const savePreset = async () => {
        if (!newPresetName.trim()) return;
        const newPreset: Preset = {
            name: newPresetName.trim(),
            subtitleStyle,
            customTexts,
        };

        try {
            await window.electron?.ipcRenderer.invoke("presets:save", newPreset);
            const updated = await window.electron?.ipcRenderer.invoke("presets:list");
            setPresets(updated);
            setNewPresetName("");
        } catch (err) {
            console.error("[Presets] Save failed:", err);
        }
    };

    const applyPreset = (preset: Preset) => {
        setSubtitleStyle(preset.subtitleStyle);
        setCustomTexts(preset.customTexts);
    };

    const deletePreset = async (name: string) => {
        try {
            await window.electron?.ipcRenderer.invoke("presets:delete", name);
            const updated = await window.electron?.ipcRenderer.invoke("presets:list");
            setPresets(updated);
        } catch (err) {
            console.error("[Presets] Delete failed:", err);
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Presets</h4>

            {/* Input + Save */}
            <div className="flex gap-2">
                <Input
                    placeholder="Preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                />
                <Button onClick={savePreset}>Save</Button>
            </div>

            {/* List */}
            <div className="space-y-2">
                {presets.length === 0 && (
                    <p className="text-sm text-gray-500">No presets saved yet.</p>
                )}

                {presets.map((preset) => (
                    <div
                        key={preset.name}
                        className="flex items-center justify-between border p-2 rounded"
                    >
                        <span className="text-sm">{preset.name}</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => applyPreset(preset)}>
                                Apply
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deletePreset(preset.name)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
