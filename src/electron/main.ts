import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs"
import { spawn } from "child_process";
import { ensureDir, fileExists, resolveBinaryPath, tmpPath, readText, downloadWithProgress, isDev } from "./util.js";
import { WHISPER_MODEL_FILES, WhisperModelKey } from "./constants/whisper.js";
import { getPreloadPath } from "./pathResolver.js"

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const devServerURL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5172";
    console.log(path.join(app.getAppPath(), "dist-electron", "preload.js"));

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            preload: getPreloadPath(),
        },
    });

    if (isDev() && devServerURL) {
        mainWindow.loadURL(devServerURL);
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), "dist-react", "index.html"));
    }
}

app.whenReady().then(async () => {
    await ensureDir(modelsDir());
    await ensureDir(transcriptsDir());
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// ---------- Paths ----------
function modelsDir() {
    return path.join(app.getPath("userData"), "whisper", "models");
}
function transcriptsDir() {
    return path.join(app.getPath("userData"), "whisper", "transcripts");
}

ipcMain.handle("dialog:openVideo", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
            { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
        ],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0]; // ✅ send path back to renderer
});

// ---------- IPC: check cache ----------
ipcMain.handle("whisper:checkCache", async (_e: IpcMainInvokeEvent, modelKey: WhisperModelKey) => {
    const entry = WHISPER_MODEL_FILES[modelKey];
    if (!entry) return false;
    const p = path.join(modelsDir(), entry.filename);
    return fileExists(p);
});

// ---------- IPC: download model (+progress events) ----------
ipcMain.handle("whisper:downloadModel", async (_e, modelKey: WhisperModelKey) => {
    const entry = WHISPER_MODEL_FILES[modelKey];
    if (!entry) throw new Error(`Unknown model: ${modelKey}`);

    const dest = path.join(modelsDir(), entry.filename);

    // ✅ Copy from public/models if it exists there
    const localPath = path.join(process.cwd(), "public", "models", entry.filename);
    if (fs.existsSync(localPath)) {
        fs.copyFileSync(localPath, dest);
        return true;
    }

    // Otherwise fallback to download (if URL is remote)
    if (entry.url.startsWith("http")) {
        const web = BrowserWindow.fromWebContents(_e.sender);
        await downloadWithProgress(entry.url, dest, (percent) => {
            web?.webContents.send("whisper:download:progress", { model: modelKey, percent });
        });
        return true;
    }

    throw new Error(`Model not found locally and no remote URL for ${modelKey}`);
});


// ---------- Helper: extract audio with ffmpeg ----------
async function extractAudioToWav(videoPath: string) {
    const ffmpegBin = resolveBinaryPath("ffmpeg"); // use system ffmpeg or bundled
    const out = tmpPath("audio", "wav");

    console.log("Running ffmpeg with:", ffmpegBin, videoPath, "->", out);

    await new Promise<void>((resolve, reject) => {
        const ff = spawn(ffmpegBin, [
            "-y",
            "-i", videoPath,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            out,
        ], { stdio: "ignore" });

        ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });

    return out;
}

// ---------- Helper: run whisper.cpp ----------
async function runWhisper(modelPath: string, audioPath: string, outBaseName: string) {
    const whisperBin = resolveBinaryPath("whisper-cli"); // dev: public/bin/whisper
    const outBase = path.join(transcriptsDir(), outBaseName);

    await new Promise<void>((resolve, reject) => {
        const child = spawn(whisperBin, [
            "-m", modelPath,
            "-f", audioPath,
            "-otxt",
            "-osrt",
            "-of", outBase
        ]);

        child.stdout.on("data", () => { }); // optional: pipe logs
        child.stderr.on("data", () => { });
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`whisper exited ${code}`))));
    });

    return {
        txt: `${outBase}.txt`,
        srt: `${outBase}.srt`,
    };
}

// ---------- IPC: transcribe ----------
ipcMain.handle("whisper:transcribe", async (_e: IpcMainInvokeEvent, payload: { model: WhisperModelKey; videoPath: string | null }) => {
    const { model, videoPath } = payload;
    if (!videoPath) throw new Error("videoPath not provided. In Electron, prefer using main-process dialog to choose files so their path is accessible.");

    // Resolve model path
    const entry = WHISPER_MODEL_FILES[model];
    if (!entry) throw new Error(`Unknown model: ${model}`);
    const modelPath = path.join(modelsDir(), entry.filename);
    if (!fileExists(modelPath)) throw new Error(`Model not cached: ${model}`);

    // 1) Extract audio wav
    const wavPath = await extractAudioToWav(videoPath);

    // 2) Run whisper
    const baseName = path.parse(videoPath).name + "-" + Date.now().toString(36);
    const out = await runWhisper(modelPath, wavPath, baseName);

    // 3) Read outputs
    const full = fileExists(out.txt) ? await readText(out.txt) : "";
    const preview = full.slice(0, 1200) + (full.length > 1200 ? "\n..." : "");

    return {
        transcriptPath: out.srt, // you’ll feed this to the next tab
        preview,
        full,
    };
});

ipcMain.handle("file:read", async (_e, path: string) => {
    return fs.readFileSync(path); // Buffer → sent to renderer
});
