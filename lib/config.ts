import { promises as fs } from "fs";
import path from "path";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CONFIG_FILE = path.join(CACHE_DIR, "config.json");
interface AppConfig {
videoDir: string | null; // null = not configured yet
}
let cached: AppConfig | null = null;
async function ensureDir() {
await fs.mkdir(CACHE_DIR, { recursive: true });
}
async function loadConfig(): Promise<AppConfig> {
if (cached) return cached;
try {
const raw = await fs.readFile(CONFIG_FILE, "utf-8");
cached = JSON.parse(raw);
} catch {
// Back-compat: if nothing has been saved yet, fall back to the old
// VIDEO_DIR env var so upgrades from the old version don't break.
const envDir = process.env.VIDEO_DIR ? path.resolve(process.env.VIDEO_DIR) : null;
cached = { videoDir: envDir };
}
return cached!;
}
export async function getVideoDir(): Promise<string | null> {
const cfg = await loadConfig();
return cfg.videoDir;
}
/**
* Persist a new library folder. Validates the path exists and is a
* directory before saving, so a typo can never silently wipe the library.
*/
export async function setVideoDir(dir: string): Promise<string> {
const resolved = path.resolve(dir.trim());
const stat = await fs.stat(resolved).catch(() => null);
if (!stat) {
throw new Error("That path doesn't exist on the server.");
}
if (!stat.isDirectory()) {
throw new Error("That path exists but isn't a folder.");
}
await ensureDir();
cached = { videoDir: resolved };
await fs.writeFile(CONFIG_FILE, JSON.stringify(cached, null, 2), "utf-8");
return resolved;
}
export async function isConfigured(): Promise<boolean> {
return !!(await getVideoDir());
}