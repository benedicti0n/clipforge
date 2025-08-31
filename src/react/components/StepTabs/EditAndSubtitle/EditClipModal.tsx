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

    // State
    const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
    const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
        fontSize: 28,
        fontColor: "#ffffff",
        strokeColor: "#000000",
        fontFamily: "Arial",
        x: 50,
        y: 90,
    });
    const [customTexts, setCustomTexts] = useState<CustomText[]>([]);
    const [accurateCuts, setAccurateCuts] = useState(false);

    // Save (burn with Skia/FFmpeg)
    const handleSave = async () => {
        const payload = {
            filePath: clip.filePath,
            subtitles,
            subtitleStyle,
            customTexts,
            index: clip.index,
            accurate: accurateCuts,
        };

        try {
            const newPath: string = await window.electron?.ipcRenderer.invoke(
                "clip:addSubtitles",
                payload
            );
            onSave(newPath || clip.filePath);
            if (videoRef.current) {
                videoRef.current.src = `file://${newPath}`;
                videoRef.current.load();
            }
            onClose();
        } catch (err) {
            console.error("Burn failed:", err);
            alert("Failed to export. See logs.");
        }
    };

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

                        {/* Live overlay (for preview only) */}
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
                                    WebkitTextStroke: `1px ${subtitleStyle.strokeColor}`,
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
                                    WebkitTextStroke: `1px ${t.strokeColor}`,
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
                                <SubtitleStylePanel style={subtitleStyle} setStyle={setSubtitleStyle} />
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

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save & Export</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
