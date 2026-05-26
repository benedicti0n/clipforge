import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useClipGenerationStore } from "@/store/clipGenerationStore"

export function GenerationSettings() {
    const { settings, setSettings } = useClipGenerationStore()

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="padding">Padding (seconds)</Label>
                    <Input
                        id="padding"
                        type="number"
                        min={0}
                        max={30}
                        value={settings.paddingSeconds}
                        onChange={(e) => setSettings({ paddingSeconds: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                        Add extra time before/after each clip
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
