import { NextRequest, NextResponse } from "next/server";
import { getLibrary, isFfmpegAvailable } from "@/lib/scanner";
import { getVideoDir } from "@/lib/config";
import { ROLE_HEADER } from "@/lib/auth";
import type { LibraryResponse } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const superAdmin = req.headers.get(ROLE_HEADER) === "admin";
  const videoDir = await getVideoDir();
  const ffmpegAvailable = await isFfmpegAvailable();
  if (!videoDir) {
    const body: LibraryResponse = {
      videos: [],
      folders: [],
      generatedAt: Date.now(),
      ffmpegAvailable,
      videoDir: null,
      configured: false,
      superAdmin,
    };
    return NextResponse.json(body);
  }
  const rescan = req.nextUrl.searchParams.get("rescan") === "1";
  const videos = await getLibrary(rescan);
  const folders = Array.from(new Set(videos.map((v) => v.folder).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
  const body: LibraryResponse = {
    videos,
    folders,
    generatedAt: Date.now(),
    ffmpegAvailable,
    videoDir,
    configured: true,
    superAdmin,
  };
  return NextResponse.json(body);
}
