"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";

import type { SubtitleEntry } from "../../../../electron/types/subtitleTypes";
import WhisperModelDropdown from "../Transcription/WhisperModelDropdown"; // 🔧 adjust path if needed
import {
    useSelectedModel,
    useIsModelCached,
    useTranscriptionStore,
    type WhisperModel,
} from "../../../store/StepTabs/transcriptionStore";

/* ---------------- utils ---------------- */

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

/* ------------- key bridge (renderer → main) -------------
   If your main's WHISPER_MODEL_FILES uses different keys
   (e.g. large-v2 / large-v3), map them here. */
const MODEL_KEY_BRIDGE: Record<WhisperModel, string> = {
    tiny: "tiny",
    base: "base",
    small: "small",
    medium: "medium",
    "large-turbo": "large-v3", // 👈 map turbo → v3 (adjust if your main differs)
    large: "large-v2",          // 👈 map large → v2 (adjust if your main differs)
};

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
    const ipc = typeof window !== "undefined" ? window.electron?.ipcRenderer : undefined;

    const selectedModel = useSelectedModel();
    const isCachedSelected = selectedModel ? useIsModelCached(selectedModel) : false;

    // (optional) also reflect global transcribing state in store if you want
    const setIsTranscribing = useTranscriptionStore((s) => s.setIsTranscribing);

    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [wordsPerLine, setWordsPerLine] = useState(3);

    const updateLine = (index: number, patch: Partial<SubtitleEntry>) => {
        setSubtitles(subtitles.map((s, i) => (i === index ? { ...s, ...patch } : s)));
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
        if (!ipc) {
            alert("IPC not available. Are you in Electron renderer?");
            return;
        }
        if (!selectedModel) {
            alert("Select a Whisper model first.");
            return;
        }

        const bridgedKey = MODEL_KEY_BRIDGE[selectedModel] ?? selectedModel;

        // Double-check cache in MAIN to avoid exit code 3 if store is stale
        const isActuallyCached = await ipc.invoke("whisper:checkCache", bridgedKey);
        if (!isActuallyCached) {
            alert(
                `The selected model "${selectedModel}" is not downloaded yet.\n` +
                `Open the dropdown, click "Download", then try again.`
            );
            return;
        }

        setLoading(true);
        setIsTranscribing?.(true);
        try {
            const resp: {
                transcriptPath: string;
                preview: string;
                full: string;
                srt: string;
            } | undefined = await ipc.invoke("whisper:transcribe", {
                model: bridgedKey, // ✅ use bridged key sent to main
                videoPath,
            });

            if (resp?.srt) {
                const parsed = parseSRT(resp.srt);
                const chunked = parsed.flatMap((entry) => splitEntry(entry, wordsPerLine));
                setSubtitles(chunked);
            } else {
                alert("No SRT returned from transcription.");
            }
        } catch (err: any) {
            console.error("Transcription failed:", err);
            const msg = (err?.message || String(err)).slice(0, 2000);
            alert(`Failed to generate transcript:\n\n${msg}`);
        } finally {
            setLoading(false);
            setIsTranscribing?.(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header row: title + model selector + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-sm">Transcript</h4>

                    {/* Selected model & cache badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Model:</span>
                        <div className="min-w-[220px]">
                            <WhisperModelDropdown />
                        </div>
                        {selectedModel && (
                            <Badge
                                variant={isCachedSelected ? "secondary" : "destructive"}
                                className={`text-xs ${isCachedSelected
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                    : ""
                                    }`}
                            >
                                {isCachedSelected ? "Cached" : "Not cached"}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Words/line</span>
                    <Input
                        type="number"
                        className="w-16 h-8 text-xs"
                        value={wordsPerLine}
                        min={2}
                        max={12}
                        onChange={(e) =>
                            setWordsPerLine(Math.max(2, Math.min(12, Number(e.target.value) || 3)))
                        }
                    />
                    <Button size="sm" variant="outline" onClick={handleGenerateTranscript} disabled={loading}>
                        {loading ? "Transcribing..." : "Generate"}
                    </Button>
                    <Button size="sm" onClick={addLine}>
                        Add Line
                    </Button>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 border rounded p-2 space-y-2">
                {subtitles.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subtitles yet.</p>
                )}
                {subtitles.map((s, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded border cursor-pointer transition-colors ${i === activeIndex ? "bg-primary text-primary-foreground" : "bg-muted"
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

            {/* Editor */}
            {activeIndex !== null && (
                <div className="mt-3 border rounded p-3 space-y-2">
                    <div className="flex gap-2">
                        <Input
                            className="text-xs"
                            value={subtitles[activeIndex].start}
                            onChange={(e) => updateLine(activeIndex, { start: e.target.value })}
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
                        <Button variant="destructive" size="sm" onClick={() => deleteLine(activeIndex)}>
                            Delete Line
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
