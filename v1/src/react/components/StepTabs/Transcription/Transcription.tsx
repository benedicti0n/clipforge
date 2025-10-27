"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import {
    useTranscriptionStore,
    useSelectedModel,
    useIsModelCached,
    useIsDownloadingModel,
    useProgressForModel,
    useIsTranscribing,
    type WhisperModel,
} from "../../../store/StepTabs/transcriptionStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { PlayCircle } from "lucide-react";
import { ScrollArea } from "../../ui/scroll-area";
import { Progress } from "../../ui/progress";
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

// 🔹 Inline progress component with “Completed ✅”
function CurrentModelProgress({ model }: { model: WhisperModel }) {
    const progress = useProgressForModel(model);
    const isDownloading = useIsDownloadingModel(model);

    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        if (progress === 100) {
            setShowCompleted(true);
            const t = setTimeout(() => setShowCompleted(false), 2000);
            return () => clearTimeout(t);
        }
    }, [progress]);

    if (showCompleted) {
        return (
            <span className="text-xs text-green-600 font-medium">
                Completed ✅
            </span>
        );
    }

    if (!isDownloading || progress === null || progress >= 100) return null;

    return (
        <div className="flex flex-col gap-1">
            <Progress value={progress} className="w-full" />
            <span className="text-xs text-muted-foreground">
                Downloading {model}… {progress}%
            </span>
        </div>
    );
}

export default function TranscriptionTab({
    setActiveTab,
}: {
    setActiveTab: (tab: string) => void;
}) {
    const selectedModel = useSelectedModel();
    const isTranscribing = useIsTranscribing();

    const setIsTranscribing = useTranscriptionStore((s) => s.setIsTranscribing);
    const setTranscriptPath = useTranscriptionStore((s) => s.setTranscriptPath);
    const setTranscriptPreview = useTranscriptionStore(
        (s) => s.setTranscriptPreview
    );
    const setTranscriptFull = useTranscriptionStore((s) => s.setTranscriptFull);
    const setTranscriptSRT = useTranscriptionStore((s) => s.setTranscriptSRT);
    const transcriptPath = useTranscriptionStore((s) => s.transcriptPath);
    const transcriptFull = useTranscriptionStore((s) => s.transcriptFull);
    const transcriptSRT = useTranscriptionStore((s) => s.transcriptSRT);
    const resetResults = useTranscriptionStore((s) => s.resetResults);

    const ipc = window.electron?.ipcRenderer;

    function getBaseName(filePath: string) {
        const parts = filePath.split(/[\\/]/); // split by slash or backslash
        const file = parts[parts.length - 1];
        return file.replace(/\.[^/.]+$/, ""); // remove extension
    }

    const { absolutePath } = useUploadStore();
    const videoBaseName = absolutePath ? getBaseName(absolutePath) : "transcript";

    // ✅ Always call hooks unconditionally with fallback
    const isCached = useIsModelCached(selectedModel ?? "tiny");
    const isDownloading = useIsDownloadingModel(selectedModel ?? "tiny");

    // ✅ Derived boolean
    const canStart =
        !!absolutePath && !!selectedModel && isCached && !isDownloading;

    const handleStartTranscription = async () => {
        if (!absolutePath || !selectedModel) return;

        setIsTranscribing(true);
        resetResults();

        try {
            const resp = await ipc?.invoke("whisper:transcribe", {
                model: selectedModel,
                videoPath: absolutePath,
            });

            if (!resp) throw new Error("IPC returned undefined");

            setTranscriptPath(resp.transcriptPath);
            setTranscriptPreview(resp.preview);
            setTranscriptFull(resp.full);
            setTranscriptSRT(resp.srt);
        } catch (e) {
            console.error(e);
            alert("Transcription failed. See logs.");
        } finally {
            setIsTranscribing(false);
        }
    };

    // Logs state
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        const handler = (msg: string) => setLogs((prev) => [...prev, msg]);
        ipc?.on?.("whisper:log", handler);
        return () => ipc?.removeAllListeners?.("whisper:log");
    }, [ipc]);

    useEffect(() => {
        const handleStopped = () => {
            setLogs(["⚠️ Transcription stopped by user."]);
            setIsTranscribing(false);
        };
        ipc?.on?.("whisper:stopped", handleStopped);
        return () => ipc?.removeAllListeners?.("whisper:stopped");
        // eslint-disable-next-line 
    }, [ipc]);

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
                    <CardTitle>Whisper Models</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <WhisperModelDropdown />
                    <Separator />

                    <div className="space-y-2">
                        {isTranscribing ? (
                            <Button
                                className="w-full"
                                variant="destructive"
                                onClick={async () => {
                                    await ipc?.invoke("whisper:stop");
                                    resetResults();
                                    setLogs([]);
                                    setIsTranscribing(false);
                                }}
                            >
                                Stop Transcription
                            </Button>
                        ) : (
                            <Button
                                className="w-full"
                                onClick={handleStartTranscription}
                                disabled={!canStart}
                            >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Start Transcription
                            </Button>
                        )}

                        {selectedModel && <CurrentModelProgress model={selectedModel} />}
                    </div>

                    <ScrollArea className="h-[300px] rounded border bg-white dark:bg-black text-black dark:text-white font-mono text-xs p-2">
                        {logs.length === 0 ? (
                            <div className="text-muted-foreground">
                                Logs will appear here...
                            </div>
                        ) : (
                            <>
                                {logs.map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                                <div ref={logsEndRef} />
                            </>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* RIGHT: Transcript results */}
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

                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (!transcriptFull) return;
                                const blob = new Blob([transcriptFull], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${videoBaseName}.txt`;
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
                                a.download = `${videoBaseName}.srt`;
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
                                    const path = await ipc?.invoke("dialog:openSRT");
                                    if (!path) return;
                                    const content = await ipc?.invoke("file:readText", path);
                                    if (content) {
                                        setTranscriptSRT(content);
                                        setTranscriptPath(path);
                                        setTranscriptPreview(
                                            content.slice(0, 800) +
                                            (content.length > 800 ? "\n..." : "")
                                        );
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
