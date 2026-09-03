"use client";
import { useState } from "react";
export default function MoveDialog({
currentFolder,
folderPaths,
busy = false,
error,
onSave,
onCancel,
}: {
currentFolder: string;
folderPaths: string[];
busy?: boolean;
error?: string;
onSave: (folder: string) => void;
onCancel: () => void;
}) {
const [folder, setFolder] = useState(currentFolder);
return (
<div
className="fixed inset-0 z-[110] bg-black/70 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4"
onClick={onCancel}
onKeyDown={(e) => {
e.stopPropagation();
if (e.key === "Escape") onCancel();
}}
>
<form
onClick={(e) => e.stopPropagation()}
onSubmit={(e) => {
e.preventDefault();
if (folder.trim() !== currentFolder) onSave(folder.trim());
}}
className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
>
<h3 className="text-base font-semibold text-white">Move video</h3>
<div>
<label className="text-xs text-muted block mb-1.5">Destination folder</label>
<input
autoFocus
list="move-folder-options"
value={folder}
onChange={(e) => setFolder(e.target.value)}
placeholder="(root — no folder)"
className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white outline-none focus:border-red-600 text-sm"
/>
<datalist id="move-folder-options">
<option value="" />
{folderPaths.map((f) => (
<option key={f} value={f} />
))}
</datalist>
<p className="text-xs text-muted mt-1.5">
Pick an existing folder from the list, or type a new path (e.g. <code className="text-white/70">Marvel/Movies/Thor</code>) to create it.
</p>
</div>
{error && <p className="text-sm text-red-500">{error}</p>}
<div className="flex justify-end gap-2">
<button
type="button"
onClick={onCancel}
disabled={busy}
className="px-3.5 py-2 rounded-md text-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring"
>
Cancel
</button>
<button
type="submit"
disabled={busy || folder.trim() === currentFolder}
className="px-3.5 py-2 rounded-md text-sm font-semibold bg-accent hover:opacity-90 disabled:opacity-50 focus-ring"
>
{busy ? "Moving…" : "Move"}
</button>
</div>
</form>
</div>
);
}
