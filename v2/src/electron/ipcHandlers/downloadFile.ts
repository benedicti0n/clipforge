import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

// Keep references to active downloads
const activeDownloads = new Map<string, ReturnType<typeof https.get>>();
let globalDownloadInProgress = false;

export function registerWhisperModelDownloadHandler() {
    console.log("🧠 registerWhisperModelDownloadHandler called");

    ipcMain.handle("download-model", async (event, { url, savePath }) => {
        if (globalDownloadInProgress) {
            console.warn("⚠️ Another download is already in progress. Ignoring new request.");
            event.sender.send("download-blocked", { reason: "Another download is in progress" });
            return false;
        }

        try {
            globalDownloadInProgress = true;
            console.log("⚡ download-model IPC triggered with:", url);

            const modelsDir = path.join(app.getPath("userData"), "whisperModels");
            if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

            const absoluteSavePath = path.join(modelsDir, path.basename(savePath));
            console.log("⬇️ Downloading model to:", absoluteSavePath);

            await downloadWithRedirects(url, absoluteSavePath, event, 5);

            console.log("✅ Model downloaded:", absoluteSavePath);
            event.sender.send("download-success", { file: absoluteSavePath });
            return true;
        } catch (err) {
            console.error("❌ Download handler failed:", err);
            throw err;
        } finally {
            globalDownloadInProgress = false;
        }
    });

    ipcMain.handle("cancel-download", async (_, filename: string) => {
        const req = activeDownloads.get(filename);
        if (req) {
            console.log(`🛑 Canceling download: ${filename}`);
            req.destroy(new Error("Download canceled by user"));
            activeDownloads.delete(filename);
            globalDownloadInProgress = false; // ✅ release lock
            return true;
        }
        console.log(`⚠️ No active download for: ${filename}`);
        return false;
    });
}

function downloadWithRedirects(
    url: string,
    savePath: string,
    event: Electron.IpcMainInvokeEvent,
    maxRedirects: number,
    attempt: number = 1
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) return reject(new Error("Too many redirects"));
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

            if (statusCode !== 200) {
                file.close();
                fs.rmSync(tmpPath, { force: true });
                return reject(new Error(`HTTP ${statusCode}`));
            }

            const total = parseInt(response.headers["content-length"] || "0", 10);
            let downloaded = 0;
            const filename = path.basename(savePath);
            activeDownloads.set(filename, request);

            // 📊 Progress tracking
            let lastEmit = Date.now();
            response.on("data", (chunk) => {
                downloaded += chunk.length;
                const progress = total ? (downloaded / total) * 100 : 0;

                // Emit progress every 500 ms to reduce IPC spam
                if (Date.now() - lastEmit > 500) {
                    event.sender.send("download-progress", { progress });
                    lastEmit = Date.now();
                }
            });

            response.pipe(file);

            file.on("finish", () => {
                file.close();
                activeDownloads.delete(filename);
                if (fs.existsSync(tmpPath)) {
                    fs.renameSync(tmpPath, savePath);
                }
                console.log("✅ Finished download:", savePath);
                resolve();
            });
        });

        // 🧱 Robust error / retry handling
        request.on("error", (err) => {
            file.close();
            const filename = path.basename(savePath);
            activeDownloads.delete(filename);
            fs.rmSync(tmpPath, { force: true });

            if (attempt < 5) {
                console.warn(`⚠️ Download failed (${attempt}/5): ${err.message}. Retrying...`);
                event.sender.send("download-retry", { attempt });
                setTimeout(() => {
                    resolve(downloadWithRedirects(url, savePath, event, maxRedirects, attempt + 1));
                }, 5000); // 5 s delay
            } else {
                event.sender.send("download-failed", { error: err.message });
                reject(err);
            }
        });

        // 🕒 Extended timeout for large models (10 min)
        request.setTimeout(10 * 60 * 1000, () => {
            request.destroy(new Error("Download timeout (10 min)"));
        });
    });
}
