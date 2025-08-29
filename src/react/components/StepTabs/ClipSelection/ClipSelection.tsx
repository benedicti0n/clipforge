"use client";

import { useState } from "react";
import { useClipSelectionStore } from "../../../store/StepTabs/clipSelectionStore";
import { useTranscriptionStore } from "../../../store/StepTabs/transcriptionStore";
import { PROMPT_PRESETS } from "../../../constants/prompts";

import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { ScrollArea } from "../../ui/scroll-area";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

export default function ClipSelection() {
    const {
        geminiApiKey,
        setGeminiApiKey,
        selectedModel,
        setSelectedModel,
        selectedPrompt,
        setSelectedPrompt,
        promptText,
        setPromptText,
        clipCandidates,
        setClipCandidates,
    } = useClipSelectionStore();

    const { transcriptSRT } = useTranscriptionStore();
    const [loading, setLoading] = useState(false);

    const handleSendToGemini = async () => {
        if (!geminiApiKey || !promptText || !transcriptSRT) {
            alert("Missing API key, prompt, or transcript.");
            return;
        }

        setLoading(true);

        try {
            const data = await window.electron?.ipcRenderer.invoke("gemini:run", {
                apiKey: geminiApiKey,
                prompt: promptText,
                transcript: transcriptSRT,
            });

            console.log("Gemini raw response:", data);

            const parsed = JSON.parse(
                data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]"
            );

            setClipCandidates(parsed);
        } catch (e) {
            console.error("Gemini error:", e);
            alert("Gemini request failed. Check logs and API key.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: API + Prompt */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Gemini Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!geminiApiKey ? (
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter Gemini API Key"
                                type="password"
                                onBlur={(e) => setGeminiApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your API key will be stored locally only.
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-green-500">✅ API Key saved</p>
                    )}

                    {/* Model Dropdown */}
                    <Select
                        value={selectedModel ?? ""}
                        onValueChange={(v) => setSelectedModel(v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro (best)</SelectItem>
                            <SelectItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash (faster)</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Prompt Dropdown */}
                    <Select
                        value={selectedPrompt ?? ""}
                        onValueChange={(v) => {
                            setSelectedPrompt(v);
                            setPromptText(PROMPT_PRESETS[v]);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a genre" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(PROMPT_PRESETS).map((key) => (
                                <SelectItem key={key} value={key}>
                                    {key}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <ScrollArea className="h-[200px] border rounded p-2 text-sm">
                        {promptText || (
                            <span className="text-muted-foreground">Select a prompt type</span>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* RIGHT: Transcript + Run */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Transcript (SRT)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ScrollArea className="h-[240px] rounded border p-2 text-xs font-mono">
                        {transcriptSRT || "No transcript available."}
                    </ScrollArea>

                    <Button
                        className="w-full"
                        onClick={handleSendToGemini}
                        disabled={loading || !geminiApiKey || !transcriptSRT}
                    >
                        {loading ? "Running..." : `Send to ${selectedModel}`}
                    </Button>

                    {clipCandidates.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-semibold">Results</h3>
                            <ScrollArea className="h-[200px] border rounded p-2 text-xs">
                                <pre>{JSON.stringify(clipCandidates, null, 2)}</pre>
                            </ScrollArea>

                            {/* ✅ Download JSON Button */}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const blob = new Blob(
                                        [JSON.stringify(clipCandidates, null, 2)],
                                        { type: "application/json" }
                                    );
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "clip_candidates.json";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                            >
                                Download JSON
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
