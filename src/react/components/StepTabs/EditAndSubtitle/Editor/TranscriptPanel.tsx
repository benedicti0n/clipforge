import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";

interface SrtEntry {
    start: string;
    end: string;
    text: string;
}

interface Props {
    clipPath: string; // ✅ add this
    srt: string | null;
    setSrt: (s: string | null) => void;
    loading: boolean;
    setLoading: (b: boolean) => void;
    wordsPerLine: number;
    setWordsPerLine: (n: number) => void;
    parsedAndChunked: SrtEntry[];
}

export function TranscriptPanel({
    clipPath,
    srt,
    setSrt,
    loading,
    setLoading,
    wordsPerLine,
    setWordsPerLine,
    parsedAndChunked,
}: Props) {
    const handleTranscribe = async () => {
        setLoading(true);
        try {
            const resp = await window.electron?.ipcRenderer.invoke("whisper:transcribe", {
                model: "base",
                videoPath: clipPath,   // ✅ send actual file path
            });
            if (resp?.srt) setSrt(resp.srt);
        } catch (err) {
            console.error("Transcription failed:", err);
            alert("Transcription failed. See logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
                <Button size="sm" onClick={handleTranscribe} disabled={loading}>
                    {loading ? "Transcribing..." : "Transcribe Clip"}
                </Button>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Words/line</span>
                    <Input
                        type="number"
                        className="w-20 h-8"
                        value={wordsPerLine}
                        min={2}
                        max={10}
                        onChange={(e) =>
                            setWordsPerLine(
                                Math.max(2, Math.min(10, Number(e.target.value) || 5))
                            )
                        }
                    />
                </div>
            </div>

            {parsedAndChunked.length > 0 ? (
                <div className="border p-2 rounded text-xs h-36 overflow-y-auto font-mono bg-muted">
                    {parsedAndChunked.map((seg, i) => (
                        <div key={i} className="mb-1">
                            <span className="text-muted-foreground">
                                {seg.start} → {seg.end} |
                            </span>{" "}
                            {seg.text}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">
                    No transcript yet. Click “Transcribe Clip”.
                </p>
            )}
        </div>
    );
}
