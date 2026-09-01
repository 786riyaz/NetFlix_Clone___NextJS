import type { ReadStream } from "fs";
// Wraps a Node `createReadStream` in a Web `ReadableStream` with proper
// teardown. Plain `Readable.toWeb()` keeps pushing 'data' events into the
// controller even after the browser aborts the fetch (closing the player,
// rapid seeking, or — for images — scrolling a thumbnail out of view before
// it finished loading). A late `controller.enqueue()` on an already-closed
// controller throws `ERR_INVALID_STATE`, and since that throw happens
// inside a stream event callback rather than inside a request handler's
// try/catch, it becomes an uncaught exception that crashes the whole
// Node process. This version destroys the Node stream on cancel and
// guards every controller call so a late event can never throw.
export function nodeStreamToWeb(nodeStream: ReadStream): ReadableStream<Uint8Array> {
let closed = false;
return new ReadableStream<Uint8Array>({
start(controller) {
nodeStream.on("data", (chunk: Buffer) => {
if (closed) return;
try {
controller.enqueue(new Uint8Array(chunk));
} catch {
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
// already closed
}
});
nodeStream.on("error", (err) => {
if (closed) return;
closed = true;
try {
controller.error(err);
} catch {
// already closed
}
});
},
cancel() {
closed = true;
nodeStream.destroy();
},
});
}
