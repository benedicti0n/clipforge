import { app } from "electron";
import { createMainWindow } from "./window.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { ensureDir } from "./util.js";
import { modelsDir, transcriptsDir } from "./helpers/paths.js";
import { ffmpeg, ffprobe, logBinaryPaths } from "./helpers/resolveBinary.js";

app.whenReady().then(async () => {
    await ensureDir(modelsDir());
    await ensureDir(transcriptsDir());

    createMainWindow();
    registerIpcHandlers();

    logBinaryPaths("[boot]");
    if (!ffmpeg) console.error("[boot] ERROR: ffmpeg not found");
    if (!ffprobe) console.error("[boot] ERROR: ffprobe not found");
});
