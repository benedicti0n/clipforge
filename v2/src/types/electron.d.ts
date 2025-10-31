// src/types/electron.d.ts
export interface ElectronAPI {
    downloadModel: (url: string, savePath: string) => Promise<boolean>;
    saveFile: (path: string, buffer: Buffer) => Promise<boolean>;
    deleteFile: (path: string) => Promise<boolean>;
    onDownloadProgress: (callback: (progress: number) => void) => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };