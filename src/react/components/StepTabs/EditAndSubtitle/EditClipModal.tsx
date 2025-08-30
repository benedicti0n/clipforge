"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Slider } from "../../ui/slider";

interface EditClipModalProps {
    open: boolean;
    onClose: () => void;
    clip: { filePath: string };
    onSave: (newPath: string, newStart: string, newEnd: string) => void;
    index: number;
}

export default function EditClipModal({
    open,
    onClose,
    clip,
    onSave,
    index,
}: EditClipModalProps) {
    const [clipDuration, setClipDuration] = useState<number>(0);
    const [range, setRange] = useState<[number, number]>([0, 0]);
    const videoRef = useRef<HTMLVideoElement>(null);

    // --- Helpers ---
    function toSrtTime(seconds: number) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const s = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s},000`;
    }

    // Load duration of this clip
    useEffect(() => {
        if (clip.filePath) {
            const vid = document.createElement("video");
            vid.src = `file://${clip.filePath}`;
            vid.onloadedmetadata = () => {
                const dur = vid.duration;
                setClipDuration(dur);
                setRange([0, dur]); // initialize slider to full clip length
            };
        }
    }, [clip.filePath]);

    // Handle Save
    const handleSave = async () => {
        const [newStartSec, newEndSec] = range;

        const newPath: string = await window.electron?.ipcRenderer.invoke("clip:trim", {
            filePath: clip.filePath, // trim inside the clip
            startTime: toSrtTime(newStartSec),
            endTime: toSrtTime(newEndSec),
            index,
        });

        onSave(newPath, toSrtTime(newStartSec), toSrtTime(newEndSec));
        onClose();
    };

    // Loop inside trim range
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const checkLoop = () => {
            if (vid.currentTime > range[1]) {
                vid.currentTime = range[0];
                vid.play();
            }
        };

        vid.addEventListener("timeupdate", checkLoop);
        return () => vid.removeEventListener("timeupdate", checkLoop);
    }, [range]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Clip</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <video
                        ref={videoRef}
                        src={`file://${clip.filePath}`}
                        controls
                        className="w-full rounded"
                    />

                    {/* 🎯 Double thumb slider for range */}
                    <Slider
                        min={0}
                        max={clipDuration}
                        step={1}
                        value={range}
                        onValueChange={(val: number[]) =>
                            setRange([val[0], val[1]] as [number, number])
                        }
                    />

                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Start: {toSrtTime(range[0])}</span>
                        <span>End: {toSrtTime(range[1])}</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Trim</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
