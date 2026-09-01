export type Role = "guest" | "admin";

interface Creds {
username: string;
password: string;
}

function readCreds(userVar: string, passVar: string): Creds | null {
const username = process.env[userVar];
const password = process.env[passVar];
if (!username || !password) return null;
return { username, password };
}

export function getGuestCreds(): Creds | null {
return readCreds("GUEST_USER_NAME", "GUEST_USER_PASSWORD");
}
export function getAdminCreds(): Creds | null {
return readCreds("ADMIN_USER_NAME", "ADMIN_USER_PASSWORD");
}

/** At least one role must be configured for the app to be usable at all. */
export function isConfigured(): boolean {
return getGuestCreds() !== null || getAdminCreds() !== null;
}

async function sha256Hex(input: string): Promise<string> {
const data = new TextEncoder().encode(input);
const digest = await crypto.subtle.digest("SHA-256", data);
return Array.from(new Uint8Array(digest))
.map((b) => b.toString(16).padStart(2, "0"))
.join("");
}

/** Deterministic per-role token — lets the cookie hold something other
 * than the raw password, with no server-side session store needed. Uses
 * Web Crypto so it works in both the Edge middleware runtime and Node
 * API routes. */
export async function tokenForRole(role: Role): Promise<string | null> {
const creds = role === "admin" ? getAdminCreds() : getGuestCreds();
if (!creds) return null;
return sha256Hex(`${role}:${creds.username}:${creds.password}`);
}

/** Checks a submitted username/password against both role's credentials
 * and returns which role matched, or null. Admin is checked first so
 * that if an operator reuses the same username for both (they shouldn't,
 * but might), admin wins. */
export function matchRole(username: string, password: string): Role | null {
const admin = getAdminCreds();
if (admin && username === admin.username && password === admin.password) return "admin";
const guest = getGuestCreds();
if (guest && username === guest.username && password === guest.password) return "guest";
return null;
}

export const AUTH_COOKIE = "vault_auth";
export const ROLE_HEADER = "x-user-role";
