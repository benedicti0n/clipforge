// src/electron/util/ffmpeg.ts
import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { ffmpeg, ffprobe } from "../helpers/resolveBinary.js";

function assertExecutable(path: string, label: "ffmpeg" | "ffprobe") {
    if (!path) throw new Error(`${label} path is empty (did not resolve).`);
    try {
        accessSync(path, constants.X_OK);
    } catch (e: any) {
        throw new Error(`${label} not executable or not found at: ${path}\n${e?.message || e}`);
    }
}

/** Run a command synchronously and return { stdout, stderr }. Throws if spawn failed. */
function safeSpawnSync(cmd: string, args: string[]) {
    const res = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    if (res.error) {
        throw new Error(
            `Failed to start ${cmd}: ${res.error.message}\n` +
            `args: ${JSON.stringify(args)}`
        );
    }
    // When spawn succeeds but tool fails, status is non-zero; still return for parsing callers.
    return {
        stdout: res.stdout?.toString?.() ?? "",
        stderr: res.stderr?.toString?.() ?? "",
        status: res.status,
        signal: res.signal,
    };
}

export async function ffprobeInfo(input: string): Promise<{
    durationSec: number;
    width: number;
    height: number;
    sar: string;
}> {
    assertExecutable(ffprobe, "ffprobe");

    // duration
    const d = safeSpawnSync(ffprobe, [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input,
    ]);
    if (d.status && d.status !== 0) {
        throw new Error(`ffprobe failed reading duration (status ${d.status}). Stderr:\n${d.stderr}`);
    }
    const duration = parseFloat((d.stdout || "0").trim() || "0");

    // video stream dims + SAR
    const s = safeSpawnSync(ffprobe, [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,sample_aspect_ratio",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input,
    ]);
    if (s.status && s.status !== 0) {
        throw new Error(`ffprobe failed reading stream info (status ${s.status}). Stderr:\n${s.stderr}`);
    }
    const [wStr, hStr, sarStr] = (s.stdout || "").trim().split(/\r?\n/);
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
    assertExecutable(ffmpeg, "ffmpeg");

    return new Promise((resolve, reject) => {
        let stderrBuf = "";
        const ff = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });

        ff.stderr.on("data", (d: Buffer) => {
            const s = d.toString();
            stderrBuf += s;
            const m = s.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
            if (m && onProgress) {
                const h = parseInt(m[1], 10);
                const mi = parseInt(m[2], 10);
                const sec = parseFloat(m[3]);
                onProgress(h * 3600 + mi * 60 + sec);
            }
        });

        ff.on("error", (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)));

        ff.on("exit", (code, signal) => {
            if (code === 0) return resolve();
            reject(new Error(
                `ffmpeg exit ${code ?? "null"}${signal ? ` (signal ${signal})` : ""}\n` +
                `Args: ${JSON.stringify(args)}\nStderr:\n${stderrBuf}`
            ));
        });
    });
}
