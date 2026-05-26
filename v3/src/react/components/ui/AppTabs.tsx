"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import Upload from "../Tabs/Upload";
import Transcription from "../Tabs/Transcription";
import ClipsJson from "../Tabs/ClipsJson";
import { ClipGeneration } from "../Tabs/ClipGeneration";

export function AppTabs() {
    const [activeTab, setActiveTab] = React.useState("upload");

    React.useEffect(() => {
        const handleMoveToClipsJson = () => setActiveTab("clips-json");
        const handleMoveToClipsGeneration = () => setActiveTab("clips-generation");

        window.addEventListener("moveToClipsJson", handleMoveToClipsJson);
        window.addEventListener("moveToClipsGeneration", handleMoveToClipsGeneration);

        return () => {
            window.removeEventListener("moveToClipsJson", handleMoveToClipsJson);
            window.removeEventListener("moveToClipsGeneration", handleMoveToClipsGeneration);
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
            >
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

                <div className="w-full flex-1 min-h-0 pt-1 overflow-auto">
                    <TabsContent value="upload" className="h-full">
                        <Upload />
                    </TabsContent>

                    <TabsContent value="transcription" className="h-full">
                        <Transcription />
                    </TabsContent>

                    <TabsContent value="clips-json" className="h-full">
                        <ClipsJson />
                    </TabsContent>

                    <TabsContent value="clips-generation" className="h-full">
                        <ClipGeneration />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}