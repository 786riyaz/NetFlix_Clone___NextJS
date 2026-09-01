// ffmpeg-static and ffprobe-static ship prebuilt, platform-specific ffmpeg /
// ffprobe binaries as npm packages, so Vault gets working thumbnails and
// durations out of the box without anyone having to install ffmpeg
// system-wide or fuss with PATH. Neither package publishes TypeScript
// types, so we require them defensively and degrade gracefully if a given
// platform/arch combination isn't supported (e.g. some ARM boards) — in
// that case the app falls back to a global `ffmpeg`/`ffprobe` on PATH,
// exactly like before.
function safeRequire(name: string): any {
try {
// eslint-disable-next-line @typescript-eslint/no-var-requires
return require(name);
} catch {
return null;
}
}
const ffmpegStatic = safeRequire("ffmpeg-static");
const ffprobeStatic = safeRequire("ffprobe-static");
export const BUNDLED_FFMPEG_PATH: string | null =
typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.default ?? null;
export const BUNDLED_FFPROBE_PATH: string | null =
ffprobeStatic?.path ?? ffprobeStatic?.default?.path ?? null;
