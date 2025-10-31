"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Upload from "../Tabs/Upload";

export function AppTabs() {
    const [activeTab, setActiveTab] = React.useState("upload");

    return (
        <div className="w-full h-full flex flex-col">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
            >
                {/* Header shouldn't grow */}
                <TabsList className="w-full justify-center shrink-0">
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

                {/* Content wrapper should grow */}
                <div className="w-full flex-1 min-h-0">
                    <TabsContent value="upload" className="h-full">
                        <Upload />
                    </TabsContent>

                    <TabsContent value="transcription" className="h-full">
                        <p className="text-sm text-muted-foreground">
                            Generated transcription text will appear here.
                        </p>
                    </TabsContent>

                    <TabsContent value="clips-json" className="h-full">
                        <p className="text-sm text-muted-foreground">
                            View and edit extracted clips JSON here.
                        </p>
                    </TabsContent>

                    <TabsContent value="clips-generation" className="h-full">
                        <p className="text-sm text-muted-foreground">
                            Final clip generation and export options.
                        </p>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
