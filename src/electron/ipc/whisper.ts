import { ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs/promises";
import { ensureDir, fileExists, readText, downloadWithProgress } from "../util.js";
import { WHISPER_MODEL_FILES, WhisperModelKey } from "../constants/whisper.js";
import { modelsDir, transcriptsDir } from "../helpers/paths.js";
import { extractAudioToWav } from "../helpers/ffmpeg.js";
import { runWhisper } from "../helpers/whisper.js";
import { ChildProcess } from "child_process";

let activeWhisperProcess: ChildProcess | null = null;


//
// 🔹 Track active downloads in main
//
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
            // Local copy (from ./public/models)
            const localPath = path.join(process.cwd(), "public", "models", entry.filename);
            const fsSync = await import("fs");
            if (fsSync.existsSync(localPath)) {
                fsSync.copyFileSync(localPath, dest);

                e.sender.send("whisper:download:progress", { model: modelKey, percent: 100 });
                return true;
            }

            // Remote download
            if (entry.url.startsWith("http")) {
                e.sender.send("whisper:download:progress", { model: modelKey, percent: 0 });

                await downloadWithProgress(entry.url, dest, (percent) => {
                    try {
                        e.sender.send("whisper:download:progress", {
                            model: modelKey,
                            percent,
                        });
                    } catch (err) {
                        console.error("Failed to send progress to renderer", err);
                    }
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
        const modelPath = path.join(modelsDir(), entry.filename);

        const wavPath = await extractAudioToWav(videoPath);
        const baseName = path.parse(videoPath).name + "-" + Date.now().toString(36);

        // runWhisper should return process + output paths
        const out = await runWhisper(modelPath, wavPath, baseName, e.sender, (proc) => {
            activeWhisperProcess = proc;
        });

        activeWhisperProcess = null; // reset after done

        const full = (await fileExists(out.txt)) ? await readText(out.txt) : "";
        const preview = full.slice(0, 1200) + (full.length > 1200 ? "\n..." : "");
        const srt = (await fileExists(out.srt)) ? await readText(out.srt) : "";

        return { transcriptPath: out.srt, preview, full, srt };
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
            if (err.code === "ENOENT") {
                return { success: false, message: "Model file not found" };
            }
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

    //
    // 🔹 New: allow renderer to resync active downloads after reload
    //
    ipcMain.handle("whisper:activeDownloads", () => {
        return Array.from(activeDownloads);
    });
}
