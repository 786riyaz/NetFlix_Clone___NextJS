import { useCallback } from "react";

/**
 * Attach the returned handler to a container's onKeyDown. Arrow keys move
 * focus between any [role="button"][tabindex] descendant (folder tiles,
 * video cards) — rows are found by comparing each item's actual offsetTop
 * after layout, not by assuming a column count, so it stays correct
 * whether the grid is showing 2 columns on a phone or 6 on a desktop.
 * Enter/Space activation is left to each item's own handler; this only
 * moves focus.
 */
export function useGridKeyboardNav() {
return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
const navKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
if (!navKeys.includes(e.key)) return;

const container = e.currentTarget;
const items = Array.from(container.querySelectorAll<HTMLElement>('[role="button"][tabindex]'));
if (!items.length) return;

const active = document.activeElement as HTMLElement | null;
const idx = active ? items.indexOf(active) : -1;

if (idx === -1) {
// Focus is outside this grid (or nowhere) — first arrow press just
// lands on the first item, matching common file-explorer behavior.
if (e.key.startsWith("Arrow")) {
e.preventDefault();
items[0]?.focus();
}
return;
}

e.preventDefault();
if (e.key === "Home") return items[0].focus();
if (e.key === "End") return items[items.length - 1].focus();
if (e.key === "ArrowRight") return items[Math.min(idx + 1, items.length - 1)].focus();
if (e.key === "ArrowLeft") return items[Math.max(idx - 1, 0)].focus();

// ArrowUp / ArrowDown: group items into visual rows by offsetTop, then
// move to the item in the neighboring row closest to the current column.
const rows: HTMLElement[][] = [];
let rowTop: number | null = null;
let row: HTMLElement[] = [];
for (const it of items) {
if (rowTop === null || Math.abs(it.offsetTop - rowTop) > 4) {
if (row.length) rows.push(row);
row = [it];
rowTop = it.offsetTop;
} else {
row.push(it);
}
}
if (row.length) rows.push(row);

const rowIdx = rows.findIndex((r) => r.includes(active!));
if (rowIdx === -1) return;
const colIdx = rows[rowIdx].indexOf(active!);
const targetRow = rows[e.key === "ArrowDown" ? rowIdx + 1 : rowIdx - 1];
if (targetRow) targetRow[Math.min(colIdx, targetRow.length - 1)].focus();
}, []);
}
