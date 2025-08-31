import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

console.log("✅ Preload loaded!");

contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        // Invoke handlers
        invoke: (channel: string, ...args: any[]) =>
            ipcRenderer.invoke(channel, ...args),

        // Subscribe
        on: (channel: string, listener: (...args: any[]) => void) => {
            ipcRenderer.on(channel, (_event: IpcRendererEvent, ...rest: any[]) =>
                listener(...rest)
            );
            return () => ipcRenderer.removeListener(channel, listener); // return disposer
        },

        // Subscribe once
        once: (channel: string, listener: (...args: any[]) => void) => {
            ipcRenderer.once(channel, (_event: IpcRendererEvent, ...rest: any[]) =>
                listener(...rest)
            );
        },

        // Unsubscribe
        removeListener: (channel: string, listener: (...args: any[]) => void) =>
            ipcRenderer.removeListener(channel, listener),

        // Remove all listeners for a channel
        removeAllListeners: (channel: string) =>
            ipcRenderer.removeAllListeners(channel),

        // Alias `.off` → `.removeListener` (React-friendly)
        off: (channel: string, listener: (...args: any[]) => void) =>
            ipcRenderer.removeListener(channel, listener),
    },
});
