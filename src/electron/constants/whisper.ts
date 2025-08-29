export type WhisperModelKey =
    | "tiny"
    | "base"
    | "small"
    | "medium"
    | "large"
    | "large-v2"
    | "large-v3";

// UI metadata (used by React)
export const WHISPER_MODELS_META: Array<{
    key: WhisperModelKey;
    label: string;
    sizeMB: number;
    note: string;
}> = [
        { key: "tiny", label: "tiny", sizeMB: 75, note: "Fastest, least accurate" },
        { key: "base", label: "base", sizeMB: 150, note: "Fast & light" },
        { key: "small", label: "small", sizeMB: 466, note: "Balanced speed/accuracy" },
        { key: "medium", label: "medium", sizeMB: 1500, note: "High accuracy, slower" },
        { key: "large", label: "large", sizeMB: 3100, note: "Legacy large" },
        { key: "large-v2", label: "large-v2", sizeMB: 3100, note: "Large v2 (better accuracy)" },
        { key: "large-v3", label: "large-v3", sizeMB: 3100, note: "Large v3 (best accuracy)" },
    ];

// Model file names + download URLs (whisper.cpp ggml)
export const WHISPER_MODEL_FILES: Record<
    WhisperModelKey,
    { filename: string; url: string }
> = {
    tiny: { filename: "ggml-tiny.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin" },
    base: { filename: "ggml-base.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" },
    small: { filename: "ggml-small.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin" },
    medium: { filename: "ggml-medium.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin" },
    large: { filename: "ggml-large.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin" },
    "large-v2": { filename: "ggml-large-v2.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin" },
    "large-v3": { filename: "ggml-large-v3.bin", url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin" },
};
