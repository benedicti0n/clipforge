"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";

import TranscriptPanel from "./TranscriptPanel";
import SubtitleStylePanel from "./SubtitleStylePanel";
import CustomTextsPanel from "./CustomTextsPanel";
import ClipOptionsPanel from "./ClipOptionsPanel";

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../../../types/subtitleTypes";

interface EditClipModalProps {
    open: boolean;
    onClose: () => void;
    clip: { filePath: string; index: number };
    onSave: (newPath: string) => void;
}

export default function EditClipModal({
    open,
    onClose,
    clip,
    onSave,
}: EditClipModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [uploadedFonts, setUploadedFonts] = useState<{ name: string; path: string }[]>([]);

    // State
    const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
    const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
        fontSize: 28,
        fontColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 1,
        fontFamily: "Arial",
        x: 50,
        y: 90,
        backgroundEnabled: false,
        backgroundColor: "#000000",
        backgroundOpacity: 50,
        backgroundRadius: 4,
        backgroundPadding: 10,
        opacity: 100,
        bold: false,
        italic: false,
        underline: false,
    });
    const [customTexts, setCustomTexts] = useState<CustomText[]>([]);
    const [accurateCuts, setAccurateCuts] = useState(false);

    // Rendering state
    const [progress, setProgress] = useState(0);
    const [rendering, setRendering] = useState(false);

    // Save (burn with Skia)
    const handleSave = async () => {
        const payload = {
            filePath: clip.filePath,
            subtitles,
            subtitleStyle,
            customTexts,
            index: clip.index,
            fonts: uploadedFonts, // ✅ already { name, path }
        };

        try {
            setRendering(true);
            setProgress(0);

            const outPath = await window.electron?.ipcRenderer.invoke("skia:render", payload);

            setRendering(false);
            setProgress(100);

            onSave(outPath || clip.filePath);

            if (videoRef.current && outPath) {
                videoRef.current.src = `file://${outPath}`;
                videoRef.current.load();
            }
        } catch (err) {
            console.error("Render failed:", err);
            alert("Failed to export. See logs.");
            setRendering(false);
        }
    };


    useEffect(() => {
        const ipc = window.electron?.ipcRenderer;
        if (!ipc) return;

        const onProgress = (
            _event: unknown,
            data: { frame: number; total: number; percent: number }
        ) => {
            setProgress(data.percent);
        };

        const onDone = (_event: unknown, data?: { outPath?: string }) => {
            console.log("[renderer] got skia:done", data);
            setRendering(false);
            setProgress(100);
            onSave(data?.outPath || clip.filePath);

            if (videoRef.current && data?.outPath) {
                videoRef.current.src = `file://${data.outPath}`;
                videoRef.current.load();
            }
        };


        ipc.on("skia:progress", onProgress);
        ipc.on("skia:done", onDone);

        return () => {
            ipc.removeListener("skia:progress", onProgress);
            ipc.removeListener("skia:done", onDone);
        };
    }, [clip.filePath]); // only depends on clip.filePath

    useEffect(() => {
        console.log("[EditClipModal] uploadedFonts:", uploadedFonts);
    }, [uploadedFonts]);


    useEffect(() => {
        if (open && videoRef.current) {
            videoRef.current.load();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Edit Clip</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[70vh]">
                    {/* Left: Video Preview */}
                    <div className="relative bg-black rounded flex flex-col">
                        <video
                            ref={videoRef}
                            src={`file://${clip.filePath}`}
                            controls
                            className="w-full h-full object-contain"
                        />

                        {/* Live preview overlays (not burned yet) */}
                        {subtitles.length > 0 && (
                            <div
                                className="absolute pointer-events-none text-center"
                                style={{
                                    top: `${subtitleStyle.y}%`,
                                    left: `${subtitleStyle.x}%`,
                                    transform: "translate(-50%, -50%)",
                                    fontSize: `${subtitleStyle.fontSize}px`,
                                    color: subtitleStyle.fontColor,
                                    fontFamily: subtitleStyle.fontFamily,
                                    WebkitTextStroke: `${subtitleStyle.strokeWidth}px ${subtitleStyle.strokeColor}`,
                                    background: subtitleStyle.backgroundEnabled
                                        ? `${subtitleStyle.backgroundColor}${Math.round(
                                            (subtitleStyle.backgroundOpacity / 100) * 255
                                        )
                                            .toString(16)
                                            .padStart(2, "0")}`
                                        : "transparent",
                                    borderRadius: subtitleStyle.backgroundRadius,
                                    padding: `${subtitleStyle.backgroundPadding}px`,
                                    display: "inline-block",
                                    opacity: subtitleStyle.opacity / 100,
                                    fontWeight: subtitleStyle.bold ? "bold" : "normal",
                                    fontStyle: subtitleStyle.italic ? "italic" : "normal",
                                    textDecoration: subtitleStyle.underline ? "underline" : "none",

                                }}
                            >
                                {subtitles[0].text}
                            </div>
                        )}
                        {customTexts.map((t, i) => (
                            <div
                                key={i}
                                className="absolute pointer-events-none"
                                style={{
                                    top: `${t.y}%`,
                                    left: `${t.x}%`,
                                    transform: "translate(-50%, -50%)",
                                    fontSize: `${t.fontSize}px`,
                                    color: t.fontColor,
                                    fontFamily: t.fontFamily,
                                    WebkitTextStroke: `${subtitleStyle.strokeWidth}px ${t.strokeColor}`,
                                    opacity: (t.opacity ?? 100) / 100,
                                    fontWeight: t.bold ? "bold" : "normal",
                                    fontStyle: t.italic ? "italic" : "normal",
                                    textDecoration: t.underline ? "underline" : "none",
                                }}
                            >
                                {t.text}
                            </div>

                        ))}
                    </div>

                    {/* Right: Editors */}
                    <div className="flex flex-col overflow-y-auto">
                        <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
                            <TabsList className="grid grid-cols-4 mb-2">
                                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                <TabsTrigger value="style">Style</TabsTrigger>
                                <TabsTrigger value="custom">Custom</TabsTrigger>
                                <TabsTrigger value="options">Options</TabsTrigger>
                            </TabsList>

                            <TabsContent value="transcript" className="flex-1 overflow-y-auto">
                                <TranscriptPanel
                                    subtitles={subtitles}
                                    setSubtitles={setSubtitles}
                                    videoPath={clip.filePath}
                                />
                            </TabsContent>

                            <TabsContent value="style" className="flex-1 overflow-y-auto">
                                <SubtitleStylePanel
                                    style={subtitleStyle}
                                    setStyle={setSubtitleStyle}
                                    uploadedFonts={uploadedFonts}
                                    setUploadedFonts={setUploadedFonts}
                                />
                            </TabsContent>

                            <TabsContent value="custom" className="flex-1 overflow-y-auto">
                                <CustomTextsPanel texts={customTexts} setTexts={setCustomTexts} />
                            </TabsContent>

                            <TabsContent value="options" className="flex-1 overflow-y-auto">
                                <ClipOptionsPanel accurate={accurateCuts} setAccurate={setAccurateCuts} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Footer with progress */}
                <DialogFooter className="flex flex-col gap-2">
                    {rendering && (
                        <div className="w-full">
                            <p className="text-xs text-muted-foreground mb-1">
                                Rendering... {progress}%
                            </p>
                            <div className="w-full h-2 bg-gray-200 rounded">
                                <div
                                    className="h-2 bg-blue-500 rounded"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex w-full justify-end gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={rendering}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={rendering}>
                            {rendering ? "Rendering..." : "Save & Export"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
