"use client";

import * as React from "react";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

export function AppTabs() {
    const [activeTab, setActiveTab] = React.useState("upload");

    return (
        <div className="w-full">
            {/* Tabs Header */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="w-full justify-center">
                    <TabsTrigger
                        value="upload"
                        className="data-[state=active]:border data-[state=active]:border-primary px-4 py-2 font-medium"
                    >
                        Upload
                    </TabsTrigger>
                    <TabsTrigger
                        value="transcription"
                        className="data-[state=active]:border data-[state=active]:border-primary px-4 py-2 font-medium"
                    >
                        Transcription
                    </TabsTrigger>
                    <TabsTrigger
                        value="clips-json"
                        className="data-[state=active]:border data-[state=active]:border-primary px-4 py-2 font-medium"
                    >
                        Clips JSON
                    </TabsTrigger>
                    <TabsTrigger
                        value="clips-generation"
                        className="data-[state=active]:border data-[state=active]:border-primary px-4 py-2 font-medium"
                    >
                        Clips Generation
                    </TabsTrigger>
                </TabsList>

                {/* Tabs Content */}
                <div className="w-full">
                    <TabsContent value="upload">
                        <p className="text-sm text-muted-foreground">Upload your video file here to start processing.</p>
                    </TabsContent>

                    <TabsContent value="transcription">
                        <p className="text-sm text-muted-foreground">Generated transcription text will appear here.</p>
                    </TabsContent>

                    <TabsContent value="clips-json">
                        <p className="text-sm text-muted-foreground">View and edit extracted clips JSON here.</p>
                    </TabsContent>

                    <TabsContent value="clips-generation">
                        <p className="text-sm text-muted-foreground">Final clip generation and export options.</p>
                    </TabsContent>
                </div>
            </Tabs >
        </div >
    );
}
