//electron/main.ts
import { app } from "electron";
import { createMainWindow } from "./window.js";
import { registerIpcHandlers } from "./ipcHandlers/index.js";

app.whenReady().then(async () => {
    createMainWindow();
    registerIpcHandlers();
});
