import { NextRequest } from "next/server";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (ffmpegStatic) {
  // Ensure we point to the actual binary
  ffmpeg.setFfmpegPath(ffmpegStatic.toString());
}

function parseHMS(hms: string): number {
  // Accept "SS" or "HH:MM:SS"
  if (/^\d+$/.test(hms)) return parseInt(hms, 10);
  const m = hms.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) throw new Error("Invalid timestamp format. Use SS or HH:MM:SS");
  const [_, hh, mm, ss] = m;
  return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const startStr = String(form.get("start") ?? "0");
    const endStr = String(form.get("end") ?? "0");

    if (!(file instanceof File)) {
      return new Response("No file uploaded", { status: 400 });
    }

    const startSec = parseHMS(startStr);
    const endSec = parseHMS(endStr);
    if (endSec <= startSec) {
      return new Response("End must be greater than Start", { status: 400 });
    }
    const duration = endSec - startSec;

    // Save upload to temp file
    const bytes = Buffer.from(await file.arrayBuffer());
    const inName = `upload-${crypto.randomUUID()}.mp4`;
    const inPath = path.join(os.tmpdir(), inName);
    await writeFile(inPath, bytes);

    const outName = `clip-${crypto.randomUUID()}.mp4`;
    const outPath = path.join(os.tmpdir(), outName);

    // Run ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .inputOptions([`-ss ${startSec}`]) // fast seek
        .outputOptions([
          `-t ${duration}`,
          // Use copy for speed (no re-encode). 
          // If you hit codec issues, comment the next line and re-encode.
          "-c copy",
          "-movflags +faststart"
        ])
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .save(outPath);
    });

    const outBuffer = await readFile(outPath);

    // Cleanup temp files
    await unlink(inPath).catch(() => { });
    await unlink(outPath).catch(() => { });

    return new Response(outBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="clip.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to process";
    return new Response(message, { status: 500 });
  }
}
