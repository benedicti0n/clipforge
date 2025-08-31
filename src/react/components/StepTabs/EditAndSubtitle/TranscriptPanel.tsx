"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { ScrollArea } from "../../ui/scroll-area";

import type { SubtitleEntry } from "../../../../types/subtitleTypes";

// --- utils ---
// parse raw SRT string → SubtitleEntry[]
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

// split one entry into chunks of N words
function splitEntry(entry: SubtitleEntry, wordsPerLine: number): SubtitleEntry[] {
    const words = entry.text.split(/\s+/).filter(Boolean);
    if (words.length <= wordsPerLine) return [entry];

    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
        chunks.push(words.slice(i, i + wordsPerLine).join(" "));
    }

    // proportionally distribute timings
    const [sh, sm, ssMs] = entry.start.split(":");
    const [eh, em, esMs] = entry.end.split(":");
    const startSec =
        parseInt(sh) * 3600 + parseInt(sm) * 60 + parseFloat(ssMs.replace(",", "."));
    const endSec =
        parseInt(eh) * 3600 + parseInt(em) * 60 + parseFloat(esMs.replace(",", "."));

    const total = Math.max(endSec - startSec, 0.01);
    const slice = total / chunks.length;

    const toSrtTime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.round((sec - Math.floor(sec)) * 1000);
        return (
            String(h).padStart(2, "0") +
            ":" +
            String(m).padStart(2, "0") +
            ":" +
            String(s).padStart(2, "0") +
            "," +
            String(ms).padStart(3, "0")
        );
    };

    return chunks.map((text, i) => ({
        start: toSrtTime(startSec + i * slice),
        end: toSrtTime(startSec + (i + 1) * slice),
        text,
    }));
}

interface TranscriptPanelProps {
    subtitles: SubtitleEntry[];
    setSubtitles: (subs: SubtitleEntry[]) => void;
    videoPath: string | null;
}

export default function TranscriptPanel({
    subtitles,
    setSubtitles,
    videoPath,
}: TranscriptPanelProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [wordsPerLine, setWordsPerLine] = useState(5);

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
                model: "base",
                videoPath,
            });

            if (resp?.srt) {
                const parsed = parseSRT(resp.srt);
                // ✅ split entries into smaller chunks
                const chunked = parsed.flatMap((entry) =>
                    splitEntry(entry, wordsPerLine)
                );
                setSubtitles(chunked);
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
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Words/line</span>
                    <Input
                        type="number"
                        className="w-16 h-8 text-xs"
                        value={wordsPerLine}
                        min={2}
                        max={12}
                        onChange={(e) =>
                            setWordsPerLine(Math.max(2, Math.min(12, Number(e.target.value) || 5)))
                        }
                    />
                    <Button size="sm" onClick={addLine}>
                        ➕
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateTranscript}
                        disabled={loading}
                    >
                        {loading ? "Transcribing..." : "Generate"}
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
