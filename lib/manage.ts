import { promises as fs } from "fs";
import path from "path";
import { getVideoDir } from "./config";
import { getLibrary, invalidateLibraryCache, VIDEO_EXTENSIONS } from "./scanner";
import type { VideoItem } from "./types";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const ORDER_FILE = path.join(CACHE_DIR, "tree-order.json");

export interface TreeFileNode {
  type: "file";
  name: string;
  path: string; // "/"-joined, relative to the library root
  video: VideoItem | null;
}
export interface TreeFolderNode {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}
export type TreeNode = TreeFileNode | TreeFolderNode;

// Per-folder display order, keyed by the folder's own relative path
// ("" = library root) -> ordered list of direct child names. Only
// affects display order in the Manage tab; never touches the filesystem.
type OrderMap = Record<string, string[]>;

async function loadOrder(): Promise<OrderMap> {
  try {
    const raw = await fs.readFile(ORDER_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function saveOrder(order: OrderMap) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(ORDER_FILE, JSON.stringify(order), "utf-8");
}

function defaultSort(a: TreeNode, b: TreeNode) {
  if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function sortWithOrder(nodes: TreeNode[], parentPath: string, order: OrderMap): TreeNode[] {
  const saved = order[parentPath];
  const arr = [...nodes];
  if (!saved || !saved.length) {
    arr.sort(defaultSort);
    return arr;
  }
  const idx = new Map(saved.map((n, i) => [n, i]));
  arr.sort((a, b) => {
    const ia = idx.has(a.name) ? (idx.get(a.name) as number) : Number.MAX_SAFE_INTEGER;
    const ib = idx.has(b.name) ? (idx.get(b.name) as number) : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return defaultSort(a, b);
  });
  return arr;
}

function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(name).slice(1).toLowerCase());
}

async function walkFs(absDir: string, relDir: string): Promise<TreeNode[]> {
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: TreeNode[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const relPath = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      const children = await walkFs(path.join(absDir, e.name), relPath);
      nodes.push({ type: "folder", name: e.name, path: relPath, children });
    } else if (e.isFile() && isVideoFile(e.name)) {
      nodes.push({ type: "file", name: e.name, path: relPath, video: null });
    }
  }
  return nodes;
}

function attachAndSort(
  nodes: TreeNode[],
  parentPath: string,
  videoByPath: Map<string, VideoItem>,
  order: OrderMap
): TreeNode[] {
  for (const n of nodes) {
    if (n.type === "file") {
      n.video = videoByPath.get(n.path) || null;
    } else {
      n.children = attachAndSort(n.children, n.path, videoByPath, order);
    }
  }
  return sortWithOrder(nodes, parentPath, order);
}

/** Builds the full folder tree exactly as it exists on disk (including
 * empty sub-folders), enriched with the same metadata (duration, size,
 * thumbnail, playback id…) the rest of the app already uses. */
export async function getTree(): Promise<TreeNode[]> {
  const root = await getVideoDir();
  if (!root) return [];
  const [raw, videos, order] = await Promise.all([walkFs(root, ""), getLibrary(), loadOrder()]);
  const videoByPath = new Map(videos.map((v) => [v.relativePath, v]));
  return attachAndSort(raw, "", videoByPath, order);
}

function parentOf(relPath: string): string {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}
function nameOf(relPath: string): string {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? relPath : relPath.slice(idx + 1);
}

/** Resolves a relative path against the library root and guarantees the
 * result can never escape it — the same guard the video-serving route
 * already relies on, applied here for every mutating operation too. */
async function resolveInRoot(root: string, relPath: string): Promise<string> {
  const abs = path.resolve(root, relPath);
  const normalizedRoot = path.resolve(root);
  if (abs !== normalizedRoot && !abs.startsWith(normalizedRoot + path.sep)) {
    throw new Error("That path is outside the library folder.");
  }
  return abs;
}

async function requireRoot(): Promise<string> {
  const root = await getVideoDir();
  if (!root) throw new Error("No library folder is configured yet.");
  return root;
}

export async function renameEntry(relPath: string, newName: string): Promise<void> {
  const root = await requireRoot();
  const trimmed = newName.trim();
  if (!trimmed || /[\/\\]/.test(trimmed)) throw new Error("That's not a valid name.");
  const abs = await resolveInRoot(root, relPath);
  const parentAbs = path.dirname(abs);
  const newAbs = path.join(parentAbs, trimmed);
  await resolveInRoot(root, path.relative(root, newAbs));
  if (await fs.stat(newAbs).catch(() => null)) {
    throw new Error("An item with that name already exists here.");
  }
  await fs.rename(abs, newAbs);
  const order = await loadOrder();
  const parent = parentOf(relPath);
  if (order[parent]) {
    order[parent] = order[parent].map((n) => (n === nameOf(relPath) ? trimmed : n));
    await saveOrder(order);
  }
  invalidateLibraryCache();
}

export async function deleteEntry(relPath: string): Promise<void> {
  const root = await requireRoot();
  const abs = await resolveInRoot(root, relPath);
  const stat = await fs.stat(abs);
  if (stat.isDirectory()) {
    await fs.rm(abs, { recursive: true, force: true });
  } else {
    await fs.unlink(abs);
  }
  const order = await loadOrder();
  const parent = parentOf(relPath);
  if (order[parent]) {
    order[parent] = order[parent].filter((n) => n !== nameOf(relPath));
    await saveOrder(order);
  }
  delete order[relPath]; // in case it was itself a folder with its own saved order
  await saveOrder(order);
  invalidateLibraryCache();
}

export async function moveEntry(relPath: string, targetFolder: string): Promise<void> {
  const root = await requireRoot();
  const abs = await resolveInRoot(root, relPath);
  const targetAbs = targetFolder ? await resolveInRoot(root, targetFolder) : root;
  const name = nameOf(relPath);
  const destAbs = path.join(targetAbs, name);
  if (path.normalize(destAbs) === path.normalize(abs)) return; // no-op, already there
  if ((destAbs + path.sep).startsWith(abs + path.sep)) {
    throw new Error("Can't move a folder into itself or one of its own sub-folders.");
  }
  if (await fs.stat(destAbs).catch(() => null)) {
    throw new Error("An item with that name already exists in the destination folder.");
  }
  await fs.mkdir(targetAbs, { recursive: true });
  await fs.rename(abs, destAbs);
  const order = await loadOrder();
  const parent = parentOf(relPath);
  if (order[parent]) {
    order[parent] = order[parent].filter((n) => n !== name);
    await saveOrder(order);
  }
  invalidateLibraryCache();
}

export async function createFolder(parentPath: string, name: string): Promise<void> {
  const root = await requireRoot();
  const trimmed = name.trim();
  if (!trimmed || /[\/\\]/.test(trimmed)) throw new Error("That's not a valid folder name.");
  const parentAbs = parentPath ? await resolveInRoot(root, parentPath) : root;
  const newAbs = path.join(parentAbs, trimmed);
  await resolveInRoot(root, path.relative(root, newAbs));
  if (await fs.stat(newAbs).catch(() => null)) {
    throw new Error("A folder with that name already exists here.");
  }
  await fs.mkdir(newAbs);
  invalidateLibraryCache();
}

/** Swaps a file/folder with its previous or next sibling in display order,
 * persisting the result — this is the "rearrange" affordance for items
 * within the same folder. Moving an item to a *different* folder is a
 * separate action (moveEntry, above). */
export async function reorderSibling(parentPath: string, name: string, direction: "up" | "down"): Promise<void> {
  const root = await requireRoot();
  const parentAbs = parentPath ? await resolveInRoot(root, parentPath) : root;
  const entries = await fs.readdir(parentAbs, { withFileTypes: true });
  const siblingNames = entries
    .filter((e) => !e.name.startsWith("."))
    .filter((e) => e.isDirectory() || isVideoFile(e.name))
    .map((e) => e.name);
  const order = await loadOrder();
  let current =
    order[parentPath] && order[parentPath].length
      ? [...order[parentPath]]
      : [...siblingNames].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const n of siblingNames) if (!current.includes(n)) current.push(n);
  current = current.filter((n) => siblingNames.includes(n));
  const i = current.indexOf(name);
  if (i === -1) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= current.length) return;
  [current[i], current[j]] = [current[j], current[i]];
  order[parentPath] = current;
  await saveOrder(order);
}
