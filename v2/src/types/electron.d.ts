// src/types/electron.d.ts
export interface ElectronAPI {
    // Download
    downloadModel: (url: string, savePath: string) => Promise<boolean>;
    saveFile: (path: string, buffer: Buffer) => Promise<boolean>;
    deleteFile: (path: string) => Promise<boolean>;
    onDownloadProgress: (callback: (progress: number) => void) => void;
    onDownloadRetry: (callback: (attempt: number) => void) => void;
    onDownloadFailed: (callback: (error: string) => void) => void;
    openWhisperFolder: () => Promise<boolean>;
    listWhisperModels: () => Promise<string[]>;
    onDownloadSuccess: (callback: (data: { file: string }) => void) => void;
    cancelDownload: (filename: string) => Promise<boolean>;
    onDownloadCanceled: (callback: (data: { file: string }) => void) => void;
    onDownloadBlocked: (callback: (data: { reason: string }) => void) => void;

    // Transcription
    startTranscription: (params: {
        modelKey: string;
        modelFilename: string;
        inputPath: string;
        locale?: string;
        translate?: boolean;
    }) => Promise<boolean>;
    cancelTranscription: () => Promise<boolean>;
    onTranscribeLog: (cb: (data: { line: string }) => void) => void;
    onTranscribeResult: (cb: (data: {
        segments: { start: number; end: number; text: string }[];
        srt: string;
        jsonPath: string;
        srtPath: string;
    }) => void) => void;
    onTranscribeError: (cb: (data: { error: string }) => void) => void;
    getUserDataPath: () => Promise<string>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };