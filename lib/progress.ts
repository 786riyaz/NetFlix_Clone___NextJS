"use client";
const POS_PREFIX = "vault:pos:";
const WATCHED_SUFFIX = ":watched";
export function getSavedTime(id: string): number {
if (typeof window === "undefined") return 0;
const t = window.localStorage.getItem(POS_PREFIX + id);
return t ? Number(t) : 0;
}
export function setSavedTime(id: string, t: number) {
if (typeof window === "undefined") return;
window.localStorage.setItem(POS_PREFIX + id, String(t));
}
export function clearProgress(id: string) {
if (typeof window === "undefined") return;
window.localStorage.removeItem(POS_PREFIX + id);
window.localStorage.removeItem(POS_PREFIX + id + WATCHED_SUFFIX);
}
export function markWatched(id: string) {
if (typeof window === "undefined") return;
window.localStorage.setItem(POS_PREFIX + id + WATCHED_SUFFIX, "1");
}
export function isWatched(id: string): boolean {
if (typeof window === "undefined") return false;
return window.localStorage.getItem(POS_PREFIX + id + WATCHED_SUFFIX) === "1";
}
export function getVolume(): number {
if (typeof window === "undefined") return 1;
const v = window.localStorage.getItem("vault:volume");
return v ? Number(v) : 1;
}
export function setVolume(v: number) {
if (typeof window === "undefined") return;
window.localStorage.setItem("vault:volume", String(v));
}
// Every video still has to *start* muted (browsers block unmuted autoplay
// without a prior gesture) — but once someone unmutes once, every video
// after that should just start unmuted at their preferred volume instead
// of forcing them to hit unmute again each time.
export function getMutePreference(): boolean {
if (typeof window === "undefined") return true;
const v = window.localStorage.getItem("vault:muted");
return v === null ? true : v === "true";
}
export function setMutePreference(muted: boolean) {
if (typeof window === "undefined") return;
window.localStorage.setItem("vault:muted", String(muted));
}
export function getAllProgressIds(): string[] {
if (typeof window === "undefined") return [];
const ids: string[] = [];
for (let i = 0; i < window.localStorage.length; i++) {
const key = window.localStorage.key(i);
if (key && key.startsWith(POS_PREFIX) && !key.endsWith(WATCHED_SUFFIX)) {
ids.push(key.slice(POS_PREFIX.length));
}
}
return ids;
}
export type ViewMode = "browse" | "grid" | "list" | "folders";
export function getViewMode(): ViewMode {
if (typeof window === "undefined") return "browse";
const v = window.localStorage.getItem("vault:view");
return v === "grid" || v === "list" || v === "browse" || v === "folders" ? v : "browse";
}
export function setViewMode(v: ViewMode) {
if (typeof window === "undefined") return;
window.localStorage.setItem("vault:view", v);
}