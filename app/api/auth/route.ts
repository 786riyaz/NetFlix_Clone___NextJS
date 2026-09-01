import { NextRequest, NextResponse } from "next/server";
import { matchRole, tokenForRole, isConfigured, AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
return NextResponse.json({ configured: isConfigured() });
}

export async function POST(req: NextRequest) {
if (!isConfigured()) {
return NextResponse.json(
{ error: "Login isn't configured yet. Set credentials in .env and restart the server." },
{ status: 503 }
);
}
const { username, password } = await req.json().catch(() => ({ username: "", password: "" }));
const role = matchRole(username, password);
if (!role) {
return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
}
const token = await tokenForRole(role);
const res = NextResponse.json({ ok: true, role });
res.cookies.set(AUTH_COOKIE, token!, {
httpOnly: true,
sameSite: "lax",
secure: true,
path: "/",
maxAge: 60 * 60 * 24 * 30, // 30 days
});
return res;
}

export async function DELETE() {
const res = NextResponse.json({ ok: true });
res.cookies.delete(AUTH_COOKIE);
return res;
}
