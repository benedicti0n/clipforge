import { spawn, spawnSync } from "node:child_process";

export async function ffprobeInfo(input: string): Promise<{ durationSec: number }> {
    const out = spawnSync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input
    ]);
    const dur = parseFloat(out.stdout.toString().trim() || "0");
    return { durationSec: isFinite(dur) ? dur : 0 };
}

/**
 * Spawn ffmpeg and report progress via time=… from stderr.
 * onProgress is called with current seconds.
 */
export function spawnFfmpeg(args: string[], onProgress?: (sec: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

        ff.stderr.on("data", (d: Buffer) => {
            const s = d.toString();
            // Parse time=HH:MM:SS.xx
            const m = s.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
            if (m && onProgress) {
                const h = parseInt(m[1], 10);
                const mi = parseInt(m[2], 10);
                const sec = parseFloat(m[3]);
                onProgress(h * 3600 + mi * 60 + sec);
            }
        });

        ff.on("error", reject);
        ff.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
    });
}
