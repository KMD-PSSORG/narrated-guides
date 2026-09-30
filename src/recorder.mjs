/**
 * The recording engine: a browser with the stage layer, scenes timed by the
 * voice, and cues performed on the words they are anchored to.
 *
 * Each scene's duration and cue times come from <outDir>/<video>/audio/
 * scene-NN.json (voiceManuscript). Actions that wait for the server belong in
 * a scene's `before`, or in an opening click, so a wait becomes a longer pause
 * between scenes and never a gap inside one.
 *
 * Writes <outDir>/<video>/raw.webm and timeline.json for assemble.
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createStage } from "./stage.mjs";
import { cueDue } from "./timing.mjs";

const GAP = 0.45; // seconds of silence after each scene
const LEAD_IN = 1.2; // title card on screen before the first word
const HOLD_END = 2.5; // end card after the last word

export const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

const defaultOpenBrowser = async (viewport, contextOptions) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, acceptDownloads: true, ...contextOptions });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  return { browser, page };
};

const readScenes = (audioDir) =>
  readdirSync(audioDir)
    .filter((f) => /^scene-\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(audioDir, f), "utf8")))
    .map((scene) => ({ ...scene, number: scene.scene }));

/**
 * `setup(tools)` returns the video's own parts:
 * - `point[target]()` — a locator, or a promise of one, for {peg} and {klik}.
 *   Anything with `scrollIntoViewIfNeeded()` and `boundingBox()` will do.
 * - `ring[target]()` — a box `{ x, y, width, height }` for {ring}
 * - `type(target)` — performs {skriv}
 * - `show(target)` — optional; performs {vis} instead of revealing a card element
 * - `before[scene]()` — navigation and waits before the scene's audio
 * - `next` — the end card's text, or `endCard` — a whole end card instead
 *
 * `tools` are `{ page, stage, moveTo, rest, pointAt, cards, sleep, viewport }`;
 * `cards` holds titleCard, endCard, phasesCard and stepBadge in the project's theme.
 */
export const record = async (config, video, setup) => {
  const out = path.join(config.outDir, video);
  const rawDir = path.join(out, "raw");
  const scenes = readScenes(path.join(out, "audio"));
  const viewport = config.viewport;
  const cards = createStage(config);

  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const openBrowser = config.openBrowser ?? defaultOpenBrowser;
  const { browser, page } = await openBrowser(viewport, { recordVideo: { dir: rawDir, size: viewport } });
  const recordingStart = Date.now();
  const since = () => (Date.now() - recordingStart) / 1000;
  const context = page.context();
  await page.addInitScript(cards.stageScript);
  for (const script of config.initScripts) await page.addInitScript(script);

  const stage = (fn, ...args) => page.evaluate(([f, a]) => window.vstage[f](...a), [fn, args]);

  const moveTo = async ({ x, y }, ms = 550) => {
    await stage("move", x, y, ms);
    await page.mouse.move(x, y, { steps: 8 });
    await sleep(ms);
    return { x, y };
  };

  const rest = () => moveTo({ x: viewport.width * 0.45, y: viewport.height * 0.72 }, 700);

  // A ring is drawn in screen coordinates; once the page scrolls under it, it
  // circles the wrong thing.
  const pointAt = async (target) => {
    const locator = await target;
    const scrolled = () => page.evaluate(() => [window.scrollX, window.scrollY].join());
    const was = await scrolled();
    await locator.scrollIntoViewIfNeeded();
    if ((await scrolled()) !== was) await stage("clear");
    const box = await locator.boundingBox();
    if (!box) throw new Error(`No box for ${locator}`);
    return moveTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  };

  const parts = await setup({ page, stage, moveTo, rest, pointAt, cards, sleep, viewport });

  const perform = async ({ verb, target }) => {
    switch (verb) {
      case "vis":
        if (target === "slutkort") {
          await stage("cursorVisible", false);
          await stage("step", null);
          await stage("show", parts.endCard ?? cards.endCard({ next: parts.next }));
        } else if (parts.show) {
          await parts.show(target);
        } else {
          await stage("reveal", target);
        }
        return;
      case "fremhæv":
        return stage("light", target);
      case "peg":
        return pointAt(parts.point[target]());
      case "klik": {
        const { x, y } = await pointAt(parts.point[target]());
        await stage("pulse", x, y);
        await page.mouse.click(x, y);
        return;
      }
      case "trin":
        return stage("step", cards.stepBadge(Number(target)));
      case "skriv":
        return parts.type(target);
      case "ring":
        return stage("ring", await parts.ring[target]());
      default:
        throw new Error(`Unknown cue {${verb}: ${target}}`);
    }
  };

  const timeline = { viewport, scenes: [] };

  for (const scene of scenes) {
    await stage("clear").catch(() => null);
    await parts.before?.[scene.number]?.();
    const opening = scene.cues.filter((c) => c.word === 0 && c.verb === "klik");
    for (const cue of opening) await perform(cue);
    if (opening.length) {
      await page.waitForLoadState("networkidle");
      await sleep(250);
    }

    if (scene.number === scenes[0].number) {
      timeline.start = since();
      await sleep(LEAD_IN * 1000);
    }

    const start = Date.now();
    timeline.scenes.push({ scene: scene.number, start: since(), duration: scene.duration });
    const late = [];
    for (const cue of scene.cues.filter((c) => !opening.includes(c))) {
      const due = cueDue(start, cue, config.leads);
      await sleep(due - Date.now());
      const lag = (Date.now() - due) / 1000;
      if (lag > 0.25) late.push(`{${cue.verb}: ${cue.target}} ${lag.toFixed(2)} s late`);
      await perform(cue);
    }
    await sleep(start + (scene.duration + GAP) * 1000 - Date.now());
    console.log(`scene ${scene.number}: ${scene.title}${late.length ? ` — ${late.join(", ")}` : ""}`);
  }

  await sleep(HOLD_END * 1000);
  timeline.end = since();

  const recording = page.video();
  await context.close();
  await browser.close();
  renameSync(await recording.path(), path.join(out, "raw.webm"));
  rmSync(rawDir, { recursive: true, force: true });
  writeFileSync(path.join(out, "timeline.json"), JSON.stringify(timeline, null, 2));
  console.log(`wrote ${path.relative(process.cwd(), path.join(out, "raw.webm"))} and timeline.json`);
};
