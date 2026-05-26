"use client";

import { useMemo } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import AddGeminiKeyDialog from "../Dialogs/AddGeminiKeyDialog";
import DeleteGeminiKeyDialog from "../Dialogs/DeleteGeminiKeyDialog";
import { useGeminiStore } from "../../store/geminiStore";
import { GEMINI_MODELS } from "../../../constants/geminiModels";
import { BrainCircuit, Dot, Key } from "lucide-react";

export default function GeminiConfigSection() {
    const { keys, selectedKey, selectKey, selectedModel, selectModel } = useGeminiStore();

    const modelInfo = useMemo(
        () => GEMINI_MODELS.find((m) => m.id === selectedModel),
        [selectedModel]
    );

    return (
        <div className="space-y-4">
            {/* Gemini Key */}
            <div className="space-y-1">
                <Label className="text-sm flex gap-2 items-center"><Key className="w-4 h-4" /> API Key</Label>
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
                <Label className="text-sm flex gap-2 items-center"><BrainCircuit className="w-4 h-4" /> Model</Label>
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
                    <div className="text-xs text-muted-foreground py-1 flex items-center">
                        <div>{modelInfo.price}</div>
                        <Dot />
                        <div>{modelInfo.speed}</div>
                    </div>
                )}
            </div>
        </div>
    );
}