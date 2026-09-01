import { NextRequest, NextResponse } from "next/server";
import { moveEntry } from "@/lib/manage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Admin-only: enforced by middleware for every non-GET /api/manage/* route.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.path || typeof body?.targetFolder !== "string") {
    return NextResponse.json({ error: "path and targetFolder are required" }, { status: 400 });
  }
  try {
    await moveEntry(body.path, body.targetFolder);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Move failed" }, { status: 400 });
  }
}
