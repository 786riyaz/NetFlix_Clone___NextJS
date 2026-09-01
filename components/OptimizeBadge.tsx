"use client";
import { useEffect, useRef, useState } from "react";
import { pushToast } from "@/lib/toast";
type State = "idle" | "queued" | "processing" | "done" | "error";
export default function OptimizeBadge({
videoId,
videoName,
size = "sm",
}: {
videoId: string;
videoName: string;
size?: "sm" | "md";
}) {
const [state, setState] = useState<State>("idle");
const [pct, setPct] = useState(0);
const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
useEffect(() => () => {
if (pollRef.current) clearInterval(pollRef.current);
}, []);
if (state === "done") return null; // job.optimized flips server-side; a rescan will drop needsOptimize too
async function start(e: React.MouseEvent) {
e.stopPropagation();
e.preventDefault();
if (state === "processing" || state === "queued") return;
setState("queued");
const res = await fetch(`/api/optimize/${videoId}`, { method: "POST" });
if (!res.ok) {
setState("error");
pushToast("Couldn't start optimizing that video.", "error");
return;
}
pushToast(`Optimizing "${videoName}"… this runs in the background.`, "info");
pollRef.current = setInterval(async () => {
const r = await fetch(`/api/optimize/${videoId}`);
const data = await r.json().catch(() => null);
if (!data) return;
setState(data.state);
setPct(data.progressPct || 0);
if (data.state === "done") {
if (pollRef.current) clearInterval(pollRef.current);
pushToast(`"${videoName}" optimized — playback should be smoother now.`, "success");
}
if (data.state === "error") {
if (pollRef.current) clearInterval(pollRef.current);
pushToast(`Optimizing "${videoName}" failed.`, "error");
}
}, 1200);
}
const dim = size === "sm" ? "w-6 h-6" : "w-7 h-7";
if (state === "queued" || state === "processing") {
return (
<div
title={state === "queued" ? "Queued…" : `Optimizing… ${pct}%`}
className={`${dim} rounded-full bg-black/70 flex items-center justify-center text-[9px] font-semibold text-accent shrink-0`}
>
{state === "queued" ? (
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
<path d="M21 12a9 9 0 1 1-3-6.7" />
</svg>
) : (
`${pct}%`
)}
</div>
);
}
return (
<button
onClick={start}
title="May stutter in some players (variable frame rate / heavy codec) — click to optimize"
className={`${dim} rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center shrink-0 focus-ring`}
>
<svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15">
<path d="M13 2 3 14h7l-1 8 11-13h-7l0-7Z" />
</svg>
</button>
);
}
