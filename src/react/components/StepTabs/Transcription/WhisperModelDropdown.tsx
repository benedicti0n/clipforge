"use client";

import { useEffect, useRef, useState } from "react";
import {
    WHISPER_MODELS,
    type WhisperModel,
    useTranscriptionStore,
    useProgressForModel,
    useIsDownloadingModel,
    useIsModelCached,
    useSelectedModel,
    useResyncDownloads, // ✅ added
} from "../../../store/StepTabs/transcriptionStore";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import { CheckCircle2, XCircle, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "../../ui/badge";

function ModelRow({ m }: { m: { key: WhisperModel; label: string; note: string; sizeMB: number } }) {
    const ipc = window.electron?.ipcRenderer;

    const selectedModel = useSelectedModel();
    const setSelectedModel = useTranscriptionStore((s) => s.setSelectedModel);
    const setCacheFor = useTranscriptionStore((s) => s.setCacheFor);
    const setDownloading = useTranscriptionStore((s) => s.setDownloading);
    const setDownloadProgress = useTranscriptionStore((s) => s.setDownloadProgress);

    const isCached = useIsModelCached(m.key);
    const downloading = useIsDownloadingModel(m.key);
    const progress = useProgressForModel(m.key);
    const isSelected = selectedModel === m.key;

    const handleDownload = async () => {
        setDownloading(m.key, true);
        setDownloadProgress(m.key, 0);
        try {
            await ipc?.invoke("whisper:downloadModel", m.key);
            setCacheFor(m.key, true);
        } catch (e) {
            console.error(e);
            alert("Download failed");
        } finally {
            setDownloading(m.key, false);
        }
    };

    const handleDelete = async () => {
        const confirmed = confirm(`Delete model "${m.key}" ?`);
        if (!confirmed) return;
        try {
            const resp = await ipc?.invoke("whisper:deleteModel", m.key);
            if (resp?.success) {
                setCacheFor(m.key, false);
                alert(`Deleted model "${m.key}"`);
            } else {
                alert(resp?.message || "Failed to delete model");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting model");
        }
    };

    return (
        <div
            className={`rounded-md border p-3 cursor-pointer transition-colors ${isSelected ? "bg-muted" : "hover:bg-accent"
                }`}
            onClick={() => setSelectedModel(m.key)}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-muted-foreground">
                        {m.note} · {m.sizeMB} MB
                    </div>

                    <div className="mt-1 text-xs flex items-center gap-2">
                        Status:
                        {isCached ? (
                            <Badge
                                variant="secondary"
                                className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                Cached
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Not Cached
                            </Badge>
                        )}
                    </div>

                    {/* ✅ Show progress if downloading (even after reload) */}
                    {downloading && (
                        <div className="mt-2">
                            <Progress value={progress ?? 0} className="w-48" />
                            <span className="text-xs">
                                {progress !== null ? `${progress}%` : "Starting…"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex gap-2">
                    {isCached ? (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                        >
                            Delete
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
                            }}
                            disabled={downloading}
                            className="inline-flex items-center gap-1"
                        >
                            {downloading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Download
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function WhisperModelDropdown() {
    const ipc = window.electron?.ipcRenderer;
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const setDownloadProgress = useTranscriptionStore((s) => s.setDownloadProgress);

    // ✅ auto resync downloading state after reload
    useResyncDownloads();

    // close on outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node | null;
            if (!t) return;
            if (panelRef.current?.contains(t)) return;
            if (triggerRef.current?.contains(t)) return;
            setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // subscribe to IPC events
    useEffect(() => {
        const handler = (
            _evt: unknown,
            payload: { model: WhisperModel; percent: number }
        ) => {
            setDownloadProgress(payload.model, payload.percent);
        };
        ipc?.on?.("whisper:download:progress", handler);
        return () => ipc?.removeAllListeners?.("whisper:download:progress");
    }, [ipc, setDownloadProgress]);

    const selectedModel = useSelectedModel();

    return (
        <div className="relative w-full">
            <Button
                ref={triggerRef}
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => setOpen((v) => !v)}
            >
                {selectedModel ? `Selected: ${selectedModel}` : "Select Whisper Model"}
                <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
            </Button>

            {open && (
                <div
                    ref={panelRef}
                    className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
                >
                    <div className="max-h-[420px] overflow-y-auto p-2 space-y-2">
                        {WHISPER_MODELS.map((m) => (
                            <ModelRow key={m.key} m={m} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
