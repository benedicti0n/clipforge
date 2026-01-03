"use client";

import { Download, MoveRight, Terminal, Trash2, Upload } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import TranscriptPreviewModal from "./TranscriptPreviewModal";
import { useClipsResponseStore } from "../../store/clipsResponseStore";
import { useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { useVideoStore } from "../../store/videoStore";

interface ClipsJsonRightProps {
    transcriptSRT: string;
}

export default function ClipsJsonRight({ transcriptSRT }: ClipsJsonRightProps) {
    const { video } = useVideoStore();
    const { clips } = useClipsResponseStore();

    // Local states
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedJson, setUploadedJson] = useState(false);

    // Store actions
    const { setClips, clearClips } = useClipsResponseStore();


    /* -------------------------------
       1. DOWNLOAD JSON
    --------------------------------*/
    const handleDownloadJson = () => {
        if (clips.length === 0) return;

        const blob = new Blob([JSON.stringify(clips, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const name = video?.name?.replace(/\.[^/.]+$/, "") || "clips";
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* -------------------------------
       2. UPLOAD JSON
    --------------------------------*/
    const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            const text = await file.text();
            const parsed = JSON.parse(text);

            if (!Array.isArray(parsed)) {
                alert("Invalid JSON: expected an array of clip objects.");
                return;
            }

            // Basic validation
            const isValid = parsed.every((clip) =>
                clip.startTime &&
                clip.endTime &&
                clip.transcriptionPart &&
                clip.suitableCaption
            );

            if (!isValid) {
                alert("Invalid JSON format for clips.");
                return;
            }

            setClips(parsed);
            setUploadedJson(true);
        } catch (error) {
            alert("Error reading JSON: " + error);
        }
    };

    /* -------------------------------
       3. REMOVE JSON (RESET STORE)
    --------------------------------*/
    const handleRemoveJson = () => {
        clearClips();
        setUploadedJson(false);
    };

    /* -------------------------------
       4. MOVE TO CLIPS GENERATION
    --------------------------------*/
    const handleMoveToClipsGeneration = () => {
        window.dispatchEvent(new CustomEvent("moveToClipsGeneration"));
    };

    const displayText = useMemo(() => {
        if (clips.length === 0) {
            return "No clips generated yet. Configure settings and send to Gemini.";
        }
        return JSON.stringify(clips, null, 2);
    }, [clips]);

    return (
        <div className="h-full flex flex-1 flex-col relative pl-2">
            {/* Header with modal button */}
            <div className="flex justify-between mb-2">
                <h2 className="text-md font-bold text-muted-foreground flex gap-2 items-center">
                    <Terminal className="w-4 h-4" />
                    {clips.length > 0 ? `Extracted Clips (${clips.length})` : "Gemini Response"}
                </h2>
                <TranscriptPreviewModal transcriptSRT={transcriptSRT} />
            </div>

            {/* Scrollable Area */}
            <ScrollArea className="flex-1 rounded-md border bg-background border-border overflow-y-auto p-3">
                <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-tight">
                    {displayText}
                </pre>
            </ScrollArea>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <div className="grid grid-cols-4 gap-2 w-full">
                    <Button variant="outline" className="w-full" onClick={handleDownloadJson}>
                        <Download className="w-4 h-4 mr-1" /> JSON
                    </Button>

                    {/* Upload input hidden, triggered by ref */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleUploadJson}
                    />
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-4 h-4 mr-1" /> Upload JSON
                        {uploadedJson && (
                            <span className="ml-1 text-xs text-green-600">(✓)</span>
                        )}
                    </Button>

                    <Button variant="destructive" className="w-full" onClick={handleRemoveJson}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>

                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleMoveToClipsGeneration}
                    >
                        <MoveRight className="w-4 h-4 mr-1" />Clips Generation
                    </Button>
                </div>
            </div>
        </div>
    );
}