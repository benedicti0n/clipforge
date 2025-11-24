"use client";

import { useMemo } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import AddGeminiKeyDialog from "../Dialogs/AddGeminiKeyDialog";
import DeleteGeminiKeyDialog from "../Dialogs/DeleteGeminiKeyDialog";
import AddCustomPromptDialog from "../Dialogs/AddCustomPromptDialog";
import { useGeminiStore } from "../../store/geminiStore";
import { usePromptStore } from "../../store/promptStore";
import { GEMINI_MODELS } from "../../../constants/geminiModels";
import { PROMPT_PRESETS } from "../../../constants/prompt";
import { Dot, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface ClipsJsonLeftProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    responseText: string | null;
    setResponseText: (text: string | null) => void;
    transcriptSRT: string;
}

export default function ClipsJsonLeft({
    isLoading,
    setIsLoading,
    responseText,
    setResponseText,
    transcriptSRT,
}: ClipsJsonLeftProps) {
    const { keys, selectedKey, selectKey, selectedModel, selectModel } = useGeminiStore();
    const { customPrompts, getPrompt, selectedGenre, setSelectedGenre } = usePromptStore();

    const modelInfo = useMemo(
        () => GEMINI_MODELS.find((m) => m.id === selectedModel),
        [selectedModel]
    );

    const genres = [
        ...Object.keys(PROMPT_PRESETS),
        ...Object.keys(customPrompts).filter(
            (g) => !Object.keys(PROMPT_PRESETS).includes(g)
        ),
    ];

    const promptPreview = useMemo(() => {
        if (!selectedGenre) return "";
        const saved = getPrompt(selectedGenre);
        if (saved) return saved;
        return PROMPT_PRESETS[selectedGenre] || "";
    }, [selectedGenre, getPrompt]);

    const handleGenreChange = (genre: string) => {
        setSelectedGenre(genre);
    };

    const activeKey = keys.find((k) => k.name === selectedKey)?.key || "";
    const promptText = (selectedGenre && getPrompt(selectedGenre)) || "No prompt selected.";
    const modelLabel =
        selectedModel?.replace("gemini-", "Gemini ").split("-latest")[0] ||
        "Gemini";

    const handleSendToGemini = async () => {
        if (!activeKey || !selectedModel) {
            alert("Please select a Gemini API key and model first.");
            return;
        }

        if (!transcriptSRT) {
            alert("No transcription found. Please transcribe or upload one first.");
            return;
        }

        setIsLoading(true);
        setResponseText(null);

        try {
            const data = await window.electronAPI?.runGemini({
                apiKey: activeKey,
                model: selectedModel,
                prompt: promptText,
                transcript: transcriptSRT,
            });

            if (!data) throw new Error("No response from Gemini.");
            if (!data.success) throw new Error(data.error || "Unknown Gemini error.");

            // ✅ Prefer parsed text provided by IPC
            let rawText = data.text || "⚠️ No valid response.";

            // ✅ Fallback: if the text is missing, try extracting manually from the raw Gemini object
            if (!data.text && data.raw) {
                rawText =
                    data.raw?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "⚠️ No valid response.";
            }

            // ✅ Validate and filter clips
            try {
                const parsed = JSON.parse(rawText);

                // Validate it's an array
                if (!Array.isArray(parsed)) {
                    throw new Error("Response is not an array");
                }

                // Filter out clips shorter than 20 seconds
                const validClips = parsed.filter((clip: any) => {
                    if (!clip.totalDuration) return false;

                    // Parse duration HH:MM:SS to seconds
                    const parts = clip.totalDuration.split(':');
                    const seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);

                    return seconds >= 20; // Minimum 20 seconds
                });

                // Validate first item has required fields
                if (validClips.length > 0) {
                    const requiredFields = ['startTime', 'endTime', 'transcriptionPart', 'totalDuration', 'viralityScore', 'suitableCaption'];
                    const firstItem = validClips[0];
                    const missingFields = requiredFields.filter(field => !(field in firstItem));

                    if (missingFields.length > 0) {
                        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                    }
                }

                // Show stats
                const removedCount = parsed.length - validClips.length;
                console.log(`✅ Extracted ${validClips.length} valid clips (removed ${removedCount} clips under 20 seconds)`);

                if (validClips.length === 0) {
                    throw new Error("No valid clips found (all were under 20 seconds)");
                }

                setResponseText(JSON.stringify(validClips, null, 2));
            } catch (parseError: any) {
                console.error("JSON validation error:", parseError);
                setResponseText(`❌ Invalid response format: ${parseError.message}\n\nRaw response:\n${rawText}`);
            }
        } catch (err: any) {
            console.error(err);
            setResponseText(`❌ Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 flex flex-col justify-between h-full">
            {/* Gemini Config */}
            <div className="space-y-4">
                <div className="space-y-4">
                    <h3 className="text-md font-bold flex gap-2 items-center"><Settings className="w-4 h-4" /> Configuration</h3>

                    {/* Gemini Key */}
                    <div className="space-y-1">
                        <Label className="text-sm">API Key</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={selectKey} value={selectedKey || ""}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select key" />
                                </SelectTrigger>
                                <SelectContent>
                                    {keys.length > 0 ? (
                                        keys.map((k) => (
                                            <SelectItem key={k.name} value={k.name}>
                                                {k.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            No keys added
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>

                            <AddGeminiKeyDialog />
                            <DeleteGeminiKeyDialog />
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-1">
                        <Label className="text-sm">Model & Prompt</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={selectModel} value={selectedModel || ""}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GEMINI_MODELS.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {modelInfo && (
                            <div className="text-xs text-muted-foreground py-1 flex items-center">
                                <div>{modelInfo.price}</div>
                                <Dot />
                                <div>{modelInfo.speed}</div>
                            </div>
                        )}
                    </div>

                    {/* Prompt Section */}
                    <div className="flex gap-2">
                        <Select onValueChange={handleGenreChange} value={selectedGenre || ""}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select genre" />
                            </SelectTrigger>
                            <SelectContent>
                                {genres.map((genre) => (
                                    <SelectItem key={genre} value={genre}>
                                        {genre.charAt(0).toUpperCase() + genre.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Upload Dialog Button */}
                        <AddCustomPromptDialog />
                    </div>
                </div>

                {/* Prompt Section */}
                <div className="space-y-4">
                    {/* Prompt Preview */}
                    <div className="space-y-1">
                        <Label className="text-sm">
                            {selectedGenre && getPrompt(selectedGenre)
                                ? "Custom Prompt (saved)"
                                : "Template"}
                        </Label>
                        <ScrollArea
                            className="flex-1 rounded-md border overflow-y-auto p-3 h-48"
                        >
                            <div className="whitespace-pre-wrap !text-xs text-foreground font-mono leading-tight">
                                {promptPreview}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <Button
                onClick={handleSendToGemini}
                disabled={isLoading || !selectedModel}
                className="text-sm"
            >
                {isLoading
                    ? "Processing..."
                    : `Send to ${modelLabel.charAt(0).toUpperCase() + modelLabel.slice(1)
                    }`}
            </Button>

            {/* Cost Estimation */}
            <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">Estimate</h3>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Input</span>
                        <span>$0.00</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Output</span>
                        <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1">
                        <span>Total</span>
                        <span>$0.00</span>
                    </div>
                </div>
            </div>
        </div>
    );
}