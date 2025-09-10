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
import { useUploadStore } from "../../../store/StepTabs/uploadStore";

type ApiKey = { name: string; key: string };

// ✅ Model info list
const GEMINI_MODELS = [
    {
        id: "gemini-1.5-pro-latest",
        label: "Gemini 1.5 Pro",
        price: "$7/million in, $21/million out",
        speed: "High accuracy, slower",
        inPrice: 7,   // $ per 1M input tokens
        outPrice: 21, // $ per 1M output tokens
    },
    {
        id: "gemini-1.5-flash-latest",
        label: "Gemini 1.5 Flash",
        price: "$0.35/million in, $1.05/million out",
        speed: "Fast, balanced",
        inPrice: 0.35,
        outPrice: 1.05,
    },
    {
        id: "gemini-2.5-pro-latest",
        label: "Gemini 2.5 Pro",
        price: "$10/million in, $30/million out",
        speed: "Most accurate, slower",
        inPrice: 10,
        outPrice: 30,
    },
    {
        id: "gemini-2.5-flash-latest",
        label: "Gemini 2.5 Flash",
        price: "$0.50/million in, $1.50/million out",
        speed: "Fast, good balance",
        inPrice: 0.5,
        outPrice: 1.5,
    },
    {
        id: "gemini-2.5-flash-lite-latest",
        label: "Gemini 2.5 Flash Lite",
        price: "$0.10/million in, $0.30/million out",
        speed: "Ultra fast, cheaper",
        inPrice: 0.1,
        outPrice: 0.3,
    },
];

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

    // custom prompt support
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    type CustomPrompt = { name: string; text: string };
    const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);


    // --- Load keys on mount ---
    useEffect(() => {
        window.electron?.ipcRenderer.invoke("keys:list").then((keys: ApiKey[]) => {
            if (keys) {
                keys.forEach((k) => addApiKey(k));
            }
        });
    }, [addApiKey]);

    const [inputTokens, setInputTokens] = useState(0);
    const [outputTokens, setOutputTokens] = useState(0);

    function estimateTokens(text: string): number {
        return Math.ceil(text.length / 4); // rough heuristic
    }

    function estimateCost(tokens: number, ratePerMillion: number): number {
        return (tokens / 1_000_000) * ratePerMillion;
    }

    useEffect(() => {
        if (transcriptSRT && selectedModel) {
            setInputTokens(estimateTokens(transcriptSRT));
        }
    }, [transcriptSRT, selectedModel]);

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

    // --- Upload Custom Prompt ---
    const handleUploadPrompt = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const name = file.name.replace(/\.(txt|json)$/i, "");

            // ✅ Persist to disk
            await window.electron?.ipcRenderer.invoke("prompts:save", { name, text });

            setCustomPrompts((prev) => [...prev, { name, text }]);
            setSelectedPrompt(name);
            setPromptText(text);
        };
        reader.readAsText(file);
    };

    // --- Delete Custom Prompt ---
    const handleDeletePrompt = async (name: string) => {
        await window.electron?.ipcRenderer.invoke("prompts:delete", name);
        setCustomPrompts((prev) => prev.filter((p) => p.name !== name));
        if (selectedPrompt === name) {
            setSelectedPrompt("");
            setPromptText("");
        }
    };

    // --- Load prompts on mount ---
    useEffect(() => {
        window.electron?.ipcRenderer.invoke("prompts:list").then((prompts: { name: string; text: string }[]) => {
            if (prompts) setCustomPrompts(prompts);
        });
    }, []);

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
                model: selectedModel, // e.g. "gemini-2.5-flash-latest"
                prompt: promptText,
                transcript: transcriptSRT,
            });

            console.log("Gemini raw response:", data);

            let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

            text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

            const parsed = JSON.parse(text);
            setClipCandidates(parsed);

            setOutputTokens(estimateTokens(JSON.stringify(parsed)));
        } catch (e) {
            console.error("Gemini error:", e);
            alert("Gemini request failed. Check logs and API key.");
        } finally {
            setLoading(false);
        }
    };

    const jsonInputRef = useRef<HTMLInputElement | null>(null);

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

                    // 🔑 Estimate tokens + update cost just like after Gemini response
                    setOutputTokens(estimateTokens(JSON.stringify(parsed)));
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

    function getBaseName(filePath: string) {
        const parts = filePath.split(/[\\/]/); // split by slash or backslash
        const file = parts[parts.length - 1];
        return file.replace(/\.[^/.]+$/, ""); // remove extension
    }

    const { absolutePath } = useUploadStore();
    const videoBaseName = absolutePath ? getBaseName(absolutePath) : "transcript";

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
                            <Input placeholder="Key Name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                            <Input
                                placeholder="Enter Gemini API Key"
                                type="password"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleAddKey} className="w-full">Save Locally</Button>
                                <Button variant="ghost" onClick={() => setShowAddKeyForm(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Select value={selectedApiKey ?? ""} onValueChange={(name) => setSelectedApiKey(name)}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select API Key" />
                                </SelectTrigger>
                                <SelectContent>
                                    {apiKeys.map((k) => (
                                        <SelectItem key={k.name} value={k.name}>{k.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="destructive" size="sm" onClick={() => { if (selectedApiKey) handleRemoveKey(selectedApiKey); }}>Delete</Button>
                            <Button size="sm" onClick={() => setShowAddKeyForm(true)}>Add Key</Button>
                        </div>
                    )}

                    {/* Model + Prompt Dropdowns */}
                    <div className="flex flex-col gap-3">
                        {/* Model dropdown */}
                        <Select value={selectedModel ?? ""} onValueChange={(v) => setSelectedModel(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {GEMINI_MODELS.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <div className="flex flex-col">
                                            <span>{m.label}</span>
                                            <span className="text-xs text-muted-foreground">{m.price} · {m.speed}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Prompt dropdown */}
                        <div className="flex gap-2 items-center">
                            <Select
                                value={selectedPrompt ?? ""}
                                onValueChange={(v) => {
                                    setSelectedPrompt(v);
                                    const preset = PROMPT_PRESETS[v];
                                    const custom = customPrompts.find((p) => p.name === v)?.text;
                                    setPromptText(preset ?? custom ?? "");
                                }}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Choose genre or custom prompt" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(PROMPT_PRESETS).map((key) => (
                                        <SelectItem key={key} value={key}>{key}</SelectItem>
                                    ))}
                                    {customPrompts.length > 0 && (
                                        <>
                                            <hr className="my-1" />
                                            {customPrompts.map((cp) => (
                                                <div key={cp.name} className="flex items-center justify-between">
                                                    <SelectItem value={cp.name}>{cp.name} (custom)</SelectItem>
                                                    <Button
                                                        variant="destructive"
                                                        className="ml-2"
                                                        onClick={() => handleDeletePrompt(cp.name)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                </SelectContent>
                            </Select>

                            {/* Upload button for custom prompt */}
                            <input
                                type="file"
                                accept=".txt,.json"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleUploadPrompt}
                            />
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                Upload Prompt
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[200px] border rounded p-2 text-sm">
                        {promptText || <span className="text-muted-foreground">Select a prompt type</span>}
                    </ScrollArea>

                    {selectedModel && (
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                                Input tokens: {inputTokens.toLocaleString()} ·
                                Est. cost: ${estimateCost(inputTokens, GEMINI_MODELS.find(m => m.id === selectedModel)?.inPrice ?? 0).toFixed(4)}
                            </div>
                            {outputTokens > 0 && (
                                <div>
                                    Output tokens: {outputTokens.toLocaleString()} ·
                                    Est. cost: ${estimateCost(outputTokens, GEMINI_MODELS.find(m => m.id === selectedModel)?.outPrice ?? 0).toFixed(4)}
                                </div>
                            )}

                            {/* ✅ Total estimated cost */}
                            <div className="font-semibold text-foreground">
                                Total est. cost: $
                                {(
                                    estimateCost(inputTokens, GEMINI_MODELS.find(m => m.id === selectedModel)?.inPrice ?? 0) +
                                    (outputTokens > 0
                                        ? estimateCost(outputTokens, GEMINI_MODELS.find(m => m.id === selectedModel)?.outPrice ?? 0)
                                        : 0)
                                ).toFixed(4)}
                            </div>
                        </div>
                    )}
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
                        <Button className="flex-1" onClick={handleSendToGemini} disabled={loading || !selectedApiKey || !transcriptSRT}>
                            {loading ? "Running..." : `Send to ${selectedModel}`}
                        </Button>

                        <div className="flex items-center gap-2">
                            <input type="file" accept="application/json" ref={jsonInputRef} className="hidden" onChange={handleUploadJson} />
                            <Button variant="outline" onClick={() => jsonInputRef.current?.click()}>
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
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(clipCandidates, null, 2)], { type: "application/json" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `${videoBaseName}_viral.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    Download JSON
                                </Button>

                                <Button onClick={() => setActiveTab("editAndSubtitles")}>
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
