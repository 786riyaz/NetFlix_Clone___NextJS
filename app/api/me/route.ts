import { NextRequest, NextResponse } from "next/server";
import { ROLE_HEADER, getAdminCreds, getGuestCreds, type Role } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reads the role middleware already resolved from the session cookie (see
// middleware.ts) and reports it back to the client along with the display
// name configured for that role, so the UI can show "who's logged in"
// without ever handling the raw credentials itself.
export async function GET(req: NextRequest) {
  const role = req.headers.get(ROLE_HEADER) as Role | null;
  if (role !== "admin" && role !== "guest") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const creds = role === "admin" ? getAdminCreds() : getGuestCreds();
  const username = creds?.username || (role === "admin" ? "Admin" : "Guest");
  return NextResponse.json({ role, username });
}
