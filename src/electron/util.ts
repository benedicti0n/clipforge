import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import https from "https";

export async function ensureDir(dir: string) {
    await fsp.mkdir(dir, { recursive: true });
}

export function fileExists(p: string) {
    try { return fs.existsSync(p); } catch { return false; }
}

export function resolveBinaryPath(binName: string) {
    const isWin = process.platform === "win32";
    const name = isWin ? `${binName}.exe` : binName;

    // Dev: public/bin/<name>
    const dev = path.join(process.cwd(), "public", "bin", name);
    if (fileExists(dev)) return dev;

    // Prod: resources/bin/<name>
    const prod = path.join(process.resourcesPath, "bin", name);
    if (fileExists(prod)) return prod;

    // Fallback to PATH (for ffmpeg)
    return name;
}

export function tmpPath(prefix: string, ext: string) {
    const id = Math.random().toString(36).slice(2);
    return path.join(os.tmpdir(), `${prefix}-${id}.${ext}`);
}

export async function writeBufferToFile(dest: string, buf: Buffer) {
    await ensureDir(path.dirname(dest));
    await fsp.writeFile(dest, buf);
    return dest;
}

export async function readText(p: string) {
    return await fsp.readFile(p, "utf-8");
}

// Simple https download with progress + redirect support
export function downloadWithProgress(
    url: string,
    dest: string,
    onProgress: (percent: number) => void
): Promise<void> {
    return new Promise(async (resolve, reject) => {
        await ensureDir(path.dirname(dest));

        const doRequest = (u: string) => {
            const file = fs.createWriteStream(dest);
            const req = https.get(u, (res) => {
                // handle redirects
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    file.close();
                    fs.unlink(dest, () => doRequest(res.headers.location!));
                    return;
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => { });
                    return reject(new Error(`Download failed with code ${res.statusCode}`));
                }

                const total = parseInt(res.headers["content-length"] || "0", 10);
                let downloaded = 0;

                res.on("data", (chunk) => {
                    downloaded += chunk.length;
                    if (total > 0) onProgress((downloaded / total) * 100);
                });

                res.pipe(file);
                file.on("finish", () => file.close(() => resolve()));
            });

            req.on("error", (err) => {
                file.close();
                fs.unlink(dest, () => reject(err));
            });
        };

        doRequest(url);
    });
}


export function isDev(): boolean {
    return process.env.NODE_ENV === 'development'
} 