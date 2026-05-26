import { useClipsResponseStore } from "@/store/clipsResponseStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Video, Download, Play } from "lucide-react"
import { useState } from "react"

export function ClipList() {
    const { clips } = useClipsResponseStore()
    const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set())

    const toggleClip = (index: number) => {
        const newSelected = new Set(selectedClips)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedClips(newSelected)
    }

    const selectAll = () => {
        setSelectedClips(new Set(clips.map((_, i) => i)))
    }

    const deselectAll = () => {
        setSelectedClips(new Set())
    }

    if (clips.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                    No clips available. Generate clips from the Clips JSON tab first.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Generated Clips ({clips.length})</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                            Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAll}>
                            Deselect All
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    {selectedClips.size} clips selected for generation
                </p>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {clips.map((clip, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                            >
                                <Checkbox
                                    checked={selectedClips.has(index)}
                                    onCheckedChange={() => toggleClip(index)}
                                    className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">Clip {index + 1}</span>
                                        <Badge variant="outline">
                                            {clip.startTime} - {clip.endTime}
                                        </Badge>
                                        <Badge
                                            variant={clip.viralityScore >= 8 ? "default" : "secondary"}
                                        >
                                            Score: {clip.viralityScore}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                        {clip.transcriptionPart.substring(0, 150)}...
                                    </p>
                                    <p className="text-sm font-medium">"{clip.suitableCaption}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
