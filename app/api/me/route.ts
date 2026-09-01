import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Role has already been verified by middleware (see middleware.ts) and
// forwarded as a request header — this route just reads it back out.
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-vault-role") || null;
  return NextResponse.json({ role });
}
