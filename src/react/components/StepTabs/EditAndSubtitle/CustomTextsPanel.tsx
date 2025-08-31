"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Slider } from "../../ui/slider";

import type { CustomText } from "../../../../types/subtitleTypes";

interface CustomTextsPanelProps {
    texts: CustomText[];
    setTexts: (texts: CustomText[]) => void;
}

export default function CustomTextsPanel({ texts, setTexts }: CustomTextsPanelProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const updateText = (patch: Partial<CustomText>) => {
        if (activeIndex === null) return;
        setTexts(texts.map((t, i) => (i === activeIndex ? { ...t, ...patch } : t)));
    };

    const addText = () => {
        setTexts([
            ...texts,
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
        setActiveIndex(texts.length);
    };

    const deleteText = () => {
        if (activeIndex === null) return;
        setTexts(texts.filter((_, i) => i !== activeIndex));
        setActiveIndex(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">Custom Texts</h4>
                <Button size="sm" onClick={addText}>➕ Add</Button>
            </div>

            {texts.length === 0 && (
                <p className="text-xs text-muted-foreground">No custom texts yet.</p>
            )}

            <div className="space-y-2">
                {texts.map((t, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded cursor-pointer ${activeIndex === i ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                        onClick={() => setActiveIndex(i)}
                    >
                        {t.text || `Text ${i + 1}`}
                    </div>
                ))}
            </div>

            {activeIndex !== null && (
                <div className="border rounded p-3 space-y-3">
                    <Input
                        value={texts[activeIndex].text}
                        onChange={(e) => updateText({ text: e.target.value })}
                    />
                    <Input
                        type="color"
                        value={texts[activeIndex].fontColor}
                        onChange={(e) => updateText({ fontColor: e.target.value })}
                    />
                    <Input
                        type="color"
                        value={texts[activeIndex].strokeColor}
                        onChange={(e) => updateText({ strokeColor: e.target.value })}
                    />
                    <Slider
                        min={12}
                        max={72}
                        step={1}
                        value={[texts[activeIndex].fontSize]}
                        onValueChange={(v) => updateText({ fontSize: v[0] })}
                    />
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[texts[activeIndex].x]}
                        onValueChange={(v) => updateText({ x: v[0] })}
                    />
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[texts[activeIndex].y]}
                        onValueChange={(v) => updateText({ y: v[0] })}
                    />
                    <div className="flex justify-end">
                        <Button variant="destructive" size="sm" onClick={deleteText}>
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
