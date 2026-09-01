"use client";
import type { TreeNode } from "@/lib/manage";
import type { VideoItem } from "@/lib/types";
import { fmtDuration, fmtSize } from "@/lib/format";

export default function TreeRow({
  node,
  depth,
  parentPath,
  isAdmin,
  expanded,
  onToggle,
  onPlay,
  busy,
  onRename,
  onDelete,
  onMoveRequest,
  onReorder,
  onNewFolder,
  isFirst,
  isLast,
}: {
  node: TreeNode;
  depth: number;
  parentPath: string;
  isAdmin: boolean;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onPlay: (v: VideoItem) => void;
  busy: string | null;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onMoveRequest: (node: TreeNode) => void;
  onReorder: (parentPath: string, name: string, direction: "up" | "down") => void;
  onNewFolder: (parentPath: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isOpen = node.type === "folder" && expanded.has(node.path);
  const isBusy = busy === node.path;
  // Cap indentation growth on deep trees so rows stay usable on narrow
  // (mobile) screens instead of pushing content off-screen.
  const indent = 10 + Math.min(depth, 7) * 14;

  return (
    <div>
      <div
        className={`group flex items-center flex-wrap gap-1.5 sm:gap-2 pr-2 sm:pr-3 py-2 border-t border-white/5 first:border-t-0 hover:bg-white/[0.03] ${
          isBusy ? "opacity-50 pointer-events-none" : ""
        }`}
        style={{ paddingLeft: indent }}
      >
        {node.type === "folder" ? (
          <button
            onClick={() => onToggle(node.path)}
            className="w-6 h-6 shrink-0 flex items-center justify-center rounded hover:bg-white/10 focus-ring"
            aria-label={isOpen ? "Collapse folder" : "Expand folder"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="w-6 h-6 shrink-0" />
        )}

        <span className="shrink-0 text-muted">
          {node.type === "folder" ? <FolderGlyph open={isOpen} /> : <FileGlyph />}
        </span>

        <button
          onClick={() => (node.type === "folder" ? onToggle(node.path) : node.video && onPlay(node.video))}
          className="min-w-0 flex-1 text-left truncate text-sm text-white/90 hover:text-white"
          title={node.name}
        >
          {node.name}
        </button>

        {node.type === "file" && node.video && (
          <span className="hidden sm:inline text-xs text-muted tabular-nums shrink-0 mr-1">
            {fmtDuration(node.video.duration)} · {fmtSize(node.video.size)}
          </span>
        )}
        {node.type === "file" && !node.video && (
          <span className="hidden sm:inline text-xs text-amber-400/80 shrink-0 mr-1">not indexed yet</span>
        )}

        {node.type === "file" && node.video && (
          <button
            onClick={() => node.video && onPlay(node.video)}
            aria-label={`Play ${node.name}`}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-ring"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {isAdmin && (
          <div className="flex items-center gap-0.5 shrink-0">
            <IconBtn label="Move up" disabled={isFirst} onClick={() => onReorder(parentPath, node.name, "up")}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </IconBtn>
            <IconBtn label="Move down" disabled={isLast} onClick={() => onReorder(parentPath, node.name, "down")}>
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </IconBtn>
            {node.type === "folder" && (
              <IconBtn label="New sub-folder" onClick={() => onNewFolder(node.path)}>
                <path d="M12 5v14M5 12h14" />
              </IconBtn>
            )}
            <IconBtn label="Move to folder" onClick={() => onMoveRequest(node)}>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </IconBtn>
            <IconBtn label="Rename" onClick={() => onRename(node)}>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
            </IconBtn>
            <IconBtn label="Delete" danger onClick={() => onDelete(node)}>
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </IconBtn>
          </div>
        )}
      </div>

      {node.type === "folder" && isOpen && (
        <div>
          {node.children.length === 0 ? (
            <div className="text-xs text-muted py-2" style={{ paddingLeft: indent + 26 }}>
              Empty folder.
            </div>
          ) : (
            node.children.map((child, i) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                parentPath={node.path}
                isAdmin={isAdmin}
                expanded={expanded}
                onToggle={onToggle}
                onPlay={onPlay}
                busy={busy}
                onRename={onRename}
                onDelete={onDelete}
                onMoveRequest={onMoveRequest}
                onReorder={onReorder}
                onNewFolder={onNewFolder}
                isFirst={i === 0}
                isLast={i === node.children.length - 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none focus-ring ${
        danger ? "text-red-400 hover:text-red-300" : "text-muted hover:text-white"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {children}
      </svg>
    </button>
  );
}
function FolderGlyph({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {open ? (
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3V7Z M3 9h18l-2 10H5L3 9Z" />
      ) : (
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      )}
    </svg>
  );
}
function FileGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2.5" y="5" width="14" height="14" rx="2" />
      <path d="M16.5 9.5 21 7v10l-4.5-2.5" />
    </svg>
  );
}
