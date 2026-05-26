import { useClipGenerationStore } from "@/store/clipGenerationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Download } from "lucide-react"
import { toast } from "sonner"

export function VideoExport() {
    const { generatedClips, outputDir } = useClipGenerationStore()

    const openOutputFolder = async () => {
        if (outputDir && window.electronAPI) {
            await window.electronAPI.openClipsFolder?.(outputDir)
        } else if (outputDir) {
            window.open(`file://${outputDir}`)
        }
    }

    const downloadClip = async (clip: typeof generatedClips[0]) => {
        if (!clip.outputPath) return
        toast.success(`Clip saved at: ${clip.outputPath}`)
    }

    if (generatedClips.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                    No generated clips yet. Generate clips first.
                </CardContent>
            </Card>
        )
    }

    const successfulClips = generatedClips.filter(c => c.success)
    const failedClips = generatedClips.filter(c => !c.success)

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                        Generated Clips ({successfulClips.length} successful, {failedClips.length} failed)
                    </CardTitle>
                    {outputDir && (
                        <Button variant="outline" size="sm" onClick={openOutputFolder}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Open Folder
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {generatedClips.map((clip, index) => (
                        <div
                            key={index}
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                                clip.success ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-medium">Clip {index + 1}</p>
                                <p className="text-sm text-muted-foreground">
                                    {clip.startTime} - {clip.endTime}
                                </p>
                                {clip.success && clip.outputPath && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {clip.outputPath}
                                    </p>
                                )}
                                {clip.error && (
                                    <p className="text-xs text-destructive">{clip.error}</p>
                                )}
                            </div>
                            {clip.success && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadClip(clip)}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
