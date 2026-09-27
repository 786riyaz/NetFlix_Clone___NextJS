import { createReadStream, existsSync, statSync } from "fs";
import { resolveScrubSpritePath } from "@/lib/scanner";
import { nodeStreamToWeb } from "@/lib/stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
const spritePath = await resolveScrubSpritePath(params.id);
if (!spritePath || !existsSync(spritePath)) {
return new Response("Not found", { status: 404 });
}
const stat = statSync(spritePath);
const nodeStream = createReadStream(spritePath);
nodeStream.on("error", () => {});
const webStream = nodeStreamToWeb(nodeStream);
return new Response(webStream, {
status: 200,
headers: {
"Content-Type": "image/jpeg",
"Content-Length": String(stat.size),
"Cache-Control": "public, max-age=31536000, immutable",
},
});
}
