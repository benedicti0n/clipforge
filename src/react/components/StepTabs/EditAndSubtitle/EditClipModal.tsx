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

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../../../electron/types/subtitleTypes";
import PresetPanel from "./PresetPanel";
import BgMusicPanel from "./BgMusicPanel";

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [uploadedFonts, setUploadedFonts] = useState<{ name: string; path: string }[]>([]);
    const [bgMusic, setBgMusic] = useState<{ path: string; volume: number } | null>(null);

    // Video dimensions state
    const [videoDimensions, setVideoDimensions] = useState<{
        width: number;
        height: number;
        aspectRatio: number;
    }>({ width: 1920, height: 1080, aspectRatio: 16 / 9 });

    const [previewDimensions, setPreviewDimensions] = useState<{
        width: number;
        height: number;
    }>({ width: 640, height: 360 });

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

    // Rendering state
    const [progress, setProgress] = useState(0);
    const [rendering, setRendering] = useState(false);

    // Calculate scaling factors for accurate preview
    const getScalingFactors = () => {
        const scaleX = previewDimensions.width / videoDimensions.width;
        const scaleY = previewDimensions.height / videoDimensions.height;
        return { scaleX, scaleY };
    };

    // Get video metadata
    const getVideoMetadata = async () => {
        if (!videoRef.current) return;

        try {
            // Try to get dimensions from the video element first
            const video = videoRef.current;
            if (video.videoWidth && video.videoHeight) {
                setVideoDimensions({
                    width: video.videoWidth,
                    height: video.videoHeight,
                    aspectRatio: video.videoWidth / video.videoHeight
                });
            } else {
                // Fallback: get metadata via IPC if available
                const metadata = await window.electron?.ipcRenderer.invoke("get-video-metadata", clip.filePath);
                if (metadata) {
                    setVideoDimensions({
                        width: metadata.width,
                        height: metadata.height,
                        aspectRatio: metadata.width / metadata.height
                    });
                }
            }
        } catch (error) {
            console.warn("Could not get video metadata:", error);
        }
    };

    // Update preview dimensions when container size changes
    const updatePreviewDimensions = () => {
        if (!containerRef.current || !videoRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();

        // Calculate the actual video display size within the container
        const containerAspect = containerRect.width / containerRect.height;
        const videoAspect = videoDimensions.aspectRatio;

        let displayWidth, displayHeight;

        if (containerAspect > videoAspect) {
            // Container is wider than video aspect ratio
            displayHeight = containerRect.height;
            displayWidth = displayHeight * videoAspect;
        } else {
            // Container is taller than video aspect ratio
            displayWidth = containerRect.width;
            displayHeight = displayWidth / videoAspect;
        }

        setPreviewDimensions({
            width: displayWidth,
            height: displayHeight
        });
    };

    // Save (burn with Skia)
    const handleSave = async () => {
        const payload = {
            filePath: clip.filePath,
            subtitles,
            subtitleStyle,
            customTexts,
            index: clip.index,
            fonts: uploadedFonts,
            bgMusic: bgMusic || undefined,
            videoDimensions, // Pass actual video dimensions for accurate rendering
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

        //@ts-expect-error ipc is not undefined
        ipc.on("skia:progress", (_e, d: { percent: number; phase: "pass1" | "pass2" }) => {
            // Optionally display "Subtitles ..." or "Custom texts ..."
            setProgress(d.percent);
        });

        //@ts-expect-error ipc is not undefined
        ipc.on("skia:done", onDone);

        return () => {
            //@ts-expect-error ipc is not undefined
            ipc.on("skia:progress", (_e, d: { percent: number; phase: "pass1" | "pass2" }) => {
                // Optionally display "Subtitles ..." or "Custom texts ..."
                setProgress(d.percent);
            });
            //@ts-expect-error ipc is not undefined
            ipc.removeListener("skia:done", onDone);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clip.filePath]);

    useEffect(() => {
        console.log("[EditClipModal] uploadedFonts:", uploadedFonts);
    }, [uploadedFonts]);

    useEffect(() => {
        if (open && videoRef.current) {
            videoRef.current.load();
        }
    }, [open]);

    // Handle video metadata loading
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            getVideoMetadata();
        };

        const handleResize = () => {
            updatePreviewDimensions();
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        window.addEventListener('resize', handleResize);

        // Initial setup
        if (video.readyState >= 1) {
            handleLoadedMetadata();
        }

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Update preview dimensions when video dimensions change
    useEffect(() => {
        updatePreviewDimensions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoDimensions]);

    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => setCurrentTime(video.currentTime);

        video.addEventListener("timeupdate", updateTime);
        return () => {
            video.removeEventListener("timeupdate", updateTime);
        };
    }, []);

    const activeSubs = subtitles.filter((s) => {
        const parseTime = (t: string) => {
            const [h, m, sMs] = t.split(":");
            const [sec, ms] = sMs.split(",");
            return (
                parseInt(h) * 3600 +
                parseInt(m) * 60 +
                parseInt(sec) +
                parseInt(ms) / 1000
            );
        };
        return currentTime >= parseTime(s.start) && currentTime <= parseTime(s.end);
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Edit Clip</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[70vh]">
                    {/* Left: Video Preview */}
                    <div
                        ref={containerRef}
                        className="relative bg-black rounded flex flex-col"
                        style={{ aspectRatio: videoDimensions.aspectRatio }}
                    >
                        <video
                            ref={videoRef}
                            src={`file://${clip.filePath}`}
                            controls
                            className="w-full h-full object-contain"
                        />

                        {/* Overlay container with exact video dimensions */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                width: `${previewDimensions.width}px`,
                                height: `${previewDimensions.height}px`,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            {/* Live preview subtitles */}
                            {activeSubs.map((s, idx) => {
                                const { scaleX, scaleY } = getScalingFactors();
                                const scaledFontSize = subtitleStyle.fontSize * Math.min(scaleX, scaleY);
                                const scaledStrokeWidth = subtitleStyle.strokeWidth * Math.min(scaleX, scaleY);
                                const scaledPadding = subtitleStyle.backgroundPadding * Math.min(scaleX, scaleY);

                                return (
                                    <div
                                        key={idx}
                                        className="absolute text-center whitespace-pre-wrap"
                                        style={{
                                            top: `${subtitleStyle.y}%`,
                                            left: `${subtitleStyle.x}%`,
                                            transform: "translate(-50%, -50%)",
                                            fontSize: `${scaledFontSize}px`,
                                            color: subtitleStyle.fontColor,
                                            fontFamily: subtitleStyle.fontFamily,
                                            WebkitTextStroke: `${scaledStrokeWidth}px ${subtitleStyle.strokeColor}`,
                                            background: subtitleStyle.backgroundEnabled
                                                ? `${subtitleStyle.backgroundColor}${Math.round(
                                                    (subtitleStyle.backgroundOpacity / 100) * 255
                                                )
                                                    .toString(16)
                                                    .padStart(2, "0")}`
                                                : "transparent",
                                            borderRadius: `${subtitleStyle.backgroundRadius * Math.min(scaleX, scaleY)}px`,
                                            padding: `${scaledPadding}px`,
                                            display: "inline-block",
                                            opacity: subtitleStyle.opacity / 100,
                                            fontWeight: subtitleStyle.bold ? "bold" : "normal",
                                            fontStyle: subtitleStyle.italic ? "italic" : "normal",
                                            textDecoration: subtitleStyle.underline ? "underline" : "none",
                                            maxWidth: "90%",
                                        }}
                                    >
                                        {s.text}
                                    </div>
                                );
                            })}


                            {/* Live preview custom texts */}
                            {customTexts.map((t, i) => {
                                const { scaleX, scaleY } = getScalingFactors();
                                const scaledFontSize = t.fontSize * Math.min(scaleX, scaleY);
                                const scaledStrokeWidth = (t.strokeWidth ?? 0) * Math.min(scaleX, scaleY);

                                return (
                                    <div
                                        key={i}
                                        className="absolute whitespace-pre-wrap"
                                        style={{
                                            top: `${t.y}%`,
                                            left: `${t.x}%`,
                                            transform: "translate(-50%, -50%)",
                                            fontSize: `${scaledFontSize}px`,
                                            color: t.fontColor,
                                            fontFamily: t.fontFamily,
                                            WebkitTextStroke: `${scaledStrokeWidth}px ${t.strokeColor}`,
                                            opacity: (t.opacity ?? 100) / 100,
                                            fontWeight: t.bold ? "bold" : "normal",
                                            fontStyle: t.italic ? "italic" : "normal",
                                            textDecoration: t.underline ? "underline" : "none",
                                            maxWidth: "90%",
                                        }}
                                    >
                                        {t.text}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Debug info (remove in production) */}
                        <div className="absolute top-2 left-2 text-xs text-white bg-black bg-opacity-50 p-1 rounded">
                            Video: {videoDimensions.width}×{videoDimensions.height}<br />
                            Preview: {Math.round(previewDimensions.width)}×{Math.round(previewDimensions.height)}<br />
                            Scale: {(previewDimensions.width / videoDimensions.width).toFixed(2)}
                        </div>
                    </div>

                    {/* Right: Editors */}
                    <div className="flex flex-col overflow-y-auto">
                        <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
                            <TabsList className="grid grid-cols-5 mb-2">
                                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                <TabsTrigger value="style">Style</TabsTrigger>
                                <TabsTrigger value="custom">Custom</TabsTrigger>
                                <TabsTrigger value="presets">Presets</TabsTrigger>
                                <TabsTrigger value="bgmusic">Bg Music</TabsTrigger>
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

                            <TabsContent value="presets" className="flex-1 overflow-y-auto">
                                <PresetPanel
                                    subtitleStyle={subtitleStyle}
                                    setSubtitleStyle={setSubtitleStyle}
                                    customTexts={customTexts}
                                    setCustomTexts={setCustomTexts}
                                />
                            </TabsContent>

                            <TabsContent value="bgmusic" className="flex-1 overflow-y-auto">
                                <BgMusicPanel bgMusic={bgMusic} setBgMusic={setBgMusic} />
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