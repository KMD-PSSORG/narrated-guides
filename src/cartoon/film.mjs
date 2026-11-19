/**
 * The film renderer: takes the place the recorder has in the app track.
 *
 * It reads the voiced scenes, computes the film's timeline from their
 * lengths, turns the cues into a score, and renders the picture one frame at
 * a time in a browser: each frame is `render(frame / 30)`, screenshotted.
 * Nothing is played and nothing is waited for, so the film is as long as its
 * voice says and comes out the same every time.
 *
 * That last claim is checked on every run: when the picture is done, a
 * sample of frames is rendered again, out of order, in a fresh browser, and
 * the run fails if any of them differs.
 *
 * Writes <outDir>/<video>/raw.mp4 (lossless) and timeline.json for assemble.
 * Everything that can be wrong with the manuscript is found before a browser
 * opens.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { voiceMix } from "../assemble.mjs";
import { dataUri } from "../config.mjs";
import { readScenes } from "../scenes.mjs";
import { checkCues, scoreOf } from "./score.mjs";
import { serveFilm } from "./serve.mjs";
import { filmEvents, filmTimeline } from "./timeline.mjs";

const FPS = 30;
const SIZE = { width: 1920, height: 1080 };
const PICTURE = "raw.mp4";
const STILL_AFTER = 0.6; // a review still this long after a cue catches a gesture while it is held

/** The film's stills as data URIs, by name. `pictures` maps a name to a file in the project. */
export const loadPictures = (pictures, root) =>
  Object.fromEntries(
    Object.entries(pictures).map(([name, file]) => {
      const at = path.resolve(root, file);
      if (!existsSync(at)) throw new Error(`The picture "${name}" is not at ${at}.`);
      return [name, dataUri(at)];
    }),
  );

/** The one figure of the film, the voice it speaks with, and the mark it starts at. */
export const castOf = (cast) => {
  const entries = Object.entries(cast ?? {});
  if (entries.length !== 1) throw new Error(`A film has one figure for now; the cast names ${entries.length}.`);
  const [[voice, { figure, at }]] = entries;
  return { voice, figure, at };
};

/**
 * A warning when no scene is spoken by the figure's voice: every scene would
 * then be a narrator off screen and the figure would never open its mouth,
 * which is far more often a misspelt cast than a plan. Null when all is well.
 */
export const unheard = (voice, scenes) => {
  const voices = [...new Set(scenes.map((scene) => scene.voice ?? "default"))];
  return voices.includes(voice)
    ? null
    : `No scene is spoken by "${voice}", so the figure never opens its mouth. The manuscript's voices are: ${voices.join(", ")}.`;
};

/** Up to `of` frames spread evenly over the film, the last one first, to be rendered again. */
export const sampleFrames = (count, of = 12) => {
  const n = Math.min(count, of);
  return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : Math.round(((n - 1 - i) * (count - 1)) / (n - 1))));
};

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (file) => path.relative(process.cwd(), file);

/** A browser on the film's page, and a way to take a frame from it. */
const openFilm = async (url) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: SIZE });
  const failures = [];
  page.on("pageerror", (err) => failures.push(err.message));
  await page.goto(url);
  await page.waitForSelector("html[data-ready]", { state: "attached", timeout: 30_000 }).catch(() => {
    throw new Error(`The film's page did not start${failures.length ? `: ${failures.join("; ")}` : "."}`);
  });
  const shot = async (frame) => {
    await page.evaluate((t) => window.render(t), frame / FPS);
    return page.screenshot({ type: "png" });
  };
  return { shot, close: () => browser.close() };
};

/**
 * Renders the film `video` from its voiced scenes.
 * - `set`: the room (see sets/office.mjs);
 * - `cast`: `{ <voice name>: { figure, at } }`, the figure and the mark it
 *   starts at; `default` is the manuscript's default voice;
 * - `pictures`: `{ <name>: <file> }`, the stills `{vis: <name>}` can put on
 *   the room's screen.
 * With `preview` (or `--preview` on the command line) nothing is rendered:
 * the film is served to be watched live, with its voice.
 */
export const film = async (config, video, { set, cast, pictures = {} }, { preview = process.argv.includes("--preview") } = {}) => {
  const out = path.join(config.outDir, video);
  const scenes = readScenes(path.join(out, "audio"));
  const timeline = filmTimeline(scenes);
  const { cues, words } = filmEvents(scenes, timeline);

  const { voice, figure, at } = castOf(cast);
  if (!set.marks[at]) throw new Error(`The figure starts at "${at}", which is not a mark in the set. The marks are: ${Object.keys(set.marks).join(", ")}.`);
  const silent = unheard(voice, scenes);
  if (silent) console.warn(`  ${silent}`);
  const embedded = loadPictures(pictures, config.root);
  const problems = checkCues(cues, { set, pictures: embedded });
  for (const problem of problems) console.error(`  ${problem}`);
  if (problems.length) throw new Error(`${problems.length} problem(s) in the manuscript; nothing was rendered.`);

  const startX = set.marks[at].x;
  const score = scoreOf(cues, { set, startX, shoulderY: set.floor - figure.shoulderHeight * figure.scale });
  for (const late of score.late) console.warn(`  {${late.verb}: ${late.target}} ${late.by.toFixed(2)} s late`);

  const length = timeline.end;
  const data = { fps: FPS, length, set, figure, voice: voice === "default" ? null : voice, startX, score, words, pictures: embedded };
  const voices = timeline.scenes.map(({ scene, start }) => ({ start, mp3: path.join(out, "audio", `scene-${String(scene).padStart(2, "0")}.mp3`) }));

  if (preview) {
    // The voice as one file on the film's clock. voiceMix counts its inputs
    // from 1, after a picture, so a blank one stands in for it.
    const voiceFile = path.join(out, "film-voice.mp3");
    const mix = voiceMix(voices);
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=16x16:r=1", ...mix.inputs,
      "-filter_complex", mix.filter, "-map", "[a]", "-t", length.toFixed(3), "-c:a", "libmp3lame", "-b:a", "128k", voiceFile,
    ]);
    const server = await serveFilm({ data, voice: voiceFile });
    console.log(`watch the film at ${server.url}  (ctrl-c to stop)`);
    await new Promise((resolve) => process.once("SIGINT", resolve));
    await server.close();
    return null;
  }

  const frames = Math.ceil(length * FPS);
  const raw = path.join(out, PICTURE);
  const server = await serveFilm({ data });
  try {
    const first = await openFilm(server.url);
    const ffmpeg = spawn("ffmpeg", [
      "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-qp", "0", "-preset", "ultrafast", "-pix_fmt", "yuv444p", raw,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    const encoded = new Promise((resolve, reject) => {
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg ended with ${code}.`)) : resolve()));
    });
    const hashes = [];
    try {
      for (let frame = 0; frame < frames; frame++) {
        const png = await first.shot(frame);
        hashes.push(digest(png));
        if (!ffmpeg.stdin.write(png)) await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
      }
    } finally {
      ffmpeg.stdin.end();
      await first.close();
    }
    await encoded;

    // The same frames again, out of order, in a browser that has seen nothing.
    const again = await openFilm(server.url);
    const sample = sampleFrames(frames);
    const differing = [];
    try {
      for (const frame of sample) if (digest(await again.shot(frame)) !== hashes[frame]) differing.push(frame);
    } finally {
      await again.close();
    }
    if (differing.length) throw new Error(`Frames ${differing.join(", ")} were not the same when rendered again.`);

    writeFileSync(path.join(out, "timeline.json"), JSON.stringify({ viewport: SIZE, picture: PICTURE, stillAfter: STILL_AFTER, ...timeline }, null, 2));
    console.log(`wrote ${relative(raw)} (${length.toFixed(1)} s, ${frames} frames) and timeline.json`);
    console.log(`${sample.length} frames checked again in a new browser: identical`);
    return raw;
  } finally {
    await server.close();
  }
};
