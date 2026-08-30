import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function listWindowsDrives(): Promise<string[]> {
const drives: string[] = [];
for (let i = 65; i <= 90; i++) {
const drive = `${String.fromCharCode(i)}:\\`;
try {
await fs.stat(drive);
drives.push(drive);
} catch {
// drive letter not in use — skip
}
}
return drives;
}
async function browseDir(target: string) {
const resolved = path.resolve(target);
let dirEntries;
try {
dirEntries = await fs.readdir(resolved, { withFileTypes: true });
} catch {
return NextResponse.json(
{ error: "Can't read that folder — check the path and permissions." },
{ status: 400 }
);
}
const entries = dirEntries
.filter((e) => e.isDirectory() && !e.name.startsWith("."))
.map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
.sort((a, b) => a.name.localeCompare(b.name));
const parentDir = path.dirname(resolved);
const atFsRoot = parentDir === resolved; // e.g. "/" or "C:\\"
// Going up from a Windows drive root goes back to the drive list ("").
// Going up from POSIX "/" has nowhere further to go (null).
const parent = atFsRoot ? (process.platform === "win32" ? "" : null) : parentDir;
return NextResponse.json({ current: resolved, parent, entries });
}
export async function GET(req: NextRequest) {
const requested = req.nextUrl.searchParams.get("path");
if (!requested) {
if (process.platform === "win32") {
const drives = await listWindowsDrives();
return NextResponse.json({
current: "",
parent: null,
entries: drives.map((d) => ({ name: d, path: d })),
});
}
return browseDir("/");
}
return browseDir(requested);
}