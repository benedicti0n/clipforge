"use client";

import { useState, useRef } from "react";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Save, Upload } from "lucide-react";
import { usePromptStore } from "../../store/promptStore";

export default function AddCustomPromptDialog() {
    const [open, setOpen] = useState(false);
    const [genreName, setGenreName] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const { savePrompt } = usePromptStore();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (genreName.trim()) {
                savePrompt(genreName.trim().toLowerCase(), content);
            }
        };
        reader.readAsText(file);
    };

    const handleConfirm = () => {
        if (!genreName) return;
        setGenreName("");
        setFileName(null);
        setOpen(false);
    };

    const triggerFile = () => {
        fileRef.current?.click();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload /> Custom
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Custom Prompt</DialogTitle>
                    <DialogDescription>
                        Enter a genre name and upload your <b>.txt</b> prompt template.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Genre Name</Label>
                        <Input
                            value={genreName}
                            onChange={(e) => setGenreName(e.target.value)}
                            placeholder="e.g. productivity, tech, finance"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Prompt File (.txt)</Label>
                        <input
                            type="file"
                            accept=".txt"
                            ref={fileRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button variant={"outline"} onClick={triggerFile} className="w-full">
                            Choose File
                        </Button>
                        {fileName && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Selected: <span className="font-medium">{fileName}</span>
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!genreName || !fileName}>
                        <Save /> Save Prompt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
