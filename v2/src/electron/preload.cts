import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

console.log("✅ Preload loaded!");

const electronAPI = {
    saveFileFromBlob: async (savePath: string, file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        return ipcRenderer.invoke("save-file", savePath, buf);
    },

    // ✅ Direct high-level API calls
    listWhisperModels: () => {
        console.log("📄 preload → invoking list-whisper-models");
        return ipcRenderer.invoke("list-whisper-models");
    },

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

    onDownloadRetry: (callback: (attempt: number) => void) => {
        const listener = (_: IpcRendererEvent, data: { attempt: number }) => {
            callback(data.attempt);
        };
        ipcRenderer.on("download-retry", listener);
        return () => ipcRenderer.removeListener("download-retry", listener);
    },

    onDownloadFailed: (callback: (error: string) => void) => {
        const listener = (_: IpcRendererEvent, data: { error: string }) => {
            callback(data.error);
        };
        ipcRenderer.on("download-failed", listener);
        return () => ipcRenderer.removeListener("download-failed", listener);
    },

    onDownloadSuccess: (callback: (data: { file: string }) => void) => {
        const listener = (_: IpcRendererEvent, data: { file: string }) => {
            callback(data);
        };
        ipcRenderer.on("download-success", listener);
        return () => ipcRenderer.removeListener("download-success", listener);
    },

    cancelDownload: (filename: string) => ipcRenderer.invoke("cancel-download", filename),
    onDownloadCanceled: (callback: (data: { file: string }) => void) => {
        const listener = (_: IpcRendererEvent, data: { file: string }) => callback(data);
        ipcRenderer.on("download-canceled", listener);
        return () => ipcRenderer.removeListener("download-canceled", listener);
    },

    onDownloadBlocked: (callback: (data: { reason: string }) => void) => {
        const listener = (_: IpcRendererEvent, data: { reason: string }) => callback(data);
        ipcRenderer.on("download-blocked", listener);
        return () => ipcRenderer.removeListener("download-blocked", listener);
    },




    startTranscription: (params: {
        modelKey: string;
        modelFilename: string;
        inputPath: string;
        locale?: string;
        translate?: boolean;
    }) => ipcRenderer.invoke("start-transcription", params),

    cancelTranscription: () => ipcRenderer.invoke("cancel-transcription"),

    onTranscribeLog: (cb: (data: { line: string }) => void) => {
        const fn = (_: IpcRendererEvent, data: { line: string }) => cb(data);
        ipcRenderer.on("transcribe-log", fn);
        return () => ipcRenderer.removeListener("transcribe-log", fn);
    },

    onTranscribeResult: (cb: (data: {
        segments: { start: number; end: number; text: string }[];
        srt: string;
        jsonPath: string;
        srtPath: string;
    }) => void) => {
        const fn = (_: IpcRendererEvent, data: any) => cb(data);
        ipcRenderer.on("transcribe-result", fn);
        return () => ipcRenderer.removeListener("transcribe-result", fn);
    },

    onTranscribeError: (cb: (data: { error: string }) => void) => {
        const fn = (_: IpcRendererEvent, data: { error: string }) => cb(data);
        ipcRenderer.on("transcribe-error", fn);
        return () => ipcRenderer.removeListener("transcribe-error", fn);
    },

    getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

console.log("✅ electronAPI exposed to window");