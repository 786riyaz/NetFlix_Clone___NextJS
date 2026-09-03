import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { createReadStream, statSync } from "fs";
import { getSubtitleExtractTarget } from "@/lib/scanner";
import { nodeStreamToWeb } from "@/lib/stream";
import { BUNDLED_FFMPEG_PATH } from "@/lib/ffmpeg-bin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractToVtt(ffmpegBin: string, absPath: string, subtitleIndex: number, outPath: string): Promise<void> {
return new Promise((resolve, reject) => {
const args = ["-y", "-i", absPath, "-map", `0:s:${subtitleIndex}`, outPath];
const p = spawn(ffmpegBin, args);
let stderr = "";
p.stderr.on("data", (d) => (stderr += d.toString()));
p.on("error", (err) => reject(err));
p.on("exit", (code) => {
if (code === 0) resolve();
else reject(new Error(stderr.slice(-300) || `ffmpeg exited with code ${code}`));
});
});
}

function statOrNull(p: string) {
try {
return statSync(p);
} catch {
return null;
}
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
const trackIndex = Number(req.nextUrl.searchParams.get("track") ?? "0");
if (!Number.isInteger(trackIndex) || trackIndex < 0) {
return new Response("Invalid track index", { status: 400 });
}
const target = await getSubtitleExtractTarget(params.id, trackIndex);
if (!target) return new Response("Not found", { status: 404 });
if (!target.track.convertible) {
return new Response("This subtitle track is image-based and can't be converted to text captions.", { status: 422 });
}

let stat = statOrNull(target.outPath);
if (!stat) {
// Subtitle streams are tiny — a couple of seconds of ffmpeg work even
// for a feature-length file — so this runs inline rather than needing
// a background job/poll like the audio-track switch does.
try {
const ffmpegBin = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
await extractToVtt(ffmpegBin, target.absPath, trackIndex, target.outPath);
stat = statOrNull(target.outPath);
} catch (err: any) {
return new Response(`Could not extract subtitles: ${err?.message || "unknown error"}`, { status: 500 });
}
}
if (!stat) return new Response("Not found", { status: 404 });

const nodeStream = createReadStream(target.outPath);
nodeStream.on("error", () => {});
return new Response(nodeStreamToWeb(nodeStream), {
status: 200,
headers: {
"Content-Type": "text/vtt; charset=utf-8",
"Content-Length": String(stat.size),
"Cache-Control": "public, max-age=31536000, immutable",
},
});
}
