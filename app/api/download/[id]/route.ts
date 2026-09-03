import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import { resolveVideoPath, MIME_TYPES } from "@/lib/scanner";
import { nodeStreamToWeb } from "@/lib/stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Encodes a filename for Content-Disposition so names with spaces, unicode,
// or quotes don't break the header or get mangled by the browser.
function contentDisposition(filename: string): string {
const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
const encoded = encodeURIComponent(filename);
return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
const trackParam = req.nextUrl.searchParams.get("track");
const trackIndex = trackParam !== null ? Number(trackParam) : undefined;
const resolved = await resolveVideoPath(params.id, trackIndex);
if (!resolved) return new Response("Not found", { status: 404 });
const { absPath, ext, downloadName } = resolved;
let stat;
try {
stat = statSync(absPath);
} catch {
return new Response("Not found", { status: 404 });
}
const mime = MIME_TYPES[ext] || "application/octet-stream";
const range = req.headers.get("range");

// Downloads support Range too — browsers' native download managers use
// it to resume interrupted downloads on large files, same as the video
// player does for seeking.
if (range) {
const match = /bytes=(\d*)-(\d*)/.exec(range);
const start = match && match[1] ? parseInt(match[1], 10) : 0;
const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
const safeEnd = Math.min(end, stat.size - 1);
if (start >= stat.size || start > safeEnd) {
return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
}
const nodeStream = createReadStream(absPath, { start, end: safeEnd });
nodeStream.on("error", () => {});
return new Response(nodeStreamToWeb(nodeStream), {
status: 206,
headers: {
"Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`,
"Accept-Ranges": "bytes",
"Content-Length": String(safeEnd - start + 1),
"Content-Type": mime,
"Content-Disposition": contentDisposition(downloadName),
"Cache-Control": "no-store",
},
});
}

const nodeStream = createReadStream(absPath);
nodeStream.on("error", () => {});
return new Response(nodeStreamToWeb(nodeStream), {
status: 200,
headers: {
"Content-Length": String(stat.size),
"Content-Type": mime,
"Accept-Ranges": "bytes",
"Content-Disposition": contentDisposition(downloadName),
"Cache-Control": "no-store",
},
});
}
