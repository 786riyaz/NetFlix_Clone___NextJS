import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import type { VideoItem } from "./types";

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

const ROOT_DIR = path.resolve(process.env.VIDEO_DIR || path.join(process.cwd(), "videos"));
const CACHE_DIR = path.join(process.cwd(), ".cache");
const THUMB_DIR = path.join(CACHE_DIR, "thumbnails");
const CACHE_FILE = path.join(CACHE_DIR, "library.json");
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

interface CacheEntry {
  id: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
  duration: number;
  hasThumbnail: boolean;
}

interface CacheFile {
  entries: Record<string, CacheEntry>; // keyed by id
  ffmpegAvailable: boolean | null;
}

let memCache: CacheFile | null = null;
let scanInFlight: Promise<VideoItem[]> | null = null;

function makeId(relativePath: string): string {
  return crypto.createHash("md5").update(relativePath).digest("hex");
}

async function ensureDirs() {
  await fs.mkdir(THUMB_DIR, { recursive: true });
}

async function loadCache(): Promise<CacheFile> {
  if (memCache) return memCache;
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    memCache = JSON.parse(raw);
  } catch {
    memCache = { entries: {}, ffmpegAvailable: null };
  }
  return memCache!;
}

async function saveCache(cache: CacheFile) {
  await ensureDirs();
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache), "utf-8");
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

function probeDuration(absPath: string): Promise<number> {
  return new Promise((resolve) => {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      absPath,
    ];
    const p = spawn(FFPROBE_BIN, args);
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("error", () => resolve(0));
    p.on("exit", () => {
      const val = parseFloat(out.trim());
      resolve(Number.isFinite(val) ? val : 0);
    });
  });
}

function generateThumbnail(absPath: string, id: string, duration: number): Promise<boolean> {
  return new Promise((resolve) => {
    const outPath = path.join(THUMB_DIR, `${id}.jpg`);
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

async function walk(dir: string, base: string, out: { relativePath: string; abs: string; folder: string }[]) {
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
      await walk(abs, base, out);
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
 * Scans VIDEO_DIR for video files and returns lightweight metadata only
 * (name, size, duration, thumbnail flag). Video bytes are never read into
 * memory here — only fs.stat and, for new/changed files, a one-off ffprobe
 * / ffmpeg pass whose output (a duration number, a small jpg) is cached to
 * disk so repeat requests are just a JSON read.
 */
export async function getLibrary(forceRescan = false): Promise<VideoItem[]> {
  if (scanInFlight) return scanInFlight;
  scanInFlight = (async () => {
    await ensureDirs();
    const cache = await loadCache();
    if (cache.ffmpegAvailable === null) {
      cache.ffmpegAvailable = await checkFfmpegAvailable();
    }

    await fs.mkdir(ROOT_DIR, { recursive: true });
    const found: { relativePath: string; abs: string; folder: string }[] = [];
    await walk(ROOT_DIR, ROOT_DIR, found);

    const seenIds = new Set<string>();
    const items: VideoItem[] = [];

    const pending: { relativePath: string; abs: string; folder: string; id: string; stat: import("fs").Stats }[] = [];

    for (const f of found) {
      const id = makeId(f.relativePath);
      seenIds.add(id);
      const stat = await fs.stat(f.abs).catch(() => null);
      if (!stat) continue;
      const existing = cache.entries[id];
      const unchanged =
        existing && existing.size === stat.size && existing.mtimeMs === stat.mtimeMs;
      if (unchanged && !forceRescan) {
        items.push(toVideoItem(existing, f.folder, f.relativePath));
      } else {
        pending.push({ ...f, id, stat });
      }
    }

    if (pending.length) {
      const processed = await runWithConcurrency(pending, 3, async (f) => {
        const duration = cache.ffmpegAvailable ? await probeDuration(f.abs) : 0;
        const hasThumbnail = cache.ffmpegAvailable
          ? await generateThumbnail(f.abs, f.id, duration)
          : false;
        const entry: CacheEntry = {
          id: f.id,
          relativePath: f.relativePath,
          size: f.stat.size,
          mtimeMs: f.stat.mtimeMs,
          duration,
          hasThumbnail,
        };
        cache.entries[f.id] = entry;
        return toVideoItem(entry, f.folder, f.relativePath);
      });
      items.push(...processed);
    }

    // prune deleted files from cache + their thumbnails
    for (const id of Object.keys(cache.entries)) {
      if (!seenIds.has(id)) {
        delete cache.entries[id];
        fs.unlink(path.join(THUMB_DIR, `${id}.jpg`)).catch(() => {});
      }
    }

    await saveCache(cache);
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
  };
}

export async function isFfmpegAvailable(): Promise<boolean> {
  const cache = await loadCache();
  if (cache.ffmpegAvailable === null) {
    cache.ffmpegAvailable = await checkFfmpegAvailable();
    await saveCache(cache);
  }
  return cache.ffmpegAvailable;
}

export async function resolveVideoPath(id: string): Promise<{ absPath: string; ext: string } | null> {
  const cache = await loadCache();
  const entry = cache.entries[id];
  if (!entry) return null;
  const absPath = path.join(ROOT_DIR, entry.relativePath);
  // guard against any path traversal — resolved path must stay inside ROOT_DIR
  if (!absPath.startsWith(ROOT_DIR)) return null;
  const ext = path.extname(entry.relativePath).slice(1).toLowerCase();
  return { absPath, ext };
}

export function resolveThumbnailPath(id: string): string {
  return path.join(THUMB_DIR, `${id}.jpg`);
}

export { ROOT_DIR };
