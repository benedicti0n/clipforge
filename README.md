# Next.js 15 Video Clipper (TypeScript)

Upload a large video, choose start & end timestamps, and clip a segment for download.

## Quick Start
```bash
pnpm i   # or npm i / yarn
pnpm dev # or npm run dev
```
Then open http://localhost:3000

## Notes
- Uses `ffmpeg-static` + `fluent-ffmpeg` on the server.
- The route handler writes the uploaded file to the OS temp dir, runs ffmpeg,
  then returns the clipped file as a download.
- For *very* large files, you may want to:
  - Put this route behind an object storage upload (S3, GCS) and process from there.
  - Stream the response instead of buffering (simple approach here buffers).
- Timestamps support `SS` (seconds) or `HH:MM:SS`.

## Deploy
- Deploy to a Node.js environment (NOT Edge). Ensure ffmpeg binary execution is allowed.
- If you see codec issues, remove `-c copy` and let ffmpeg re-encode (slower but reliable).
