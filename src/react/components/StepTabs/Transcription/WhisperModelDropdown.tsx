"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, ChevronDown } from "lucide-react";
import { useTranscriptionStore, WHISPER_MODELS, type WhisperModel } from "../../../store/StepTabs/transcriptionStore";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import { Badge } from "../../ui/badge";

function bytesMB(n: number) {
    return `${n.toLocaleString()} MB`;
}

export default function WhisperModelDropdown() {
    const {
        selectedModel,
        setSelectedModel,
        cache,
        downloadProgress,
        isDownloading,
        setIsDownloading,
        setCacheFor,
        setDownloadProgress,
    } = useTranscriptionStore();

    const [open, setOpen] = useState(false);

    const handleDownload = async (model: WhisperModel) => {
        setIsDownloading(true);
        setDownloadProgress(model, 0);

        try {
            // listen for progress events from main
            window.electron?.ipcRenderer.on?.(
                "whisper:download:progress",
                (payload: { model: WhisperModel; percent: number }) => {
                    if (payload.model === model) {
                        setDownloadProgress(model, Math.max(0, Math.min(100, payload.percent)));
                    }
                }
            );

            await window.electron?.ipcRenderer.invoke("whisper:downloadModel", model);
            setCacheFor(model, true);
            setDownloadProgress(model, 100);
        } catch (err) {
            console.error("Download error:", err);
            setDownloadProgress(model, 0);
            alert("Failed to download model. Check your internet and try again.");
        } finally {
            setIsDownloading(false);
            window.electron?.ipcRenderer.removeAllListeners?.("whisper:download:progress");
        }
    };


    const selectedMeta = WHISPER_MODELS.find((m) => m.key === selectedModel);

    useEffect(() => {
        const checkCache = async () => {
            for (const m of WHISPER_MODELS) {
                const cached = await window.electron?.ipcRenderer.invoke("whisper:checkCache", m.key);
                setCacheFor(m.key, !!cached);
            }
        };
        checkCache();
    }, [setCacheFor]);

    return (
        <div className="relative">
            {/* Trigger Button */}
            <Button
                variant="outline"
                className="w-full flex justify-between items-center"
                onClick={() => setOpen(!open)}
            >
                {selectedMeta ? (
                    <span>{selectedMeta.label} • {bytesMB(selectedMeta.sizeMB)}</span>
                ) : (
                    <span>Select a model</span>
                )}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>

            {/* Dropdown Content */}
            {open && (
                <div className="absolute mt-2 w-full rounded-xl border bg-popover shadow-lg z-10 max-h-[300px] overflow-y-auto">
                    {WHISPER_MODELS.map((m) => {
                        const isCached = !!cache[m.key];
                        const progress = downloadProgress[m.key] ?? 0;

                        return (
                            <div
                                key={m.key}
                                className="flex items-start justify-between rounded-lg border-b p-3 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => {
                                    setSelectedModel(m.key as WhisperModel);
                                    setOpen(false);
                                }}
                            >
                                {/* LEFT */}
                                <div className="flex flex-col">
                                    <span className="font-medium">{m.label}</span>
                                    <span className="text-xs text-muted-foreground">{m.note} • {bytesMB(m.sizeMB)}</span>
                                    {!isCached && progress > 0 && progress < 100 && (
                                        <div className="mt-2">
                                            <Progress value={progress} />
                                            <div className="text-xs mt-1">{Math.floor(progress)}%</div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT */}
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant={isCached ? "default" : "secondary"}>
                                        {isCached ? (
                                            <span className="inline-flex items-center gap-1">
                                                <CheckCircle2 className="h-4 w-4" /> Cached
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1">
                                                <CircleAlert className="h-4 w-4" /> Not cached
                                            </span>
                                        )}
                                    </Badge>

                                    {!isCached && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevent closing dropdown when clicking Download
                                                handleDownload(m.key as WhisperModel);
                                            }}
                                            disabled={isDownloading}
                                        >
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
