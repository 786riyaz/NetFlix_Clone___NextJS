import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import type { ReadStream } from "fs";
import { resolveVideoPath, MIME_TYPES } from "@/lib/scanner";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wraps a Node `createReadStream` in a Web `ReadableStream` with proper
// teardown. The previous implementation used `Readable.toWeb()`, which
// keeps piping 'data' events into the controller even after the browser
// aborts the fetch (e.g. rapid seeking, or navigating away mid-download).
// Once the client disconnects, the underlying web stream's controller is
// already closed, but the Node stream doesn't know that and keeps calling
// `controller.enqueue()`, which throws `ERR_INVALID_STATE` — and because
// that throw happens inside a stream event callback (not inside a request
// handler try/catch), it becomes an uncaught exception that crashes the
// whole Node process.
//
// This version explicitly destroys the Node stream when the web stream is
// cancelled, and guards every controller call so a late event from the
// Node stream can never throw.
function nodeStreamToWeb(nodeStream: ReadStream): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          // Controller already closed/errored from the other side (client
          // aborted). Stop the Node stream so no more events arrive.
          closed = true;
          nodeStream.destroy();
        }
      });
      nodeStream.on("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed, nothing to do
        }
      });
      nodeStream.on("error", (err) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(err);
        } catch {
          // already closed, nothing to do
        }
      });
    },
    cancel() {
      // Client aborted (paused/seeked/navigated away). Stop reading the
      // file immediately — this is what actually prevents the crash.
      closed = true;
      nodeStream.destroy();
    },
  });
}

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
