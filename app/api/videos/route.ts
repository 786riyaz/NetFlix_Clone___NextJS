import { NextRequest, NextResponse } from "next/server";
import { getLibrary, isFfmpegAvailable } from "@/lib/scanner";
import type { LibraryResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const forceRescan = req.nextUrl.searchParams.get("rescan") === "1";
  const [videos, ffmpegAvailable] = await Promise.all([
    getLibrary(forceRescan),
    isFfmpegAvailable(),
  ]);
  const folders = Array.from(new Set(videos.map((v) => v.folder).filter(Boolean))).sort();

  const body: LibraryResponse = {
    videos,
    folders,
    generatedAt: Date.now(),
    ffmpegAvailable,
  };
  return NextResponse.json(body);
}
