"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "../../../ui/dialog";
import { Button } from "../../../ui/button";

import { VideoPreview } from "./VideoPreview";
import { TranscriptPanel } from "./TranscriptPanel";
import { SubtitleStyleEditor } from "./SubtitleStyleEditor";
import { CustomTextsEditor } from "./CustomTextsEditor";
import { ClipOptions } from "./ClipOptions";

import { parseSRT, splitEntry, toSeconds } from "../../../../utils/srt";

interface SubtitleModalProps {
    open: boolean;
    onClose: () => void;
    clip: { filePath: string };
    onSave: (newPath: string) => void;
    index: number;
}

export interface CustomText {
    text: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    fontFamily: string;
    x: number;
    y: number;
}

export interface SubtitleStyle {
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    fontFamily: string;
    x: number;
    y: number;
}

type SrtEntry = { start: string; end: string; text: string };

export default function SubtitleModal({
    open,
    onClose,
    clip,
    onSave,
    index,
}: SubtitleModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const [srt, setSrt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [wordsPerLine, setWordsPerLine] = useState(5);

    const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
        fontSize: 28,
        fontColor: "#ffffff",
        strokeColor: "#000000",
        fontFamily: "Arial",
        x: 50,
        y: 90,
    });

    const [customTexts, setCustomTexts] = useState<CustomText[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [accurateCuts, setAccurateCuts] = useState(false);

    // parsed transcript
    const parsedAndChunked: SrtEntry[] = useMemo(() => {
        if (!srt) return [];
        const parsed = parseSRT(srt);
        return parsed.flatMap((e) => splitEntry(e, wordsPerLine));
    }, [srt, wordsPerLine]);

    // track current subtitle line
    const [currentTime, setCurrentTime] = useState(0);
    const activeLine = useMemo(() => {
        return parsedAndChunked.find(
            (ln) =>
                currentTime >= toSeconds(ln.start) && currentTime <= toSeconds(ln.end)
        );
    }, [parsedAndChunked, currentTime]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onTime = () => setCurrentTime(v.currentTime);
        v.addEventListener("timeupdate", onTime);
        return () => v.removeEventListener("timeupdate", onTime);
    }, []);

    const handleSave = async () => {
        if (!clip.filePath) return;

        const payload = {
            filePath: clip.filePath,
            subtitles: parsedAndChunked,
            subtitleStyle,
            customTexts,
            index,
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
        } catch (e) {
            console.error(e);
            alert("Burning subtitles failed. See logs.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Subtitles & Custom Text</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[70vh]">
                    {/* Left: Video fixed */}
                    <div className="relative bg-black rounded overflow-hidden flex items-center justify-center">
                        <VideoPreview
                            videoRef={videoRef}
                            filePath={clip.filePath}
                            activeLine={activeLine}
                            subtitleStyle={subtitleStyle}
                            customTexts={customTexts}
                            activeIndex={activeIndex}
                        />
                    </div>

                    {/* Right: Scrollable controls */}
                    <div className="space-y-4 overflow-y-auto pr-2">
                        <TranscriptPanel
                            clipPath={clip.filePath}
                            srt={srt}
                            setSrt={setSrt}
                            loading={loading}
                            setLoading={setLoading}
                            wordsPerLine={wordsPerLine}
                            setWordsPerLine={setWordsPerLine}
                            parsedAndChunked={parsedAndChunked}
                        />

                        {parsedAndChunked.length > 0 && (
                            <SubtitleStyleEditor
                                subtitleStyle={subtitleStyle}
                                setSubtitleStyle={setSubtitleStyle}
                            />
                        )}

                        <CustomTextsEditor
                            customTexts={customTexts}
                            setCustomTexts={setCustomTexts}
                            activeIndex={activeIndex}
                            setActiveIndex={setActiveIndex}
                            updateActiveText={(patch) =>
                                setCustomTexts((prev) =>
                                    prev.map((t, i) =>
                                        i === activeIndex ? { ...t, ...patch } : t
                                    )
                                )
                            }
                            deleteActiveText={() => {
                                if (activeIndex !== null) {
                                    setCustomTexts((prev) =>
                                        prev.filter((_, i) => i !== activeIndex)
                                    );
                                    setActiveIndex(null);
                                }
                            }}
                        />

                        <ClipOptions
                            accurateCuts={accurateCuts}
                            setAccurateCuts={setAccurateCuts}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Burn Subtitles & Text</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
