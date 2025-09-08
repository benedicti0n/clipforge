"use client";

import { useEffect } from "react";
import {
    useTranscriptionStore,
    WHISPER_MODELS,
    type WhisperModel,
} from "../../../store/StepTabs/transcriptionStore";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "../../ui/badge";

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

export default function WhisperModelDropdown() {
    const {
        selectedModel,
        setSelectedModel,
        setCacheFor,
        setDownloadProgress,
        setDownloading,
        getProgressForModel,
        isDownloadingModel,
        isModelCached,
    } = useTranscriptionStore();

    const ipc = window.electron?.ipcRenderer;

    // listen for progress events
    useEffect(() => {
        const handler = (
            _: unknown,
            { model, percent }: { model: WhisperModel; percent: number }
        ) => {
            setDownloadProgress(model, percent);
        };

        ipc?.on?.("whisper:download:progress", handler);
        return () => ipc?.removeAllListeners?.("whisper:download:progress");
    }, [ipc, setDownloadProgress]);

    const handleDownload = async (modelKey: WhisperModel) => {
        setDownloading(modelKey, true);
        setDownloadProgress(modelKey, 0);
        try {
            await ipc?.invoke("whisper:downloadModel", modelKey);
            setCacheFor(modelKey, true);
            setDownloadProgress(modelKey, 100);
        } catch (e) {
            console.error(e);
            alert("Download failed");
        } finally {
            setDownloading(modelKey, false);
        }
    };

    const handleDelete = async (modelKey: WhisperModel) => {
        const confirmed = confirm(`Delete model "${modelKey}" ?`);
        if (!confirmed) return;
        try {
            const resp = await ipc?.invoke("whisper:deleteModel", modelKey);
            if (resp?.success) {
                setCacheFor(modelKey, false);
                alert(`Deleted model "${modelKey}"`);
            } else {
                alert(resp?.message || "Failed to delete model");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting model");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    {selectedModel ? `Selected: ${selectedModel}` : "Select Whisper Model"}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[400px] max-h-[400px] overflow-y-auto p-2 space-y-2">
                {WHISPER_MODELS.map((m) => {
                    const isCached = isModelCached(m.key);
                    const isDownloading = isDownloadingModel(m.key);
                    const progress = getProgressForModel(m.key);
                    const isSelected = selectedModel === m.key;

                    return (
                        <div
                            key={m.key}
                            className={`rounded-md border p-3 cursor-pointer ${isSelected ? "bg-muted" : "hover:bg-accent"
                                }`}
                            onClick={() => setSelectedModel(m.key)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{m.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {m.note} · {m.sizeMB} MB
                                    </div>

                                    <div className="text-xs flex items-center gap-2">
                                        Status:
                                        {isCached ? (
                                            <Badge variant="success" className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Cached
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="destructive"
                                                className="flex items-center gap-1"
                                            >
                                                <XCircle className="h-3 w-3" />
                                                Not Cached
                                            </Badge>
                                        )}
                                    </div>

                                    {isDownloading && progress !== null && progress < 100 && (
                                        <div className="mt-2">
                                            <Progress value={progress} className="w-40" />
                                            <span className="text-xs">{progress}%</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {isCached ? (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(m.key);
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(m.key);
                                            }}
                                            disabled={isDownloading}
                                        >
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
