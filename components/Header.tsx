"use client";
import { useEffect, useRef, useState } from "react";
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
  isAdmin,
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
  isAdmin: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-bg/95 backdrop-blur border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-10 py-3 sm:py-3.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-accent font-extrabold text-lg sm:text-2xl tracking-tight">VAULT</span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 sm:gap-2 justify-end min-w-0">
          <div className="relative flex-1 sm:flex-none min-w-0 sm:w-64 max-w-[220px] sm:max-w-none">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              type="text"
              placeholder="Search"
              className="w-full bg-black/40 border border-white/10 rounded-md pl-3 pr-7 py-1.5 text-sm placeholder:text-muted focus-ring outline-none"
            />
            {search && (
              <button
                aria-label="Clear search"
                onClick={() => onSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-muted hover:text-white hover:bg-white/10"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Desktop-only inline controls */}
          <select
            value={folder}
            onChange={(e) => onFolder(e.target.value)}
            className="hidden lg:block bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none max-w-[140px]"
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
            className="hidden sm:block bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none"
          >
            <option value="date">Newest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="duration">Duration</option>
          </select>

          <ViewToggle view={view} onView={onView} isAdmin={isAdmin} />

          <button
            onClick={onChangeFolder}
            title="Change your video library folder"
            className="hidden sm:flex shrink-0 text-sm px-2.5 sm:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 focus-ring items-center gap-1.5"
          >
            <FolderIcon />
            <span className="hidden md:inline">Folder</span>
          </button>
          <button
            onClick={onRescan}
            disabled={rescanning}
            title="Rescan library for new or changed files"
            className="hidden sm:flex shrink-0 text-sm px-2.5 sm:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring items-center gap-1.5"
          >
            <RescanIcon spinning={rescanning} />
            <span className="hidden md:inline">{rescanning ? "Scanning…" : "Rescan"}</span>
          </button>
          <button
            onClick={signOut}
            title="Sign out"
            className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 focus-ring"
          >
            <LogoutIcon />
          </button>

          {/* Mobile overflow menu: folder filter + sort + folder/rescan/logout actions */}
          <div className="relative sm:hidden" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More options"
              aria-expanded={moreOpen}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 focus-ring"
            >
              <MoreIcon />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-10 z-50 w-60 rounded-lg bg-panel border border-white/10 shadow-card p-3 space-y-2.5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-muted">Folder</span>
                  <select
                    value={folder}
                    onChange={(e) => onFolder(e.target.value)}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none"
                  >
                    <option value="">All folders</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-muted">Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => onSort(e.target.value as SortKey)}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none"
                  >
                    <option value="date">Newest</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="duration">Duration</option>
                  </select>
                </label>
                <div className="h-px bg-white/10" />
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onChangeFolder();
                  }}
                  className="w-full flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-white/10 focus-ring"
                >
                  <FolderIcon /> Change library folder
                </button>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onRescan();
                  }}
                  disabled={rescanning}
                  className="w-full flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-white/10 focus-ring disabled:opacity-50"
                >
                  <RescanIcon spinning={rescanning} /> {rescanning ? "Scanning…" : "Rescan library"}
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-white/10 focus-ring"
                >
                  <LogoutIcon /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
function ViewToggle({
  view,
  onView,
  isAdmin,
}: {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  isAdmin: boolean;
}) {
  const options: { key: ViewMode; label: string; icon: JSX.Element }[] = [
    { key: "browse", label: "Browse", icon: <BrowseIcon /> },
    { key: "grid", label: "Grid", icon: <GridIcon /> },
    { key: "list", label: "List", icon: <ListIcon /> },
  ];
  if (isAdmin) options.push({ key: "manage", label: "Manage (admin)", icon: <ManageIcon /> });
  return (
    <div className="flex items-center bg-black/40 border border-white/10 rounded-md p-0.5 gap-0.5 shrink-0">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onView(o.key)}
          title={o.label}
          aria-pressed={view === o.key}
          className={`w-7 h-7 flex items-center justify-center rounded focus-ring transition-colors ${
            view === o.key ? "bg-white/15 text-white" : "text-muted hover:text-white hover:bg-white/5"
          } ${o.key === "manage" ? "text-accent" : ""}`}
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
function BrowseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
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
function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
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
function ManageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M9 13h6" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
