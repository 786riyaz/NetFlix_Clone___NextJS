import { NextRequest, NextResponse } from "next/server";
import { deleteEntry } from "@/lib/manage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Admin-only: enforced by middleware for every non-GET /api/manage/* route.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  try {
    await deleteEntry(body.path);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 400 });
  }
}
