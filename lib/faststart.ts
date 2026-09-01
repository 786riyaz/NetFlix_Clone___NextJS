import { promises as fs } from "fs";
import { spawn } from "child_process";

// Only ISO-BMFF / QuickTime-family containers have this "moov atom"
// concept. MKV/WebM/AVI/etc are structured differently and don't need it.
export const FASTSTART_EXTS = new Set(["mp4", "m4v", "mov"]);

/**
 * Reads only the top-level box headers of an MP4/MOV file (a handful of
 * ~8-16 byte reads, never the full file) to determine whether the `moov`
 * box appears before or after `mdat`. If `moov` is after `mdat`, a video
 * player must download/seek to the end of the file just to know how to
 * start playing at all — this is the #1 cause of "long delay before a
 * video starts, but instant seeking afterward."
 *
 * Returns true (fast-start, nothing to do), false (needs a remux), or
 * null (couldn't determine — malformed file or unusual box layout; we
 * leave those alone rather than guess).
 */
export async function isFastStart(absPath: string): Promise<boolean | null> {
  let fh;
  try {
    fh = await fs.open(absPath, "r");
    const { size } = await fh.stat();
    let offset = 0;
    let sawMdatFirst = false;
    const header = Buffer.alloc(16);
    while (offset < size) {
      const { bytesRead } = await fh.read(header, 0, 16, offset);
      if (bytesRead < 8) break;
      let boxSize = header.readUInt32BE(0);
      const boxType = header.toString("ascii", 4, 8);
      let headerSize = 8;
      if (boxSize === 1) {
        boxSize = Number(header.readBigUInt64BE(8));
        headerSize = 16;
      } else if (boxSize === 0) {
        boxSize = size - offset;
      }
      if (boxType === "moov") return !sawMdatFirst;
      if (boxType === "mdat") sawMdatFirst = true;
      if (boxSize < headerSize) break; // malformed — bail out, don't guess
      offset += boxSize;
    }
    return null;
  } catch {
    return null;
  } finally {
    await fh?.close().catch(() => {});
  }
}

/**
 * Remuxes (not re-encodes — `-c copy` just rewrites the container, so this
 * is fast and lossless) into a fast-start copy. Runs ffmpeg once per file.
 */
export function remuxFastStart(ffmpegBin: string, absPath: string, outPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ["-y", "-i", absPath, "-c", "copy", "-movflags", "+faststart", outPath];
    const p = spawn(ffmpegBin, args);
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}
