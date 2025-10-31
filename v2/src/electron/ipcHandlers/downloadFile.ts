import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

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
            return true;
        } catch (err) {
            console.error("❌ Download handler failed:", err);
            throw err;
        }
    });
}

function downloadWithRedirects(
    url: string,
    savePath: string,
    event: Electron.IpcMainInvokeEvent,
    maxRedirects: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
            reject(new Error("Too many redirects"));
            return;
        }

        const file = fs.createWriteStream(savePath);
        const protocol = url.startsWith("https") ? https : http;

        const request = protocol.get(url, (response) => {
            const statusCode = response.statusCode || 0;

            // Handle redirects (301, 302, 303, 307, 308)
            if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
                console.log(`↪️  Redirect ${statusCode} to:`, response.headers.location);
                file.close();
                fs.unlinkSync(savePath); // Clean up partial file

                // Follow the redirect
                const redirectUrl = new URL(response.headers.location, url).href;
                downloadWithRedirects(redirectUrl, savePath, event, maxRedirects - 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // Handle non-200 responses
            if (statusCode !== 200) {
                file.close();
                if (fs.existsSync(savePath)) {
                    fs.unlinkSync(savePath);
                }
                reject(new Error(`HTTP ${statusCode}`));
                return;
            }

            // Track download progress
            const total = parseInt(response.headers["content-length"] || "0", 10);
            let downloaded = 0;

            response.on("data", (chunk) => {
                downloaded += chunk.length;
                const progress = total ? (downloaded / total) * 100 : 0;
                event.sender.send("download-progress", { progress });
            });

            response.pipe(file);

            file.on("finish", () => {
                file.close();
                resolve();
            });

            file.on("error", (err) => {
                file.close();
                if (fs.existsSync(savePath)) {
                    fs.unlinkSync(savePath);
                }
                reject(err);
            });
        });

        request.on("error", (err) => {
            file.close();
            if (fs.existsSync(savePath)) {
                fs.unlinkSync(savePath);
            }
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            file.close();
            if (fs.existsSync(savePath)) {
                fs.unlinkSync(savePath);
            }
            reject(new Error("Download timeout"));
        });
    });
}