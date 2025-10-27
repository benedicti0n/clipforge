import { ipcMain, IpcMainInvokeEvent } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { ensureDir, fileExists, readText, downloadWithProgress } from "../util.js";
import { WHISPER_MODEL_FILES, WhisperModelKey } from "../constants/whisper.js";
import { modelsDir, transcriptsDir } from "../helpers/paths.js";
import { extractAudioToWav } from "../helpers/ffmpeg.js";
import { runWhisper } from "../helpers/whisper.js";
import { ChildProcess } from "node:child_process";

let activeWhisperProcess: ChildProcess | null = null;

// Track active downloads
const activeDownloads = new Set<WhisperModelKey>();

export function registerWhisperHandlers() {
    ensureDir(modelsDir());
    ensureDir(transcriptsDir());

    ipcMain.handle("whisper:checkCache", async (_e: IpcMainInvokeEvent, modelKey: WhisperModelKey) => {
        const entry = WHISPER_MODEL_FILES[modelKey];
        if (!entry) return false;
        const p = path.join(modelsDir(), entry.filename);
        return fileExists(p);
    });

    ipcMain.handle("whisper:downloadModel", async (e, modelKey: WhisperModelKey) => {
        const entry = WHISPER_MODEL_FILES[modelKey];
        if (!entry) throw new Error(`Unknown model: ${modelKey}`);

        const dest = path.join(modelsDir(), entry.filename);

        if (activeDownloads.has(modelKey)) {
            console.warn(`Download for ${modelKey} already in progress`);
            return false;
        }
        activeDownloads.add(modelKey);

        try {
            // Prefer local copy (public/models) if present
            const localPath = path.join(process.cwd(), "public", "models", entry.filename);
            const fsSync = await import("node:fs");
            if (fsSync.existsSync(localPath)) {
                fsSync.copyFileSync(localPath, dest);
                e.sender.send("whisper:download:progress", { model: modelKey, percent: 100 });
                return true;
            }

            // Remote download
            if (entry.url?.startsWith("http")) {
                e.sender.send("whisper:download:progress", { model: modelKey, percent: 0 });
                await downloadWithProgress(entry.url, dest, (percent) => {
                    try {
                        e.sender.send("whisper:download:progress", { model: modelKey, percent });
                    } catch { }
                });
                e.sender.send("whisper:download:progress", { model: modelKey, percent: 100 });
                return true;
            }

            throw new Error(`Model not found locally and no remote URL for ${modelKey}`);
        } finally {
            activeDownloads.delete(modelKey);
        }
    });

    ipcMain.handle("whisper:transcribe", async (e, { model, videoPath }: { model: WhisperModelKey; videoPath: string | null }) => {
        if (!videoPath) throw new Error("videoPath not provided");

        const entry = WHISPER_MODEL_FILES[model];
        if (!entry) throw new Error(`Unknown Whisper model key: ${model}`);

        const modelPath = path.join(modelsDir(), entry.filename);

        const baseName = `${path.parse(videoPath).name}-${Date.now().toString(36)}`;
        const outBase = path.join(transcriptsDir(), baseName);
        const wavPath = `${outBase}.wav`;

        try {
            // 1) Extract WAV (16k mono) for whisper
            await extractAudioToWav(videoPath, wavPath);

            // 2) Run whisper CLI (emits outBase.txt / outBase.srt)
            const out = await runWhisper(modelPath, wavPath, baseName, e.sender, (proc) => {
                activeWhisperProcess = proc;
            });

            activeWhisperProcess = null;

            // 3) Read results if present
            const full = (await fileExists(out.txt)) ? await readText(out.txt) : "";
            const srt = (await fileExists(out.srt)) ? await readText(out.srt) : "";
            const preview = full.slice(0, 1200) + (full.length > 1200 ? "\n..." : "");

            return { transcriptPath: out.srt, preview, full, srt };
        } catch (err) {
            activeWhisperProcess = null;
            e.sender.send("whisper:log", String((err as any)?.message || err));
            throw err;
        }
    });

    ipcMain.handle("whisper:stop", async () => {
        if (activeWhisperProcess) {
            try {
                activeWhisperProcess.kill("SIGINT");
                activeWhisperProcess = null;
                return { success: true };
            } catch (err) {
                return { success: false, error: String(err) };
            }
        }
        return { success: false, message: "No active transcription" };
    });

    ipcMain.handle("whisper:deleteModel", async (_e, modelKey: WhisperModelKey) => {
        const entry = WHISPER_MODEL_FILES[modelKey];
        if (!entry) throw new Error(`Unknown model: ${modelKey}`);
        const modelPath = path.join(modelsDir(), entry.filename);

        try {
            await fs.unlink(modelPath);
            return { success: true };
        } catch (err: any) {
            if (err.code === "ENOENT") return { success: false, message: "Model file not found" };
            throw err;
        }
    });

    ipcMain.handle("whisper:listCache", async () => {
        const result: Record<string, boolean> = {};
        for (const key of Object.keys(WHISPER_MODEL_FILES) as WhisperModelKey[]) {
            const entry = WHISPER_MODEL_FILES[key];
            const p = path.join(modelsDir(), entry.filename);
            result[key] = await fileExists(p);
        }
        return result;
    });

    ipcMain.handle("whisper:activeDownloads", () => Array.from(activeDownloads));
}
