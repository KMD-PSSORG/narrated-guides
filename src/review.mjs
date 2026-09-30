/**
 * What a human needs to approve a step: the voice as one file to listen to,
 * and a still of the finished video at every cue.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { durationOf } from "./tts.mjs";

const GAP = 0.8;

/** The scenes' audio in order with a short silence between, as <video>/preview.mp3. */
export const preview = (config, video) => {
  const out = path.join(config.outDir, video);
  const audio = path.join(out, "audio");
  const scenes = readdirSync(audio).filter((f) => /^scene-\d+\.mp3$/.test(f)).sort();
  const gap = path.join(out, "gap.mp3");
  const list = path.join(out, "preview.txt");
  const target = path.join(out, "preview.mp3");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-t", String(GAP), "-i", "anullsrc=r=44100:cl=mono",
    "-c:a", "libmp3lame", "-b:a", "128k", gap]);
  writeFileSync(list, scenes.flatMap((f) => [`file '${path.join(audio, f)}'`, `file '${gap}'`]).join("\n"));
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", target]);
  rmSync(gap);
  rmSync(list);
  console.log(`wrote ${path.relative(process.cwd(), target)} (${durationOf(target).toFixed(1)} s)`);
  return target;
};

/**
 * A still `after` seconds past each cue, and one at each scene's start, as
 * <video>/frames/sNN-<verb>-<target>.jpg. The cue's moment is where the
 * recorder started that scene, plus the lead-in, plus the word's time.
 */
export const frames = (config, video, name = video, { after = 1.5, width = 1100 } = {}) => {
  const out = path.join(config.outDir, video);
  const mp4 = path.join(out, `${name}.mp4`);
  const timeline = JSON.parse(readFileSync(path.join(out, "timeline.json"), "utf8"));
  const dir = path.join(out, "frames");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const shots = [];
  for (const { scene, start } of timeline.scenes) {
    const nn = String(scene).padStart(2, "0");
    const { cues } = JSON.parse(readFileSync(path.join(out, "audio", `scene-${nn}.json`), "utf8"));
    const base = start - timeline.start + 1.2;
    shots.push([`s${nn}-start`, base + 0.3]);
    for (const cue of cues) shots.push([`s${nn}-${cue.verb}-${cue.target}`.replace(/[^\p{L}\p{N}.-]+/gu, "_"), base + cue.at + after]);
  }
  for (const [file, at] of shots) {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", at.toFixed(2), "-i", mp4, "-frames:v", "1",
      "-vf", `scale=${width}:-1`, path.join(dir, `${file}.jpg`)]);
  }
  console.log(`wrote ${shots.length} frames to ${path.relative(process.cwd(), dir)}`);
  return dir;
};
