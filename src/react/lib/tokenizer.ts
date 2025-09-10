import { encoding_for_model } from "js-tiktoken";

// Fallback: use cl100k_base (GPT-4/3.5 style BPE)
const enc = encoding_for_model("gpt-4") ?? encoding_for_model("cl100k_base");

export function countTokens(text: string): number {
    if (!text) return 0;
    return enc.encode(text).length;
}
