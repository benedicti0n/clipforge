"use client";

import { useMemo } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import AddGeminiKeyDialog from "../Dialogs/AddGeminiKeyDialog";
import DeleteGeminiKeyDialog from "../Dialogs/DeleteGeminiKeyDialog";
import AddCustomPromptDialog from "../Dialogs/AddCustomPromptDialog";
import { useGeminiStore } from "../../store/geminiStore";
import { usePromptStore } from "../../store/promptStore";
import { GEMINI_MODELS } from "../../../constants/geminiModels";
import { PROMPT_PRESETS } from "../../../constants/prompt";

export default function ClipsJsonLeft() {
    const { keys, selectedKey, selectKey, selectedModel, selectModel } = useGeminiStore();
    const {
        customPrompts,
        savePrompt,
        getPrompt,
        selectedGenre,
        setSelectedGenre,
    } = usePromptStore();

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

    return (
        <div className="space-y-6 flex flex-col justify-between h-full">
            {/* Gemini Config */}
            <div className="space-y-4">
                <div className="space-y-4">
                    <h3 className="text-md font-bold">Configuration</h3>

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
                        <Label className="text-sm">Model</Label>
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

                        {modelInfo && (
                            <div className="text-xs text-muted-foreground mt-1 border rounded-md p-2 bg-muted/40">
                                <div className="font-medium text-foreground">{modelInfo.label}</div>
                                <div>{modelInfo.price}</div>
                                <div>{modelInfo.speed}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prompt Section */}
                <div className="space-y-4">
                    <h3 className="text-md font-bold">Prompt</h3>

                    {/* Genre Select */}
                    <div className="space-y-1">
                        <Label className="text-sm">Genre</Label>
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
                    </div>

                    {/* Prompt Preview */}
                    <div className="space-y-1">
                        <Label className="text-sm">
                            {selectedGenre && getPrompt(selectedGenre)
                                ? "Custom Prompt (saved)"
                                : "Template"}
                        </Label>
                        <Textarea
                            className="h-48 resize-none text-xs font-mono leading-tight"
                            placeholder="Prompt template preview..."
                            value={promptPreview}
                            readOnly
                        />
                    </div>

                    {/* Upload Dialog Button */}
                    <AddCustomPromptDialog />
                </div>
            </div>

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
