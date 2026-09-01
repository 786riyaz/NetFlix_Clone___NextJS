"use client";
import { useState } from "react";
export default function RenameDialog({
currentName,
busy = false,
error,
onSave,
onCancel,
}: {
currentName: string;
busy?: boolean;
error?: string;
onSave: (name: string) => void;
onCancel: () => void;
}) {
const [name, setName] = useState(currentName);
return (
<div className="fixed inset-0 z-[110] bg-black/70 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4" onClick={onCancel} onKeyDown={(e) => e.key === "Escape" && onCancel()}>
<form
onClick={(e) => e.stopPropagation()}
onSubmit={(e) => {
e.preventDefault();
if (name.trim() && name.trim() !== currentName) onSave(name.trim());
}}
className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
>
<h3 className="text-base font-semibold text-white">Rename video</h3>
<input
autoFocus
value={name}
onChange={(e) => setName(e.target.value)}
onFocus={(e) => {
// Select just the base name, not the extension — matches the
// familiar "rename" behavior from desktop file explorers.
const dot = currentName.lastIndexOf(".");
e.currentTarget.setSelectionRange(0, dot > 0 ? dot : currentName.length);
}}
className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white outline-none focus:border-red-600 text-sm"
/>
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
disabled={busy || !name.trim() || name.trim() === currentName}
className="px-3.5 py-2 rounded-md text-sm font-semibold bg-accent hover:opacity-90 disabled:opacity-50 focus-ring"
>
{busy ? "Saving…" : "Save"}
</button>
</div>
</form>
</div>
);
}
