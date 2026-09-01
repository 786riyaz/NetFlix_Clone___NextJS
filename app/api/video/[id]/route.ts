import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import { resolveVideoPath, MIME_TYPES } from "@/lib/scanner";
import { nodeStreamToWeb } from "@/lib/stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
const resolved = await resolveVideoPath(params.id);
if (!resolved) {
return new Response("Not found", { status: 404 });
}
const { absPath, ext } = resolved;
let stat;
try {
stat = statSync(absPath);
} catch {
return new Response("Not found", { status: 404 });
}
const mime = MIME_TYPES[ext] || "application/octet-stream";
const range = req.headers.get("range");
if (range) {
const match = /bytes=(\d*)-(\d*)/.exec(range);
const start = match && match[1] ? parseInt(match[1], 10) : 0;
const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
const safeEnd = Math.min(end, stat.size - 1);
const chunkSize = safeEnd - start + 1;
if (start >= stat.size || start > safeEnd) {
return new Response(null, {
status: 416,
headers: { "Content-Range": `bytes */${stat.size}` },
});
}
const nodeStream = createReadStream(absPath, { start, end: safeEnd });
nodeStream.on("error", () => {
/* handled inside nodeStreamToWeb; this no-op prevents a second
uncaught 'error' listener warning */
});
const webStream = nodeStreamToWeb(nodeStream);
return new Response(webStream, {
status: 206,
headers: {
"Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`,
"Accept-Ranges": "bytes",
"Content-Length": String(chunkSize),
"Content-Type": mime,
"Cache-Control": "no-store",
},
});
}
// No range header: stream the whole file, but still as a stream (not buffered).
const nodeStream = createReadStream(absPath);
nodeStream.on("error", () => {});
const webStream = nodeStreamToWeb(nodeStream);
return new Response(webStream, {
status: 200,
headers: {
"Content-Length": String(stat.size),
"Content-Type": mime,
"Accept-Ranges": "bytes",
"Cache-Control": "no-store",
},
});
}
