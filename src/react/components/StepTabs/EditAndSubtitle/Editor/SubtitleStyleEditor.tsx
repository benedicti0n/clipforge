import { Input } from "../../../ui/input";
import { Slider } from "../../../ui/slider";
import type { SubtitleStyle } from "./SubtitleModal";

interface Props {
    subtitleStyle: SubtitleStyle;
    setSubtitleStyle: (s: SubtitleStyle) => void;
}

export function SubtitleStyleEditor({ subtitleStyle, setSubtitleStyle }: Props) {
    return (
        <div className="border rounded p-3 space-y-3">
            <h4 className="text-sm font-semibold">Subtitle Style</h4>

            <div className="flex items-center gap-3">
                <label className="text-sm">Font Size</label>
                <Slider
                    min={12}
                    max={72}
                    step={1}
                    value={[subtitleStyle.fontSize]}
                    onValueChange={(v) =>
                        setSubtitleStyle({ ...subtitleStyle, fontSize: v[0] })
                    }
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Input
                    value={subtitleStyle.fontColor}
                    onChange={(e) =>
                        setSubtitleStyle({ ...subtitleStyle, fontColor: e.target.value })
                    }
                    placeholder="#ffffff"
                />
                <Input
                    value={subtitleStyle.strokeColor}
                    onChange={(e) =>
                        setSubtitleStyle({ ...subtitleStyle, strokeColor: e.target.value })
                    }
                    placeholder="#000000"
                />
            </div>

            <select
                className="border rounded p-1 w-full"
                value={subtitleStyle.fontFamily}
                onChange={(e) =>
                    setSubtitleStyle({ ...subtitleStyle, fontFamily: e.target.value })
                }
            >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
            </select>

            <div className="space-y-2">
                <label className="text-sm">Position X</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[subtitleStyle.x]}
                    onValueChange={(v) =>
                        setSubtitleStyle({ ...subtitleStyle, x: v[0] })
                    }
                />
                <label className="text-sm">Position Y</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[subtitleStyle.y]}
                    onValueChange={(v) =>
                        setSubtitleStyle({ ...subtitleStyle, y: v[0] })
                    }
                />
            </div>
        </div>
    );
}
