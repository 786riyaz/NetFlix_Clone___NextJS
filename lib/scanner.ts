import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import type { VideoItem } from "./types";
import { getVideoDir } from "./config";
import { BUNDLED_FFMPEG_PATH, BUNDLED_FFPROBE_PATH } from "./ffmpeg-bin";
import { isFastStart, remuxFastStart, FASTSTART_EXTS } from "./faststart";
export const VIDEO_EXTENSIONS = new Set([
"mp4", "webm", "ogg", "ogv", "mov", "mkv", "avi", "wmv", "flv", "m4v", "ts",
]);
export const MIME_TYPES: Record<string, string> = {
mp4: "video/mp4",
m4v: "video/mp4",
webm: "video/webm",
ogg: "video/ogg",
ogv: "video/ogg",
mov: "video/quicktime",
mkv: "video/x-matroska",
avi: "video/x-msvideo",
wmv: "video/x-ms-wmv",
flv: "video/x-flv",
ts: "video/mp2t",
};
const CACHE_ROOT = path.join(process.cwd(), ".cache");
// Bundled binaries are used unless the user explicitly overrides them via env.
const FFMPEG_BIN = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || BUNDLED_FFPROBE_PATH || "ffprobe";
interface CacheEntry {
id: string;
relativePath: string;
size: number;
mtimeMs: number;
duration: number;
hasThumbnail: boolean;
// Fast-start optimization state for mp4/m4v/mov files (see lib/faststart.ts),
// OR a full manual transcode (see lib/transcode.ts) for files with playback
// issues at the source (VFR, HEVC, bloated bitrate). Either way: true means
// an optimized copy exists at optimizedDir/<id>.mp4 and should be served
// instead of the original. undefined = not checked yet.
optimized?: boolean;
codec?: string | null;
width?: number | null;
height?: number | null;
bitRate?: number | null;
vfr?: boolean;
needsOptimize?: boolean;
}
interface CacheFile {
entries: Record<string, CacheEntry>;
ffmpegAvailable: boolean | null;
}
interface LibraryPaths {
root: string;
thumbDir: string;
optimizedDir: string;
cacheFile: string;
}
// The chosen library folder can change at runtime, so caches are keyed per
// folder (by hash) instead of once at module load. That also means
// switching folders never mixes up thumbnails/durations between libraries.
let memCache: CacheFile | null = null;
let memCacheRoot: string | null = null;
let scanInFlight: Promise<VideoItem[]> | null = null;
function cacheDirFor(root: string): string {
const hash = crypto.createHash("md5").update(root).digest("hex").slice(0, 16);
return path.join(CACHE_ROOT, "libraries", hash);
}
async function getPaths(): Promise<LibraryPaths | null> {
const root = await getVideoDir();
if (!root) return null;
const dir = cacheDirFor(root);
return {
root,
thumbDir: path.join(dir, "thumbnails"),
optimizedDir: path.join(dir, "optimized"),
cacheFile: path.join(dir, "library.json"),
};
}
function makeId(relativePath: string): string {
return crypto.createHash("md5").update(relativePath).digest("hex");
}
async function ensureDirs(thumbDir: string, optimizedDir?: string) {
await fs.mkdir(thumbDir, { recursive: true });
if (optimizedDir) await fs.mkdir(optimizedDir, { recursive: true });
}
async function loadCache(paths: LibraryPaths): Promise<CacheFile> {
if (memCache && memCacheRoot === paths.root) return memCache;
try {
const raw = await fs.readFile(paths.cacheFile, "utf-8");
memCache = JSON.parse(raw);
} catch {
memCache = { entries: {}, ffmpegAvailable: null };
}
memCacheRoot = paths.root;
return memCache!;
}
async function saveCache(paths: LibraryPaths, cache: CacheFile) {
await ensureDirs(paths.thumbDir, paths.optimizedDir);
await fs.writeFile(paths.cacheFile, JSON.stringify(cache), "utf-8");
}
/** Call after the user picks a new library folder so stale data isn't served. */
export function invalidateLibraryCache() {
memCache = null;
memCacheRoot = null;
scanInFlight = null;
}
// --- background fast-start remux queue ---
// Deliberately separate from the scan itself: remuxing 300 files (even at
// -c copy speed) shouldn't hold up the library from showing up. This runs
// after getLibrary() has already returned, one/two files at a time so it
// doesn't compete with normal disk I/O, and updates the on-disk cache as
// each file finishes so a server restart doesn't repeat finished work.
const remuxInProgress = new Set<string>();
let remuxQueueRunning = false;
const remuxQueue: { paths: LibraryPaths; id: string; absPath: string }[] = [];
async function processRemuxQueue() {
if (remuxQueueRunning) return;
remuxQueueRunning = true;
try {
while (remuxQueue.length) {
const batch = remuxQueue.splice(0, 2);
await Promise.all(
batch.map(async ({ paths, id, absPath }) => {
if (remuxInProgress.has(id)) return;
remuxInProgress.add(id);
try {
const outPath = path.join(paths.optimizedDir, `${id}.mp4`);
const ok = await remuxFastStart(FFMPEG_BIN, absPath, outPath);
const cache = await loadCache(paths);
if (cache.entries[id]) {
cache.entries[id].optimized = ok;
await saveCache(paths, cache);
}
if (!ok) await fs.unlink(outPath).catch(() => {});
} finally {
remuxInProgress.delete(id);
}
})
);
}
} finally {
remuxQueueRunning = false;
}
}
const metaBackfillInProgress = new Set<string>();
function scheduleMetaBackfill(paths: LibraryPaths, id: string, absPath: string, cache: CacheFile) {
if (cache.entries[id]?.needsOptimize !== undefined) return; // already probed
if (metaBackfillInProgress.has(id)) return;
metaBackfillInProgress.add(id);
probeMeta(absPath)
.then(async (meta) => {
const fresh = await loadCache(paths);
const entry = fresh.entries[id];
if (entry) {
entry.codec = meta.codec;
entry.width = meta.width;
entry.height = meta.height;
entry.bitRate = meta.bitRate;
entry.vfr = meta.vfr;
entry.needsOptimize = needsOptimize(meta);
await saveCache(paths, fresh);
}
})
.finally(() => metaBackfillInProgress.delete(id));
}
function scheduleFastStartCheck(
paths: LibraryPaths,
id: string,
absPath: string,
ext: string,
cache: CacheFile
) {
if (!FASTSTART_EXTS.has(ext)) return;
if (cache.entries[id]?.optimized !== undefined) return; // already checked
isFastStart(absPath).then((fast) => {
if (fast === null) return; // couldn't determine — leave alone
if (fast === true) {
if (cache.entries[id]) cache.entries[id].optimized = false; // fine as-is, no copy needed
return;
}
remuxQueue.push({ paths, id, absPath });
processRemuxQueue();
});
}
// --- simple concurrency-limited queue so we never spawn unbounded ffmpeg/ffprobe processes ---
async function runWithConcurrency<T, R>(
items: T[],
limit: number,
worker: (item: T) => Promise<R>
): Promise<R[]> {
const results: R[] = new Array(items.length);
let idx = 0;
async function next(): Promise<void> {
const current = idx++;
if (current >= items.length) return;
results[current] = await worker(items[current]);
return next();
}
await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
return results;
}
function checkFfmpegAvailable(): Promise<boolean> {
return new Promise((resolve) => {
const p = spawn(FFPROBE_BIN, ["-version"]);
p.on("error", () => resolve(false));
p.on("exit", (code) => resolve(code === 0));
});
}
function probeMeta(absPath: string): Promise<{
duration: number;
codec: string | null;
width: number | null;
height: number | null;
bitRate: number | null;
vfr: boolean;
}> {
return new Promise((resolve) => {
const args = [
"-v", "error",
"-select_streams", "v:0",
"-show_entries", "format=duration:stream=codec_name,width,height,bit_rate,r_frame_rate,avg_frame_rate",
"-of", "json",
absPath,
];
const p = spawn(FFPROBE_BIN, args);
let out = "";
p.stdout.on("data", (d) => (out += d.toString()));
p.on("error", () => resolve({ duration: 0, codec: null, width: null, height: null, bitRate: null, vfr: false }));
p.on("exit", () => {
try {
const parsed = JSON.parse(out);
const duration = parseFloat(parsed?.format?.duration);
const stream = parsed?.streams?.[0];
const codec: string | null = stream?.codec_name ?? null;
const width: number | null = stream?.width ?? null;
const height: number | null = stream?.height ?? null;
const bitRate: number | null = stream?.bit_rate ? parseInt(stream.bit_rate, 10) : null;
// Format Factory (and similar tools) frequently produce variable
// frame rate output even from a constant-rate source. r_frame_rate
// (the stream's stated rate) diverging from avg_frame_rate (the
// actual average) is the standard signal for VFR — and VFR is one
// of the most common causes of stutter that shows up in *every*
// player, not just ours, because the decoder keeps mistiming frames.
const rFps = parseFrameRate(stream?.r_frame_rate);
const avgFps = parseFrameRate(stream?.avg_frame_rate);
const vfr = rFps !== null && avgFps !== null && Math.abs(rFps - avgFps) > 0.5;
resolve({
duration: Number.isFinite(duration) ? duration : 0,
codec,
width,
height,
bitRate,
vfr,
});
} catch {
resolve({ duration: 0, codec: null, width: null, height: null, bitRate: null, vfr: false });
}
});
});
}
function parseFrameRate(s: string | undefined): number | null {
if (!s) return null;
const [num, den] = s.split("/").map(Number);
if (!den) return num || null;
return num / den;
}
// Heuristic for "this file will probably stutter on playback, in any
// player" — used to surface an opt-in Optimize button rather than a hard
// rule, since it's a judgment call, not a certainty.
function needsOptimize(meta: { codec: string | null; width: number | null; height: number | null; bitRate: number | null; vfr: boolean }): boolean {
if (meta.vfr) return true;
if (meta.codec === "hevc" || meta.codec === "h265") return true;
if (meta.bitRate && meta.width && meta.height) {
const megapixels = (meta.width * meta.height) / 1_000_000;
const mbps = meta.bitRate / 1_000_000;
// Rough ceiling for a "sane" H.264-family bitrate per megapixel;
// well above this usually means a bloated re-encode, which is heavier
// to decode than the resolution warrants.
if (megapixels > 0 && mbps / megapixels > 12) return true;
}
return false;
}
function generateThumbnail(
absPath: string,
id: string,
duration: number,
thumbDir: string
): Promise<boolean> {
return new Promise((resolve) => {
const outPath = path.join(thumbDir, `${id}.jpg`);
const seek = duration > 4 ? Math.min(duration * 0.15, 30) : 0.5;
const args = [
"-y",
"-ss", String(seek),
"-i", absPath,
"-frames:v", "1",
"-vf", "scale=440:-1",
"-q:v", "4",
outPath,
];
const p = spawn(FFMPEG_BIN, args);
p.on("error", () => resolve(false));
p.on("exit", (code) => resolve(code === 0));
});
}
async function walk(
dir: string,
base: string,
out: { relativePath: string; abs: string; folder: string }[],
depth = 0
) {
if (depth > 20) return; // guard against pathological symlink loops
let entries;
try {
entries = await fs.readdir(dir, { withFileTypes: true });
} catch {
return;
}
for (const entry of entries) {
if (entry.name.startsWith(".")) continue;
const abs = path.join(dir, entry.name);
if (entry.isDirectory()) {
await walk(abs, base, out, depth + 1);
} else if (entry.isFile()) {
const ext = path.extname(entry.name).slice(1).toLowerCase();
if (VIDEO_EXTENSIONS.has(ext)) {
const relativePath = path.relative(base, abs).split(path.sep).join("/");
const segs = relativePath.split("/");
const folder = segs.length > 1 ? segs[0] : "";
out.push({ relativePath, abs, folder });
}
}
}
}
/**
* Scans the currently configured library folder — at any depth, recursively
* — for video files and returns lightweight metadata only (name, size,
* duration, thumbnail flag). Video bytes are never read into memory here —
* only fs.stat and, for new/changed files, a one-off ffprobe/ffmpeg pass
* whose output (a duration number, a small jpg) is cached to disk so repeat
* requests are just a JSON read. Returns [] if no folder has been chosen yet.
*/
export async function getLibrary(forceRescan = false): Promise<VideoItem[]> {
const paths = await getPaths();
if (!paths) return [];
if (scanInFlight) return scanInFlight;
scanInFlight = (async () => {
await ensureDirs(paths.thumbDir, paths.optimizedDir);
const cache = await loadCache(paths);
if (cache.ffmpegAvailable === null) {
cache.ffmpegAvailable = await checkFfmpegAvailable();
}
const found: { relativePath: string; abs: string; folder: string }[] = [];
await walk(paths.root, paths.root, found);
const seenIds = new Set<string>();
// fs.stat for every file used to run sequentially here (one await per
// file, in a for-loop) — for a library of a few hundred videos, that
// serialized round-trip cost alone was the main source of slowness,
// even on every normal page load, not just first-time scans. Statting
// all files concurrently (bounded, like the ffprobe pass below) turns
// an O(n) chain of awaits into a handful of parallel batches.
const statResults = await runWithConcurrency(found, 24, async (f) => {
const stat = await fs.stat(f.abs).catch(() => null);
return { f, stat };
});
const items: VideoItem[] = [];
const pending: { relativePath: string; abs: string; folder: string; id: string; stat: import("fs").Stats }[] = [];
for (const { f, stat } of statResults) {
if (!stat) continue;
const id = makeId(f.relativePath);
seenIds.add(id);
const existing = cache.entries[id];
const unchanged =
existing && existing.size === stat.size && existing.mtimeMs === stat.mtimeMs;
if (unchanged && !forceRescan) {
items.push(toVideoItem(existing, f.folder, f.relativePath));
if (cache.ffmpegAvailable) {
const ext = path.extname(f.relativePath).slice(1).toLowerCase();
scheduleFastStartCheck(paths, id, f.abs, ext, cache);
scheduleMetaBackfill(paths, id, f.abs, cache);
}
} else {
pending.push({ ...f, id, stat });
}
}
if (pending.length) {
const processed = await runWithConcurrency(pending, 3, async (f) => {
const meta = cache.ffmpegAvailable
? await probeMeta(f.abs)
: { duration: 0, codec: null, width: null, height: null, bitRate: null, vfr: false };
const hasThumbnail = cache.ffmpegAvailable
? await generateThumbnail(f.abs, f.id, meta.duration, paths.thumbDir)
: false;
const entry: CacheEntry = {
id: f.id,
relativePath: f.relativePath,
size: f.stat.size,
mtimeMs: f.stat.mtimeMs,
duration: meta.duration,
hasThumbnail,
codec: meta.codec,
width: meta.width,
height: meta.height,
bitRate: meta.bitRate,
vfr: meta.vfr,
needsOptimize: needsOptimize(meta),
};
cache.entries[f.id] = entry;
if (cache.ffmpegAvailable) {
const ext = path.extname(f.relativePath).slice(1).toLowerCase();
scheduleFastStartCheck(paths, f.id, f.abs, ext, cache);
}
return toVideoItem(entry, f.folder, f.relativePath);
});
items.push(...processed);
}
// prune deleted files from cache + their thumbnails/optimized copies
for (const id of Object.keys(cache.entries)) {
if (!seenIds.has(id)) {
delete cache.entries[id];
fs.unlink(path.join(paths.thumbDir, `${id}.jpg`)).catch(() => {});
fs.unlink(path.join(paths.optimizedDir, `${id}.mp4`)).catch(() => {});
}
}
await saveCache(paths, cache);
return items.sort((a, b) => a.name.localeCompare(b.name));
})();
try {
return await scanInFlight;
} finally {
scanInFlight = null;
}
}
function toVideoItem(entry: CacheEntry, folder: string, relativePath: string): VideoItem {
const ext = path.extname(relativePath).slice(1).toLowerCase();
return {
id: entry.id,
name: path.basename(relativePath),
relativePath,
folder,
size: entry.size,
mtimeMs: entry.mtimeMs,
duration: entry.duration,
ext,
hasThumbnail: entry.hasThumbnail,
needsOptimize: !!entry.needsOptimize && !entry.optimized,
optimized: !!entry.optimized,
};
}
export async function isFfmpegAvailable(): Promise<boolean> {
const paths = await getPaths();
if (!paths) return !!(FFMPEG_BIN && FFPROBE_BIN) && (await checkFfmpegAvailable());
const cache = await loadCache(paths);
if (cache.ffmpegAvailable === null) {
cache.ffmpegAvailable = await checkFfmpegAvailable();
await saveCache(paths, cache);
}
return cache.ffmpegAvailable;
}
export async function resolveVideoPath(id: string): Promise<{ absPath: string; ext: string } | null> {
const paths = await getPaths();
if (!paths) return null;
const cache = await loadCache(paths);
const entry = cache.entries[id];
if (!entry) return null;
if (entry.optimized) {
const optimizedPath = path.join(paths.optimizedDir, `${id}.mp4`);
const stat = await fs.stat(optimizedPath).catch(() => null);
if (stat) return { absPath: optimizedPath, ext: "mp4" };
}
const absPath = path.join(paths.root, entry.relativePath);
// guard against any path traversal — resolved path must stay inside the library root
if (!absPath.startsWith(paths.root)) return null;
const ext = path.extname(entry.relativePath).slice(1).toLowerCase();
return { absPath, ext };
}
export async function resolveThumbnailPath(id: string): Promise<string | null> {
const paths = await getPaths();
if (!paths) return null;
return path.join(paths.thumbDir, `${id}.jpg`);
}
/** Everything the manual-optimize API route needs to kick off a transcode
* job: the original (never the already-optimized) file path, its known
* duration for progress %, and where the result should be written. */
export async function getOptimizeTarget(
id: string
): Promise<{ absPath: string; outPath: string; duration: number; alreadyOptimized: boolean } | null> {
const paths = await getPaths();
if (!paths) return null;
const cache = await loadCache(paths);
const entry = cache.entries[id];
if (!entry) return null;
const absPath = path.join(paths.root, entry.relativePath);
if (!absPath.startsWith(paths.root)) return null;
return {
absPath,
outPath: path.join(paths.optimizedDir, `${id}.mp4`),
duration: entry.duration,
alreadyOptimized: !!entry.optimized,
};
}
/** Marks a video as served from its optimized copy from now on (or reverts
* the flag on failure so the original keeps being served). */
export async function markOptimized(id: string, ok: boolean): Promise<void> {
const paths = await getPaths();
if (!paths) return;
const cache = await loadCache(paths);
if (cache.entries[id]) {
cache.entries[id].optimized = ok;
if (ok) cache.entries[id].needsOptimize = false;
await saveCache(paths, cache);
}
}
