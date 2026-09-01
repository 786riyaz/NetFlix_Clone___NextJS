import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, ROLE_HEADER, tokenForRole, isConfigured } from "@/lib/auth";

// Login is mandatory — there is no bypass. Every route (pages and API)
// requires a valid session cookie matching either the guest or admin
// credentials from .env. The matched role is written into a request
// header that route handlers read instead of re-deriving it themselves —
// but only after stripping any value the client tried to send for that
// same header, so a request can't just claim to be admin.
export async function middleware(req: NextRequest) {
const { pathname } = req.nextUrl;

if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
return NextResponse.next();
}
if (pathname === "/login" || pathname === "/api/auth") {
return NextResponse.next();
}

const cookie = req.cookies.get(AUTH_COOKIE)?.value;
const [adminToken, guestToken] = await Promise.all([tokenForRole("admin"), tokenForRole("guest")]);

let role: "admin" | "guest" | null = null;
if (cookie && adminToken && cookie === adminToken) role = "admin";
else if (cookie && guestToken && cookie === guestToken) role = "guest";

if (role) {
const headers = new Headers(req.headers);
headers.delete(ROLE_HEADER);
headers.set(ROLE_HEADER, role);
return NextResponse.next({ request: { headers } });
}

if (pathname.startsWith("/api")) {
return NextResponse.json(
{ error: isConfigured() ? "Unauthorized" : "Login not configured — set credentials in .env" },
{ status: 401 }
);
}

const loginUrl = new URL("/login", req.url);
loginUrl.searchParams.set("next", pathname);
return NextResponse.redirect(loginUrl);
}

export const config = {
matcher: ["/((?!_next/static|_next/image).*)"],
};
