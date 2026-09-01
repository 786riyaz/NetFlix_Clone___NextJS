import { NextRequest, NextResponse } from "next/server";
import { updateVideoLocation, deleteVideo } from "@/lib/scanner";
import { getJob } from "@/lib/transcode";
import { ROLE_HEADER } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(req: NextRequest) {
if (req.headers.get(ROLE_HEADER) !== "admin") {
return NextResponse.json({ error: "Admin access is required for this action." }, { status: 403 });
}
return null;
}

function blockIfOptimizing(id: string) {
const job = getJob(id);
if (job && (job.state === "queued" || job.state === "processing")) {
return NextResponse.json(
{ error: "This video is being optimized right now — try again once that finishes." },
{ status: 409 }
);
}
return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
const denied = requireAdmin(req);
if (denied) return denied;
const busy = blockIfOptimizing(params.id);
if (busy) return busy;

const body = await req.json().catch(() => ({}));
const { name, folder } = body as { name?: string; folder?: string };
if (name === undefined && folder === undefined) {
return NextResponse.json({ error: "Provide a name and/or folder to update." }, { status: 400 });
}
try {
const video = await updateVideoLocation(params.id, { name, folder });
return NextResponse.json({ video });
} catch (err: any) {
return NextResponse.json({ error: err?.message || "Update failed" }, { status: 400 });
}
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const denied = requireAdmin(req);
if (denied) return denied;
const busy = blockIfOptimizing(params.id);
if (busy) return busy;

try {
await deleteVideo(params.id);
return NextResponse.json({ ok: true });
} catch (err: any) {
return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 400 });
}
}
