import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken, isConfigured } from "@/lib/auth";

// Login is mandatory — there is no bypass. Every route (pages and API)
// requires a valid session cookie that matches USER_NAME/USER_PASSWORD
// from .env. If those aren't set, everything stays locked and the login
// page shows a setup notice instead of quietly letting requests through.
export async function middleware(req: NextRequest) {
const { pathname } = req.nextUrl;

if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
return NextResponse.next();
}
if (pathname === "/login" || pathname === "/api/auth") {
return NextResponse.next();
}

const token = await expectedToken();
const cookie = req.cookies.get(AUTH_COOKIE)?.value;

if (token && cookie === token) {
return NextResponse.next();
}

if (pathname.startsWith("/api")) {
return NextResponse.json(
{ error: isConfigured() ? "Unauthorized" : "Login not configured — set USER_NAME and USER_PASSWORD in .env" },
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
