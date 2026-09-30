/**
 * Lays each scene's voice onto the recording, at the moment the recorder
 * started that scene, and writes the finished video and its subtitles.
 *
 * Reads <outDir>/<video>/raw.webm, timeline.json and audio/scene-NN.{mp3,json}.
 * Writes <outDir>/<video>/<name>.{mp4,srt}.
 *
 * The recording is made at the configured viewport and scaled to 1920 × 1080
 * here, so the app's text stays legible in full screen without zooming the
 * page itself.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { subtitleCues, toSrt } from "./subtitles.mjs";

export const assemble = (config, video, name = video) => {
  const out = path.join(config.outDir, video);
  const timeline = JSON.parse(readFileSync(path.join(out, "timeline.json"), "utf8"));
  const offset = timeline.start;
  const length = timeline.end - offset;

  const scenes = timeline.scenes.map(({ scene, start }) => {
    const id = `scene-${String(scene).padStart(2, "0")}`;
    return {
      start: start - offset,
      mp3: path.join(out, "audio", `${id}.mp3`),
      words: JSON.parse(readFileSync(path.join(out, "audio", `${id}.json`), "utf8")).words,
    };
  });

  const inputs = ["-i", path.join(out, "raw.webm")];
  scenes.forEach(({ mp3 }) => inputs.push("-i", mp3));
  const delays = scenes.map(({ start }, i) => `[${i + 1}:a]adelay=${Math.round(start * 1000)}:all=1[a${i}]`).join(";");
  const mix = `${scenes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${scenes.length}:normalize=0,apad[a]`;
  const picture = `[0:v]trim=start=${offset.toFixed(3)},setpts=PTS-STARTPTS,fps=30,scale=1920:1080:flags=lanczos[v]`;

  const mp4 = path.join(out, `${name}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-v", "error", "-y",
      ...inputs,
      "-filter_complex", `${picture};${delays};${mix}`,
      "-map", "[v]", "-map", "[a]",
      "-t", length.toFixed(3),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      mp4,
    ],
    { stdio: "inherit" },
  );

  const cues = subtitleCues(scenes);
  writeFileSync(path.join(out, `${name}.srt`), toSrt(cues));
  console.log(`wrote ${path.relative(process.cwd(), mp4)} (${length.toFixed(1)} s) and ${name}.srt (${cues.length} cues)`);
  return mp4;
};
