import { NextRequest, NextResponse } from "next/server";
import { findUser, loginToken, isConfigured, AUTH_COOKIE, ROLE_COOKIE } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ configured: isConfigured() });
}
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Login isn't configured yet. Set the GUEST_/ADMIN_ credentials in .env and restart the server." },
      { status: 503 }
    );
  }
  const { username, password } = await req.json().catch(() => ({ username: "", password: "" }));
  const user = findUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const token = await loginToken(user);
  const res = NextResponse.json({ ok: true, role: user.role });
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
  res.cookies.set(AUTH_COOKIE, token, cookieOpts);
  res.cookies.set(ROLE_COOKIE, user.role, cookieOpts);
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(ROLE_COOKIE);
  return res;
}
