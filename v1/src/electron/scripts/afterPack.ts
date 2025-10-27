// scripts/afterPack.js
import fs from "fs"
import path from "path";
import fse from "fs-extra"
import { spawnSync } from "child_process";

import ffmpegStatic from "ffmpeg-static";
import ffprobeStaticPkg from "ffprobe-static";

function log(...args) {
    console.log("[afterPack]", ...args);
}

function chmodX(p) {
    try {
        // 0o755
        fs.chmodSync(p, 0o755);
    } catch (e) {
        log("chmod failed for", p, e.message);
    }
}

function deQuarantineDarwin(p) {
    if (process.platform !== "darwin") return;
    try {
        spawnSync("xattr", ["-dr", "com.apple.quarantine", p], { stdio: "ignore" });
    } catch (e) {
        // Non-fatal
        log("xattr failed for", p, e.message);
    }
}

function ensureDir(p) {
    fse.ensureDirSync(p);
}

function copyFlatten(src, destDir, destName) {
    ensureDir(destDir);
    const finalPath = path.join(destDir, destName);
    fse.copyFileSync(src, finalPath);
    chmodX(finalPath);
    deQuarantineDarwin(finalPath);
    return finalPath;
}

async function afterPack(context) {
    const { appOutDir, electronPlatformName, packager } = context;
    const resourcesDir =
        electronPlatformName === "darwin"
            ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
            : path.join(appOutDir, "resources");

    const binDir = path.join(resourcesDir, "bin");
    ensureDir(binDir);

    // --- Resolve ffmpeg / ffprobe from node_modules ---
    let ffmpegPath, ffprobePath;
    try {
        ffmpegPath = ffmpegStatic; // absolute path to binary for host platform
    } catch (e) {
        log("Cannot resolve ffmpeg-static:", e.message);
    }

    try {
        const ffprobeStatic = ffprobeStaticPkg;
        ffprobePath = typeof ffprobeStatic === "string" ? ffprobeStatic : ffprobeStatic.path;
    } catch (e) {
        log("Cannot resolve ffprobe-static:", e.message);
    }

    // Optional: resolve whisper-cli if you ship it via npm or you placed it in public/bin
    // let whisperCli = null;
    // try {
    //   whisperCli = require.resolve("whisper-cli/bin/whisper-cli"); // example path
    // } catch {}

    // --- Copy & normalize names per platform ---
    const isWin = electronPlatformName === "win32";
    const ffmpegName = isWin ? "ffmpeg.exe" : "ffmpeg";
    const ffprobeName = isWin ? "ffprobe.exe" : "ffprobe";

    if (ffmpegPath) {
        const out = copyFlatten(ffmpegPath, binDir, path.basename(ffmpegName));
        log("Copied ffmpeg →", out);
    } else {
        log("WARNING: ffmpeg-static not found; ffmpeg will be missing!");
    }

    if (ffprobePath) {
        const out = copyFlatten(ffprobePath, binDir, path.basename(ffprobeName));
        log("Copied ffprobe →", out);
    } else {
        log("WARNING: ffprobe-static not found; ffprobe will be missing!");
    }

    // If you have your own whisper-cli, copy it similarly:
    // if (whisperCli) {
    //   const whisperName = isWin ? "whisper-cli.exe" : "whisper-cli";
    //   const out = copyFlatten(whisperCli, binDir, path.basename(whisperName));
    //   log("Copied whisper-cli →", out);
    // }

    // --- Optional: migrate any existing public/bin payloads into bin/ (flattens nested structure) ---
    // e.g., if you still keep some prebuilt tools in public/bin
    const publicBin = path.resolve("public/bin");
    if (fs.existsSync(publicBin)) {
        const entries = fse.readdirSync(publicBin, { withFileTypes: true });
        for (const ent of entries) {
            const src = path.join(publicBin, ent.name);
            if (ent.isFile()) {
                const out = copyFlatten(src, binDir, ent.name);
                log("Copied from public/bin →", out);
            } else if (ent.isDirectory()) {
                // flatten: copy child files to binDir root
                const subfiles = fse.readdirSync(src, { withFileTypes: true });
                for (const s of subfiles) {
                    if (!s.isFile()) continue;
                    const sPath = path.join(src, s.name);
                    const out = copyFlatten(sPath, binDir, s.name);
                    log("Copied from public/bin/* →", out);
                }
            }
        }
    }

    // --- Final verification: try `-version` on both (non-fatal if it fails) ---
    function checkVersion(binary) {
        try {
            const result = spawnSync(path.join(binDir, binary), ["-version"]);
            log(`${binary} -version status:`, result.status);
        } catch (e) {
            log(`Failed running ${binary} -version:`, e.message);
        }
    }
    checkVersion(ffmpegName);
    checkVersion(ffprobeName);
}

export default afterPack;
