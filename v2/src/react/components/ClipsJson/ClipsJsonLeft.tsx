"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { KeyRound, Upload } from "lucide-react";

export default function ClipsJsonLeft() {
    const [selectedKey, setSelectedKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedPrompt, setSelectedPrompt] = useState("");

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
                            <Select onValueChange={setSelectedKey}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select key" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="key1">Key 1</SelectItem>
                                    <SelectItem value="key2">Key 2</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button>Add <KeyRound /></Button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-1">
                        <Label className="text-sm">Model</Label>
                        <Select onValueChange={setSelectedModel}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-1.5-flash">1.5 Flash</SelectItem>
                                <SelectItem value="gemini-1.5-pro">1.5 Pro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Prompt Section */}
                <div className="space-y-4">
                    <h3 className="text-md font-bold">Prompt</h3>

                    <div className="space-y-1">
                        <Label className="text-sm">Genre</Label>
                        <Select onValueChange={setSelectedPrompt}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select genre" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gaming">Gaming</SelectItem>
                                <SelectItem value="podcast">Podcast</SelectItem>
                                <SelectItem value="educational">Educational</SelectItem>
                                <SelectItem value="motivational">Motivational</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Template</Label>
                        <Textarea
                            className="h-32 resize-none text-sm"
                            placeholder="Prompt template preview..."
                            readOnly
                        />
                    </div>

                    <Button className="w-full">
                        <Upload /> Custom Prompt
                    </Button>
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