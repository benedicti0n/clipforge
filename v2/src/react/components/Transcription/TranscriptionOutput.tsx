"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { FileText, Terminal, Upload, Trash2, MoveRight, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranscriptionStore } from "../../store/transcriptionStore";
import { useVideoStore } from "../../store/videoStore";

function formatTime(s: number) {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export default function TranscriptionOutput() {
    const { video } = useVideoStore();
    const {
        logs,
        segments,
        isTranscribing,
        uploadedSrt,
        setUploadedSrt,
        clearAll,
    } = useTranscriptionStore();

    const hasTranscript = segments && segments.length > 0;
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLogsModal, setShowLogsModal] = useState(false);

    const viewMode = useMemo(() => {
        if (isTranscribing) return "logs";
        if (hasTranscript) return "transcript";
        return "waiting";
    }, [isTranscribing, hasTranscript]);

    // 🧭 Auto-scroll to bottom
    useEffect(() => {
        const scrollTimeout = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
        return () => clearTimeout(scrollTimeout);
    }, [logs, segments]);

    // 🧾 Download handlers
    const handleDownloadTxt = () => {
        if (!segments) return;
        const text = segments.map((s) => s.text).join("\n");
        const name = video?.name?.replace(/\.[^/.]+$/, "") || "transcription";
        downloadBlob(text, `${name}.txt`);
        toast.success(`Downloaded ${name}.txt`);
    };

    const handleDownloadSrt = () => {
        if (!segments) return;
        const srt = segments
            .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
            .join("\n");
        const name = video?.name?.replace(/\.[^/.]+$/, "") || "transcription";
        downloadBlob(srt, `${name}.srt`);
        toast.success(`Downloaded ${name}.srt`);
    };

    const downloadBlob = (data: string, filename: string) => {
        const blob = new Blob([data], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatSrtTime = (sec: number) => {
        const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, "0");
        const h = Math.floor(sec / 3600).toString().padStart(2, "0");
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
        const s = Math.floor(sec % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s},${ms}`;
    };

    // 📤 Upload SRT handler
    const handleUploadSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith(".srt")) {
            toast.error("Only .srt files are supported");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            setUploadedSrt(content);
            toast.success(`Uploaded SRT: ${file.name}`);
        };
        reader.readAsText(file);
    };

    const handleRemoveTranscription = () => {
        clearAll();
        toast.warning("Transcription cleared");
    };

    const handleMoveToClips = () => {
        window.dispatchEvent(new CustomEvent("moveToClipsJson"));
        toast.success("Moved to Clips JSON tab");
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 relative pl-2">
            {/* Header */}
            <div className="flex justify-between mb-1">
                <h2 className="text-md font-bold text-muted-foreground flex gap-2">
                    {viewMode === "transcript" ? (
                        <>
                            <FileText className="w-4 h-4 mt-1" />
                            Transcription Output
                        </>
                    ) : (
                        <>
                            <Terminal className="w-4 h-4 mt-1" />
                            Live Logs
                        </>
                    )}
                </h2>

                {viewMode !== "waiting" && !isTranscribing && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        title="View Logs"
                        onClick={() => setShowLogsModal(true)}
                    >
                        <Terminal className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Scroll Area */}
            <ScrollArea className="flex-1 rounded-md border bg-background border-border p-3 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {viewMode === "waiting" && (
                        <motion.div
                            key="waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="text-xs text-foreground p-1 font-mono opacity-80"
                        >
                            Waiting...
                        </motion.div>
                    )}

                    {viewMode === "logs" && (
                        <motion.div
                            key="logs"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="whitespace-pre-wrap text-xs text-foreground space-y-1 font-mono"
                        >
                            {logs.length === 0
                                ? "Starting transcription..."
                                : logs.map((l, i) => <div key={i}>{l}</div>)}
                            <div ref={bottomRef} />
                        </motion.div>
                    )}

                    {viewMode === "transcript" && (
                        <motion.div
                            key="transcript"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-2 text-sm"
                        >
                            {segments!.map((s, i) => (
                                <div key={i} className="flex gap-2">
                                    <div className="text-muted-foreground font-mono min-w-[86px]">
                                        [{formatTime(s.start)}–{formatTime(s.end)}]
                                    </div>
                                    <div>{s.text}</div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </ScrollArea>

            {/* ✅ Action Bar (Visible for both logs & transcript) */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <div className="grid grid-cols-5 gap-2 w-full">
                    <Button variant="outline" className="w-full" onClick={handleDownloadTxt}>
                        <Download className="w-4 h-4 mr-1" /> Txt
                    </Button>

                    <Button variant="outline" className="w-full" onClick={handleDownloadSrt}>
                        <Download className="w-4 h-4 mr-1" /> Srt
                    </Button>

                    {/* Upload input hidden, triggered by ref */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".srt"
                        className="hidden"
                        onChange={handleUploadSrt}
                    />
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-4 h-4 mr-1" /> Upload
                        {uploadedSrt && (
                            <span className="ml-1 text-xs text-green-600">(✓)</span>
                        )}
                    </Button>

                    <Button variant="destructive" className="w-full" onClick={handleRemoveTranscription}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>

                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleMoveToClips}
                    >
                        <MoveRight className="w-4 h-4 mr-1" /> Clips JSON
                    </Button>
                </div>
            </div>

            {/* Logs Modal */}
            <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Transcription Logs
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 mt-2 overflow-y-auto rounded-md border bg-background p-3">
                        <div className="whitespace-pre-wrap text-xs font-mono text-foreground space-y-1">
                            {logs.length > 0
                                ? logs.map((l, i) => <div key={i}>{l}</div>)
                                : "No logs available."}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
