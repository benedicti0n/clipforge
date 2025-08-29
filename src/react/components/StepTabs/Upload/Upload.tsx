"use client";

import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { Button } from "../../ui/button";
import { Video } from "lucide-react";

interface UploadProps {
    setActiveTab: (tab: string) => void;
}

export default function Upload({ setActiveTab }: UploadProps) {
    const { filePath, setFilePath, clearFile } = useUploadStore();

    const pickVideo = async () => {
        const path = await window.electron?.ipcRenderer.invoke("dialog:openVideo");
        if (path) {
            const response = await window.electron?.ipcRenderer.invoke("file:read", path);
            const blob = new Blob([response], { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            setFilePath(url);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center gap-4 p-6">
            {!filePath ? (
                <>
                    <Button onClick={pickVideo}>
                        <Video className="mr-2 h-4 w-4" /> Select Video (max 2GB)
                    </Button>
                </>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <video
                        src={filePath}   // use the blob URL directly
                        controls
                        className="max-w-lg rounded-lg border shadow"
                    />
                    <p className="text-sm text-muted-foreground break-all">
                        {filePath.startsWith("blob:") ? "Blob URL (in-memory)" : filePath}
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
