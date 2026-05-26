"use client";

import { useMemo } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import AddCustomPromptDialog from "../Dialogs/AddCustomPromptDialog";
import { usePromptStore } from "../../store/promptStore";
import { PROMPT_PRESETS } from "../../../constants/prompt";
import { Quote, TextSelect } from "lucide-react";

export default function PromptSelectorSection() {
    const { customPrompts, getPrompt, selectedGenre, setSelectedGenre } = usePromptStore();

    const genres = useMemo(() => [
        ...Object.keys(PROMPT_PRESETS),
        ...Object.keys(customPrompts).filter(
            (g) => !Object.keys(PROMPT_PRESETS).includes(g)
        ),
    ], [customPrompts]);

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
        <div className="space-y-4">
            {/* Genre Selection */}
            <div className="space-y-1">
                <Label className="text-sm flex gap-2 items-center"><Quote className="w-4 h-4" /> Prompt Genre</Label>
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

                    <AddCustomPromptDialog />
                </div>
            </div>

            {/* Prompt Preview */}
            <div className="space-y-1">
                <Label className="text-sm flex gap-2 items-center">
                    {selectedGenre && getPrompt(selectedGenre)
                        ? <><TextSelect className="w-4 h-4" /> Custom Prompt (saved)</>
                        : <><TextSelect className="w-4 h-4" /> Template</>}
                </Label>
                <ScrollArea className="flex-1 rounded-md border overflow-y-auto p-3 h-48">
                    <div className="whitespace-pre-wrap !text-xs text-foreground font-mono leading-tight">
                        {promptPreview || "No prompt selected"}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}