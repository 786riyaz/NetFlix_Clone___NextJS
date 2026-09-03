import { spawn } from "child_process";
import { promises as fs } from "fs";
import { BUNDLED_FFMPEG_PATH } from "./ffmpeg-bin";

export type AudioJobState = "queued" | "processing" | "done" | "error";
export interface AudioJob {
key: string; // `${videoId}:${trackIndex}`
state: AudioJobState;
error?: string;
}

const jobs = new Map<string, AudioJob>();
const queue: { key: string; absPath: string; outPath: string; trackIndex: number }[] = [];
let running = false;

export function jobKey(id: string, trackIndex: number): string {
return `${id}:${trackIndex}`;
}
export function getAudioJob(id: string, trackIndex: number): AudioJob | null {
return jobs.get(jobKey(id, trackIndex)) || null;
}

async function processQueue() {
if (running) return;
running = true;
try {
while (queue.length) {
const item = queue.shift()!;
const job = jobs.get(item.key);
if (!job) continue;
job.state = "processing";
try {
await remuxAudioTrack(item.absPath, item.outPath, item.trackIndex);
job.state = "done";
} catch (err: any) {
job.state = "error";
job.error = err?.message || "Audio track switch failed";
await fs.unlink(item.outPath).catch(() => {});
}
}
} finally {
running = false;
}
}

export function enqueueAudioSwitch(
ffmpegBin: string,
id: string,
absPath: string,
outPath: string,
trackIndex: number
): AudioJob {
const key = jobKey(id, trackIndex);
const existing = jobs.get(key);
if (existing && (existing.state === "queued" || existing.state === "processing")) return existing;
const job: AudioJob = { key, state: "queued" };
jobs.set(key, job);
queue.push({ key, absPath, outPath, trackIndex });
processQueue();
return job;
}

function remuxAudioTrack(absPath: string, outPath: string, trackIndex: number): Promise<void> {
return new Promise((resolve, reject) => {
const ffmpegBin = process.env.FFMPEG_PATH || BUNDLED_FFMPEG_PATH || "ffmpeg";
const args = [
"-y",
"-i", absPath,
"-map", "0:v:0",
"-map", `0:a:${trackIndex}`,
"-c", "copy", // stream copy only — no re-encode, so this is fast regardless of file size
"-movflags", "+faststart",
outPath,
];
const p = spawn(ffmpegBin, args);
let stderr = "";
p.stderr.on("data", (d) => (stderr += d.toString()));
p.on("error", (err) => reject(err));
p.on("exit", (code) => {
if (code === 0) resolve();
else reject(new Error(stderr.slice(-300) || `ffmpeg exited with code ${code}`));
});
});
}
