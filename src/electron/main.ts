import { app } from "electron";
import { createMainWindow } from "./window.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { ensureDir } from "./util.js";
import { modelsDir, transcriptsDir } from "./helpers/paths.js";

app.whenReady().then(async () => {
    await ensureDir(modelsDir());
    await ensureDir(transcriptsDir());

    createMainWindow();
    registerIpcHandlers();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
