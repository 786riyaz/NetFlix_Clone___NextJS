import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import { resolveVideoPath, MIME_TYPES } from "@/lib/scanner";
import { nodeStreamToWeb } from "@/lib/stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Personal, authenticated video content — "private" so only the viewer's
// own browser cache may keep it (never a shared/intermediate cache like a
// CDN or corporate proxy). A short max-age is enough to make "go back to
// a video I was just watching" feel instant from the browser's own disk
// cache, without risking a rename/move/delete/optimize action being
// invisible for long if it happens moments later.
const CACHE_CONTROL = "private, max-age=300, must-revalidate";

function buildETag(size: number, mtimeMs: number, trackIndex?: number): string {
  return `"${size}-${Math.trunc(mtimeMs)}${trackIndex !== undefined ? `-t${trackIndex}` : ""}"`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const trackParam = req.nextUrl.searchParams.get("track");
  const trackIndex = trackParam !== null ? Number(trackParam) : undefined;
  const resolved = await resolveVideoPath(params.id, trackIndex);
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
  const etag = buildETag(stat.size, stat.mtimeMs, trackIndex);
  const lastModified = new Date(stat.mtimeMs).toUTCString();

  // Conditional GET: if the browser already has this exact byte range
  // cached and it's still valid (same ETag), skip re-reading/re-sending
  // the file entirely and just confirm it's still fresh.
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

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
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
        "Last-Modified": lastModified,
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
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
      "Last-Modified": lastModified,
    },
  });
}
