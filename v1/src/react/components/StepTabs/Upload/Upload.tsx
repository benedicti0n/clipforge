"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { Button } from "../../ui/button";
import { Video, Trash2, ArrowRight } from "lucide-react";

interface UploadProps {
    setActiveTab: (tab: string) => void;
}

export default function Upload({ setActiveTab }: UploadProps) {
    const { absolutePath, previewUrl, setFile, clearFile } = useUploadStore();

    // Metadata states
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [duration, setDuration] = useState<string | null>(null);
    const [resolution, setResolution] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const pickVideo = async () => {
        const path = await window.electron?.ipcRenderer.invoke("dialog:openVideo");
        if (path) {
            const buffer = await window.electron?.ipcRenderer.invoke("file:read", path);
            const blob = new Blob([buffer], { type: "video/mp4" });
            const previewUrl = URL.createObjectURL(blob);

            // File size from buffer
            setFileSize(formatBytes(buffer.byteLength));
            setFile(path, previewUrl);
        }
    };

    // Extract duration & resolution once video metadata is loaded
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const onLoaded = () => {
            const dur = videoEl.duration;
            const mins = Math.floor(dur / 60);
            const secs = Math.floor(dur % 60);
            setDuration(`${mins}m ${secs}s`);

            setResolution(`${videoEl.videoWidth} x ${videoEl.videoHeight}`);
        };

        videoEl.addEventListener("loadedmetadata", onLoaded);
        return () => {
            videoEl.removeEventListener("loadedmetadata", onLoaded);
        };
    }, [previewUrl]);

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
            {!absolutePath ? (
                <>
                    <div
                        className="w-full max-w-lg border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const file = e.dataTransfer.files[0];
                            if (!file) return;

                            if ("path" in file) {
                                // ✅ Running inside Electron
                                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const path = (file as any).path;
                                const buffer = await window.electron?.ipcRenderer.invoke("file:read", path);
                                const blob = new Blob([buffer], { type: file.type || "video/mp4" });
                                const previewUrl = URL.createObjectURL(blob);

                                setFile(path, previewUrl);
                            } else {
                                // ✅ Running in normal browser (fallback for dev mode)
                                const previewUrl = URL.createObjectURL(file);
                                setFile(file.name, previewUrl);
                            }
                        }}

                    >
                        <Video className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-gray-600">Drag & Drop your video here</p>
                        <p className="text-xs text-gray-400 mb-3">(max 2GB)</p>
                        <Button onClick={pickVideo}>Or Select Video</Button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                    <video
                        ref={videoRef}
                        src={previewUrl ?? ""}
                        controls
                        className="max-w-xl w-full rounded-lg border shadow"
                    />

                    {/* Metadata Section */}
                    <div className="w-full max-w-md rounded-lg border bg-muted/20 p-3 text-sm">
                        <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                            File Metadata
                        </h4>
                        <div className="space-y-1">
                            {absolutePath && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Path:</span>
                                    <span className="truncate max-w-[60%] text-right">{absolutePath}</span>
                                </div>
                            )}
                            {fileSize && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Size:</span>
                                    <span>{fileSize}</span>
                                </div>
                            )}
                            {duration && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Duration:</span>
                                    <span>{duration}</span>
                                </div>
                            )}
                            {resolution && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Resolution:</span>
                                    <span>{resolution}</span>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="flex gap-3">
                        <Button
                            onClick={clearFile}
                            variant="destructive"
                            className="flex gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remove
                        </Button>
                        <Button
                            onClick={() => setActiveTab("transcription")}
                            className="flex gap-2"
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Helper: format file size nicely ---
function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
