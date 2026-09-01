import { spawn } from "child_process";
import { promises as fs } from "fs";
import { BUNDLED_FFMPEG_PATH } from "./ffmpeg-bin";
import { markOptimized } from "./scanner";

export type JobState = "queued" | "processing" | "done" | "error";
export interface Job {
id: string;
state: JobState;
progressPct: number;
error?: string;
}

const jobs = new Map<string, Job>();
const queue: { id: string; absPath: string; outPath: string; duration: number }[] = [];
let running = false;

export function getJob(id: string): Job | null {
return jobs.get(id) || null;
}

/** Runs one file at a time — a full re-encode is genuinely CPU-heavy, and
 * this app already streams other videos off the same disk, so we don't
 * want to compete with active playback. */
async function processQueue() {
if (running) return;
running = true;
try {
while (queue.length) {
const item = queue.shift()!;
const job = jobs.get(item.id);
if (!job) continue;
job.state = "processing";
try {
await transcodeWithProgress(item.absPath, item.outPath, item.duration, (pct) => {
job.progressPct = pct;
});
job.state = "done";
job.progressPct = 100;
await markOptimized(item.id, true);
} catch (err: any) {
job.state = "error";
job.error = err?.message || "Transcode failed";
await fs.unlink(item.outPath).catch(() => {});
await markOptimized(item.id, false);
}
}
} finally {
running = false;
}
}

export function enqueueTranscode(ffmpegBin: string, id: string, absPath: string, outPath: string, duration: number) {
const existing = jobs.get(id);
if (existing && (existing.state === "queued" || existing.state === "processing")) return existing;
const job: Job = { id, state: "queued", progressPct: 0 };
jobs.set(id, job);
queue.push({ id, absPath, outPath, duration });
processQueue();
return job;
}

function transcodeWithProgress(
absPath: string,
outPath: string,
duration: number,
onProgress: (pct: number) => void
): Promise<void> {
return new Promise((resolve, reject) => {
const ffmpegBin = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
const args = [
"-y",
"-i", absPath,
// -vsync cfr normalizes variable frame rate into constant frame rate —
// the actual fix for the most common Format-Factory-style stutter.
"-vsync", "cfr",
"-c:v", "libx264",
"-preset", "veryfast",
"-crf", "22",
"-c:a", "aac",
"-b:a", "192k",
"-movflags", "+faststart",
"-progress", "pipe:1",
"-nostats",
outPath,
];
const p = spawn(ffmpegBin, args);
let buf = "";
p.stdout.on("data", (d) => {
buf += d.toString();
const match = buf.match(/out_time_ms=(\d+)/g);
if (match && duration > 0) {
const last = match[match.length - 1];
const ms = parseInt(last.split("=")[1], 10);
const pct = Math.min(99, Math.round((ms / 1000 / duration) * 100));
onProgress(pct);
}
});
p.on("error", (err) => reject(err));
p.on("exit", (code) => {
if (code === 0) resolve();
else reject(new Error(`ffmpeg exited with code ${code}`));
});
});
}
