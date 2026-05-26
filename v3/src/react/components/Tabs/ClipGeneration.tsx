import { useVideoStore } from "@/store/videoStore"
import { useClipsResponseStore } from "@/store/clipsResponseStore"
import { useClipGenerationStore } from "@/store/clipGenerationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipList } from "@/components/ClipGeneration/ClipList"
import { GenerationSettings } from "@/components/ClipGeneration/GenerationSettings"
import { GenerationProgress } from "@/components/ClipGeneration/GenerationProgress"
import { ExportSrtPerClip } from "@/components/ClipGeneration/ExportSrtPerClip"
import { VideoExport } from "@/components/ClipGeneration/VideoExport"
import { Video, Scissors, Film } from "lucide-react"
import { toast } from "sonner"

export function ClipGeneration() {
    const { videoPath } = useVideoStore()
    const { clips } = useClipsResponseStore()
    const { isGenerating, setGenerating, setProgress, setResult, settings } = useClipGenerationStore()

    const handleGenerateClips = async () => {
        if (!videoPath) {
            toast.error("No video loaded. Please upload a video first.")
            return
        }

        if (clips.length === 0) {
            toast.error("No clips to generate. Generate clips from Gemini first.")
            return
        }

        if (!window.electronAPI) {
            toast.error("Electron API not available")
            return
        }

        setGenerating(true)
        setProgress({
            current: 0,
            total: clips.length,
            clipIndex: -1,
            status: "starting",
            message: "Starting clip generation..."
        })

        try {
            const result = await window.electronAPI.generateClips({
                inputPath: videoPath,
                clips: clips,
                paddingSeconds: settings.paddingSeconds
            })

            setResult(result)

            if (result.success) {
                toast.success(`Successfully generated ${result.successfulClips} clips`)
            } else {
                toast.error(`Generated ${result.successfulClips} clips, ${result.failedClips} failed`)
            }
        } catch (err: any) {
            setGenerating(false)
            setProgress(null)
            toast.error(`Failed to generate clips: ${err.message}`)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Scissors className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Clip Generation</h2>
            </div>

            <GenerationProgress />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <ClipList />
                    <GenerationSettings />
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Generate Video Clips</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    <span>Video: {videoPath ? "Loaded" : "Not loaded"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Film className="h-4 w-4" />
                                    <span>Clips: {clips.length}</span>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleGenerateClips}
                                disabled={isGenerating || !videoPath || clips.length === 0}
                            >
                                <Scissors className="h-4 w-4 mr-2" />
                                {isGenerating ? "Generating..." : "Generate Selected Clips"}
                            </Button>
                        </CardContent>
                    </Card>

                    <ExportSrtPerClip />
                    <VideoExport />
                </div>
            </div>
        </div>
    )
}
