import { NextRequest, NextResponse } from "next/server";

// Optional access gate. If APP_PASSWORD is unset, the app behaves exactly
// as before (open, no login) — this only kicks in once you set it, which
// you should always do before making the port public over a tunnel, since
// this app can browse and stream any folder on the host machine.
const COOKIE_NAME = "netflix_auth";

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }
  // Let Next's own internals through so the login page itself can render.
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === password) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
