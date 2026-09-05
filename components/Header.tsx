"use client";
import { useEffect, useState } from "react";
import type { ViewMode } from "@/lib/progress";
export type SortKey = "name" | "date" | "size" | "duration";
export default function Header({
search,
onSearch,
sort,
onSort,
folder,
onFolder,
folders,
onRescan,
rescanning,
onChangeFolder,
view,
onView,
searchInputRef,
}: {
search: string;
onSearch: (v: string) => void;
sort: SortKey;
onSort: (v: SortKey) => void;
folder: string;
onFolder: (v: string) => void;
folders: string[];
onRescan: () => void;
rescanning: boolean;
onChangeFolder: () => void;
view: ViewMode;
onView: (v: ViewMode) => void;
searchInputRef?: React.RefObject<HTMLInputElement>;
}) {
const [scrolled, setScrolled] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
useEffect(() => {
function onScroll() {
setScrolled(window.scrollY > 12);
}
window.addEventListener("scroll", onScroll);
return () => window.removeEventListener("scroll", onScroll);
}, []);
// Close the mobile overflow panel automatically if the viewport grows
// past the breakpoint where it's needed (e.g. rotating a tablet).
useEffect(() => {
function onResize() {
if (window.innerWidth >= 640) setMenuOpen(false);
}
window.addEventListener("resize", onResize);
return () => window.removeEventListener("resize", onResize);
}, []);
async function logout() {
await fetch("/api/auth", { method: "DELETE" });
window.location.href = "/login";
}
return (
<header
className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
scrolled || menuOpen ? "bg-bg/95 backdrop-blur border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
}`}
>
<div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-10 py-3 sm:py-3.5">
<span className="text-accent font-extrabold text-lg sm:text-2xl tracking-tight shrink-0">VAULT</span>
<div className="flex-1 flex items-center gap-2 justify-end min-w-0 flex-wrap sm:flex-nowrap gap-y-1.5">
<SearchBox search={search} onSearch={onSearch} searchInputRef={searchInputRef} />
{/* Full control row — tablet and up */}
<div className="hidden sm:flex items-center gap-2">
<select
value={folder}
onChange={(e) => onFolder(e.target.value)}
className="bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none max-w-[120px] lg:max-w-[160px]"
>
<option value="">All folders</option>
{folders.map((f) => (
<option key={f} value={f}>
{f}
</option>
))}
</select>
<select
value={sort}
onChange={(e) => onSort(e.target.value as SortKey)}
className="bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none"
>
<option value="date">Newest</option>
<option value="name">Name</option>
<option value="size">Size</option>
<option value="duration">Duration</option>
</select>
<ViewToggle view={view} onView={onView} />
<button
onClick={onChangeFolder}
title="Change your video library folder"
className="shrink-0 text-sm px-2.5 lg:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 focus-ring flex items-center gap-1.5"
>
<FolderIcon />
<span className="hidden lg:inline">Folder</span>
</button>
<button
onClick={onRescan}
disabled={rescanning}
title="Rescan library for new or changed files"
className="shrink-0 text-sm px-2.5 lg:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring flex items-center gap-1.5"
>
<RescanIcon spinning={rescanning} />
<span className="hidden lg:inline">{rescanning ? "Scanning…" : "Rescan"}</span>
</button>
<button
onClick={logout}
title="Sign out"
className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 focus-ring"
>
<LogoutIcon />
</button>
</div>
{/* Phone: view toggle stays inline (used constantly), everything else collapses */}
<div className="flex sm:hidden items-center gap-2">
<ViewToggle view={view} onView={onView} />
<button
onClick={() => setMenuOpen((o) => !o)}
aria-label="More options"
aria-expanded={menuOpen}
className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-md focus-ring ${
menuOpen ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
}`}
>
<MoreIcon />
</button>
</div>
</div>
</div>
{/* Phone overflow panel */}
{menuOpen && (
<div className="sm:hidden px-3 pb-3 pt-1 flex flex-col gap-2 border-t border-white/5">
<select
value={folder}
onChange={(e) => onFolder(e.target.value)}
className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-2 text-sm focus-ring outline-none"
>
<option value="">All folders</option>
{folders.map((f) => (
<option key={f} value={f}>
{f}
</option>
))}
</select>
<select
value={sort}
onChange={(e) => onSort(e.target.value as SortKey)}
className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-2 text-sm focus-ring outline-none"
>
<option value="date">Sort: Newest</option>
<option value="name">Sort: Name</option>
<option value="size">Sort: Size</option>
<option value="duration">Sort: Duration</option>
</select>
<div className="grid grid-cols-3 gap-2">
<button
onClick={() => {
onChangeFolder();
setMenuOpen(false);
}}
className="text-sm px-2 py-2 rounded-md bg-white/10 hover:bg-white/20 focus-ring flex flex-col items-center gap-1"
>
<FolderIcon />
Folder
</button>
<button
onClick={() => {
onRescan();
setMenuOpen(false);
}}
disabled={rescanning}
className="text-sm px-2 py-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring flex flex-col items-center gap-1"
>
<RescanIcon spinning={rescanning} />
{rescanning ? "…" : "Rescan"}
</button>
<button
onClick={logout}
className="text-sm px-2 py-2 rounded-md bg-white/10 hover:bg-white/20 focus-ring flex flex-col items-center gap-1"
>
<LogoutIcon />
Sign out
</button>
</div>
</div>
)}
</header>
);
}
function SearchBox({
search,
onSearch,
searchInputRef,
}: {
search: string;
onSearch: (v: string) => void;
searchInputRef?: React.RefObject<HTMLInputElement>;
}) {
return (
<div className="relative w-full max-w-[140px] xs:max-w-[180px] sm:max-w-none sm:w-64">
<input
ref={searchInputRef}
value={search}
onChange={(e) => onSearch(e.target.value)}
type="text"
placeholder="Search"
className="w-full bg-black/40 border border-white/10 rounded-md pl-3 pr-9 py-1.5 sm:py-1.5 text-sm placeholder:text-muted focus-ring outline-none"
/>
{search && (
<button
aria-label="Clear search"
onClick={() => onSearch("")}
className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded text-muted hover:text-white hover:bg-white/10"
>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
<path d="M6 6l12 12M18 6 6 18" />
</svg>
</button>
)}
</div>
);
}
function ViewToggle({ view, onView }: { view: ViewMode; onView: (v: ViewMode) => void }) {
const options: { key: ViewMode; label: string; icon: JSX.Element }[] = [
{ key: "browse", label: "Browse", icon: <BrowseIcon /> },
{ key: "folders", label: "Folders", icon: <FoldersViewIcon /> },
{ key: "grid", label: "Grid", icon: <GridIcon /> },
{ key: "list", label: "List", icon: <ListIcon /> },
];
return (
<div className="flex items-center bg-black/40 border border-white/10 rounded-md p-0.5 gap-0.5 shrink-0">
{options.map((o) => (
<button
key={o.key}
onClick={() => onView(o.key)}
title={o.label}
aria-pressed={view === o.key}
className={`w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded focus-ring transition-colors ${
view === o.key ? "bg-white/15 text-white" : "text-muted hover:text-white hover:bg-white/5"
}`}
>
{o.icon}
</button>
))}
</div>
);
}
function FolderIcon() {
return (
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" className="shrink-0">
<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
</svg>
);
}
function RescanIcon({ spinning }: { spinning: boolean }) {
return (
<svg
width="14"
height="14"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
className={spinning ? "animate-spin" : ""}
>
<path d="M21 12a9 9 0 1 1-3-6.7" />
<path d="M21 4v5h-5" />
</svg>
);
}
function LogoutIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
<path d="M16 17l5-5-5-5" />
<path d="M21 12H9" />
</svg>
);
}
function MoreIcon() {
return (
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
<circle cx="5" cy="12" r="1.8" />
<circle cx="12" cy="12" r="1.8" />
<circle cx="19" cy="12" r="1.8" />
</svg>
);
}
function BrowseIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<rect x="3" y="4" width="18" height="4" rx="1" />
<rect x="3" y="10" width="18" height="4" rx="1" />
<rect x="3" y="16" width="18" height="4" rx="1" />
</svg>
);
}
function FoldersViewIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
</svg>
);
}
function GridIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<rect x="3" y="3" width="7" height="7" rx="1" />
<rect x="14" y="3" width="7" height="7" rx="1" />
<rect x="3" y="14" width="7" height="7" rx="1" />
<rect x="14" y="14" width="7" height="7" rx="1" />
</svg>
);
}
function ListIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<line x1="4" y1="6" x2="20" y2="6" />
<line x1="4" y1="12" x2="20" y2="12" />
<line x1="4" y1="18" x2="20" y2="18" />
</svg>
);
}
