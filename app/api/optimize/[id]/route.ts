import { NextRequest, NextResponse } from "next/server";
import { getOptimizeTarget } from "@/lib/scanner";
import { enqueueTranscode, getJob } from "@/lib/transcode";
import { BUNDLED_FFMPEG_PATH } from "@/lib/ffmpeg-bin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
const job = getJob(params.id);
if (!job) return NextResponse.json({ state: "idle", progressPct: 0 });
return NextResponse.json(job);
}
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
const target = await getOptimizeTarget(params.id);
if (!target) return NextResponse.json({ error: "Video not found" }, { status: 404 });
const ffmpegBin = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
const job = enqueueTranscode(ffmpegBin, params.id, target.absPath, target.outPath, target.duration);
return NextResponse.json(job);
}
