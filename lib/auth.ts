export function getCredentials(): { username: string; password: string } | null {
const username = process.env.USER_NAME;
const password = process.env.USER_PASSWORD;
if (!username || !password) return null;
return { username, password };
}

export function isConfigured(): boolean {
return getCredentials() !== null;
}

async function sha256Hex(input: string): Promise<string> {
const data = new TextEncoder().encode(input);
const digest = await crypto.subtle.digest("SHA-256", data);
return Array.from(new Uint8Array(digest))
.map((b) => b.toString(16).padStart(2, "0"))
.join("");
}

/** Deterministic token from the configured credentials — lets the cookie
 * hold something other than the raw password, while still needing no
 * server-side session store for a single-user home app. Uses Web Crypto
 * so it works in both the Edge middleware runtime and Node API routes. */
export async function expectedToken(): Promise<string | null> {
const creds = getCredentials();
if (!creds) return null;
return sha256Hex(`${creds.username}:${creds.password}`);
}

export function checkCredentials(username: string, password: string): boolean {
const creds = getCredentials();
if (!creds) return false;
return username === creds.username && password === creds.password;
}

export const AUTH_COOKIE = "vault_auth";
