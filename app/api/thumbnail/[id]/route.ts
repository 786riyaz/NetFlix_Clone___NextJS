import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import { resolveThumbnailPath } from "@/lib/scanner";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
const thumbPath = await resolveThumbnailPath(params.id);
if (!thumbPath || !existsSync(thumbPath)) {
return new Response("Not found", { status: 404 });
}
const stat = statSync(thumbPath);
const nodeStream = createReadStream(thumbPath);
const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
return new Response(webStream, {
status: 200,
headers: {
"Content-Type": "image/jpeg",
"Content-Length": String(stat.size),
"Cache-Control": "public, max-age=31536000, immutable",
},
});
}