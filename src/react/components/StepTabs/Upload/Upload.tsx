"use client";

import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { Button } from "../../ui/button";
import { Video } from "lucide-react";

interface UploadProps {
    setActiveTab: (tab: string) => void;
}

export default function Upload({ setActiveTab }: UploadProps) {
    const { absolutePath, previewUrl, setFile, clearFile } = useUploadStore();

    const pickVideo = async () => {
        const path = await window.electron?.ipcRenderer.invoke("dialog:openVideo");
        if (path) {
            // read file into blob for preview
            const buffer = await window.electron?.ipcRenderer.invoke("file:read", path);
            const blob = new Blob([buffer], { type: "video/mp4" });
            const previewUrl = URL.createObjectURL(blob);

            setFile(path, previewUrl); // ✅ save both in store
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-6">
            {!absolutePath ? (
                <>
                    <Button onClick={pickVideo}>
                        <Video className="mr-2 h-4 w-4" /> Select Video (max 2GB)
                    </Button>
                </>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    {/* Use blob URL for <video> playback */}
                    <video
                        src={previewUrl ?? ""}
                        controls
                        className="max-w-lg rounded-lg border shadow"
                    />
                    <p className="text-sm text-muted-foreground break-all">
                        {absolutePath}
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={() => clearFile()} variant="destructive">
                            Remove
                        </Button>
                        <Button onClick={() => setActiveTab("transcription")}>
                            Move to Transcription
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
