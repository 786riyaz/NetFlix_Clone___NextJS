import { NextRequest, NextResponse } from "next/server";
import { reorderSibling } from "@/lib/manage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Admin-only: enforced by middleware for every non-GET /api/manage/* route.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || (body.direction !== "up" && body.direction !== "down")) {
    return NextResponse.json({ error: "name and direction ('up'|'down') are required" }, { status: 400 });
  }
  try {
    await reorderSibling(body.parentPath || "", body.name, body.direction);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Reorder failed" }, { status: 400 });
  }
}
