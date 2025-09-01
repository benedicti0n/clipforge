"use client";

import { useEffect, useRef, useState } from "react";
import { useClipSelectionStore } from "../../../store/StepTabs/clipSelectionStore";
import { useTranscriptionStore } from "../../../store/StepTabs/transcriptionStore";
import { PROMPT_PRESETS } from "../../../constants/prompts";

import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { ScrollArea } from "../../ui/scroll-area";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

// Local typing for IPC
type ApiKey = { name: string; key: string };

export default function ClipSelection({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
    const {
        apiKeys,
        selectedApiKey,
        setSelectedApiKey,
        addApiKey,
        removeApiKey,
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
    const [newKeyName, setNewKeyName] = useState("");
    const [newKey, setNewKey] = useState("");
    const [showAddKeyForm, setShowAddKeyForm] = useState(false);

    // --- Load keys on mount ---
    useEffect(() => {
        window.electron?.ipcRenderer.invoke("keys:list").then((keys: ApiKey[]) => {
            if (keys) {
                // replace store with fresh list (avoid duplicates)
                keys.forEach((k) => addApiKey(k));
            }
        });
    }, [addApiKey]);

    // --- Add new key locally + persist ---
    const handleAddKey = async () => {
        if (!newKeyName || !newKey) {
            alert("Enter both name and key");
            return;
        }
        const apiKeyObj: ApiKey = { name: newKeyName, key: newKey };
        const updated = await window.electron?.ipcRenderer.invoke("keys:add", apiKeyObj);
        if (updated) {
            addApiKey(apiKeyObj);
            setSelectedApiKey(apiKeyObj.name);
            setNewKey("");
            setNewKeyName("");
            setShowAddKeyForm(false);
        }
    };

    // --- Remove key locally + persist ---
    const handleRemoveKey = async (name: string) => {
        const updated = await window.electron?.ipcRenderer.invoke("keys:remove", name);
        if (updated) {
            removeApiKey(name);
        }
    };

    // --- Send request to Gemini ---
    const handleSendToGemini = async () => {
        const activeKey = apiKeys.find((k) => k.name === selectedApiKey)?.key;
        if (!activeKey || !promptText || !transcriptSRT) {
            alert("Missing API key, prompt, or transcript.");
            return;
        }

        setLoading(true);

        try {
            const data = await window.electron?.ipcRenderer.invoke("gemini:run", {
                apiKey: activeKey,
                model: selectedModel,
                prompt: promptText,
                transcript: transcriptSRT,
            });

            console.log("Gemini raw response:", data);

            let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

            // ✅ Strip markdown code fences if present
            text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

            const parsed = JSON.parse(text);
            setClipCandidates(parsed);
        } catch (e) {
            console.error("Gemini error:", e);
            alert("Gemini request failed. Check logs and API key.");
        } finally {
            setLoading(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // --- Handle JSON Upload ---
    const handleUploadJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    setClipCandidates(parsed);
                } else {
                    alert("⚠️ Invalid JSON format. Expected an array.");
                }
            } catch (err) {
                console.error("Error parsing JSON:", err);
                alert("⚠️ Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: API + Model + Prompt */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Gemini Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* API Key Handling */}
                    {apiKeys.length === 0 || showAddKeyForm ? (
                        <div className="space-y-2">
                            <Input
                                placeholder="Key Name"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                            />
                            <Input
                                placeholder="Enter Gemini API Key"
                                type="password"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleAddKey} className="w-full">
                                    Save Locally
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowAddKeyForm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedApiKey ?? ""}
                                onValueChange={(name) => setSelectedApiKey(name)}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select API Key" />
                                </SelectTrigger>
                                <SelectContent>
                                    {apiKeys.map((k) => (
                                        <SelectItem key={k.name} value={k.name}>
                                            {k.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    if (selectedApiKey) handleRemoveKey(selectedApiKey);
                                }}
                            >
                                Delete
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => setShowAddKeyForm(true)}
                            >
                                Add Key
                            </Button>
                        </div>
                    )}

                    {/* Model + Prompt Dropdowns side by side */}
                    <div className="flex gap-2">
                        <Select
                            value={selectedModel ?? ""}
                            onValueChange={(v) => setSelectedModel(v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-1.5-pro-latest">
                                    Gemini 1.5 Pro
                                </SelectItem>
                                <SelectItem value="gemini-1.5-flash-latest">
                                    Gemini 1.5 Flash
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedPrompt ?? ""}
                            onValueChange={(v) => {
                                setSelectedPrompt(v);
                                setPromptText(PROMPT_PRESETS[v]);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose genre" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(PROMPT_PRESETS).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {key}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ScrollArea className="h-[200px] border rounded p-2 text-sm">
                        {promptText || (
                            <span className="text-muted-foreground">
                                Select a prompt type
                            </span>
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

                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={handleSendToGemini}
                            disabled={loading || !selectedApiKey || !transcriptSRT}
                        >
                            {loading ? "Running..." : `Send to ${selectedModel}`}
                        </Button>

                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="application/json"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleUploadJson}
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Upload ViralClips.json
                            </Button>
                        </div>
                    </div>


                    {clipCandidates.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-semibold">Results</h3>
                            <ScrollArea className="h-[200px] border rounded p-2 text-xs">
                                <pre>{JSON.stringify(clipCandidates, null, 2)}</pre>
                            </ScrollArea>

                            <div className="flex gap-2">
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

                                {/* ✅ Move to Edit & Subtitles Button */}
                                <Button
                                    onClick={() => setActiveTab("editAndSubtitles")}
                                >
                                    Move to Edit and Subtitles
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
