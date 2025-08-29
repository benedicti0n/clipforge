import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs"
import { spawn } from "child_process";
import { ensureDir, fileExists, resolveBinaryPath, tmpPath, readText, downloadWithProgress, isDev } from "./util.js";
import { WHISPER_MODEL_FILES, WhisperModelKey } from "./constants/whisper.js";
import { getPreloadPath } from "./pathResolver.js"
import fetch from "node-fetch"

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
async function runWhisper(modelPath: string, audioPath: string, outBaseName: string, web: Electron.WebContents) {
    const whisperBin = resolveBinaryPath("whisper-cli");
    const outBase = path.join(transcriptsDir(), outBaseName);

    await new Promise<void>((resolve, reject) => {
        const child = spawn(whisperBin, [
            "-m", modelPath,
            "-f", audioPath,
            "-otxt",
            "-osrt",
            "-of", outBase,
        ]);

        child.stdout.on("data", (chunk) => {
            web.send("whisper:log", chunk.toString());
        });

        child.stderr.on("data", (chunk) => {
            web.send("whisper:log", chunk.toString());
        });

        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`whisper exited ${code}`))));
    });

    return {
        txt: `${outBase}.txt`,
        srt: `${outBase}.srt`,
    };
}

// ---------- IPC: transcribe ----------
ipcMain.handle("whisper:transcribe", async (e, payload: { model: WhisperModelKey; videoPath: string | null }) => {
    const { model, videoPath } = payload;
    if (!videoPath) throw new Error("videoPath not provided");

    const entry = WHISPER_MODEL_FILES[model];
    const modelPath = path.join(modelsDir(), entry.filename);

    const wavPath = await extractAudioToWav(videoPath);
    const baseName = path.parse(videoPath).name + "-" + Date.now().toString(36);

    // ✅ pass sender’s webContents
    const out = await runWhisper(modelPath, wavPath, baseName, e.sender);

    const full = fileExists(out.txt) ? await readText(out.txt) : "";
    const preview = full.slice(0, 1200) + (full.length > 1200 ? "\n..." : "");

    const srt = fileExists(out.srt) ? await readText(out.srt) : "";


    return { transcriptPath: out.srt, preview, full, srt };
});

ipcMain.handle("dialog:openSRT", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "SubRip Subtitle", extensions: ["srt"] }],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle("file:readText", async (_e, path: string) => {
    return fs.readFileSync(path, "utf-8");
});


ipcMain.handle("file:read", async (_e, path: string) => {
    return fs.readFileSync(path); // Buffer → sent to renderer
});

// ipcMain.handle("ollama:list", async () => {
//     return new Promise<string[]>((resolve) => {
//         const child = spawn("ollama", ["list"]);
//         let out = "";
//         child.stdout.on("data", (d) => (out += d.toString()));
//         child.on("close", () => {
//             const models = out
//                 .split("\n")
//                 .slice(1)
//                 .map((line) => line.split(/\s+/)[0])
//                 .filter(Boolean);
//             resolve(models);
//         });
//     });
// });

// ipcMain.handle("ollama:pull", async (_e, model: string) => {
//     return new Promise<void>((resolve, reject) => {
//         const child = spawn("ollama", ["pull", model], { stdio: "inherit" });
//         child.on("close", (code) =>
//             code === 0 ? resolve() : reject(new Error("Failed to pull model"))
//         );
//     });
// });

// ipcMain.handle("ollama:run", async (_e, payload: { model: string; prompt: string }) => {
//     const { model, prompt } = payload;

//     return new Promise<string>((resolve, reject) => {
//         let output = "";

//         const child = spawn("ollama", ["run", model, "--format", "json"], {
//             stdio: ["pipe", "pipe", "pipe"],
//         });

//         child.stdin.write(prompt);
//         child.stdin.end();

//         child.stdout.on("data", (chunk) => {
//             const msg = chunk.toString();
//             output += msg;

//             BrowserWindow.getAllWindows().forEach((w) =>
//                 w.webContents.send("ollama:output", msg)
//             );
//         });

//         child.stderr.on("data", (chunk) => {
//             const msg = chunk.toString();
//             console.error("Ollama stderr:", msg);
//             BrowserWindow.getAllWindows().forEach((w) =>
//                 w.webContents.send("ollama:log", msg)
//             );
//         });

//         child.on("close", (code) => {
//             if (code === 0) {
//                 try {
//                     // Ollama JSON mode can emit multiple JSON objects per line
//                     const lines = output.trim().split("\n").filter(Boolean);
//                     const last = lines[lines.length - 1]; // final full JSON
//                     resolve(last);
//                 } catch (err) {
//                     reject(new Error("Failed to parse Ollama JSON output"));
//                 }
//             } else {
//                 reject(new Error(`Ollama exited with code ${code}`));
//             }
//         });
//     });
// });

ipcMain.handle(
    "gemini:run",
    async (_e, payload: { apiKey: string; prompt: string; transcript: string }) => {
        const { apiKey, prompt, transcript } = payload;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: prompt },
                                { text: transcript },
                            ],
                        },
                    ],
                }),
            });

            if (!res.ok) {
                throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
            }

            const data = await res.json();
            return data;
        } catch (err) {
            console.error("Gemini API error:", err);
            throw err;
        }
    }
);

// ---------- IPC: Keys Store/Delete ----------
type ApiKey = { name: string; key: string };

// ---------- File helpers ----------
function keysFilePath() {
    return path.join(app.getPath("userData"), "gemini_keys.json");
}

function readKeys(): ApiKey[] {
    try {
        const raw = fs.readFileSync(keysFilePath(), "utf8");
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeKeys(keys: ApiKey[]) {
    fs.writeFileSync(keysFilePath(), JSON.stringify(keys, null, 2), "utf8");
}

// ---------- IPC handlers ----------
ipcMain.handle("keys:list", async () => {
    return readKeys();
});

ipcMain.handle("keys:add", async (_e, apiKey: ApiKey) => {
    let keys = readKeys();

    // Prevent duplicates (by name)
    keys = keys.filter((k) => k.name !== apiKey.name);
    keys.push(apiKey);

    writeKeys(keys);
    return keys; // ✅ always return full updated list
});

ipcMain.handle("keys:remove", async (_e, name: string) => {
    let keys = readKeys();

    keys = keys.filter((k) => k.name !== name);

    writeKeys(keys);
    return keys; // ✅ always return full updated list
});