import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, expectedToken, isConfigured, AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
return NextResponse.json({ configured: isConfigured() });
}

export async function POST(req: NextRequest) {
if (!isConfigured()) {
return NextResponse.json(
{ error: "Login isn't configured yet. Set USER_NAME and USER_PASSWORD in .env and restart the server." },
{ status: 503 }
);
}
const { username, password } = await req.json().catch(() => ({ username: "", password: "" }));
if (!checkCredentials(username, password)) {
return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
}
const token = await expectedToken();
const res = NextResponse.json({ ok: true });
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
