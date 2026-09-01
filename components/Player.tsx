"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { fmtDuration } from "@/lib/format";
import {
getSavedTime,
setSavedTime,
clearProgress,
markWatched,
getVolume,
setVolume as persistVolume,
} from "@/lib/progress";
import ManageControls from "./ManageControls";
import DownloadButton from "./DownloadButton";
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export default function Player({
video,
queue,
onClose,
onPlayVideo,
superAdmin = false,
onRenamed,
onDeleted,
folderPaths = [],
}: {
video: VideoItem;
queue: VideoItem[];
onClose: () => void;
onPlayVideo: (v: VideoItem) => void;
superAdmin?: boolean;
onRenamed?: (v: VideoItem) => void;
onDeleted?: (id: string) => void;
folderPaths?: string[];
}) {
const queueIdx = queue.findIndex((v) => v.id === video.id);
const prevVideo = queueIdx > 0 ? queue[queueIdx - 1] : null;
const nextVideo = queueIdx >= 0 && queueIdx < queue.length - 1 ? queue[queueIdx + 1] : null;
const videoRef = useRef<HTMLVideoElement>(null);
const [playing, setPlaying] = useState(false);
const [current, setCurrent] = useState(0);
const [duration, setDuration] = useState(video.duration || 0);
const [buffered, setBuffered] = useState(0);
// Buffering spinner: shown on initial load and whenever the browser stalls
// mid-playback (e.g. slow disk read, seeking into an unbuffered region).
const [loading, setLoading] = useState(true);
// Brief center icon "pulse" shown when play/pause is toggled by clicking
// the video itself, mirroring the familiar YouTube/Netflix feedback.
const [clickFeedback, setClickFeedback] = useState<"play" | "pause" | null>(null);
const clickFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const [showShortcuts, setShowShortcuts] = useState(false);
const [volume, setVolumeState] = useState(1);
// Videos always start muted — the person clicks the volume/unmute button
// to turn sound on. This also keeps autoplay reliable across browsers,
// most of which block unmuted autoplay entirely.
const [muted, setMuted] = useState(true);
const [speed, setSpeed] = useState(1);
const [showControls, setShowControls] = useState(true);
const [autonext, setAutonext] = useState(true);
const [savedToast, setSavedToast] = useState(false);
const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
useEffect(() => {
const v = videoRef.current;
if (!v) return;
const startAt = getSavedTime(video.id);
v.currentTime = startAt || 0;
const vol = getVolume();
v.volume = vol || 1;
setVolumeState(vol || 1);
v.muted = true;
setMuted(true);
v.play().catch(() => {});
}, [video.id]);
useEffect(() => {
autosaveTimer.current = setInterval(() => {
const v = videoRef.current;
if (v && !v.paused) setSavedTime(video.id, v.currentTime);
}, 5000);
return () => {
if (autosaveTimer.current) clearInterval(autosaveTimer.current);
};
}, [video.id]);
useEffect(() => {
return () => {
const v = videoRef.current;
if (v && v.currentTime > 2) setSavedTime(video.id, v.currentTime);
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [video.id]);
const resetHideTimer = useCallback(() => {
setShowControls(true);
if (hideTimer.current) clearTimeout(hideTimer.current);
hideTimer.current = setTimeout(() => {
if (!videoRef.current?.paused) setShowControls(false);
}, 2800);
}, []);
useEffect(() => {
resetHideTimer();
return () => {
if (hideTimer.current) clearTimeout(hideTimer.current);
};
}, [resetHideTimer]);
function togglePlay() {
const v = videoRef.current;
if (!v) return;
if (v.paused) v.play();
else v.pause();
}
function handleVideoClick() {
resetHideTimer();
const v = videoRef.current;
if (!v) return;
const willPlay = v.paused;
togglePlay();
setClickFeedback(willPlay ? "play" : "pause");
if (clickFeedbackTimer.current) clearTimeout(clickFeedbackTimer.current);
clickFeedbackTimer.current = setTimeout(() => setClickFeedback(null), 550);
}
function skip(delta: number) {
const v = videoRef.current;
if (!v) return;
v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, v.currentTime + delta));
}
function handleSeek(pct: number) {
const v = videoRef.current;
if (!v || !v.duration) return;
v.currentTime = (pct / 100) * v.duration;
}
function handleVolume(val: number) {
const v = videoRef.current;
if (!v) return;
v.volume = val;
v.muted = val === 0;
setVolumeState(val);
setMuted(val === 0);
persistVolume(val);
}
function toggleMute() {
const v = videoRef.current;
if (!v) return;
const next = !v.muted;
v.muted = next;
// Coming out of mute at 0 volume would still be silent — give it a
// sensible level so clicking unmute is never a no-op.
if (!next && v.volume === 0) {
v.volume = 1;
setVolumeState(1);
persistVolume(1);
}
setMuted(next);
}
async function toggleFullscreen() {
try {
if (!document.fullscreenElement) {
await videoRef.current?.parentElement?.requestFullscreen();
} else {
await document.exitFullscreen();
}
} catch {}
}
async function togglePip() {
try {
if (document.pictureInPictureElement) {
await document.exitPictureInPicture();
} else if (videoRef.current) {
await videoRef.current.requestPictureInPicture();
}
} catch {
alert("Picture-in-picture isn't supported in this browser.");
}
}
function handleSavePosition() {
const v = videoRef.current;
if (!v) return;
setSavedTime(video.id, v.currentTime);
setSavedToast(true);
setTimeout(() => setSavedToast(false), 1500);
}
function handleResetPosition() {
clearProgress(video.id);
if (videoRef.current) videoRef.current.currentTime = 0;
}
function playNext() {
if (nextVideo) onPlayVideo(nextVideo);
else onClose();
}
function playPrevious() {
if (prevVideo) onPlayVideo(prevVideo);
}
function seekToPercent(pct: number) {
const v = videoRef.current;
if (!v || !v.duration) return;
v.currentTime = (pct / 100) * v.duration;
resetHideTimer();
}
useEffect(() => {
function onKey(e: KeyboardEvent) {
if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
switch (e.key) {
case " ":
case "k":
e.preventDefault();
togglePlay();
break;
case "ArrowRight":
skip(10);
break;
case "ArrowLeft":
skip(-10);
break;
case "f":
toggleFullscreen();
break;
case "m":
toggleMute();
break;
case "n":
case "N":
playNext();
break;
case "p":
case "P":
playPrevious();
break;
case "Home": {
const v = videoRef.current;
if (v) v.currentTime = 0;
resetHideTimer();
break;
}
case "End": {
const v = videoRef.current;
if (v && v.duration) v.currentTime = Math.max(0, v.duration - 0.5);
resetHideTimer();
break;
}
case "0":
case "1":
case "2":
case "3":
case "4":
case "5":
case "6":
case "7":
case "8":
case "9":
// Standard YouTube-style shortcut: number key N jumps to N*10% of
// the video (0 = start, 9 = 90%).
seekToPercent(Number(e.key) * 10);
break;
case "Escape":
if (showShortcuts) setShowShortcuts(false);
else onClose();
break;
}
}
window.addEventListener("keydown", onKey);
return () => window.removeEventListener("keydown", onKey);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [showShortcuts, video.id, nextVideo, prevVideo]);
const pct = duration ? (current / duration) * 100 : 0;
return (
<div
className="fixed inset-0 z-50 bg-black flex flex-col"
onMouseMove={resetHideTimer}
onClick={resetHideTimer}
>
<div className="relative flex-1 flex items-center justify-center overflow-hidden">
<video
ref={videoRef}
className="w-full h-full max-h-screen bg-black"
src={`/api/video/${video.id}`}
muted
onPlay={() => setPlaying(true)}
onPause={() => setPlaying(false)}
onTimeUpdate={(e) => {
const v = e.currentTarget;
setCurrent(v.currentTime);
if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
if (v.duration && v.currentTime > v.duration - 3) markWatched(video.id);
}}
onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
onEnded={() => {
markWatched(video.id);
if (autonext) playNext();
}}
onWaiting={() => setLoading(true)}
onPlaying={() => setLoading(false)}
onCanPlay={() => setLoading(false)}
onLoadStart={() => setLoading(true)}
onSeeking={() => setLoading(true)}
onSeeked={() => setLoading(false)}
onClick={handleVideoClick}
onDoubleClick={toggleFullscreen}
autoPlay
playsInline
/>
{/* Buffering spinner */}
{loading && (
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
<div className="w-12 h-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin" />
</div>
)}
{/* Click-to-toggle feedback pulse */}
{clickFeedback && (
<div
key={Date.now()}
className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 flex items-center justify-center pointer-events-none animate-clickpulse"
>
{clickFeedback === "play" ? (
<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
<path d="M8 5v14l11-7z" />
</svg>
) : (
<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
<path d="M7 5h4v14H7zM13 5h4v14h-4z" />
</svg>
)}
</div>
)}
{/* Top bar */}
<div
className={`absolute top-0 left-0 right-0 flex items-start justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
showControls ? "opacity-100" : "opacity-0 pointer-events-none"
}`}
>
<div className="min-w-0 pr-4">
<div className="text-lg sm:text-xl font-semibold truncate">{video.name}</div>
<div className="text-xs sm:text-sm text-muted truncate">{video.folder || "Library root"}</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<DownloadButton videoId={video.id} size="md" />
{superAdmin && onRenamed && onDeleted && (
<ManageControls
video={video}
size="md"
folderPaths={folderPaths}
onRenamed={(v) => {
onRenamed(v);
}}
onDeleted={(id) => {
onDeleted(id);
onClose();
}}
/>
)}
<button
onClick={() => setShowShortcuts((s) => !s)}
className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center focus-ring"
aria-label="Keyboard shortcuts"
title="Keyboard shortcuts"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<circle cx="12" cy="12" r="10" />
<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
<path d="M12 17h.01" />
</svg>
</button>
<button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center focus-ring" aria-label="Close player">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M18 6 6 18M6 6l12 12" />
</svg>
</button>
</div>
</div>
{showShortcuts && (
<div
onClick={(e) => e.stopPropagation()}
className="absolute top-16 right-4 sm:right-6 z-10 w-64 rounded-lg bg-black/90 border border-white/10 p-4 text-xs space-y-1.5"
>
<div className="text-sm font-semibold mb-2">Keyboard shortcuts</div>
<Shortcut keys="Space / K" desc="Play / pause" />
<Shortcut keys="← / →" desc="Back / forward 10s" />
<Shortcut keys="N / P" desc="Next / previous video" />
<Shortcut keys="Home" desc="Jump to start" />
<Shortcut keys="End" desc="Jump to end" />
<Shortcut keys="0–9" desc="Jump to 0%–90%" />
<Shortcut keys="M" desc="Mute / unmute" />
<Shortcut keys="F" desc="Fullscreen" />
<Shortcut keys="Esc" desc="Close player" />
</div>
)}
{/* Center play/pause tap target */}
{!playing && showControls && (
<button
onClick={togglePlay}
className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 flex items-center justify-center focus-ring"
aria-label="Play"
>
<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
<path d="M8 5v14l11-7z" />
</svg>
</button>
)}
{muted && playing && (
<button
onClick={toggleMute}
className="absolute bottom-24 sm:bottom-28 left-4 sm:left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-xs sm:text-sm focus-ring transition-opacity duration-300"
>
<MuteIcon /> Tap to unmute
</button>
)}
{savedToast && (
<div className="absolute top-16 right-6 px-3 py-1.5 rounded bg-black/80 text-xs">Position saved</div>
)}
{/* Bottom controls */}
<div
className={`absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-10 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
showControls ? "opacity-100" : "opacity-0 pointer-events-none"
}`}
>
{/* seek bar */}
<div className="relative w-full h-3 flex items-center mb-2 group/seek">
<div className="absolute w-full h-1 rounded bg-white/20" />
<div className="absolute h-1 rounded bg-white/35" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
<div className="absolute h-1 rounded bg-accent" style={{ width: `${pct}%` }} />
<input
type="range"
min={0}
max={100}
step={0.1}
value={pct}
onChange={(e) => handleSeek(Number(e.target.value))}
className="relative w-full h-3 cursor-pointer"
aria-label="Seek"
/>
</div>
<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
<IconButton onClick={togglePlay} label={playing ? "Pause" : "Play"}>
{playing ? <PauseIcon /> : <PlayIcon />}
</IconButton>
<IconButton onClick={playPrevious} label="Previous video" disabled={!prevVideo}>
<PrevTrackIcon />
</IconButton>
<IconButton onClick={() => skip(-10)} label="Back 10 seconds">
<BackIcon />
</IconButton>
<IconButton onClick={() => skip(10)} label="Forward 10 seconds">
<FwdIcon />
</IconButton>
<IconButton onClick={playNext} label="Next video" disabled={!nextVideo}>
<NextTrackIcon />
</IconButton>
<div className="flex items-center gap-1.5 group/vol">
<IconButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
{muted || volume === 0 ? <MuteIcon /> : <VolIcon />}
</IconButton>
<input
type="range"
min={0}
max={1}
step={0.01}
value={muted ? 0 : volume}
onChange={(e) => handleVolume(Number(e.target.value))}
className="w-14 sm:w-0 sm:group-hover/vol:w-20 transition-all duration-200 overflow-hidden"
aria-label="Volume"
/>
</div>
<div className="text-xs sm:text-sm tabular-nums text-white/80 ml-1">
{fmtDuration(current)} / {fmtDuration(duration)}
</div>
<div className="ml-auto flex items-center gap-2 sm:gap-3">
<label className="hidden sm:flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
<input type="checkbox" checked={autonext} onChange={(e) => setAutonext(e.target.checked)} />
Autoplay next
</label>
<select
value={speed}
onChange={(e) => {
const s = Number(e.target.value);
setSpeed(s);
if (videoRef.current) videoRef.current.playbackRate = s;
}}
className="bg-white/10 text-xs rounded px-2 py-1.5 focus-ring"
aria-label="Playback speed"
>
{SPEEDS.map((s) => (
<option key={s} value={s}>
{s}x
</option>
))}
</select>
<button onClick={handleSavePosition} className="hidden sm:block text-xs px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 focus-ring">
Save
</button>
<button onClick={handleResetPosition} className="hidden sm:block text-xs px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 focus-ring">
Reset
</button>
<IconButton onClick={togglePip} label="Picture in picture">
<PipIcon />
</IconButton>
<IconButton onClick={toggleFullscreen} label="Fullscreen">
<FsIcon />
</IconButton>
</div>
</div>
</div>
</div>
{nextVideo && (
<div className="absolute bottom-24 sm:bottom-28 right-4 sm:right-6 text-xs text-muted max-w-[50%] truncate">
Up next: <span className="text-white">{nextVideo.name}</span>
</div>
)}
</div>
);
}
function Shortcut({ keys, desc }: { keys: string; desc: string }) {
return (
<div className="flex items-center justify-between gap-3">
<span className="text-muted">{desc}</span>
<kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] shrink-0">{keys}</kbd>
</div>
);
}
function IconButton({
children,
onClick,
label,
disabled = false,
}: {
children: React.ReactNode;
onClick: () => void;
label: string;
disabled?: boolean;
}) {
return (
<button
onClick={onClick}
disabled={disabled}
aria-label={label}
title={label}
className="w-9 h-9 rounded-full hover:enabled:bg-white/10 disabled:opacity-30 flex items-center justify-center focus-ring shrink-0"
>
{children}
</button>
);
}
function PlayIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
<path d="M8 5v14l11-7z" />
</svg>
);
}
function PauseIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
<path d="M7 5h4v14H7zM13 5h4v14h-4z" />
</svg>
);
}
function BackIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M3 12a9 9 0 1 0 9-9" />
<path d="M3 5v6h6" />
<text x="7" y="16" fontSize="7" fill="#fff" stroke="none">10</text>
</svg>
);
}
function FwdIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M21 12a9 9 0 1 1-9-9" />
<path d="M21 5v6h-6" />
<text x="8" y="16" fontSize="7" fill="#fff" stroke="none">10</text>
</svg>
);
}
function PrevTrackIcon() {
return (
<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
<path d="M6 5h2v14H6zM20 5v14l-11-7z" />
</svg>
);
}
function NextTrackIcon() {
return (
<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
<path d="M16 5h2v14h-2zM4 5v14l11-7z" />
</svg>
);
}
function VolIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
<path d="M4 9v6h4l5 5V4L8 9H4z" />
<path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="#fff" strokeWidth="1.6" fill="none" />
</svg>
);
}
function MuteIcon() {
return (
<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
<path d="M4 9v6h4l5 5V4L8 9H4z" />
<path d="M16 9l5 6M21 9l-5 6" stroke="#fff" strokeWidth="1.6" />
</svg>
);
}
function PipIcon() {
return (
<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
<rect x="3" y="4" width="18" height="14" rx="1.5" />
<rect x="12" y="11" width="7" height="5" rx="1" fill="#fff" stroke="none" />
</svg>
);
}
function FsIcon() {
return (
<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
</svg>
);
}