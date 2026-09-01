"use client";
import { useCallback, useEffect, useState } from "react";
import type { TreeNode } from "@/lib/manage";
import type { VideoItem } from "@/lib/types";
import { pushToast } from "@/lib/toast";
import TreeRow from "./TreeRow";

export default function ManageView({
  isAdmin,
  onPlay,
}: {
  isAdmin: boolean;
  onPlay: (v: VideoItem) => void;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ path: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/tree");
      if (!res.ok) throw new Error("Couldn't load the folder tree.");
      const data = await res.json();
      setTree(data.tree || []);
    } catch (e: any) {
      pushToast(e.message || "Couldn't load the folder tree.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (hasAutoExpanded || !tree.length) return;
    setExpanded(new Set(tree.filter((n) => n.type === "folder").map((n) => n.path)));
    setHasAutoExpanded(true);
  }, [tree, hasAutoExpanded]);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function call(url: string, body: any, successMsg: (data: any) => string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "That didn't work.");
    pushToast(successMsg(data), "success");
  }

  async function handleRename(node: TreeNode) {
    const newName = window.prompt(`Rename "${node.name}" to:`, node.name);
    if (!newName || newName.trim() === node.name) return;
    setBusy(node.path);
    try {
      await call("/api/manage/rename", { path: node.path, newName }, () => `Renamed to "${newName.trim()}".`);
      await load();
    } catch (e: any) {
      pushToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(node: TreeNode) {
    const label = node.type === "folder" ? "folder — and everything inside it" : "file";
    if (!window.confirm(`Permanently delete this ${label}?\n\n"${node.name}"\n\nThis can't be undone.`)) return;
    setBusy(node.path);
    try {
      await call("/api/manage/delete", { path: node.path }, () => `Deleted "${node.name}".`);
      await load();
    } catch (e: any) {
      pushToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleMove(item: { path: string; name: string }, targetFolder: string) {
    setBusy(item.path);
    try {
      await call("/api/manage/move", { path: item.path, targetFolder }, () => `Moved "${item.name}".`);
      setMoveTarget(null);
      await load();
    } catch (e: any) {
      pushToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleReorder(parentPath: string, name: string, direction: "up" | "down") {
    setBusy(`${parentPath}/${name}`);
    try {
      await call("/api/manage/reorder", { parentPath, name, direction }, () => "");
      await load();
    } catch (e: any) {
      pushToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleNewFolder(parentPath: string) {
    const name = window.prompt("New folder name:");
    if (!name) return;
    setBusy(`new:${parentPath}`);
    try {
      await call("/api/manage/mkdir", { parentPath, name }, () => `Created folder "${name.trim()}".`);
      setExpanded((prev) => new Set(prev).add(parentPath));
      await load();
    } catch (e: any) {
      pushToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  function flattenFolders(nodes: TreeNode[], prefix = ""): { path: string; label: string }[] {
    let out: { path: string; label: string }[] = [];
    for (const n of nodes) {
      if (n.type === "folder") {
        out.push({ path: n.path, label: prefix + n.name });
        out = out.concat(flattenFolders(n.children, prefix + n.name + " / "));
      }
    }
    return out;
  }

  if (loading) {
    return <div className="pt-28 px-4 sm:px-10 text-muted text-sm">Loading folder tree…</div>;
  }

  const allFolders = [{ path: "", label: "Library root" }, ...flattenFolders(tree)];

  return (
    <div className="pt-24 px-3 sm:px-10 pb-16">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Manage library</h2>
          <p className="text-xs text-muted mt-0.5">
            Same folder structure as on disk. Rename, delete, move between folders, or reorder items — admin only.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleNewFolder("")}
            className="shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 focus-ring"
          >
            + New folder
          </button>
        )}
      </div>

      {tree.length === 0 ? (
        <div className="text-muted text-sm py-10">No videos or folders found in the library.</div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-panel/40">
          {tree.map((node, i) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              parentPath=""
              isAdmin={isAdmin}
              expanded={expanded}
              onToggle={toggle}
              onPlay={onPlay}
              busy={busy}
              onRename={handleRename}
              onDelete={handleDelete}
              onMoveRequest={(n) => setMoveTarget({ path: n.path, name: n.name })}
              onReorder={handleReorder}
              onNewFolder={handleNewFolder}
              isFirst={i === 0}
              isLast={i === tree.length - 1}
            />
          ))}
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-panel border border-white/10 rounded-lg shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-sm">Move "{moveTarget.name}"</h3>
              <p className="text-xs text-muted mt-1">Choose the destination folder.</p>
            </div>
            <div className="max-h-72 overflow-y-auto px-2 py-2">
              {allFolders
                .filter((f) => f.path !== moveTarget.path)
                .map((f) => (
                  <button
                    key={f.path || "__root__"}
                    onClick={() => handleMove(moveTarget, f.path)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm truncate"
                  >
                    {f.label}
                  </button>
                ))}
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setMoveTarget(null)}
                className="text-sm px-3 py-1.5 rounded-md hover:bg-white/10 focus-ring"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
