// src/electron/util/ffmpeg.ts
import { spawn, spawnSync } from "node:child_process";
import { ffmpeg, ffprobe } from "../helpers/resolveBinary.js"; // ✅ use resolved binaries

export async function ffprobeInfo(input: string): Promise<{
    durationSec: number;
    width: number;
    height: number;
    sar: string; // e.g., "1:1"
}> {
    // duration
    const d = spawnSync(ffprobe, [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input,
    ]);
    const duration = parseFloat(d.stdout.toString().trim() || "0");

    // video stream dims + SAR
    const s = spawnSync(ffprobe, [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,sample_aspect_ratio",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input,
    ]);
    const [wStr, hStr, sarStr] = s.stdout.toString().trim().split(/\r?\n/);
    const width = parseInt(wStr || "0", 10);
    const height = parseInt(hStr || "0", 10);
    const sar = sarStr || "1:1";

    return {
        durationSec: isFinite(duration) ? duration : 0,
        width: Number.isFinite(width) ? width : 0,
        height: Number.isFinite(height) ? height : 0,
        sar,
    };
}

/** Spawn ffmpeg and report progress via time=… from stderr. */
export function spawnFfmpeg(
    args: string[],
    onProgress?: (sec: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const ff = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });

        ff.stderr.on("data", (d: Buffer) => {
            const s = d.toString();
            const m = s.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
            if (m && onProgress) {
                const h = parseInt(m[1], 10);
                const mi = parseInt(m[2], 10);
                const sec = parseFloat(m[3]);
                onProgress(h * 3600 + mi * 60 + sec);
            }
        });

        ff.on("error", reject);
        ff.on("exit", (code) =>
            code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))
        );
    });
}
