// modelInfos.ts
export const ModelInfos: Record<
  string,
  { size: string; vram: string; speed: string }
> = {
  tiny: { size: "75 MB", vram: "~1GB", speed: "Very Fast" },
  base: { size: "142 MB", vram: "~1GB", speed: "Fast" },
  small: { size: "466 MB", vram: "~2GB", speed: "Balanced" },
  medium: { size: "1.5 GB", vram: "~5GB", speed: "Slower" },
  large: { size: "3.1 GB", vram: "~10GB", speed: "Slowest" },
  "large-v2": { size: "3.1 GB", vram: "~10GB", speed: "Slowest (Better accuracy)" },
  "large-v3": { size: "3.1 GB", vram: "~10GB", speed: "Slowest (Best accuracy)" },
};
