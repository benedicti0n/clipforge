import { Button } from "./components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useThemeStore } from "./store/themeStore";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react"
import Upload from "./components/StepTabs/Upload/Upload";
import TranscriptionTab from "./components/StepTabs/Transcription/Transcription";
import ClipSelection from "./components/StepTabs/ClipSelection/ClipSelection";


function App() {
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState("upload");

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="min-h-screen w-full p-4">
        <Button className="absolute bottom-1 right-1" onClick={toggleTheme}>
          {theme === "dark" ? <Moon /> : <Sun />}
        </Button>

        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full">
              <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
              <TabsTrigger value="transcription" className="flex-1">Transcription</TabsTrigger>
              <TabsTrigger value="clipSelection" className="flex-1">Clip Selection</TabsTrigger>
              <TabsTrigger value="editAndSubtitles" className="flex-1">Edit and Subtitles</TabsTrigger>
              <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <Upload setActiveTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="transcription"><TranscriptionTab setActiveTab={setActiveTab} /></TabsContent>
            <TabsContent value="clipSelection"><ClipSelection setActiveTab={setActiveTab} /></TabsContent>
            <TabsContent value="editAndSubtitles">Edit and Subtitles tab content</TabsContent>
            <TabsContent value="export">Export tab content</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
