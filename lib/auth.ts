export type Role = "guest" | "admin";

interface UserCred {
  username: string;
  password: string;
  role: Role;
}

/** Reads both credential pairs from env. Either or both may be set; an
 * unset pair is simply not a valid login. */
function getUsers(): UserCred[] {
  const users: UserCred[] = [];
  const gu = process.env.GUEST_USER_NAME;
  const gp = process.env.GUEST_USER_PASSWORD;
  if (gu && gp) users.push({ username: gu, password: gp, role: "guest" });
  const au = process.env.ADMIN_USER_NAME;
  const ap = process.env.ADMIN_USER_PASSWORD;
  if (au && ap) users.push({ username: au, password: ap, role: "admin" });
  return users;
}

export function isConfigured(): boolean {
  return getUsers().length > 0;
}

export function findUser(username: string, password: string): UserCred | null {
  return getUsers().find((u) => u.username === username && u.password === password) || null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic token from a user's credentials AND role. Lets the auth
 * cookie hold something other than the raw password, with no server-side
 * session store, while also binding the role cookie to that user: a
 * request can't claim "admin" by editing the role cookie unless it also
 * knows the admin password, since the token is recomputed from env creds
 * for whatever role is claimed and compared against the auth cookie. Uses
 * Web Crypto so it works in both the Edge middleware runtime and Node API
 * routes. */
async function tokenFor(user: UserCred): Promise<string> {
  return sha256Hex(`${user.username}:${user.password}:${user.role}`);
}

/** Recomputes the expected token for a claimed role using whatever
 * credentials are configured for that role in env. Returns null if that
 * role isn't configured at all. */
export async function expectedTokenForRole(role: Role): Promise<string | null> {
  const user = getUsers().find((u) => u.role === role);
  if (!user) return null;
  return tokenFor(user);
}

export async function loginToken(user: UserCred): Promise<string> {
  return tokenFor(user);
}

export const AUTH_COOKIE = "vault_auth";
export const ROLE_COOKIE = "vault_role";
