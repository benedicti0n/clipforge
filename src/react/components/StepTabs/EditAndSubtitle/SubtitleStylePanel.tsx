"use client";

import { Slider } from "../../ui/slider";
import { Input } from "../../ui/input";
import type { SubtitleStyle } from "../../../../types/subtitleTypes";

interface SubtitleStylePanelProps {
    style: SubtitleStyle;
    setStyle: (style: SubtitleStyle) => void;
}

export default function SubtitleStylePanel({ style, setStyle }: SubtitleStylePanelProps) {
    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-sm">Subtitle Style</h4>

            {/* Font Size */}
            <div className="flex items-center gap-3">
                <label className="text-sm w-24">Font Size</label>
                <Slider
                    min={12}
                    max={72}
                    step={1}
                    value={[style.fontSize]}
                    onValueChange={(v) => setStyle({ ...style, fontSize: v[0] })}
                />
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-3">
                <label className="text-sm w-24">Stroke Width</label>
                <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[style.strokeWidth]}
                    onValueChange={(v) => setStyle({ ...style, strokeWidth: v[0] })}
                />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-2">
                <Input
                    type="color"
                    value={style.fontColor}
                    onChange={(e) => setStyle({ ...style, fontColor: e.target.value })}
                />
                <Input
                    type="color"
                    value={style.strokeColor}
                    onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                />
            </div>

            {/* Font Family */}
            <select
                className="border rounded p-1 w-full"
                value={style.fontFamily}
                onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
            >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
            </select>

            {/* Position */}
            <div className="space-y-2">
                <label className="text-sm">Position X</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[style.x]}
                    onValueChange={(v) => setStyle({ ...style, x: v[0] })}
                />
                <label className="text-sm">Position Y</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[style.y]}
                    onValueChange={(v) => setStyle({ ...style, y: v[0] })}
                />
            </div>
        </div>
    );
}
