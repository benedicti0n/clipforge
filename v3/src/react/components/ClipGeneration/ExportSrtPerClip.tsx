import { useState } from "react"
import { useClipsResponseStore } from "@/store/clipsResponseStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, FileText } from "lucide-react"
import { toast } from "sonner"

function formatTimestampForSrt(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = 0
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`
}

function parseTimestamp(ts: string): number {
    const parts = ts.split(":").map(Number)
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return 0
}

export function ExportSrtPerClip() {
    const { clips } = useClipsResponseStore()
    const [selectedClip, setSelectedClip] = useState<number | null>(null)

    const generateSrtForClip = (clip: typeof clips[0], index: number): string => {
        const startSec = parseTimestamp(clip.startTime)
        const endSec = parseTimestamp(clip.endTime)
        const duration = endSec - startSec

        let srt = `${index + 1}\n`
        srt += `${formatTimestampForSrt(startSec)} --> ${formatTimestampForSrt(endSec)}\n`
        srt += `${clip.suitableCaption}\n`
        srt += `\n`

        return srt
    }

    const downloadSrtForClip = (clip: typeof clips[0], index: number) => {
        const srtContent = generateSrtForClip(clip, 0)
        const blob = new Blob([srtContent], { type: "text/srt" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `clip_${(index + 1).toString().padStart(3, "0")}_timestamps.srt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Downloaded SRT for clip ${index + 1}`)
    }

    const downloadAllSrt = () => {
        let fullSrt = ""
        clips.forEach((clip, index) => {
            fullSrt += `Clip ${index + 1}: ${clip.startTime} - ${clip.endTime}\n`
            fullSrt += generateSrtForClip(clip, index)
            fullSrt += "\n"
        })

        const blob = new Blob([fullSrt], { type: "text/srt" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "all_clips_timestamps.srt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Downloaded SRT for all clips")
    }

    if (clips.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                    No clips available to export.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Export SRT with Clip Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Select a clip to export SRT with timestamps</Label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedClip ?? ""}
                        onChange={(e) => setSelectedClip(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">Select a clip...</option>
                        {clips.map((clip, index) => (
                            <option key={index} value={index}>
                                Clip {index + 1}: {clip.startTime} - {clip.endTime} ({clip.suitableCaption.substring(0, 30)}...)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => selectedClip !== null && downloadSrtForClip(clips[selectedClip], selectedClip)}
                        disabled={selectedClip === null}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Download Selected SRT
                    </Button>
                    <Button variant="outline" onClick={downloadAllSrt}>
                        <Download className="h-4 w-4 mr-2" />
                        Download All Clips SRT
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
