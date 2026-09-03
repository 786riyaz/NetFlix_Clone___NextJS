import { NextRequest, NextResponse } from "next/server";
import { getAudioTrackSwitchTarget, resolveAudioTrackPath } from "@/lib/scanner";
import { enqueueAudioSwitch, getAudioJob } from "@/lib/audioTrack";
import { BUNDLED_FFMPEG_PATH } from "@/lib/ffmpeg-bin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
const trackIndex = Number(req.nextUrl.searchParams.get("track") ?? "0");
if (!Number.isInteger(trackIndex) || trackIndex < 0) {
return NextResponse.json({ error: "Invalid track index" }, { status: 400 });
}
const job = getAudioJob(params.id, trackIndex);
if (job) return NextResponse.json(job);
// No in-memory job (e.g. server restarted since it finished) — check
// whether the remuxed file is already sitting on disk from earlier.
const existing = await resolveAudioTrackPath(params.id, trackIndex);
return NextResponse.json({ state: existing ? "done" : "idle" });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
const { trackIndex } = await req.json().catch(() => ({ trackIndex: undefined }));
if (typeof trackIndex !== "number" || trackIndex < 0) {
return NextResponse.json({ error: "trackIndex is required" }, { status: 400 });
}
// Track 0 is always what the default file already contains — no remux
// needed, the player just switches back to the normal stream.
if (trackIndex === 0) {
return NextResponse.json({ state: "done" });
}
const target = await getAudioTrackSwitchTarget(params.id, trackIndex);
if (!target) return NextResponse.json({ error: "Video or audio track not found" }, { status: 404 });
const ffmpegBin = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
const job = enqueueAudioSwitch(ffmpegBin, params.id, target.absPath, target.outPath, trackIndex);
return NextResponse.json(job);
}
