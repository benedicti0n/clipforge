// ---------- Types ----------
export type SrtEntry = { start: string; end: string; text: string };

// ---------- Time helpers ----------
export function toSeconds(srtTime: string): number {
    const [hms, ms = "0"] = srtTime.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms, 10) || 0) / 1000;
}

export function toSrtTime(sec: number): string {
    const clamped = Math.max(sec, 0);
    const h = Math.floor(clamped / 3600);
    const m = Math.floor((clamped % 3600) / 60);
    const s = Math.floor(clamped % 60);
    const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
    return (
        String(h).padStart(2, "0") +
        ":" +
        String(m).padStart(2, "0") +
        ":" +
        String(s).padStart(2, "0") +
        "," +
        String(ms).padStart(3, "0")
    );
}

// ---------- Parsing ----------
export function parseSRT(srt: string): SrtEntry[] {
    return srt
        .trim()
        .split(/\n\n+/)
        .map((block) => {
            const lines = block.split("\n");
            if (lines.length >= 3) {
                const [start, end] = lines[1].split(" --> ");
                const text = lines.slice(2).join(" ").replace(/\s+/g, " ").trim();
                return { start, end, text };
            }
            return null;
        })
        .filter(Boolean) as SrtEntry[];
}

// ---------- Splitting ----------
export function splitEntry(entry: SrtEntry, wordsPerLine = 5): SrtEntry[] {
    const words = entry.text.split(/\s+/).filter(Boolean);
    if (words.length <= wordsPerLine) return [entry];

    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
        chunks.push(words.slice(i, i + wordsPerLine).join(" "));
    }

    const startSec = toSeconds(entry.start);
    const endSec = toSeconds(entry.end);
    const total = Math.max(endSec - startSec, 0.01);
    const slice = total / chunks.length;

    return chunks.map((t, i) => ({
        start: toSrtTime(startSec + i * slice),
        end: toSrtTime(startSec + (i + 1) * slice),
        text: t,
    }));
}
