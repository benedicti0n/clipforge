import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useClipGenerationStore } from "@/store/clipGenerationStore"
import { X } from "lucide-react"

export function GenerationProgress() {
    const { isGenerating, progress, setGenerating } = useClipGenerationStore()

    const handleCancel = async () => {
        if (window.electronAPI) {
            await window.electronAPI.cancelClipGeneration?.()
        }
        setGenerating(false)
    }

    if (!isGenerating && !progress) {
        return null
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>
                        {isGenerating ? "Generating Clips..." : "Generation Status"}
                    </span>
                    {isGenerating && (
                        <Button variant="destructive" size="sm" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {progress && (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{progress.message}</span>
                                <span>
                                    {progress.current} / {progress.total}
                                </span>
                            </div>
                            <Progress
                                value={(progress.current / progress.total) * 100}
                            />
                        </div>
                        {progress.clipIndex >= 0 && (
                            <p className="text-xs text-muted-foreground">
                                Processing clip {progress.clipIndex + 1}...
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
