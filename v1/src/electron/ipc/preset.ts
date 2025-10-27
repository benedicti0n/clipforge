import { ipcMain } from "electron";
import {
    savePresetToDisk,
    listPresetsFromDisk,
    deletePresetFromDisk,
} from "../helpers/presets.js";

export function registerPresetHandlers() {
    ipcMain.handle("presets:save", async (_e, preset) => {
        return savePresetToDisk(preset);
    });

    ipcMain.handle("presets:list", async () => {
        return listPresetsFromDisk();
    });

    ipcMain.handle("presets:delete", async (_e, name: string) => {
        return deletePresetFromDisk(name);
    });
}
