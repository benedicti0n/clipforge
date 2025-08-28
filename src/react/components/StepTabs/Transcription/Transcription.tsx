"use client";

import { useEffect, useMemo } from "react";
import WhisperModelDropdown from "./WhisperModelDropDown";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { useTranscriptionStore, WHISPER_MODELS, type WhisperModel } from "../../../store/StepTabs/transcriptionStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { PlayCircle } from "lucide-react";
import { ScrollArea } from "../../ui/scroll-area";

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

function bytesMB(n: number) {
    return `${n.toLocaleString()} MB`;
}

export default function TranscriptionTab() {
    const { file } = useUploadStore();

    const {
        selectedModel,
        cache,
        setCacheFor,
        setDownloadProgress,
        isDownloading,
        setIsDownloading,
        isTranscribing,
        setIsTranscribing,
        transcriptPath,
        transcriptPreview,
        transcriptFull,
        setTranscriptPath,
        setTranscriptPreview,
        setTranscriptFull,
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

    const canStart = useMemo(() => {
        if (!file) return false;
        if (!selectedModel) return false;
        if (!cache[selectedModel]) return false;
        return true;
    }, [file, selectedModel, cache]);

    const handleDownload = async (model: WhisperModel) => {
        setIsDownloading(true);
        setDownloadProgress(model, 0);

        try {
            // Expect main process to stream progress events (0-100)
            // and resolve when done. If not available yet, we poll a fake progress.
            if (ipc?.on) {
                ipc.on("whisper:download:progress", (_evt: any, payload: { model: WhisperModel; percent: number }) => {
                    if (payload.model === model) {
                        setDownloadProgress(model, Math.max(0, Math.min(100, payload.percent)));
                    }
                });
            }

            await ipc?.invoke?.("whisper:downloadModel", model);
            setCacheFor(model, true);
            setDownloadProgress(model, 100);
        } catch (e) {
            console.error(e);
            setDownloadProgress(model, 0);
            alert("Failed to download model. Please try again.");
        } finally {
            setIsDownloading(false);
            if (ipc?.removeAllListeners) ipc.removeAllListeners("whisper:download:progress");
        }
    };

    const handleStartTranscription = async () => {
        if (!file || !selectedModel) return;

        setIsTranscribing(true);
        resetResults();

        try {
            // NOTE: In Electron, File objects often have a non-standard `.path`.
            // If not available in your setup, you can pass the file as a temp path
            // created on the main process. Adjust the IPC accordingly.
            const filePath = (file as any).path ?? null;

            const resp: {
                transcriptPath: string;
                preview: string; // short preview text
                full: string;    // full transcript text
            } =
                (await ipc?.invoke?.("whisper:transcribe", {
                    model: selectedModel,
                    videoPath: filePath,
                    // You can pass flags like: { outputFormat: "srt|txt", timestamps: true }
                })) ??
                // Dev fallback (no Electron):
                {
                    transcriptPath: "/tmp/mock_transcript.txt",
                    preview:
                        "[00:00] Hello everyone...\n[00:10] In this video we discuss...\n[00:20] Persistence is key.\n...",
                    full:
                        "[00:00] Hello everyone, welcome...\n[00:10] In this video, we will discuss X...\n[00:20] Persistence is key to success...\n[00:31] Thank you for watching...",
                };

            setTranscriptPath(resp.transcriptPath);
            setTranscriptPreview(resp.preview);
            setTranscriptFull(resp.full);
        } catch (e) {
            console.error(e);
            alert("Transcription failed. Check logs and try again.");
        } finally {
            setIsTranscribing(false);
        }
    };

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
                        {transcriptPreview ? (
                            <pre className="whitespace-pre-wrap text-sm">{transcriptPreview}</pre>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                Preview will appear here after transcription.
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
                            variant="ghost"
                            onClick={() => {
                                if (!transcriptFull) return;
                                // Simple modal-less “full view”: replace preview with full (toggle)
                                // You can replace with a Sheet/Modal later.
                                const currentlyPreviewingFull = transcriptPreview === transcriptFull;
                                if (currentlyPreviewingFull) {
                                    // restore short preview (first 800 chars)
                                    const short = transcriptFull.slice(0, 800) + (transcriptFull.length > 800 ? "\n..." : "");
                                    setTranscriptPreview(short);
                                } else {
                                    setTranscriptPreview(transcriptFull);
                                }
                            }}
                            disabled={!transcriptFull}
                        >
                            Toggle Full / Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
