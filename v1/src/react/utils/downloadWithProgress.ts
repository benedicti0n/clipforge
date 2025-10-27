import { createWriteStream } from "fs";
import https from "https";
import http from "http";

export async function downloadWithProgress(
    url: string,
    dest: string,
    onProgress?: (percent: number) => void,
    throttleMs: number = 1000 // ✅ only send progress every 1s
) {
    return new Promise<void>((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;

        client
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed: ${res.statusCode}`));
                    return;
                }

                const total = parseInt(res.headers["content-length"] || "0", 10);
                let downloaded = 0;

                const file = createWriteStream(dest);

                let lastEmit = Date.now();

                res.on("data", (chunk) => {
                    downloaded += chunk.length;

                    if (total && onProgress) {
                        const percent = Math.round((downloaded / total) * 100);

                        const now = Date.now();
                        if (now - lastEmit >= throttleMs || percent === 100) {
                            onProgress(percent);
                            lastEmit = now;
                        }
                    }
                });

                res.pipe(file);

                file.on("finish", () => {
                    file.close();
                    onProgress?.(100); // ensure final update
                    resolve();
                });

                res.on("error", reject);
                file.on("error", reject);
            })
            .on("error", reject);
    });
}
