import { Button } from "./components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useThemeStore } from "./store/themeStore";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react"
import Upload from "./components/StepTabs/Upload/Upload";


function App() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="min-h-screen w-full p-4">
        <Button className="absolute bottom-1 right-1" onClick={toggleTheme}>{theme === "dark" ? <Moon /> : <Sun />}</Button>

        <div className="w-full">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="flex w-full">
              <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
              <TabsTrigger value="transcription" className="flex-1">Transcription</TabsTrigger>
              <TabsTrigger value="clipSelection" className="flex-1">Clip Selection</TabsTrigger>
              <TabsTrigger value="editAndSubtitles" className="flex-1">Edit and Subtitles</TabsTrigger>
              <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="upload"><Upload /></TabsContent>
            <TabsContent value="transcription">Transcription tab content</TabsContent>
            <TabsContent value="clipSelection">Clip Selection tab content</TabsContent>
            <TabsContent value="editAndSubtitles">Edit and Subtitles tab content</TabsContent>
            <TabsContent value="export">Export tab content</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
