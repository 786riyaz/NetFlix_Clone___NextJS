import { NextRequest, NextResponse } from "next/server";
import { renameVideo, deleteVideo } from "@/lib/scanner";
import { getJob } from "@/lib/transcode";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEnabled() {
return process.env.SUPER_MANAGEMENT === "true";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
if (!isEnabled()) {
return NextResponse.json({ error: "File management isn't enabled on this server." }, { status: 403 });
}
const job = getJob(params.id);
if (job && (job.state === "queued" || job.state === "processing")) {
return NextResponse.json({ error: "This video is being optimized right now — try again once that finishes." }, { status: 409 });
}
const { name } = await req.json().catch(() => ({ name: "" }));
if (!name || typeof name !== "string") {
return NextResponse.json({ error: "A new name is required." }, { status: 400 });
}
try {
const video = await renameVideo(params.id, name);
return NextResponse.json({ video });
} catch (err: any) {
return NextResponse.json({ error: err?.message || "Rename failed" }, { status: 400 });
}
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
if (!isEnabled()) {
return NextResponse.json({ error: "File management isn't enabled on this server." }, { status: 403 });
}
const job = getJob(params.id);
if (job && (job.state === "queued" || job.state === "processing")) {
return NextResponse.json({ error: "This video is being optimized right now — try again once that finishes." }, { status: 409 });
}
try {
await deleteVideo(params.id);
return NextResponse.json({ ok: true });
} catch (err: any) {
return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 400 });
}
}
