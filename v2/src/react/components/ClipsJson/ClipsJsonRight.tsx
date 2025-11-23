"use client";

import { FileText, Terminal } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface ClipsJsonRightProps {
    responseText: string | null;
    transcriptSRT: string;
}

export default function ClipsJsonRight({ responseText, transcriptSRT }: ClipsJsonRightProps) {
    return (
        <div className="pl-4 h-full space-y-4 flex flex-col">
            <h2 className="text-md font-bold text-muted-foreground flex gap-2 items-center">
                {responseText ? <><Terminal className="w-4 h-4" /> Gemini Response</> : <><FileText className="w-4 h-4" /> Transcript Preview</>}
            </h2>

            {/* Scrollable Area */}
            <ScrollArea className="flex-1 rounded-md border overflow-y-auto p-3 h-full">
                {!responseText ? (
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-tight">
                        {transcriptSRT || "No transcription available."}
                    </pre>
                ) : (
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-tight">
                        {responseText}
                    </pre>
                )}
            </ScrollArea>
        </div>
    );
}