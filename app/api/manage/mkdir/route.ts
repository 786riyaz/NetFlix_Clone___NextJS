import { NextRequest, NextResponse } from "next/server";
import { createFolder } from "@/lib/manage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Admin-only: enforced by middleware for every non-GET /api/manage/* route.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    await createFolder(body.parentPath || "", body.name);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not create folder" }, { status: 400 });
  }
}
