"use client";
import { useEffect, useState } from "react";
interface BrowseEntry {
name: string;
path: string;
}
interface BrowseResponse {
current: string;
parent: string | null;
entries: BrowseEntry[];
error?: string;
}
export default function FolderPicker({
initialPath,
canCancel = true,
onCancel,
onSelect,
}: {
initialPath?: string | null;
canCancel?: boolean;
onCancel: () => void;
onSelect: (path: string) => Promise<void> | void;
}) {
const [current, setCurrent] = useState("");
const [parent, setParent] = useState<string | null>(null);
const [entries, setEntries] = useState<BrowseEntry[]>([]);
const [manualPath, setManualPath] = useState(initialPath || "");
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
async function browse(target: string) {
setLoading(true);
setError(null);
try {
const res = await fetch(`/api/browse?path=${encodeURIComponent(target)}`);
const data: BrowseResponse = await res.json();
if (!res.ok) throw new Error(data.error || "Could not open that folder.");
setCurrent(data.current);
setParent(data.parent);
setEntries(data.entries);
setManualPath(data.current);
} catch (e: any) {
setError(e.message || "Could not open that folder.");
} finally {
setLoading(false);
}
}
useEffect(() => {
browse(initialPath || "");
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
async function handleUseThisFolder(target: string) {
if (!target) return;
setSaving(true);
setError(null);
try {
await onSelect(target);
} catch (e: any) {
setError(e.message || "Could not use that folder.");
setSaving(false);
}
}
return (
<div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
<div className="w-full max-w-lg bg-panel border border-white/10 rounded-lg shadow-card overflow-hidden">
<div className="px-5 py-4 border-b border-white/10">
<h2 className="text-lg font-semibold">Choose your video library folder</h2>
<p className="text-xs text-muted mt-1">
Sub-folders are scanned recursively, at any depth — nested collections, seasons, whatever you've got.
</p>
</div>
<div className="px-5 py-3 flex items-center gap-2 border-b border-white/10">
<input
value={manualPath}
onChange={(e) => setManualPath(e.target.value)}
onKeyDown={(e) => e.key === "Enter" && browse(manualPath)}
placeholder={
typeof window !== "undefined" && navigator.platform.toLowerCase().includes("win")
? "Paste a folder path, e.g. D:\\Movies"
: "Paste a folder path, e.g. /home/you/Movies"
}
className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm outline-none focus-ring"
/>
<button
onClick={() => browse(manualPath)}
className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 focus-ring shrink-0"
>
Go
</button>
</div>
<div className="max-h-72 overflow-y-auto px-2 py-2">
{loading && <div className="px-3 py-6 text-sm text-muted">Loading…</div>}
{!loading && error && <div className="px-3 py-3 text-sm text-accent">{error}</div>}
{!loading && !error && (
<>
{parent !== null && (
<button
onClick={() => browse(parent)}
className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm flex items-center gap-2"
>
<FolderIcon /> ..
</button>
)}
{entries.map((e) => (
<button
key={e.path}
onClick={() => browse(e.path)}
className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm flex items-center gap-2"
>
<FolderIcon /> {e.name}
</button>
))}
{entries.length === 0 && (
<div className="px-3 py-6 text-sm text-muted">No sub-folders here.</div>
)}
</>
)}
</div>
<div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
{canCancel ? (
<button onClick={onCancel} className="text-sm px-3 py-1.5 rounded-md hover:bg-white/10 focus-ring">
Cancel
</button>
) : (
<span className="text-xs text-muted">Pick a folder to get started</span>
)}
<button
onClick={() => handleUseThisFolder(current || manualPath)}
disabled={saving || (!current && !manualPath)}
className="text-sm px-4 py-1.5 rounded-md bg-accent hover:bg-accent2 disabled:opacity-50 focus-ring font-medium"
>
{saving ? "Saving…" : "Use this folder"}
</button>
</div>
</div>
</div>
);
}
function FolderIcon() {
return (
<svg
width="15"
height="15"
viewBox="0 0 24 24"
fill="none"
stroke="#9aa0a6"
strokeWidth="1.8"
className="shrink-0"
>
<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
</svg>
);
}