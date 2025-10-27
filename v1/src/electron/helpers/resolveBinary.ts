import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { app } from "electron";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const isWin = process.platform === "win32";
const ffmpegName = isWin ? "ffmpeg.exe" : "ffmpeg";
const ffprobeName = isWin ? "ffprobe.exe" : "ffprobe";
const whisperName = isWin ? "whisper-cli.exe" : "whisper-cli";

function existsX(p?: string): p is string {
    if (!p) return false;
    try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; }
}
function ensureExec(p: string) {
    try { fs.chmodSync(p, 0o755); } catch { }
    if (process.platform === "darwin") {
        try { spawnSync("xattr", ["-dr", "com.apple.quarantine", p], { stdio: "ignore" }); } catch { }
    }
}
function versionStatus(p: string): number | null {
    const r = spawnSync(p, ["-version"], { stdio: ["ignore", "ignore", "ignore"] });
    return (r && typeof r.status === "number") ? r.status : null;
}
function usable(p?: string): string | "" {
    if (!p) return "";
    if (!existsX(p)) return "";
    ensureExec(p);
    const st = versionStatus(p);
    return st === 0 ? p : "";
}
function firstUsable(candidates: string[], label: string): string {
    if (process.env.FFMPEG_LOG_CANDIDATES === "1") {
        console.log(`[bin:candidates:${label}]`, candidates);
    }
    for (const c of candidates) {
        const u = usable(c);
        if (u) return u;
    }
    return "";
}
// NEW: for whisper-cli (don’t require -version)
function firstExecutable(candidates: string[], label: string): string {
    if (process.env.FFMPEG_LOG_CANDIDATES === "1") {
        console.log(`[bin:candidates:${label}]`, candidates);
    }
    for (const c of candidates) {
        if (!c) continue;
        if (!existsX(c)) continue;
        ensureExec(c);
        return c;
    }
    return "";
}

function resourcesBin(name: string) {
    return path.join(process.resourcesPath ?? "", "bin", name);
}
function projectBin(name: string) {
    return path.resolve("public", "bin", name);
}
function nmFfmpeg(): string {
    return (ffmpegStatic as unknown as string) || "";
}
function nmFfprobe(): string {
    const raw: any = ffprobeStatic;
    return typeof raw === "string" ? raw : raw?.path || "";
}

// env overrides
const ENV_FFMPEG = process.env.FFMPEG_PATH || "";
const ENV_FFPROBE = process.env.FFPROBE_PATH || "";
const ENV_WHISPER = process.env.WHISPER_CLI_PATH || "";

// ffmpeg: prefer resources/bin → npm static → Homebrew → public/bin
function pickFfmpeg() {
    const candidates = app.isPackaged
        ? [ENV_FFMPEG, resourcesBin(ffmpegName), nmFfmpeg(), "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", projectBin(ffmpegName)]
        : [ENV_FFMPEG, nmFfmpeg(), "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", projectBin(ffmpegName)];
    return firstUsable(candidates.filter(Boolean), "ffmpeg");
}

// ffprobe: similar
function pickFfprobe() {
    const nm = nmFfprobe();
    const candidates = app.isPackaged
        ? [ENV_FFPROBE, resourcesBin(ffprobeName), nm, "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe", projectBin(ffprobeName)]
        : [ENV_FFPROBE, nm, "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe", projectBin(ffprobeName)];
    return firstUsable(candidates.filter(Boolean), "ffprobe");
}

// whisper-cli: exists & executable is enough
function pickWhisperCli() {
    const candidates = app.isPackaged
        ? [ENV_WHISPER, resourcesBin(whisperName), projectBin(whisperName)]
        : [ENV_WHISPER, projectBin(whisperName)];
    return firstExecutable(candidates.filter(Boolean), "whisper-cli");
}

export const ffmpeg = pickFfmpeg();
export const ffprobe = pickFfprobe();
export const whisperCli = pickWhisperCli();

export function logBinaryPaths(prefix = "[boot]") {
    console.log(`${prefix} ffmpeg: ${ffmpeg || "(not found)"}`);
    console.log(`${prefix} ffprobe: ${ffprobe || "(not found)"}`);
    console.log(`${prefix} whisper-cli: ${whisperCli || "(not found)"}`);
    console.log(`${prefix} ffmpeg -version:`, ffmpeg ? versionStatus(ffmpeg) : "(n/a)");
    console.log(`${prefix} ffprobe -version:`, ffprobe ? versionStatus(ffprobe) : "(n/a)");
    // don’t run -version on whisper-cli (many builds don’t have it)
}
