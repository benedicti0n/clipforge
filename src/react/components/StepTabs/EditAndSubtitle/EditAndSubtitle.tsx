"use client";

import { useState } from "react";
import { useUploadStore } from "../../../store/StepTabs/uploadStore";
import { useClipSelectionStore } from "../../../store/StepTabs/clipSelectionStore";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import EditClipModal from "./EditClipModal"; // ✅ Import your modal

export default function EditSubtitleTab() {
    const { absolutePath } = useUploadStore();
    const { clipCandidates, setClipFilePath } = useClipSelectionStore();

    const [loading, setLoading] = useState(false);
    const [editingClipIndex, setEditingClipIndex] = useState<number | null>(null);

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

    // ---------- UI States ----------
    if (!absolutePath && clipCandidates.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                ⚠️ Please upload a video and generate clips first.
            </div>
        );
    }

    if (absolutePath && clipCandidates.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                Transcript clips JSON not found or empty. Please upload or generate a ViralClips.json<br />
            </div>
        );
    }

    const allMissingFiles = clipCandidates.every((c) => !c.filePath);

    if (absolutePath && clipCandidates.length > 0 && allMissingFiles) {
        return (
            <div className="text-center text-muted-foreground py-10 space-y-4">
                <p>Transcript clips JSON found but clips not generated.</p>
                <Button onClick={handleGenerateClips} disabled={loading}>
                    {loading ? "Generating..." : "Generate Clips"}
                </Button>
            </div>
        );
    }

    // ---------- Show Generated Clips ----------
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Generated Clips</h2>
                {absolutePath && (
                    <Button onClick={handleGenerateClips} disabled={loading}>
                        {loading ? "Generating..." : "Regenerate Clips"}
                    </Button>
                )}
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
                                Clip not generated yet
                            </div>
                        )}

                        <CardContent className="p-3 space-y-2 pt-0">
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
                                <span
                                    className={`px-2 py-1 rounded ${Number(clip.viralityScore) > 7
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                >
                                    Score: {clip.viralityScore}
                                </span>
                            </div>

                            <p className="text-sm italic text-muted-foreground">
                                {clip.suitableCaption}
                            </p>

                            {/* ✅ Edit Button */}
                            <Button size="sm" onClick={() => setEditingClipIndex(i)}>
                                Edit
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ✅ Modal rendered once outside the loop */}
            {editingClipIndex !== null && (
                <EditClipModal
                    open={editingClipIndex !== null}
                    onClose={() => setEditingClipIndex(null)}
                    clip={clipCandidates[editingClipIndex]}
                    onSave={(newPath, newStart, newEnd) => {
                        setClipFilePath(editingClipIndex, newPath);
                        clipCandidates[editingClipIndex].startTime = newStart;
                        clipCandidates[editingClipIndex].endTime = newEnd;
                    }}
                />
            )}
        </div>
    );
}
