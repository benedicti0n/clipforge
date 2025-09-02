"use client";

import { useRef, useState } from "react";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { useClipSelectionStore } from "../../../store/StepTabs/clipSelectionStore";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import EditClipModal from "./EditClipModal";
import { Buffer } from "buffer";

export default function EditSubtitleTab() {
    const { absolutePath } = useUploadStore();
    const { clipCandidates, setClipFilePath, addCustomClip } = useClipSelectionStore();

    const [loading, setLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleGenerateClips = async () => {
        if (!absolutePath || clipCandidates.length === 0) {
            alert("Missing video or clips JSON");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                videoPath: absolutePath,
                clips: clipCandidates.map((c, i) => ({
                    index: i,
                    startTime: c.startTime,
                    endTime: c.endTime,
                })),
            };

            const results: { index: number; filePath: string }[] =
                await window.electron?.ipcRenderer.invoke("clip:generate", payload);

            results.forEach(({ index, filePath }) => {
                setClipFilePath(index, filePath);
            });
        } catch (e) {
            console.error("Clip generation error:", e);
            alert("Clip generation failed.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Handle manual clip upload
    const handleUploadClip = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Convert file to serializable array
            const arrayBuffer = await file.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);

            const savedPath: string = await window.electron?.ipcRenderer.invoke(
                "clip:upload",
                {
                    data: Array.from(uint8), // ✅ plain array
                    name: file.name
                }
            );

            addCustomClip(savedPath);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload clip.");
        } finally {
            setUploading(false);
            e.target.value = ""; // reset input
        }
    };



    // ---------- Show Clips ----------
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Clips</h2>
                <div className="flex gap-2">
                    <Button onClick={handleGenerateClips} disabled={loading}>
                        {loading ? "Generating..." : "Regenerate Clips"}
                    </Button>
                    <div>
                        {/* Hidden input */}
                        <input
                            type="file"
                            accept="video/*"
                            hidden
                            ref={fileInputRef}
                            onChange={handleUploadClip}
                        />

                        {/* Real button */}
                        <Button
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? "Uploading..." : "Upload Clip"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clipCandidates.map((clip, i) => (
                    <Card key={i} className="overflow-hidden shadow-sm border p-0">
                        {clip.filePath ? (
                            <video
                                src={`file://${clip.filePath}`}
                                controls
                                className="w-full object-cover"
                            />
                        ) : (
                            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                                ⚠️ Clip not generated yet
                            </div>
                        )}

                        <CardContent className="p-3 space-y-2 pt-0">
                            {/* Only show metadata if available */}
                            {clip.startTime && clip.endTime && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                        Start: {clip.startTime}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                        End: {clip.endTime}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                        Duration: {clip.totalDuration}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-gray-100">
                                        Score: {clip.viralityScore}
                                    </span>
                                </div>
                            )}

                            {clip.suitableCaption && (
                                <p className="text-sm italic text-muted-foreground">
                                    {clip.suitableCaption}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => setEditingIndex(i)}>
                                    Edit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ✅ Editing Modal */}
            {editingIndex !== null && clipCandidates[editingIndex]?.filePath && (
                <EditClipModal
                    open={editingIndex !== null}
                    onClose={() => setEditingIndex(null)}
                    clip={{
                        filePath: clipCandidates[editingIndex].filePath!,
                        index: editingIndex,
                    }}
                    onSave={(newPath) => {
                        setClipFilePath(editingIndex, newPath);
                    }}
                />
            )}
        </div>
    );
}
