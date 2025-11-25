"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { FileText } from "lucide-react";

interface TranscriptPreviewModalProps {
    transcriptSRT: string;
}

export default function TranscriptPreviewModal({ transcriptSRT }: TranscriptPreviewModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                    View Transcript
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Transcript Preview</DialogTitle>
                    <DialogDescription>
                        Full transcript in SRT format with timestamps
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 rounded-md border p-4 h-full">
                    <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-tight">
                        {transcriptSRT || "No transcription available."}
                    </pre>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}