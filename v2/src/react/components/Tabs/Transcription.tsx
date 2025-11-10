"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import WhisperModelSelect from "../Transcription/WhisperModelSelect";
import TranscriptionOutput from "../Transcription/TranscriptionOutput";
import { useWhisperStore } from "../../store/whisperStore";
import { useVideoStore } from "../../store/videoStore";
import { WHISPER_MODEL_FILES } from "../../../constants/whisper";
import { useTranscriptionStore } from "../../store/transcriptionStore";

export default function Transcription() {
    const { selectedModel } = useWhisperStore();
    const { video } = useVideoStore();
    const {
        logs,
        setLogs,
        addLog,
        segments,
        setSegments,
        isTranscribing,
        setIsTranscribing,
    } = useTranscriptionStore();

    useEffect(() => {
        // ✅ Listen for logs
        const offLog = window.electronAPI?.onTranscribeLog?.(({ line }) => {
            addLog(line.trim());
        });

        // ✅ Listen for result
        const offResult = window.electronAPI?.onTranscribeResult?.((data) => {
            console.log("✅ Received transcription result:", data);
            setSegments(data?.segments || []);
            setIsTranscribing(false);
            toast.success("Transcription complete", { duration: 3000 });
        });

        // ✅ Listen for error
        const offError = window.electronAPI?.onTranscribeError?.(({ error }) => {
            console.error("❌ Transcription error:", error);
            setIsTranscribing(false);
            toast.error("Transcription error", { description: error });
        });

        // Cleanup listeners on unmount
        return () => {
            offLog?.();
            offResult?.();
            offError?.();
        };
    }, [addLog, setSegments, setIsTranscribing]);

    const handleStartTranscribe = async () => {
        if (!selectedModel) {
            toast.warning("Select a model first");
            return;
        }

        if (!video || !video.filePath) {
            toast.warning("No uploaded video found");
            return;
        }

        try {
            // Reset and prepare
            setLogs([]);
            setSegments(null);
            setIsTranscribing(true);

            const { filename } = WHISPER_MODEL_FILES[selectedModel];
            setLogs([
                "🧠 Starting whisper.cpp...",
                `Model: ${selectedModel}`,
                `File: ${video.name}`,
            ]);

            // Start transcription via IPC
            await window.electronAPI!.startTranscription({
                modelKey: selectedModel,
                modelFilename: filename,
                inputPath: video.filePath,
                locale: "auto",
                translate: false,
            });
        } catch (e: any) {
            console.error("❌ Failed to start transcription:", e);
            setIsTranscribing(false);
            toast.error("Failed to start transcription", {
                description: e?.message || String(e),
            });
        }
    };

    const handleCancel = async () => {
        await window.electronAPI?.cancelTranscription();
        setIsTranscribing(false);
        toast.warning("Transcription canceled");
    };

    return (
        <div className="flex w-full h-full gap-6">
            {/* Left panel */}
            <div className="w-1/3 pr-2 flex flex-col justify-between gap-4">
                <WhisperModelSelect />
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleStartTranscribe}
                        disabled={isTranscribing || !video}
                    >
                        {isTranscribing ? "Transcribing..." : "Start Transcribe"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={!isTranscribing}
                    >
                        Cancel Transcription
                    </Button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-2 h-2/3 w-1 rounded-full border-border translate-y-1/4" />

            {/* Right panel: Logs / Output */}
            <TranscriptionOutput
                logs={logs}
                segments={segments}
                isTranscribing={isTranscribing}
            />
        </div>
    );
}
