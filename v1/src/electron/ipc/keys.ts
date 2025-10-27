import { ipcMain } from "electron";
import { ApiKey, readKeys, saveKey, removeKey } from "../helpers/keysStore.js";

export function registerKeysHandlers() {
    ipcMain.handle("keys:list", async () => readKeys());
    ipcMain.handle("keys:add", async (_e, apiKey: ApiKey) => saveKey(apiKey));
    ipcMain.handle("keys:remove", async (_e, name: string) => removeKey(name));
}
