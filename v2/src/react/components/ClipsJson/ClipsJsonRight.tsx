"use client";

import { Card, CardContent } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";

interface ClipsJsonRightProps {
    responseText: string | null;
    transcriptSRT: string;
}

export default function ClipsJsonRight({ responseText, transcriptSRT }: ClipsJsonRightProps) {
    return (
        <div className="p-4 h-full overflow-y-auto">
            <Card className="h-full flex flex-col">
                <CardContent className="flex flex-col h-full space-y-4 p-4">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">
                            {responseText ? "Gemini Response" : "Transcription Preview"}
                        </h3>
                    </div>

                    {/* Scrollable Area */}
                    <ScrollArea className="flex-1 rounded-md border overflow-y-auto p-2 bg-muted/30">
                        {!responseText ? (
                            <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-tight">
                                {transcriptSRT || "No transcription available."}
                            </pre>
                        ) : (
                            <pre className="whitespace-pre text-xs text-foreground font-mono leading-tight">
                                {responseText}
                            </pre>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}