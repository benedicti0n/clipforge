import { Slider } from "../../ui/slider";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";  // ✅ add this

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

            {/* Background Box Switch */}
            <div className="flex items-center justify-between">
                <label className="text-sm">Background Box</label>
                <Switch
                    checked={style.backgroundEnabled}
                    onCheckedChange={(v) => setStyle({ ...style, backgroundEnabled: v })}
                />
            </div>

            {/* Background Box Controls */}
            {style.backgroundEnabled && (
                <div className="space-y-3 pl-2 border-l border-gray-300 mt-2">
                    {/* Background Color */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm w-24">Color</label>
                        <Input
                            type="color"
                            value={style.backgroundColor}
                            onChange={(e) =>
                                setStyle({ ...style, backgroundColor: e.target.value })
                            }
                        />
                    </div>

                    {/* Background Opacity */}
                    <div>
                        <label className="text-sm">Opacity</label>
                        <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[style.backgroundOpacity]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundOpacity: v[0] })
                            }
                        />
                    </div>

                    {/* Border Radius */}
                    <div>
                        <label className="text-sm">Border Radius</label>
                        <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[style.backgroundRadius]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundRadius: v[0] })
                            }
                        />
                    </div>

                    {/* Padding */}
                    <div>
                        <label className="text-sm">Padding</label>
                        <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[style.backgroundPadding]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundPadding: v[0] })
                            }
                        />
                    </div>
                </div>
            )}

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

            {/* Opacity */}
            <div>
                <label className="text-sm">Opacity</label>
                <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[style.opacity]}
                    onValueChange={(v) => setStyle({ ...style, opacity: v[0] })}
                />
            </div>

        </div>
    );
}
