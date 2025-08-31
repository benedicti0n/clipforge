"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { ScrollArea } from "../../ui/scroll-area";

import type { SubtitleEntry } from "../../../../types/subtitleTypes";

// utils to parse SRT → SubtitleEntry[]
function parseSRT(srt: string): SubtitleEntry[] {
    return srt
        .trim()
        .split(/\n\n+/)
        .map((block) => {
            const lines = block.split("\n");
            if (lines.length >= 3) {
                const [start, end] = lines[1].split(" --> ");
                const text = lines.slice(2).join(" ").replace(/\s+/g, " ").trim();
                return { start, end, text };
            }
            return null;
        })
        .filter(Boolean) as SubtitleEntry[];
}

interface TranscriptPanelProps {
    subtitles: SubtitleEntry[];
    setSubtitles: (subs: SubtitleEntry[]) => void;
    videoPath: string | null; // ✅ pass in from EditClipModal
}

export default function TranscriptPanel({
    subtitles,
    setSubtitles,
    videoPath,
}: TranscriptPanelProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const updateLine = (index: number, patch: Partial<SubtitleEntry>) => {
        setSubtitles(
            subtitles.map((s, i) => (i === index ? { ...s, ...patch } : s))
        );
    };

    const deleteLine = (index: number) => {
        setSubtitles(subtitles.filter((_, i) => i !== index));
        setActiveIndex(null);
    };

    const addLine = () => {
        setSubtitles([
            ...subtitles,
            { start: "00:00:00,000", end: "00:00:03,000", text: "New subtitle" },
        ]);
        setActiveIndex(subtitles.length);
    };

    const handleGenerateTranscript = async () => {
        if (!videoPath) {
            alert("No video file path provided");
            return;
        }
        setLoading(true);
        try {
            const resp: {
                transcriptPath: string;
                preview: string;
                full: string;
                srt: string;
            } = await window.electron?.ipcRenderer.invoke("whisper:transcribe", {
                model: "base", // or "small/medium" depending on quality/speed tradeoff
                videoPath,
            });

            if (resp?.srt) {
                const parsed = parseSRT(resp.srt);
                setSubtitles(parsed);
            }
        } catch (err) {
            console.error("Transcription failed:", err);
            alert("Failed to generate transcript. See logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Transcript</h4>
                <div className="flex gap-2">
                    <Button size="sm" onClick={addLine}>
                        ➕ Add Line
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateTranscript}
                        disabled={loading}
                    >
                        {loading ? "Transcribing..." : "Generate Transcript"}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 border rounded p-2 space-y-2">
                {subtitles.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subtitles yet.</p>
                )}
                {subtitles.map((s, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded border cursor-pointer ${activeIndex === i
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                        onClick={() => setActiveIndex(i)}
                    >
                        <div className="text-xs font-mono">
                            {s.start} → {s.end}
                        </div>
                        <div className="truncate text-sm">{s.text}</div>
                    </div>
                ))}
            </ScrollArea>

            {activeIndex !== null && (
                <div className="mt-3 border rounded p-3 space-y-2">
                    <div className="flex gap-2">
                        <Input
                            className="text-xs"
                            value={subtitles[activeIndex].start}
                            onChange={(e) =>
                                updateLine(activeIndex, { start: e.target.value })
                            }
                        />
                        <Input
                            className="text-xs"
                            value={subtitles[activeIndex].end}
                            onChange={(e) => updateLine(activeIndex, { end: e.target.value })}
                        />
                    </div>
                    <Textarea
                        value={subtitles[activeIndex].text}
                        onChange={(e) => updateLine(activeIndex, { text: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteLine(activeIndex)}
                        >
                            Delete Line
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
