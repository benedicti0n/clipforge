import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

console.log("✅ Preload loaded!");

contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (...args: any[]) => void) =>
            ipcRenderer.on(channel, (_event: IpcRendererEvent, ...rest: any[]) => listener(...rest)),
        removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
    },
});