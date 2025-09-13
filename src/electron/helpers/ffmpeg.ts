// ESM: ensure .js suffixes in relative imports after build
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ffmpeg as ffmpegBin } from "./resolveBinary.js";

/** Ensure ffmpeg exists and is executable */
function assertFfmpeg() {
    if (!ffmpegBin) throw new Error("ffmpeg not resolved (empty path)");
    fs.accessSync(ffmpegBin, fs.constants.X_OK);
}

/** Strong ffmpeg runner: captures stderr and signal for actionable errors */
export function runFfmpeg(args: string[], label = "ffmpeg"): Promise<void> {
    assertFfmpeg();

    return new Promise((resolve, reject) => {
        let stderr = "";
        const child = spawn(ffmpegBin, args, {
            stdio: ["ignore", "ignore", "pipe"],
            windowsHide: true,
        });

        child.stderr?.on("data", (b) => { stderr += b.toString(); });
        child.on("error", (err) => {
            reject(new Error(`${label} spawn error: ${err.message}\nbin=${ffmpegBin}\nargs=${JSON.stringify(args)}`));
        });
        child.on("close", (code, signal) => {
            if (code === 0) return resolve();
            reject(new Error(
                `${label} exited ${code ?? "null"}${signal ? ` (signal ${signal})` : ""}\n` +
                `bin=${ffmpegBin}\nargs=${JSON.stringify(args)}\n` +
                `stderr:\n${stderr}`
            ));
        });
    });
}

/** Backwards-compat: keep previous name if other modules import runFFmpeg */
export const runFFmpeg = runFfmpeg;

/** Minimal mkdir -p */
export function ensureDirSync(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function extractAudioToWav(inputPath: string, outPath: string) {
    ensureDirSync(path.dirname(outPath));
    const args = [
        "-y",
        "-i", inputPath,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        outPath,
    ];
    return runFfmpeg(args, "ffmpeg(extract-wav)");
}

/** Helpers still used elsewhere */
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

export function toSeconds(srtTime: string): number {
    const [hms, ms = "0"] = srtTime.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms, 10) || 0) / 1000;
}

export function escapeText(text: string) {
    return text
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'")
        .replace(/%/g, "\\%");
}
