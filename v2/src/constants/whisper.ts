export type WhisperModelKey =
    | "tiny"
    | "base"
    | "small"
    | "medium"
    | "large-v2"
    | "large-v3";

// UI metadata (used by React dropdowns etc.)
export const WHISPER_MODELS_META: Array<{
    key: WhisperModelKey;
    label: string;
    sizeMB: number;
    note: string;
}> = [
        { key: "tiny", label: "tiny", sizeMB: 75, note: "Fastest, least accurate" },
        { key: "base", label: "base", sizeMB: 142, note: "Fast & light" },
        { key: "small", label: "small", sizeMB: 466, note: "Balanced speed/accuracy" },
        { key: "medium", label: "medium", sizeMB: 1500, note: "High accuracy, slower" },
        { key: "large-v2", label: "large-v2", sizeMB: 2900, note: "Large v2 (better accuracy)" },
        { key: "large-v3", label: "large-v3", sizeMB: 2900, note: "Large v3 (best accuracy)" },
    ];

// Model file names + official Hugging Face download URLs
// (ggml format maintained by ggerganov/whisper.cpp)
export const WHISPER_MODEL_FILES: Record<
    WhisperModelKey,
    { filename: string; url: string }
> = {
    tiny: {
        filename: "ggml-tiny.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin?download=1",
    },
    base: {
        filename: "ggml-base.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=1",
    },
    small: {
        filename: "ggml-small.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin?download=1",
    },
    medium: {
        filename: "ggml-medium.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin?download=1",
    },
    "large-v2": {
        filename: "ggml-large-v2.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin?download=1",
    },
    "large-v3": {
        filename: "ggml-large-v3.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin?download=1",
    },
};
