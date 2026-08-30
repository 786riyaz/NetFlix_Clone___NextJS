import { NextRequest, NextResponse } from "next/server";
import { getVideoDir, setVideoDir } from "@/lib/config";
import { invalidateLibraryCache } from "@/lib/scanner";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
const videoDir = await getVideoDir();
return NextResponse.json({ videoDir, configured: !!videoDir });
}
export async function POST(req: NextRequest) {
const body = await req.json().catch(() => null);
const dir = body?.videoDir;
if (!dir || typeof dir !== "string") {
return NextResponse.json({ error: "videoDir is required" }, { status: 400 });
}
try {
const resolved = await setVideoDir(dir);
invalidateLibraryCache();
return NextResponse.json({ videoDir: resolved, configured: true });
} catch (e: any) {
return NextResponse.json({ error: e.message || "Could not use that folder" }, { status: 400 });
}
}