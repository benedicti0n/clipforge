export function chunkTranscript(srt: string, maxChars = 2000): string[] {
    const lines = srt.split("\n");
    const chunks: string[] = [];
    let current = "";

    for (const line of lines) {
        if (current.length + line.length > maxChars) {
            chunks.push(current.trim());
            current = "";
        }
        current += line + "\n";
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
}
