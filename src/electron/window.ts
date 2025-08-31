import { BrowserWindow, app } from "electron";
import path from "path";
import { getPreloadPath } from "./pathResolver.js";
import { isDev } from "./util.js";

let mainWindow: BrowserWindow | null = null;

export function createMainWindow() {
    const devServerURL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5172";

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

    return mainWindow;
}
