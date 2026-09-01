import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, ROLE_COOKIE, expectedTokenForRole, isConfigured, Role } from "@/lib/auth";

// Login is mandatory — there is no bypass. Every route (pages and API)
// requires a valid session: the auth cookie must match the token expected
// for whatever role the role cookie claims, recomputed from that role's
// env credentials. This binds the two cookies together so editing the
// role cookie alone (e.g. "guest" -> "admin") can't escalate access —
// the recomputed token simply won't match unless the request also knows
// the admin password. On top of that, any *mutating* request to
// /api/manage/* is rejected unless the resolved role is "admin".
async function resolveRole(req: NextRequest): Promise<Role | null> {
  const claimed = req.cookies.get(ROLE_COOKIE)?.value;
  if (claimed !== "guest" && claimed !== "admin") return null;
  const expected = await expectedTokenForRole(claimed);
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (expected && cookie && cookie === expected) return claimed;
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }
  const role = await resolveRole(req);
  if (!role) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: isConfigured() ? "Unauthorized" : "Login not configured — set GUEST_/ADMIN_ credentials in .env" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  const isManageMutation = pathname.startsWith("/api/manage") && req.method !== "GET";
  if (isManageMutation && role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  // Forward the resolved role to route handlers (e.g. /api/me) via a
  // request header, so they can trust it without re-verifying cookies.
  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set("x-vault-role", role);
  return NextResponse.next({ request: { headers: forwardedHeaders } });
}
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
