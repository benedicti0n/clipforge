import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/react"),
    },
  },
  base: "./",
  build: {
    outDir: "dist-react",
  },
  server: {
    port: 5172,
    strictPort: true
  }
})
