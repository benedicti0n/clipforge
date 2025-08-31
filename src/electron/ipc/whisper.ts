import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from "electron";
import path from "path";
import { ensureDir, fileExists, readText, downloadWithProgress } from "../util.js";
import { WHISPER_MODEL_FILES, WhisperModelKey } from "../constants/whisper.js";
import { modelsDir, transcriptsDir } from "../helpers/paths.js";
import { extractAudioToWav } from "../helpers/ffmpeg.js";
import { runWhisper } from "../helpers/whisper.js";

export function registerWhisperHandlers() {
    ensureDir(modelsDir());
    ensureDir(transcriptsDir());

    ipcMain.handle("whisper:checkCache", async (_e: IpcMainInvokeEvent, modelKey: WhisperModelKey) => {
        const entry = WHISPER_MODEL_FILES[modelKey];
        if (!entry) return false;
        const p = path.join(modelsDir(), entry.filename);
        return fileExists(p);
    });

    ipcMain.handle("whisper:downloadModel", async (_e, modelKey: WhisperModelKey) => {
        const entry = WHISPER_MODEL_FILES[modelKey];
        if (!entry) throw new Error(`Unknown model: ${modelKey}`);

        const dest = path.join(modelsDir(), entry.filename);

        // Local copy
        const localPath = path.join(process.cwd(), "public", "models", entry.filename);
        const fs = await import("fs");
        if (fs.existsSync(localPath)) {
            fs.copyFileSync(localPath, dest);
            return true;
        }

        // Remote download
        if (entry.url.startsWith("http")) {
            const web = BrowserWindow.fromWebContents(_e.sender);
            await downloadWithProgress(entry.url, dest, (percent) => {
                web?.webContents.send("whisper:download:progress", { model: modelKey, percent });
            });
            return true;
        }

        throw new Error(`Model not found locally and no remote URL for ${modelKey}`);
    });

    ipcMain.handle("whisper:transcribe", async (e, { model, videoPath }: { model: WhisperModelKey; videoPath: string | null }) => {
        if (!videoPath) throw new Error("videoPath not provided");

        const entry = WHISPER_MODEL_FILES[model];
        const modelPath = path.join(modelsDir(), entry.filename);

        const wavPath = await extractAudioToWav(videoPath);
        const baseName = path.parse(videoPath).name + "-" + Date.now().toString(36);

        const out = await runWhisper(modelPath, wavPath, baseName, e.sender);

        const full = (await fileExists(out.txt)) ? await readText(out.txt) : "";
        const preview = full.slice(0, 1200) + (full.length > 1200 ? "\n..." : "");
        const srt = (await fileExists(out.srt)) ? await readText(out.srt) : "";

        return { transcriptPath: out.srt, preview, full, srt };
    });
}
