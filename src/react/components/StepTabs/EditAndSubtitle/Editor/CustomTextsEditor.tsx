import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Slider } from "../../../ui/slider";
import type { CustomText } from "./SubtitleModal";

interface Props {
    customTexts: CustomText[];
    setCustomTexts: (t: CustomText[]) => void;
    activeIndex: number | null;
    setActiveIndex: (i: number | null) => void;
    updateActiveText: (patch: Partial<CustomText>) => void;
    deleteActiveText: () => void;
}

export function CustomTextsEditor({
    customTexts,
    setCustomTexts,
    activeIndex,
    setActiveIndex,
    updateActiveText,
    deleteActiveText,
}: Props) {
    const addCustomText = () => {
        setCustomTexts([
            ...customTexts,
            {
                text: "New text",
                fontSize: 24,
                fontColor: "#ffffff",
                strokeColor: "#000000",
                fontFamily: "Arial",
                x: 50,
                y: 50,
            },
        ]);
        setActiveIndex(customTexts.length);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Custom Texts</h4>
                <Button onClick={addCustomText} size="sm">
                    ➕ Add
                </Button>
            </div>

            {customTexts.length === 0 && (
                <p className="text-xs text-muted-foreground">No custom texts yet.</p>
            )}

            <div className="space-y-2">
                {customTexts.map((t, i) => (
                    <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeIndex === i
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                            }`}
                        onClick={() => setActiveIndex(i)}
                    >
                        <span className="text-sm truncate">
                            {t.text || `Text ${i + 1}`}
                        </span>
                        <span className="text-[11px] opacity-80">
                            {Math.round(t.x)}%, {Math.round(t.y)}%
                        </span>
                    </div>
                ))}
            </div>

            {activeIndex !== null && (
                <div className="border rounded p-3 space-y-3">
                    <Input
                        value={customTexts[activeIndex].text}
                        onChange={(e) => updateActiveText({ text: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            value={customTexts[activeIndex].fontColor}
                            onChange={(e) =>
                                updateActiveText({ fontColor: e.target.value })
                            }
                            placeholder="#ffffff"
                        />
                        <Input
                            value={customTexts[activeIndex].strokeColor}
                            onChange={(e) =>
                                updateActiveText({ strokeColor: e.target.value })
                            }
                            placeholder="#000000"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm">Font Size</label>
                        <Slider
                            min={12}
                            max={72}
                            step={1}
                            value={[customTexts[activeIndex].fontSize]}
                            onValueChange={(v) => updateActiveText({ fontSize: v[0] })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm">Position X</label>
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[customTexts[activeIndex].x]}
                            onValueChange={(v) => updateActiveText({ x: v[0] })}
                        />
                        <label className="text-sm">Position Y</label>
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[customTexts[activeIndex].y]}
                            onValueChange={(v) => updateActiveText({ y: v[0] })}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteActiveText}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
