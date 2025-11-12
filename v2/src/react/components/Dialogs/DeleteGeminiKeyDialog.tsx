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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useGeminiStore } from "../../store/geminiStore";
import { Trash2 } from "lucide-react";

export default function DeleteGeminiKeyDialog() {
    const { keys, removeKey, selectedKey, selectKey } = useGeminiStore();
    const [open, setOpen] = useState(false);
    const [toDelete, setToDelete] = useState<string>("");

    const handleDelete = () => {
        if (!toDelete) return;
        removeKey(toDelete);
        // Clear selection if deleted key was active
        if (selectedKey === toDelete) selectKey("");
        setToDelete("");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Trash2 />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Gemini API Key</DialogTitle>
                    <DialogDescription>
                        This will permanently remove the selected key from local storage.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Select onValueChange={setToDelete} value={toDelete}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select key to delete" />
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
                                    No keys available
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleDelete} disabled={!toDelete}>
                        Confirm Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
