import { NextRequest, NextResponse } from "next/server";
import { getLibrary, isFfmpegAvailable } from "@/lib/scanner";
import { getVideoDir } from "@/lib/config";
import { ROLE_HEADER } from "@/lib/auth";
import type { LibraryResponse } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
const forceRescan = req.nextUrl.searchParams.get("rescan") === "1";
const videoDir = await getVideoDir();
// getLibrary() is what actually performs the fresh ffmpeg re-check on a
// forced rescan (see scanner.ts) — running it before isFfmpegAvailable()
// rather than in parallel means the banner reflects that fresh result
// instead of racing it and reading the stale cached value.
const videos = await getLibrary(forceRescan);
const ffmpegAvailable = await isFfmpegAvailable();
const folders = Array.from(new Set(videos.map((v) => v.folder).filter(Boolean))).sort();
const body: LibraryResponse = {
videos,
folders,
generatedAt: Date.now(),
ffmpegAvailable,
videoDir,
configured: !!videoDir,
superAdmin: req.headers.get(ROLE_HEADER) === "admin",
};
return NextResponse.json(body);
}