import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

/**
 * Registers the Whisper model download IPC handler.
 * Handles redirects, retries, timeouts, and sends live progress + status events.
 */
export function registerWhisperModelDownloadHandler() {
    console.log("🧠 registerWhisperModelDownloadHandler called");

    ipcMain.handle("download-model", async (event, { url, savePath }) => {
        try {
            console.log("⚡ download-model IPC triggered with:", url);

            // Always resolve inside app data folder (writable in prod)
            const modelsDir = path.join(app.getPath("userData"), "whisperModels");
            if (!fs.existsSync(modelsDir)) {
                fs.mkdirSync(modelsDir, { recursive: true });
            }

            const absoluteSavePath = path.join(modelsDir, path.basename(savePath));
            console.log("⬇️ Downloading model to:", absoluteSavePath);

            await downloadWithRedirects(url, absoluteSavePath, event, 5);

            console.log("✅ Model downloaded:", absoluteSavePath);
            event.sender.send("download-success", { file: absoluteSavePath }); // ✅ success event for UI toast
            return true;
        } catch (err) {
            console.error("❌ Download handler failed:", err);
            throw err;
        }
    });
}

/**
 * Robust downloader with retry, redirect, and timeout handling.
 */
function downloadWithRedirects(
    url: string,
    savePath: string,
    event: Electron.IpcMainInvokeEvent,
    maxRedirects: number,
    attempt: number = 1
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
            return reject(new Error("Too many redirects"));
        }

        const tmpPath = savePath + ".part";
        const protocol = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(tmpPath);

        const request = protocol.get(url, (response) => {
            const statusCode = response.statusCode || 0;

            // 🔁 Handle redirects
            if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
                file.close();
                fs.rmSync(tmpPath, { force: true });
                const redirectUrl = new URL(response.headers.location, url).href;
                console.log(`↪️ Redirect (${statusCode}) → ${redirectUrl}`);
                return resolve(
                    downloadWithRedirects(redirectUrl, savePath, event, maxRedirects - 1)
                );
            }

            // ❌ Non-200 response
            if (statusCode !== 200) {
                file.close();
                fs.rmSync(tmpPath, { force: true });
                return reject(new Error(`HTTP ${statusCode}`));
            }

            const total = parseInt(response.headers["content-length"] || "0", 10);
            let downloaded = 0;

            // 📊 Progress tracking
            response.on("data", (chunk) => {
                downloaded += chunk.length;
                const progress = total ? (downloaded / total) * 100 : 0;
                event.sender.send("download-progress", { progress });
            });

            // 🧩 Pipe response to file
            response.pipe(file);

            // ✅ On finish
            file.on("finish", () => {
                file.close();
                try {
                    fs.renameSync(tmpPath, savePath);
                    console.log("✅ Finished download:", savePath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        // ⚠️ Error + retry logic
        request.on("error", (err) => {
            file.close();
            fs.rmSync(tmpPath, { force: true });

            if (attempt < 3) {
                console.warn(`⚠️ Download failed (${attempt}/3): ${err.message}. Retrying...`);
                event.sender.send("download-retry", { attempt }); // 🔁 notify UI
                setTimeout(() => {
                    resolve(downloadWithRedirects(url, savePath, event, maxRedirects, attempt + 1));
                }, 3000);
            } else {
                event.sender.send("download-failed", { error: err.message }); // ❌ final failure
                reject(err);
            }
        });

        // ⏳ Timeout for large models (2 min per request)
        request.setTimeout(120000, () => {
            request.destroy(new Error("Download timeout (120s)"));
        });
    });
}
