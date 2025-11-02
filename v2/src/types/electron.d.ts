// src/types/electron.d.ts
export interface ElectronAPI {
    downloadModel: (url: string, savePath: string) => Promise<boolean>;
    saveFile: (path: string, buffer: Buffer) => Promise<boolean>;
    deleteFile: (path: string) => Promise<boolean>;
    onDownloadProgress: (callback: (progress: number) => void) => void;
    onDownloadRetry: (callback: (attempt: number) => void) => void;
    onDownloadFailed: (callback: (error: string) => void) => void;
    openWhisperFolder: () => Promise<boolean>;
    listWhisperModels: () => Promise<string[]>;
    onDownloadSuccess: (callback: (data: { file: string }) => void) => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };