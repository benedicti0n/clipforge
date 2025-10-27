"use client";

import { Switch } from "../../ui/switch";

interface ClipOptionsPanelProps {
    accurate: boolean;
    setAccurate: (v: boolean) => void;
}

export default function ClipOptionsPanel({ accurate, setAccurate }: ClipOptionsPanelProps) {
    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-sm">Options</h4>
            <div className="flex items-center justify-between">
                <label className="text-sm">Frame Accurate Cuts</label>
                <Switch checked={accurate} onCheckedChange={setAccurate} />
            </div>
            {/* Future: Watermark toggle, presets, export formats */}
        </div>
    );
}
