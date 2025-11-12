"use client";

import { useState } from "react";
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
import { useGeminiStore } from "../../store/geminiStore";

export default function AddGeminiKeyDialog() {
    const { addKey } = useGeminiStore();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [key, setKey] = useState("");

    const handleAdd = () => {
        if (!name || !key) return;
        addKey({ name, key });
        setName("");
        setKey("");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Add Key
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Gemini API Key</DialogTitle>
                    <DialogDescription>
                        Save your Gemini API key locally for quick switching.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Personal Key"
                        />
                    </div>
                    <div>
                        <Label>API Key</Label>
                        <Input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Paste your Gemini API key"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleAdd} disabled={!name || !key}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
