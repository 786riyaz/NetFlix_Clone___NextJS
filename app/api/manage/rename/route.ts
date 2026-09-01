import { NextRequest, NextResponse } from "next/server";
import { renameEntry } from "@/lib/manage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Admin-only: enforced by middleware for every non-GET /api/manage/* route.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.path || !body?.newName) {
    return NextResponse.json({ error: "path and newName are required" }, { status: 400 });
  }
  try {
    await renameEntry(body.path, body.newName);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Rename failed" }, { status: 400 });
  }
}
