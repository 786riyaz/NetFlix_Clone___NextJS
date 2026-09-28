export function fmtDuration(seconds: number): string {
if (!seconds || !isFinite(seconds)) return "--:--";
const s = Math.floor(seconds);
const h = Math.floor(s / 3600);
const m = Math.floor((s % 3600) / 60);
const sec = s % 60;
if (h > 0) {
return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
return `${m}:${String(sec).padStart(2, "0")}`;
}
export function fmtSize(bytes: number): string {
if (!bytes) return "0 B";
const units = ["B", "KB", "MB", "GB", "TB"];
let i = 0;
let n = bytes;
while (n >= 1024 && i < units.length - 1) {
n /= 1024;
i++;
}
return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
/** Strips the file extension for display purposes only — the underlying
* video.name (with extension) is still what's used for renaming, search,
* sorting, and anything else that needs the real filename. Only strips a
* short (<=5 char) trailing extension so a dotted title without one isn't
* mangled. */
export function displayName(name: string): string {
const i = name.lastIndexOf(".");
if (i <= 0 || name.length - i > 6) return name;
return name.slice(0, i);
}
export function fmtDate(mtimeMs: number): string {
return new Date(mtimeMs).toLocaleDateString(undefined, {
year: "numeric",
month: "short",
day: "numeric",
});
}
