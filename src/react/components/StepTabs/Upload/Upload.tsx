"use client";

import { Button } from "../../ui/button";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { useCallback } from "react";


export default function Upload() {
    const { file, setFile, clearFile } = useUploadStore();

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0];
            if (!selectedFile) return;

            // limit 2GB
            const maxSize = 2 * 1024 * 1024 * 1024;
            if (selectedFile.size > maxSize) {
                alert("File size exceeds 2GB limit!");
                return;
            }

            if (!selectedFile.type.startsWith("video/")) {
                alert("Only video files are allowed!");
                return;
            }

            setFile(selectedFile);
        },
        [setFile]
    );

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-6">
            {!file ? (
                <>
                    <input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <label htmlFor="video-upload">
                        <Button asChild>
                            <span>Select Video (max 2GB)</span>
                        </Button>
                    </label>
                </>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <video
                        src={URL.createObjectURL(file)}
                        controls
                        className="max-w-lg rounded-lg border shadow"
                    />
                    <p className="text-sm text-muted-foreground">{file.name}</p>
                    <div className="flex gap-2">
                        <Button onClick={() => clearFile()} variant="destructive">
                            Remove
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
