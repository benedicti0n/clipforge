import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "500mb" },
  },
  webpack: (config) => {
    // Ensure ffmpeg-static binary is treated as external, not bundled
    config.externals.push({
      "ffmpeg-static": "commonjs ffmpeg-static",
    });
    return config;
  },
};

export default nextConfig;
