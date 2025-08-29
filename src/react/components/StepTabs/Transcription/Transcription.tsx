"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { useTranscriptionStore, WHISPER_MODELS } from "../../../store/StepTabs/transcriptionStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { PlayCircle } from "lucide-react";
import { ScrollArea } from "../../ui/scroll-area";
import WhisperModelDropdown from "./WhisperModelDropdown";

type IPC = {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on?: (channel: string, listener: (...args: any[]) => void) => void;
    removeAllListeners?: (channel: string) => void;
};

declare global {
    interface Window {
        electron?: { ipcRenderer: IPC };
    }
}

export default function TranscriptionTab({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
    const {
        selectedModel,
        cache,
        setCacheFor,
        isDownloading,
        isTranscribing,
        setIsTranscribing,
        transcriptPath,
        transcriptFull,
        setTranscriptPath,
        setTranscriptPreview,
        setTranscriptFull,
        setTranscriptSRT,
        transcriptSRT,
        resetResults,
    } = useTranscriptionStore();

    const ipc = window.electron?.ipcRenderer;

    // On mount: check cache status for all models
    useEffect(() => {
        let mounted = true;

        (async () => {
            for (const m of WHISPER_MODELS) {
                try {
                    const cached =
                        (await ipc?.invoke?.("whisper:checkCache", m.key)) ?? false;
                    if (!mounted) return;
                    setCacheFor(m.key, !!cached);
                } catch {
                    // Dev fallback: mark tiny/base cached to let you play with UI without Electron wired
                    if (!mounted) return;
                    setCacheFor(m.key, m.key === "tiny" || m.key === "base");
                }
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { absolutePath } = useUploadStore();

    const canStart = useMemo(() => {
        if (!absolutePath) return false;
        if (!selectedModel) return false;
        if (!cache[selectedModel]) return false;
        return true;
    }, [absolutePath, selectedModel, cache]);

    const handleStartTranscription = async () => {
        if (!absolutePath || !selectedModel) return;

        setIsTranscribing(true);
        resetResults();

        try {
            const resp = await window.electron?.ipcRenderer.invoke("whisper:transcribe", {
                model: selectedModel,
                videoPath: absolutePath,   // ✅ real filesystem path
            });

            if (!resp) throw new Error("IPC returned undefined");

            setTranscriptPath(resp.transcriptPath);
            setTranscriptPreview(resp.preview);
            setTranscriptFull(resp.full);
            setTranscriptSRT(resp.srt);  // ✅

        } catch (e) {
            console.error(e);
            alert("Transcription failed. See logs.");
        } finally {
            setIsTranscribing(false);
        }
    };


    const [logs, setLogs] = useState<string[]>([]);

    const logsEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        const handler = (msg: string) => {
            setLogs((prev) => [...prev, msg]);
        };

        window.electron?.ipcRenderer.on?.("whisper:log", handler);

        return () => {
            window.electron?.ipcRenderer.removeAllListeners?.("whisper:log");
        };
    }, []);

    function parseSRT(srt: string) {
        const blocks = srt.split(/\n\n+/).map((block) => {
            const lines = block.split("\n");
            if (lines.length >= 3) {
                const time = lines[1];
                const text = lines.slice(2).join(" ");
                return { time, text };
            }
            return null;
        });
        return blocks.filter(Boolean);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: Models */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Whisper Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <WhisperModelDropdown />

                    <Separator />

                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Selected: <span className="font-medium">{selectedModel ?? "—"}</span>
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleStartTranscription}
                            disabled={!canStart || isDownloading || isTranscribing}
                        >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {isTranscribing ? "Transcribing..." : "Start Transcription"}
                        </Button>

                        {/* ✅ Logs right below the button */}
                        <ScrollArea className="h-[300px] rounded border bg-white dark:bg-black text-black dark:text-white font-mono text-xs p-2">
                            {logs.length === 0 ? (
                                <div className="text-muted-foreground">Logs will appear here...</div>
                            ) : (
                                <>
                                    {logs.map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                    {/* invisible div to scroll into view */}
                                    <div ref={logsEndRef} />
                                </>
                            )}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>


            {/* RIGHT: Results / Preview */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm">
                        {transcriptPath ? (
                            <div className="text-muted-foreground">
                                Saved at: <span className="font-mono">{transcriptPath}</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">
                                No transcript yet. Run a transcription to see results here.
                            </div>
                        )}
                    </div>

                    <ScrollArea className="h-[340px] rounded-md border p-3">
                        {transcriptSRT ? (
                            parseSRT(transcriptSRT).map((seg, i) => (
                                <div key={i} className="mb-2">
                                    <div className="text-xs text-muted-foreground">{seg?.time}</div>
                                    <div className="text-sm">{seg?.text}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                Transcript with timestamps will appear here after transcription.
                            </div>
                        )}
                    </ScrollArea>


                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (!transcriptFull) return;
                                const blob = new Blob([transcriptFull], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "transcript.txt";
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            disabled={!transcriptFull}
                        >
                            Download Transcript
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                if (!transcriptSRT) return;
                                const blob = new Blob([transcriptSRT], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "transcript.srt";
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            disabled={!transcriptSRT}
                        >
                            Download SRT
                        </Button>

                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    const path = await window.electron?.ipcRenderer.invoke("dialog:openSRT");
                                    if (!path) return;

                                    const content = await window.electron?.ipcRenderer.invoke("file:readText", path);
                                    if (content) {
                                        setTranscriptSRT(content);
                                        setTranscriptPath(path);
                                        setTranscriptPreview(content.slice(0, 800) + (content.length > 800 ? "\n..." : ""));
                                        setTranscriptFull(content);
                                    }
                                } catch (e) {
                                    console.error("Failed to load SRT:", e);
                                    alert("Could not load SRT file.");
                                }
                            }}
                        >
                            Add transcript manually
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={() => {
                                resetResults();
                                setTranscriptSRT(null);
                            }}
                            disabled={!transcriptSRT && !transcriptFull}
                        >
                            Remove Transcript
                        </Button>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => setActiveTab("clipSelection")}
                        disabled={!transcriptSRT && !transcriptFull}
                    >
                        Move to Clip Selection
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
