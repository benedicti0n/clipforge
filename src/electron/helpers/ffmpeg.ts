import { spawn } from "child_process";
import { resolveBinaryPath, tmpPath } from "../util.js";

export async function extractAudioToWav(videoPath: string) {
    const ffmpegBin = resolveBinaryPath("ffmpeg");
    const out = tmpPath("audio", "wav");

    await new Promise<void>((resolve, reject) => {
        const ff = spawn(ffmpegBin, [
            "-y",
            "-i", videoPath,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            out,
        ]);

        ff.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
        );
    });

    return out;
}

export function runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log("Running ffmpeg:", args.join(" "));
        const ff = spawn("ffmpeg", args);
        ff.stderr.on("data", (d) => console.log(`ffmpeg: ${d}`));
        ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });
}


// Simple time-to-seconds helper
export function toSeconds(srtTime: string): number {
    const [hms, ms = "0"] = srtTime.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms, 10) || 0) / 1000;
}

// Escape text for ffmpeg drawtext
export function escapeText(text: string) {
    return text
        .replace(/:/g, "\\:")   // colons
        .replace(/'/g, "\\'")   // single quotes
        .replace(/%/g, "\\%");  // percents
}

export function ffmpegTimeToSeconds(time: string): number {
    const parts = time.split(":").map(Number);
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
    }
    if (parts.length === 2) {
        const [m, s] = parts;
        return m * 60 + s;
    }
    return 0;
}