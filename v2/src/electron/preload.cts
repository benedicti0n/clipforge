import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

console.log("✅ Preload loaded!");

const electronAPI = {
    // ✅ Direct high-level API calls
    downloadModel: (url: string, savePath: string) => {
        console.log("🧩 preload → invoking download-model", url, savePath);
        return ipcRenderer.invoke("download-model", { url, savePath });
    },

    saveFile: (path: string, buffer: Buffer) => {
        console.log("💾 preload → invoking save-file", path);
        return ipcRenderer.invoke("save-file", path, buffer);
    },

    openWhisperFolder: () => {
        console.log("📁 preload → invoking open-whisper-folder");
        return ipcRenderer.invoke("open-whisper-folder");
    },

    deleteFile: (path: string) => {
        console.log("🗑️ preload → invoking delete-file", path);
        return ipcRenderer.invoke("delete-file", path);
    },

    onDownloadProgress: (callback: (progress: number) => void) => {
        console.log("📊 preload → setting up download-progress listener");
        const listener = (_: IpcRendererEvent, data: { progress: number }) => {
            console.log("📈 progress update:", data.progress);
            callback(data.progress);
        };
        ipcRenderer.on("download-progress", listener);

        // Return cleanup function
        return () => {
            ipcRenderer.removeListener("download-progress", listener);
        };
    },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

console.log("✅ electronAPI exposed to window");