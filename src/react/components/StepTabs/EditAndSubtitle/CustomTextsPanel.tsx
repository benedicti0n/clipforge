"use client";

import { Input } from "../../ui/input";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";
import type { CustomText } from "../../../../types/subtitleTypes";

interface CustomTextsPanelProps {
    texts: CustomText[];
    setTexts: (texts: CustomText[]) => void;
}

export default function CustomTextsPanel({ texts, setTexts }: CustomTextsPanelProps) {
    const updateText = (index: number, updates: Partial<CustomText>) => {
        const newTexts = [...texts];
        newTexts[index] = { ...newTexts[index], ...updates };
        setTexts(newTexts);
    };

    const addText = () => {
        setTexts([
            ...texts,
            {
                text: "New Text",
                fontSize: 24,
                fontColor: "#ffffff",
                strokeColor: "#000000",
                strokeWidth: 1, // ✅ default stroke width
                fontFamily: "Arial",
                x: 50,
                y: 50,
                bold: false,
                italic: false,
                underline: false,
                opacity: 100,
            },
        ]);
    };

    const removeText = (index: number) => {
        setTexts(texts.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <Button onClick={addText}>+ Add Custom Text</Button>

            {texts.map((t, i) => (
                <div key={i} className="p-3 border rounded space-y-2">
                    <div className="flex items-center gap-2">
                        <Input
                            value={t.text}
                            onChange={(e) => updateText(i, { text: e.target.value })}
                            className="flex-1"
                        />
                        <Button variant="destructive" onClick={() => removeText(i)}>
                            Remove
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            type="color"
                            value={t.fontColor}
                            onChange={(e) => updateText(i, { fontColor: e.target.value })}
                        />
                        <Input
                            type="color"
                            value={t.strokeColor}
                            onChange={(e) => updateText(i, { strokeColor: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={t.fontFamily}
                            onChange={(e) => updateText(i, { fontFamily: e.target.value })}
                            className="border rounded p-1 flex-1"
                        >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Verdana">Verdana</option>
                        </select>
                        <Slider
                            min={12}
                            max={72}
                            step={1}
                            value={[t.fontSize]}
                            onValueChange={(v) => updateText(i, { fontSize: v[0] })}
                        />
                    </div>

                    {/* ✅ Stroke Width */}
                    <div className="space-y-1">
                        <label className="text-xs">Stroke Width</label>
                        <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[t.strokeWidth ?? 0]}
                            onValueChange={(v) => updateText(i, { strokeWidth: v[0] })}
                        />
                    </div>

                    {/* Typography Toggles */}
                    <div className="flex gap-2">
                        <Button
                            variant={t.bold ? "default" : "outline"}
                            onClick={() => updateText(i, { bold: !t.bold })}
                        >
                            B
                        </Button>
                        <Button
                            variant={t.italic ? "default" : "outline"}
                            onClick={() => updateText(i, { italic: !t.italic })}
                        >
                            I
                        </Button>
                        <Button
                            variant={t.underline ? "default" : "outline"}
                            onClick={() => updateText(i, { underline: !t.underline })}
                        >
                            U
                        </Button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs">Position X</label>
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[t.x]}
                            onValueChange={(v) => updateText(i, { x: v[0] })}
                        />
                        <label className="text-xs">Position Y</label>
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[t.y]}
                            onValueChange={(v) => updateText(i, { y: v[0] })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs">Opacity</label>
                        <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[t.opacity ?? 100]}
                            onValueChange={(v) => updateText(i, { opacity: v[0] })}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
