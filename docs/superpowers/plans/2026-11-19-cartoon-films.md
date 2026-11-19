# Cartoon Films Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third track in narrated-guides that renders a cartoon, a drawn figure in a room that walks, gestures, points and talks, from a manuscript, frame by frame and identically every time.

**Architecture:** Pure, browser-safe modules in `src/cartoon/` turn the voiced scenes into a score (what the figure does and when), simulate the springs once, and expose one `render(t)`. A Node renderer serves that page on a local port, screenshots it one frame at a time, checks a sample again in a fresh browser, and hands a lossless picture and a computed `timeline.json` to the existing `assemble`.

**Tech Stack:** Node ≥ 20, plain ESM `.mjs`, SVG, Playwright (Chromium), ffmpeg, `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-cartoon-films-design.md`. The look and motion reference is the throwaway spike on the branch `spike/cartoon` (`af621c0`): read it with `git show spike/cartoon:spike/cartoon/film.html` and `…/render.mjs`. Port its drawings, angles, spring values and layering; keep none of its structure.

## Global Constraints

- Plain ESM `.mjs`, no build step, no TypeScript, Node 20 or later. No new dependencies.
- Everything in `src/cartoon/` except `film.mjs`, `serve.mjs` and `index.mjs` runs in a browser: no `node:` imports, no `Buffer`, **only relative imports** (no bare specifiers; the page has no import map).
- Nothing that makes two renders differ: no `Math.random`, no clock, no CSS transitions or animations, no timers, no `<video>`.
- `npm test` needs no browser, no ffmpeg, no voice and no network. Tests never spend ElevenLabs characters.
- Cue verbs are Danish (`gå`, `se`, `vis`, `kamera`, `peg`, `vink`, `gestus`, `bryn`). Code, comments, docs and commit messages are English. Commit subjects are plain sentences saying what changed for the user.
- Each module opens with a comment saying what it does and why, as every module in `src/` does.
- The ElevenLabs key and voice ids are never printed, logged or committed.
- Pacing is the recorder's: 0.45 s after each scene, 1.2 s lead-in, 2.5 s tail. The film is 1920 × 1080 at 30 frames a second.
- Tests follow the existing files in `test/`: `node:test` `describe`/`it`, `node:assert/strict`, one sentence per `it` that says what holds.

## Process: tests first, then a stop (GS-TDD)

This project writes tests before code and has them approved by a human.

1. **Write every test file in Tasks 1–9 and Task 11 first**, exactly as given, and nothing else. Run `npm test`: the new files fail because their modules do not exist; the 76 existing tests still pass.
2. **Stop.** Show Dennis the test files and wait for the word "godkendt". Do not write implementation before it.
3. Then work the tasks in order. In each, "Step 1: write the failing test" is already done; start at "run it to see it fail".

The tests are written the way the files in `test/` already are (a sentence per `it` saying what holds), not with Given/When/Then headings: the project's own pattern comes first.

Task 10, the rest of Task 11 and Task 12 need a browser and ffmpeg and are verified by running the example.

## Review Focus

Inputs the spec implies but does not spell out. Each has a test in the task that owns the code.

1. **A walk to the mark the figure already stands on.** Expected: nothing happens, and no frame holds a `NaN`. (Task 5)
2. **A second `{gå}` before the first walk has ended.** Expected: it sets off from where the figure is at that moment, with no jump. (Task 7)
3. **A scene with no cues, or a film with no cues at all.** Expected: the figure stands, breathes, blinks and talks. (Tasks 2, 6, 7)
4. **`film` run before `tts`,** or a picture file that is missing. Expected: one line saying what is missing and what to run, before a browser opens. (Tasks 2, 10)
5. **A request to the local server for a path outside the package.** Expected: refused. The server exists to serve this package's modules and one film, nothing else on the machine. (Task 10)

---

## File structure

```text
src/pacing.mjs                 the three pauses, shared by the recorder and the film (pure)
src/scenes.mjs                 reads <out>/<name>/audio/scene-NN.json (Node)
src/say.mjs                    the free macOS voice as a clip (Node), moved out of pptx-file.mjs
src/cartoon/timeline.mjs       when each scene starts; cues and words on the film's clock (pure)
src/cartoon/morph.mjs          a drawing sliding between its front and side versions (pure)
src/cartoon/project.mjs        from the body's own directions to the screen (pure)
src/cartoon/springs.mjs        joints chasing targets, simulated once (pure)
src/cartoon/pose.mjs           gestures, the rest pose, what every joint is asked to be at t (pure)
src/cartoon/walk.mjs           steps, planted feet (pure)
src/cartoon/mouth.mjs          the mouth shape from the letters of the word (pure)
src/cartoon/aim.mjs            which arm points, how high, which way the body turns (pure)
src/cartoon/score.mjs          cues → what happens; checks names against the set (pure)
src/cartoon/camera.mjs         the visible part of the room at t (pure)
src/cartoon/rig.mjs            builds a figure's SVG and draws it in a pose (browser)
src/cartoon/player.mjs         set + figure + score → render(t) (browser)
src/cartoon/page.html          the one page, for rendering and for watching
src/cartoon/figures/dennis.mjs the figure's drawings and sizes (data only)
src/cartoon/sets/office.mjs    the room: drawing, marks, things, screen, shots (data only)
src/cartoon/serve.mjs          the local server (Node)
src/cartoon/film.mjs           the renderer (Node)
src/cartoon/index.mjs          exports film
examples/cartoon/              a short film that runs with `tts --say`
```

Modified: `src/recorder.mjs`, `src/review.mjs`, `src/assemble.mjs`, `src/tts.mjs`, `src/timing.mjs`, `src/pptx-file.mjs`, `src/config.mjs`, `cli.mjs`, `package.json`, `README.md`, `skill/SKILL.md`.

Figures and sets are **plain data** (strings and numbers, no functions): `film` sends them to the page as JSON.

---

### Task 1: Shared pacing, the fault in `frames`, and a picture `assemble` can be told about

**Files:**
- Create: `src/pacing.mjs`, `test/review.test.mjs`, `test/assemble.test.mjs`
- Modify: `src/recorder.mjs:17-19` (import the constants), `src/review.mjs:36-58`, `src/assemble.mjs`

**Interfaces:**
- Produces: `GAP = 0.45`, `LEAD_IN = 1.2`, `HOLD_END = 2.5` from `src/pacing.mjs`.
- Produces: `stillTimes(timeline, cuesByScene, after = 1.5) → [[name, seconds], …]` from `src/review.mjs`; `frames` uses it.
- Produces: `pictureOf(timeline) → string` and `voiceMix(scenes) → { inputs: string[], filter: string }` from `src/assemble.mjs`. `scenes` are `{ start, mp3 }`; the filter ends in the label `[a]`. `assemble` uses both.

- [ ] **Step 1: Write the failing tests**

`test/review.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stillTimes } from "../src/review.mjs";

describe("stillTimes", () => {
  const timeline = { start: 2, scenes: [{ scene: 1, start: 3.2 }] };
  const cues = { 1: [{ verb: "klik", target: "Save all", at: 1 }] };

  it("takes a scene's still just after its voice starts, on the finished video's clock", () => {
    const [name, at] = stillTimes(timeline, cues)[0];
    assert.equal(name, "s01-start");
    assert.ok(Math.abs(at - 1.5) < 1e-9);
  });

  it("takes a cue's still `after` seconds past its word, without adding the lead-in twice", () => {
    const [name, at] = stillTimes(timeline, cues, 1.5)[1];
    assert.equal(name, "s01-klik-Save_all");
    assert.ok(Math.abs(at - 3.7) < 1e-9);
  });

  it("gives a scene without cues only its start", () => {
    assert.equal(stillTimes(timeline, { 1: [] }).length, 1);
  });
});
```

`test/assemble.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pictureOf, voiceMix } from "../src/assemble.mjs";

describe("pictureOf", () => {
  it("is the recording unless the timeline names another picture", () => {
    assert.equal(pictureOf({}), "raw.webm");
    assert.equal(pictureOf({ picture: "raw.mp4" }), "raw.mp4");
  });
});

describe("voiceMix", () => {
  const mix = voiceMix([{ start: 0.5, mp3: "a.mp3" }, { start: 3, mp3: "b.mp3" }]);

  it("takes each scene's audio as an input after the picture", () => {
    assert.deepEqual(mix.inputs, ["-i", "a.mp3", "-i", "b.mp3"]);
  });

  it("delays each to its start and mixes them without changing their level", () => {
    assert.match(mix.filter, /\[1:a\]adelay=500:all=1\[a0\]/);
    assert.match(mix.filter, /\[2:a\]adelay=3000:all=1\[a1\]/);
    assert.match(mix.filter, /amix=inputs=2:normalize=0,apad\[a\]$/);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/review.test.mjs test/assemble.test.mjs`
Expected: FAIL, `stillTimes`, `pictureOf` and `voiceMix` are not exported.

- [ ] **Step 3: Implement**

`src/pacing.mjs` exports the three constants; `recorder.mjs` imports them in place of its own. In `review.mjs`, `stillTimes` holds the loop `frames` has today with `base = start - timeline.start` (the `+ 1.2` is the fault: a scene's `start` is already where its voice begins). In `assemble.mjs`, lift the input list and the `adelay`/`amix` filter out into `voiceMix`, and read `path.join(out, pictureOf(timeline))`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS, the 76 existing tests included.

- [ ] **Step 5: Commit**

```bash
git add src/pacing.mjs src/recorder.mjs src/review.mjs src/assemble.mjs test/review.test.mjs test/assemble.test.mjs
git commit -m "Take review stills at the cue, not 1.2 seconds after it"
```

---

### Task 2: The film's clock, and reading the voiced scenes

**Files:**
- Create: `src/cartoon/timeline.mjs`, `src/scenes.mjs`, `test/cartoon-timeline.test.mjs`, `test/scenes.test.mjs`
- Modify: `src/recorder.mjs:32-37` (use `readScenes` from `src/scenes.mjs`)

**Interfaces:**
- Consumes: `GAP`, `LEAD_IN`, `HOLD_END` (Task 1).
- Produces: `readScenes(audioDir) → scene[]`: the parsed `scene-NN.json` files in order, each with `number` set from `scene`. Throws `No voiced scenes in <dir>. Run "narrated-guides tts <name>" first.` when the folder is missing or holds none.
- Produces: `filmTimeline(scenes) → { start: 0, end, scenes: [{ scene, start, duration }] }`.
- Produces: `filmEvents(scenes, timeline) → { cues, words }`. A cue is `{ verb, target, at, scene, sceneStart, voice }`, a word `{ text, start, end, voice }`; all times on the film's clock; `voice` is the scene's voice name or `null`.

- [ ] **Step 1: Write the failing tests**

`test/cartoon-timeline.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filmEvents, filmTimeline } from "../src/cartoon/timeline.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const scenes = [
  { scene: 1, duration: 2, voice: null, words: [{ text: "Hej", start: 0.1, end: 0.4 }], cues: [{ verb: "vink", target: "hej", word: 0, at: 0.1 }] },
  { scene: 2, duration: 3, voice: "bent", words: [], cues: [] },
];

describe("filmTimeline", () => {
  const timeline = filmTimeline(scenes);

  it("starts the first scene after the lead-in", () => close(timeline.scenes[0].start, 1.2));
  it("starts each scene when the one before has ended and paused", () => close(timeline.scenes[1].start, 3.65));
  it("ends after the last scene's pause and the tail", () => close(timeline.end, 9.6));
  it("starts at zero, so nothing is trimmed in assembly", () => assert.equal(timeline.start, 0));
});

describe("filmEvents", () => {
  const { cues, words } = filmEvents(scenes, filmTimeline(scenes));

  it("puts cues on the film's clock and remembers where their scene began", () => {
    close(cues[0].at, 1.3);
    close(cues[0].sceneStart, 1.2);
    assert.equal(cues[0].verb, "vink");
  });

  it("puts words on the film's clock with the voice that says them", () => {
    close(words[0].start, 1.3);
    close(words[0].end, 1.6);
    assert.equal(words[0].voice, null);
  });

  it("gets on with a scene that has no cues and no words", () => {
    assert.equal(cues.length, 1);
    assert.equal(words.length, 1);
  });
});
```

`test/scenes.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readScenes } from "../src/scenes.mjs";

describe("readScenes", () => {
  it("reads the scenes in order", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ng-"));
    writeFileSync(path.join(dir, "scene-02.json"), JSON.stringify({ scene: 2 }));
    writeFileSync(path.join(dir, "scene-01.json"), JSON.stringify({ scene: 1 }));
    assert.deepEqual(readScenes(dir).map((s) => s.number), [1, 2]);
  });

  it("says to run tts when there is nothing to read", () => {
    assert.throws(() => readScenes(path.join(tmpdir(), "ng-not-there")), /tts/);
    assert.throws(() => readScenes(mkdtempSync(path.join(tmpdir(), "ng-"))), /tts/);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/cartoon-timeline.test.mjs test/scenes.test.mjs`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** the three functions as the Interfaces block gives them. The tail is counted from the end of the last scene's pause, as the recorder does: `end = lastStart + lastDuration + GAP + HOLD_END`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/timeline.mjs src/scenes.mjs src/recorder.mjs test/cartoon-timeline.test.mjs test/scenes.test.mjs
git commit -m "Compute a film's timeline from its scenes' lengths"
```

---

### Task 3: `tts --say`, the free voice, without ever replacing paid audio

**Files:**
- Create: `src/say.mjs`, `test/say.test.mjs`
- Modify: `src/timing.mjs` (add `spreadWords`), `src/tts.mjs` (`voiceManuscript` third argument), `src/pptx-file.mjs:20-35` (use `src/say.mjs`), `cli.mjs` (`tts <manuscript> [--say]`, and the usage text)

**Interfaces:**
- Produces: `spreadWords(spoken: string[], duration) → [{ text, start, end }]` from `src/timing.mjs`: each word gets a share of `duration` by its length plus one.
- Produces: `sayHash(text) → "say:" + 16 hex`, and `guardSay(cached, id)` from `src/tts.mjs`: returns for `null` or a scene whose `timing` is `"say"`, and throws for any other, with a message that names the scene, says ElevenLabs voiced it, and says which two files to delete to try the free voice.
- Produces: `sayClip(dir, id, text) → { audio, words, duration }` from `src/say.mjs` (macOS `say` → mp3 through ffmpeg, words from `spreadWords`).
- Produces: `voiceManuscript(config, manuscript, { say = false } = {})`. With `say`, each scene is written as `scene-NN.mp3` and `scene-NN.json` with `hash: sayHash(text)` and `timing: "say"`, after `guardSay`; no key is read and nothing is sent.

- [ ] **Step 1: Write the failing test**

`test/say.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spreadWords } from "../src/timing.mjs";
import { guardSay, sayHash } from "../src/tts.mjs";

describe("spreadWords", () => {
  const words = spreadWords(["Hej", "verden"], 2.2);

  it("shares the time by each word's length plus one", () => {
    assert.deepEqual(words.map((w) => w.text), ["Hej", "verden"]);
    assert.ok(Math.abs(words[0].end - 0.8) < 1e-9);
  });

  it("covers the whole clip without gaps", () => {
    assert.equal(words[0].start, 0);
    assert.equal(words[1].start, words[0].end);
    assert.ok(Math.abs(words[1].end - 2.2) < 1e-9);
  });

  it("gives no words for no speech", () => assert.deepEqual(spreadWords([], 1), []));
});

describe("sayHash", () => {
  it("can never be mistaken for a voiced scene's hash", () => {
    assert.match(sayHash("Hej"), /^say:[0-9a-f]{16}$/);
    assert.notEqual(sayHash("Hej"), sayHash("Hej!"));
  });
});

describe("guardSay", () => {
  it("lets a new scene and an earlier trial through", () => {
    guardSay(null, "scene-01");
    guardSay({ timing: "say", hash: sayHash("Hej") }, "scene-01");
  });

  it("refuses to replace a scene that ElevenLabs voiced", () => {
    assert.throws(() => guardSay({ timing: "with-timestamps", hash: "0123456789abcdef" }, "scene-01"), /scene-01.*ElevenLabs/s);
    assert.throws(() => guardSay({ timing: "forced-alignment", hash: "0123456789abcdef" }, "scene-01"), /ElevenLabs/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/say.test.mjs`
Expected: FAIL, `spreadWords`, `sayHash` and `guardSay` are not exported.

- [ ] **Step 3: Implement.** Because a trial's hash starts with `say:`, the existing check `cached?.hash === hash` in `voiceManuscript` already sends a trial scene to ElevenLabs on the next ordinary `tts`; no extra code is needed for that direction. `pptx-file.mjs` keeps its behaviour and loses its private copy.

- [ ] **Step 4: Run all tests, then try it for real**

Run: `npm test`. Expected: PASS.
Run: `cd example && node ../cli.mjs tts demo --say`. Expected: one line per scene ending `(say)`, `sent 0 characters to ElevenLabs` is **not** printed, and `video/out/demo/preview.mp3` exists. Then delete `example/video/out/`.

- [ ] **Step 5: Commit**

```bash
git add src/say.mjs src/timing.mjs src/tts.mjs src/pptx-file.mjs cli.mjs test/say.test.mjs
git commit -m "Let tts use the free macOS voice to try a video, and never overwrite paid audio with it"
```

---

### Task 4: Turning: one drawing sliding into another, and the body's directions seen on screen

**Files:**
- Create: `src/cartoon/morph.mjs`, `src/cartoon/project.mjs`, `test/cartoon-turn.test.mjs`

**Interfaces:**
- Produces: `morph(front: string, profile: string) → (k: number) => string`. Both are SVG path data with the same count of numbers; the result has every number at `front + (profile - front) * k`, written with two decimals. Throws `The two drawings differ: …` otherwise.
- Produces: `viewOf(turn) → { c, s, to }`. `turn` runs from -1 (profile, facing left) through 0 (front) to 1 (facing right) and is clamped. `c` and `s` are the cosine and sine of `|turn| × 90°`; `to` is `1` facing left or front, `-1` facing right.
- Produces: `limbSeen(side, out, fwd, view) → { v: [x, y], length, dir: [x, y] }`. `side` is `-1` for the arm on the left of the picture from the front, `1` for the right. `out` and `fwd` are degrees. With `x = side·sin(out)·cos(fwd)`, `y = cos(out)·cos(fwd)`, `z = sin(fwd)`: `v = [x·c − to·z·s, y]`. `dir` is `v` at length one, or `[0, 1]` when `length < 0.05`.
- Produces: `featureSeen(x, depth, view) → { x, towards }`: `x·c − depth·s`, and `max(0, (x·s + depth·c) / depth)`. Drawn facing left; the rig mirrors for the right.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { morph } from "../src/cartoon/morph.mjs";
import { featureSeen, limbSeen, viewOf } from "../src/cartoon/project.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("morph", () => {
  const slide = morph("M0,0 L10,0 Z", "M0,0 L20,10 Z");

  it("is the front drawing at 0 and the side drawing at 1", () => {
    assert.equal(slide(0), "M0.00,0.00 L10.00,0.00 Z");
    assert.equal(slide(1), "M0.00,0.00 L20.00,10.00 Z");
  });

  it("slides every number in between", () => assert.equal(slide(0.5), "M0.00,0.00 L15.00,5.00 Z"));

  it("refuses two drawings with different points", () => {
    assert.throws(() => morph("M0,0 L10,0", "M0,0 L10,0 L5,5"), /differ/);
  });
});

describe("viewOf", () => {
  it("faces the front at 0 and is side on at either end", () => {
    close(viewOf(0).c, 1);
    close(viewOf(-1).s, 1);
    assert.equal(viewOf(-1).to, 1);
    assert.equal(viewOf(1).to, -1);
  });

  it("does not turn past the profile", () => close(viewOf(-1.3).s, 1));
});

describe("limbSeen", () => {
  const open = [105, 35]; // the forearm in the open-arms gesture

  it("hangs straight down from every side", () => {
    for (const turn of [0, -0.5, -1, 1]) {
      const { v } = limbSeen(-1, 0, 0, viewOf(turn));
      close(v[0], 0);
      close(v[1], 1);
    }
  });

  it("spreads the same pose to both sides from the front", () => {
    const l = limbSeen(-1, ...open, viewOf(0)), r = limbSeen(1, ...open, viewOf(0));
    close(l.v[0], -r.v[0]);
    close(l.v[1], r.v[1]);
    assert.ok(l.v[0] < 0);
  });

  it("brings both hands in front of a body seen from the side", () => {
    const left = viewOf(-1);
    const l = limbSeen(-1, ...open, left), r = limbSeen(1, ...open, left);
    close(l.v[0], r.v[0]);
    assert.ok(l.v[0] < 0, "forward is to the left when it faces left");
    assert.ok(limbSeen(1, ...open, viewOf(1)).v[0] > 0, "and to the right when it faces right");
  });

  it("shortens an arm that points at us, and gives it a direction anyway", () => {
    const seen = limbSeen(-1, 0, 90, viewOf(0));
    assert.ok(seen.length < 0.05);
    assert.deepEqual(seen.dir, [0, 1]);
  });
});

describe("featureSeen", () => {
  it("leaves an eye where it is from the front", () => {
    close(featureSeen(30, 58, viewOf(0)).x, 30);
    close(featureSeen(30, 58, viewOf(0)).towards, 1);
  });

  it("hides the far eye in profile and keeps the near one", () => {
    assert.equal(featureSeen(-30, 58, viewOf(-1)).towards, 0);
    assert.ok(featureSeen(30, 58, viewOf(-1)).towards > 0);
    close(featureSeen(30, 58, viewOf(-1)).x, -58);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cartoon-turn.test.mjs`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** both modules from the Interfaces block. In `morph`, the numbers are found with `/-?\d+(?:\.\d+)?/g`.

- [ ] **Step 4: Run it**

Run: `node --test test/cartoon-turn.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/morph.mjs src/cartoon/project.mjs test/cartoon-turn.test.mjs
git commit -m "Turn a drawing between front and side, and see the body's directions on screen"
```

---

### Task 5: Walking with feet that stay where they land

**Files:**
- Create: `src/cartoon/walk.mjs`, `test/cartoon-walk.test.mjs`

**Interfaces:**
- Produces: `SPEED = 190` (pixels a second), `STEP = 85`.
- Produces: `planWalk(from, to, start) → { start, from, to, duration, steps, step }`: `steps = round(|to − from| / STEP)`, at least 1 unless the distance is 0; `step` is the distance divided by `steps`; a walk of no distance has `duration 0`, `steps 0`, `step 0`.
- Produces: `walkAt(walks, t, startX) → { x, progress, weight, dir, step }`. `x` eases from `from` to `to` over the walk and stays at the last walk's `to`. `progress` is steps taken so far (distance covered ÷ `step`). `weight` rises from 0 to 1 over the first seventh of the walk and falls over the last. `dir` is -1, 0 or 1. Outside any walk: `progress 0, weight 0, dir 0`.
- Produces: `feetAt(walk) → { l: [dx, dy], r: [dx, dy] }`, each foot's offset from the body (before the hips' own spread), `dy ≤ 0`. In step `n = floor(progress)` with fraction `f`, one foot swings (`dx = (−0.5 + ease(f))·step·dir`, `dy = −sin(πf)·34`), the other is planted (`dx = (0.5 − f)·step·dir`, `dy = 0`); the left swings on even `n`. Both are multiplied by `weight`.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STEP, feetAt, planWalk, walkAt } from "../src/cartoon/walk.mjs";

const close = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);
const walk = planWalk(1240, 900, 5);

describe("planWalk", () => {
  it("takes a whole number of even steps", () => {
    assert.equal(walk.steps, 4);
    close(walk.step, STEP);
    close(walk.duration, 340 / 190);
  });

  it("has nothing to do when it is already there", () => {
    assert.deepEqual(planWalk(900, 900, 5), { start: 5, from: 900, to: 900, duration: 0, steps: 0, step: 0 });
  });
});

describe("walkAt", () => {
  it("stands at the start before the walk and on the mark after it", () => {
    assert.equal(walkAt([walk], 4, 1240).x, 1240);
    assert.equal(walkAt([walk], 20, 1240).x, 900);
    assert.equal(walkAt([walk], 20, 1240).weight, 0);
  });

  it("faces the way it goes while it walks", () => assert.equal(walkAt([walk], 5.9, 1240).dir, -1));

  it("is never anything but a number, even for a walk of no distance", () => {
    const still = walkAt([planWalk(900, 900, 5)], 5, 900);
    for (const key of ["x", "progress", "weight", "dir", "step"]) assert.ok(Number.isFinite(still[key]), key);
    for (const foot of Object.values(feetAt(still))) assert.ok(foot.every(Number.isFinite));
  });
});

describe("feetAt", () => {
  // Two moments in the same step, in the middle of the walk where the weight is 1.
  const moments = [5.75, 5.8].map((t) => walkAt([walk], t, 1240));

  it("keeps the planted foot where it landed while the body travels", () => {
    assert.equal(Math.floor(moments[0].progress), Math.floor(moments[1].progress));
    assert.equal(moments[0].weight, 1);
    const planted = Math.floor(moments[0].progress) % 2 === 0 ? "r" : "l";
    const [a, b] = moments.map((m) => m.x + feetAt(m)[planted][0]);
    close(a, b, 1e-6);
    assert.notEqual(moments[0].x, moments[1].x);
  });

  it("lifts one foot at a time", () => {
    for (let t = 5; t < 7; t += 0.03) {
      const feet = feetAt(walkAt([walk], t, 1240));
      assert.ok(feet.l[1] === 0 || feet.r[1] === 0);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cartoon-walk.test.mjs`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** from the Interfaces block. `ease(x) = x²(3 − 2x)` clamped to 0…1. Because `progress` is distance covered ÷ `step`, a planted foot's place in the room is `from + dir·step·(n + 0.5)` whatever the easing; that is what the first `feetAt` test pins.

- [ ] **Step 4: Run it**

Run: `node --test test/cartoon-walk.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/walk.mjs test/cartoon-walk.test.mjs
git commit -m "Walk in whole steps with feet that stay where they land"
```

---

### Task 6: The mouth, and the springs

**Files:**
- Create: `src/cartoon/mouth.mjs`, `src/cartoon/springs.mjs`, `test/cartoon-mouth.test.mjs`, `test/cartoon-springs.test.mjs`

**Interfaces:**
- Produces: `shapeAt(words, t) → "X" | "M" | "C" | "E" | "A" | "O" | "F"`. `X` when no word covers `t`. Otherwise the word's letters (`\p{L}` only, lower-cased) share its time, vowels (`aeiouyæøå`) weighing 2 and consonants 1; `a æ → A`, `e i → E`, `o å u ø y → O`, `m b p → M`, `f v → F`, anything else `C`.
- Produces: `mouthTrack(words, length, fps) → string[]`, one shape a frame, held for two frames: frames `2k` and `2k+1` both hold the shape at `(2k + 1) / fps`.
- Produces: `simulate(targetAt, springs, length, rate = 240, keep = 2) → { perSecond, tracks }`. `targetAt(t)` returns an object; `springs` is `{ key: [speed, damping] }`. Each key starts at `targetAt(0)[key]` at rest and is stepped `rate` times a second: `v += (speed²·(target − x) − 2·damping·speed·v)·dt; x += v·dt`. Every `keep`-th value is kept in a `Float32Array`; `perSecond = rate / keep`.
- Produces: `sample(sim, key, t) → number`, linear between kept values, clamped to the track's ends.

- [ ] **Step 1: Write the failing tests**

`test/cartoon-mouth.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mouthTrack, shapeAt } from "../src/cartoon/mouth.mjs";

const words = [{ text: "Mama,", start: 0, end: 1.2 }, { text: "FY", start: 2, end: 2.3 }, { text: "Åh", start: 3, end: 3.3 }];

describe("shapeAt", () => {
  it("takes the shape of the letter being said, vowels lasting twice as long", () => {
    assert.equal(shapeAt(words, 0.05), "M");
    assert.equal(shapeAt(words, 0.4), "A");
    assert.equal(shapeAt(words, 0.7), "M");
    assert.equal(shapeAt(words, 1.1), "A");
  });

  it("ignores case and punctuation, and knows the Danish vowels", () => {
    assert.equal(shapeAt(words, 2.01), "F");
    assert.equal(shapeAt(words, 2.25), "O");
    assert.equal(shapeAt(words, 3.05), "O");
  });

  it("is shut between words and when nothing is said", () => {
    assert.equal(shapeAt(words, 1.5), "X");
    assert.equal(shapeAt([], 1), "X");
    assert.equal(shapeAt([{ text: "…", start: 0, end: 1 }], 0.5), "X");
  });
});

describe("mouthTrack", () => {
  const track = mouthTrack(words, 4, 30);

  it("has a shape for every frame", () => assert.equal(track.length, 120));
  it("holds each shape for two frames", () => {
    for (let f = 0; f < track.length; f += 2) assert.equal(track[f], track[f + 1]);
  });
  it("is shut all the way through a film without words", () => {
    assert.ok(mouthTrack([], 1, 30).every((shape) => shape === "X"));
  });
});
```

`test/cartoon-springs.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sample, simulate } from "../src/cartoon/springs.mjs";

const step = (t) => ({ arm: t < 1 ? 0 : 10 });

describe("simulate", () => {
  const loose = simulate(step, { arm: [21, 0.5] }, 5);

  it("starts where the target starts, at rest", () => assert.equal(sample(loose, "arm", 0.5), 0));

  it("settles on its target", () => assert.ok(Math.abs(sample(loose, "arm", 4.5) - 10) < 0.01));

  it("overshoots when it is loosely damped, and does not when it is not", () => {
    assert.ok(Math.max(...loose.tracks.arm) > 10.2);
    assert.ok(Math.max(...simulate(step, { arm: [21, 1] }, 5).tracks.arm) <= 10.001);
  });

  it("gives the same track every time", () => {
    assert.deepEqual(simulate(step, { arm: [21, 0.5] }, 5).tracks.arm, loose.tracks.arm);
  });

  it("can be asked about any moment, before the start and after the end too", () => {
    assert.equal(sample(loose, "arm", -1), 0);
    assert.ok(Number.isFinite(sample(loose, "arm", 99)));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/cartoon-mouth.test.mjs test/cartoon-springs.test.mjs`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** both from the Interfaces block.

- [ ] **Step 4: Run them**

Run: `node --test test/cartoon-mouth.test.mjs test/cartoon-springs.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/mouth.mjs src/cartoon/springs.mjs test/cartoon-mouth.test.mjs test/cartoon-springs.test.mjs
git commit -m "Shape the mouth from the letters, and let joints chase their targets"
```

---

### Task 7: From cues to a score

**Files:**
- Create: `src/cartoon/aim.mjs`, `src/cartoon/score.mjs`, `test/cartoon-score.test.mjs`

**Interfaces:**
- Consumes: `planWalk`, `walkAt` (Task 5); cues from `filmEvents` (Task 2).
- A **set** (data, Task 9 draws one) has `floor`, `marks: { name: { x } }`, `things: { name: { x, y } }`, `shots: { name: { x, y, width, height } }`, `screen: { x, y, width, height }`.
- Produces: `aimAt(figureX, shoulderY, thing) → { arm, body, turn, out }`. A thing to the left (`thing.x < figureX`): `arm "l"`, `body −0.5`, `turn −1`; to the right: `"r"`, `0.5`, `1`. `out` is the angle in degrees from straight down to the line from the shoulder to the thing: `atan2(|thing.x − figureX|, thing.y − shoulderY)`.
- Produces: `GESTURE_NAMES = ["åben"]`.
- Produces: `checkCues(cues, { set, pictures }) → string[]`, one line per cue that cannot be performed, each naming the cue and listing what exists. `gå` needs a mark; `peg` a thing; `se` a thing or `kamera`; `vis` a picture or `intet`; `kamera` a shot; `gestus` a name in `GESTURE_NAMES`; `bryn` the target `op`; `vink` takes anything; any other verb is unknown.
- Produces: `scoreOf(cues, { set, startX, shoulderY }) → { startX, walks, moments, gaze, pictures, shots, late }`:
  - `walks`: `planWalk` results; a walk's `from` is where the figure **is** at the cue (`walkAt` over the walks before it), so a walk can interrupt a walk.
  - `moments`: `{ verb, target, at, start, aim? }` for `peg`, `vink`, `gestus`, `bryn`. `start = at − LEAD[verb]`, but never before `sceneStart`. `LEAD = { peg: 0.3, vink: 0.26, gestus: 0.28, bryn: 0.2 }` (the gesture's rise plus a tenth of a second for the springs). `aim` is `aimAt` for a `peg`, from where the figure is at the cue.
  - `gaze`: `{ at, turn }`: 0 for `kamera`, `−0.8` for a thing to the figure's left, `0.8` to its right.
  - `pictures`: `{ at, name }`, `name: null` for `intet`. `shots`: `{ at, name }`.
  - `late`: `{ verb, target, by }` for each moment whose start was held back, `by` in seconds.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aimAt } from "../src/cartoon/aim.mjs";
import { checkCues, scoreOf } from "../src/cartoon/score.mjs";

const set = {
  floor: 905,
  marks: { midt: { x: 1240 }, tavle: { x: 900 } },
  things: { tavle: { x: 425, y: 400 }, vindue: { x: 1575, y: 300 } },
  shots: { total: { x: 0, y: 0, width: 1920, height: 1080 } },
  screen: { x: 150, y: 230, width: 550, height: 340 },
};
const cue = (verb, target, at, sceneStart = 0) => ({ verb, target, at, sceneStart, scene: 1, voice: null });
const score = (cues) => scoreOf(cues, { set, startX: 1240, shoulderY: 460 });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("aimAt", () => {
  it("points with the arm on the thing's side and turns half way to it", () => {
    const left = aimAt(1240, 400, { x: 425, y: 400 });
    assert.deepEqual([left.arm, left.body, left.turn], ["l", -0.5, -1]);
    close(left.out, 90);
    const right = aimAt(1240, 400, { x: 1575, y: 400 });
    assert.deepEqual([right.arm, right.body, right.turn], ["r", 0.5, 1]);
  });

  it("lifts the arm to the thing's height", () => {
    close(aimAt(1000, 500, { x: 900, y: 400 }).out, 135);
    close(aimAt(1000, 500, { x: 900, y: 600 }).out, 45);
  });
});

describe("checkCues", () => {
  const check = (cues) => checkCues(cues, { set, pictures: { forside: "data:…" } });

  it("passes what the set and the film can perform", () => {
    assert.deepEqual(check([
      cue("gå", "tavle", 1), cue("peg", "vindue", 2), cue("se", "kamera", 3), cue("vis", "forside", 4), cue("vis", "intet", 5),
      cue("kamera", "total", 6), cue("vink", "hej", 7), cue("gestus", "åben", 8), cue("bryn", "op", 9),
    ]), []);
  });

  it("names the cue and lists what there is, for each kind of name", () => {
    assert.match(check([cue("gå", "døren", 1)])[0], /\{gå: døren\}.*midt.*tavle/s);
    assert.match(check([cue("peg", "døren", 1)])[0], /tavle.*vindue/s);
    assert.match(check([cue("vis", "bagside", 1)])[0], /forside/);
    assert.match(check([cue("kamera", "tæt", 1)])[0], /total/);
    assert.match(check([cue("gestus", "bue", 1)])[0], /åben/);
  });

  it("does not know a verb from another track", () => {
    assert.match(check([cue("klik", "Save", 1)])[0], /\{klik: Save\}/);
  });

  it("finds every problem, not only the first", () => {
    assert.equal(check([cue("gå", "x", 1), cue("peg", "y", 2)]).length, 2);
  });
});

describe("scoreOf", () => {
  it("is a figure standing still when there are no cues", () => {
    assert.deepEqual(score([]), { startX: 1240, walks: [], moments: [], gaze: [], pictures: [], shots: [], late: [] });
  });

  it("starts a walk on its word, from where the figure stands", () => {
    const { walks } = score([cue("gå", "tavle", 3)]);
    assert.equal(walks[0].start, 3);
    assert.equal(walks[0].from, 1240);
    assert.equal(walks[0].to, 900);
  });

  it("remembers where the figure went, across scenes", () => {
    const { walks } = score([cue("gå", "tavle", 3), cue("gå", "midt", 20, 18)]);
    assert.equal(walks[1].from, 900);
  });

  it("sets off from where it is when a walk interrupts a walk", () => {
    const { walks } = score([cue("gå", "tavle", 3), cue("gå", "midt", 3.9)]);
    assert.ok(walks[1].from < 1240 && walks[1].from > 900);
  });

  it("starts a gesture early enough to arrive on its word", () => {
    const [moment] = score([cue("gestus", "åben", 5)]).moments;
    close(moment.start, 4.72);
    assert.equal(moment.at, 5);
  });

  it("holds a gesture back to its scene's start, and says by how much", () => {
    const { moments, late } = score([cue("vink", "hej", 10.1, 10)]);
    assert.equal(moments[0].start, 10);
    assert.equal(late.length, 1);
    close(late[0].by, 0.16);
  });

  it("aims a pointing from where the figure is by then", () => {
    const { moments } = score([cue("gå", "tavle", 1), cue("peg", "vindue", 10)]);
    assert.equal(moments[0].aim.arm, "r");
    close(moments[0].aim.out, aimAt(900, 460, set.things.vindue).out);
  });

  it("keeps a gaze, a picture and a shot as states with the moment they change", () => {
    const { gaze, pictures, shots } = score([cue("se", "tavle", 1), cue("se", "kamera", 2), cue("vis", "forside", 3), cue("vis", "intet", 4), cue("kamera", "total", 5)]);
    assert.deepEqual(gaze, [{ at: 1, turn: -0.8 }, { at: 2, turn: 0 }]);
    assert.deepEqual(pictures, [{ at: 3, name: "forside" }, { at: 4, name: null }]);
    assert.deepEqual(shots, [{ at: 5, name: "total" }]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cartoon-score.test.mjs`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** `aim.mjs` and `score.mjs` from the Interfaces block. `scoreOf` assumes `checkCues` passed and does not check names again.

- [ ] **Step 4: Run it**

Run: `node --test test/cartoon-score.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/aim.mjs src/cartoon/score.mjs test/cartoon-score.test.mjs
git commit -m "Turn a film's cues into what the figure does and when"
```

---

### Task 8: What every joint is asked to be, and where the camera is

**Files:**
- Create: `src/cartoon/pose.mjs`, `src/cartoon/camera.mjs`, `test/cartoon-pose.test.mjs`, `test/cartoon-camera.test.mjs`

**Interfaces:**
- Consumes: a score (Task 7), `walkAt` (Task 5), words from `filmEvents` (Task 2).
- Produces: `envelope(t, { start, rise, hold, fall }) → number`: 0 before `start − 0.13`; a dip to −0.16 and back over those 0.13 s (`−0.16·sin(π·u)`); then 0 → 1 over `rise` (eased), 1 for `hold`, back to 0 over `fall` (eased).
- Produces: the pose keys `lUpOut lUpFwd lForeOut lForeFwd rUpOut rUpFwd rForeOut rForeFwd brow turn body nod sway`, and `REST`: arms `[7, 0, 13, 10]` each (up-out, up-forward, fore-out, fore-forward), the rest 0.
- Produces: `MOMENTS`, the timing and pose of each momentary verb, as the spike has them:

  | verb | arms (upOut, upFwd, foreOut, foreFwd) | other | rise, hold, fall | hands |
  |---|---|---|---|---|
  | `vink` | right `[72, 10, 165, 10]`, the forearm's `out` waggling ±22° at 15 rad/s | | 0.16, 1.05, 0.3 | right open |
  | `gestus: åben` | both `[30, 15, 105, 35]` | | 0.18, 1.2, 0.35 | both open |
  | `peg` | the aiming arm `[out, 45, out + 3, 45]` | `turn` and `body` from the aim | 0.2, 2.3, 0.35 | that hand points |
  | `bryn` | | `brow 1` | 0.1, 1.1, 0.25 | |

- Produces: `SPRINGS`: upper-arm keys `[21, 0.62]`, forearm keys `[18, 0.58]`, `brow [30, 0.45]`, `turn [12, 0.75]`, `body [9, 0.85]`, `nod [20, 0.45]`, `sway [9, 0.35]`.
- Produces: `targetAt(score, words, t) → pose`. Starts from `REST`; adds each moment by its envelope; then the walk: both `turn` and `body` go to the walk's `dir` by its `weight`, the upper arms swing forward and back against each other (±24°·sin(π·progress)·weight) and the forearms follow with 22° more bend, **each arm's share of the swing scaled by one minus the weight of any moment that poses that arm**; `turn` otherwise rests on the last gaze at or before `t`; `nod` is 6 for the first 0.12 s of a word of six letters or more; `sway` is the walk's `x`.
- Produces: `handsAt(score, t) → { l, r }`, each `"rest" | "open" | "point"`: a moment's hand pose while its envelope is above 0.4.
- Produces: `MOVE = 0.6`; `cameraAt(shots, set, t) → { x, y, width, height }`: the set's `total` shot until the first cue; from a cue, eased over `MOVE` seconds from where the camera was at that cue to the named shot.

- [ ] **Step 1: Write the failing tests**

`test/cartoon-pose.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REST, SPRINGS, envelope, handsAt, targetAt } from "../src/cartoon/pose.mjs";
import { planWalk } from "../src/cartoon/walk.mjs";

const empty = { startX: 1240, walks: [], moments: [], gaze: [], pictures: [], shots: [], late: [] };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("envelope", () => {
  const shape = { start: 1, rise: 0.2, hold: 1, fall: 0.3 };

  it("winds up the other way before it starts", () => {
    assert.equal(envelope(0.8, shape), 0);
    assert.ok(envelope(0.935, shape) < -0.1);
  });

  it("rises, holds and falls back to nothing", () => {
    assert.ok(envelope(1.1, shape) > 0 && envelope(1.1, shape) < 1);
    assert.equal(envelope(1.7, shape), 1);
    assert.equal(envelope(3, shape), 0);
  });
});

describe("targetAt", () => {
  it("is the rest pose where it stands, when nothing is asked", () => {
    assert.deepEqual(targetAt(empty, [], 2), { ...REST, sway: 1240 });
  });

  it("has a spring for every joint it poses", () => {
    assert.deepEqual(Object.keys(SPRINGS).sort(), Object.keys(REST).filter((k) => k !== "point").sort());
  });

  it("opens both arms alike", () => {
    const pose = targetAt({ ...empty, moments: [{ verb: "gestus", target: "åben", at: 5, start: 4.72 }] }, [], 5.5);
    assert.deepEqual([pose.lUpOut, pose.lUpFwd, pose.lForeOut, pose.lForeFwd], [30, 15, 105, 35]);
    assert.deepEqual([pose.rUpOut, pose.rForeOut], [30, 105]);
  });

  it("points with the aiming arm only, and turns head and body its way", () => {
    const aim = { arm: "l", body: -0.5, turn: -1, out: 100 };
    const pose = targetAt({ ...empty, moments: [{ verb: "peg", target: "tavle", at: 5, start: 4.7, aim }] }, [], 6);
    assert.deepEqual([pose.lUpOut, pose.lUpFwd, pose.lForeOut, pose.lForeFwd], [100, 45, 103, 45]);
    assert.equal(pose.rUpOut, REST.rUpOut);
    assert.equal(pose.turn, -1);
    assert.equal(pose.body, -0.5);
  });

  it("faces the way it walks and swings its arms against each other", () => {
    const pose = targetAt({ ...empty, walks: [planWalk(1240, 900, 5)] }, [], 5.6);
    assert.equal(pose.turn, -1);
    assert.equal(pose.body, -1);
    close(pose.lUpFwd - REST.lUpFwd, -(pose.rUpFwd - REST.rUpFwd));
    assert.notEqual(pose.sway, 1240);
  });

  it("lets a gesture take the arms from the walk's swing", () => {
    const walking = { ...empty, walks: [planWalk(1240, 900, 5)], moments: [{ verb: "gestus", target: "åben", at: 5.6, start: 5.3 }] };
    const pose = targetAt(walking, [], 5.9);
    assert.equal(pose.lUpFwd, 15);
    assert.equal(pose.rUpFwd, 15);
  });

  it("keeps looking where it was last told to", () => {
    const looking = { ...empty, gaze: [{ at: 1, turn: -0.8 }, { at: 9, turn: 0 }] };
    assert.equal(targetAt(looking, [], 5).turn, -0.8);
    assert.equal(targetAt(looking, [], 10).turn, 0);
  });

  it("nods at the start of a long word", () => {
    const words = [{ text: "manuskript", start: 2, end: 2.8, voice: null }, { text: "og", start: 3, end: 3.2, voice: null }];
    assert.equal(targetAt(empty, words, 2.05).nod, 6);
    assert.equal(targetAt(empty, words, 2.5).nod, 0);
    assert.equal(targetAt(empty, words, 3.05).nod, 0);
  });
});

describe("handsAt", () => {
  const waving = { ...empty, moments: [{ verb: "vink", target: "hej", at: 2, start: 1.74 }] };

  it("opens the hand that waves, and leaves the other", () => {
    assert.deepEqual(handsAt(waving, 2.5), { l: "rest", r: "open" });
  });

  it("rests both when nothing is going on", () => assert.deepEqual(handsAt(waving, 9), { l: "rest", r: "rest" }));

  it("points with the aiming hand", () => {
    const pointing = { ...empty, moments: [{ verb: "peg", target: "x", at: 2, start: 1.7, aim: { arm: "r", body: 0.5, turn: 1, out: 90 } }] };
    assert.deepEqual(handsAt(pointing, 3), { l: "rest", r: "point" });
  });
});
```

`test/cartoon-camera.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVE, cameraAt } from "../src/cartoon/camera.mjs";

const total = { x: 0, y: 0, width: 1920, height: 1080 };
const tavle = { x: 105, y: 220, width: 640, height: 360 };
const set = { shots: { total, tavle } };

describe("cameraAt", () => {
  it("shows the whole room until it is told otherwise", () => {
    assert.deepEqual(cameraAt([], set, 3), total);
    assert.deepEqual(cameraAt([{ at: 5, name: "tavle" }], set, 4.9), total);
  });

  it("is on its way a moment after the cue, and there once the move is over", () => {
    const shots = [{ at: 5, name: "tavle" }];
    const moving = cameraAt(shots, set, 5 + MOVE / 2);
    assert.ok(moving.width < 1920 && moving.width > 640);
    assert.deepEqual(cameraAt(shots, set, 5 + MOVE), tavle);
    assert.deepEqual(cameraAt(shots, set, 60), tavle);
  });

  it("sets off from wherever it had got to when it is told again mid-move", () => {
    const shots = [{ at: 5, name: "tavle" }, { at: 5.3, name: "total" }];
    const turned = cameraAt(shots, set, 5.3);
    assert.ok(turned.width < 1920 && turned.width > 640);
    assert.deepEqual(cameraAt(shots, set, 5.3 + MOVE), total);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/cartoon-pose.test.mjs test/cartoon-camera.test.mjs`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** both from the Interfaces block. The moment's `rise` is not the score's lead; the score starts a moment early, the envelope then rises from that `start`.

- [ ] **Step 4: Run all tests**

Run: `npm test`. Expected: PASS, every test file from Tasks 1–8 included.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/pose.mjs src/cartoon/camera.mjs test/cartoon-pose.test.mjs test/cartoon-camera.test.mjs
git commit -m "Pose the figure against its own body, and move the camera between shots"
```

---

### Task 9: The local server

**Files:**
- Create: `src/cartoon/serve.mjs`, `test/cartoon-serve.test.mjs`

**Interfaces:**
- Produces: `serveFilm({ data, voice = null }) → Promise<{ url, close }>`. Listens on `127.0.0.1` on a free port. Serves `GET /` (`page.html`), `GET /film.json` (`data` as JSON), `GET /voice.mp3` (the file at `voice`, 404 when `null`), and `GET /src/<path>` for files under this package's `src/` ending in `.mjs` (as `text/javascript`). Everything else, any other method, and any path that resolves outside `src/` is 404. `close()` stops it.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { serveFilm } from "../src/cartoon/serve.mjs";

describe("serveFilm", () => {
  let server;
  before(async () => { server = await serveFilm({ data: { fps: 30 } }); });
  after(() => server.close());
  const get = (path, init) => fetch(server.url + path, init);

  it("listens on this machine only", () => assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/));

  it("serves the film's data and the package's modules", async () => {
    assert.deepEqual(await (await get("/film.json")).json(), { fps: 30 });
    const module = await get("/src/cartoon/morph.mjs");
    assert.equal(module.status, 200);
    assert.match(module.headers.get("content-type"), /javascript/);
  });

  it("serves nothing outside the package's modules", async () => {
    for (const path of ["/src/../package.json", "/src/%2e%2e/package.json", "/src/cartoon/../../package.json", "/package.json", "/src/cartoon/page.html", "/voice.mp3"]) {
      assert.equal((await get(path)).status, 404, path);
    }
  });

  it("only answers reads", async () => {
    assert.equal((await get("/film.json", { method: "POST" })).status, 404);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cartoon-serve.test.mjs`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** with `node:http`. Decode the path, resolve it against `src/`, and serve only if the result starts with `src/` plus a separator and ends in `.mjs`: an allow-list, not a filter for `..`.

- [ ] **Step 4: Run it**

Run: `node --test test/cartoon-serve.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cartoon/serve.mjs test/cartoon-serve.test.mjs
git commit -m "Serve one film and this package's modules to a local browser, and nothing else"
```

---

### Task 10: The figure, the room and the page

No unit tests: this is drawing in a browser. It is checked by eye in Task 11, against the spike.

**Files:**
- Create: `src/cartoon/figures/dennis.mjs`, `src/cartoon/sets/office.mjs`, `src/cartoon/rig.mjs`, `src/cartoon/player.mjs`, `src/cartoon/page.html`

**Interfaces:**
- Consumes: everything from Tasks 4–8.
- Produces (data): `dennis` with at least `{ name, scale: 0.88, shoulderHeight: 506, … }` and the drawings the rig needs; `office` with `{ name, width: 1920, height: 1080, floor: 905, marks: { midt: { x: 1240 }, skærm: { x: 900 } }, things: { skærm: { x: 425, y: 400 }, vindue: { x: 1575, y: 355 } }, screen: { x: 150, y: 230, width: 550, height: 340 }, shots: { total: { x: 0, y: 0, width: 1920, height: 1080 }, skærm: { x: 105, y: 220, width: 640, height: 360 } }, svg }`. Both are JSON-serialisable.
- Produces: `buildFigure(parent, figure) → { draw({ x, floor, pose, walk, hands, mouth, t }) }` from `rig.mjs`, where `pose` holds the sprung values of the pose keys.
- Produces: `createFilm(svg, data) → { length, render(t) }` from `player.mjs`. `data` is `{ fps, length, set, figure, startX, score, words, pictures }`, `pictures` being `{ name: dataURI }`.
- Produces: `page.html`: fetches `/film.json`, calls `createFilm`, sets `window.film` and `window.render = film.render`, and sets `document.documentElement.dataset.ready = "1"` when it can be rendered. When `navigator.webdriver` is false it shows a play button and drives `render` from `/voice.mp3`'s clock.

- [ ] **Step 1: Port the drawings.** Move the spike's figure into `dennis.mjs` as data: the front and side path pairs for face, beard, hair, nose and torso; the seven mouth shapes; the three hand poses; colours; limb lengths and widths. Move its room into `office.mjs`, with the screen empty.

- [ ] **Step 2: Build the rig** in `rig.mjs` from the spike's drawing code, on `morph`, `viewOf`, `limbSeen`, `featureSeen` and `feetAt`. Keep the six rules in the spec's section "The figure". Blinks are at fixed times, as in the spike, repeating every 16 seconds.

- [ ] **Step 3: Build the player** in `player.mjs`: `simulate(targetAt…)` once in `createFilm`; `render(t)` samples the springs, draws the figure, sets the root `viewBox` from `cameraAt`, shows the picture that is current at `t` in the set's screen, and ends by taking the SVG out of the layout and putting it back when `navigator.webdriver` is true (the spike's full repaint, with its comment).

- [ ] **Step 4: Write `page.html`** as the Interfaces block gives it. No inline event handlers and no styles that animate.

- [ ] **Step 5: Check that the browser-safe rule holds**

Run: `grep -nE "from \"(node:|[a-z@])" src/cartoon/*.mjs src/cartoon/figures/*.mjs src/cartoon/sets/*.mjs | grep -v "serve.mjs\|film.mjs\|index.mjs"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/cartoon/figures src/cartoon/sets src/cartoon/rig.mjs src/cartoon/player.mjs src/cartoon/page.html
git commit -m "Draw Dennis and his office, and play a film from its score"
```

---

### Task 11: The renderer, and an example to run it on

**Files:**
- Create: `src/cartoon/film.mjs`, `src/cartoon/index.mjs`, `test/cartoon-film.test.mjs`, `examples/cartoon/guides.config.mjs`, `examples/cartoon/video/manuscripts/demo.md`, `examples/cartoon/video/film-demo.mjs`, `examples/cartoon/video/pictures/forside.svg`, `examples/cartoon/README.md`
- Modify: `src/config.mjs` (export `dataUri`), `package.json` (`exports`)

**Interfaces:**
- Consumes: `readScenes`, `filmTimeline`, `filmEvents`, `checkCues`, `scoreOf`, `serveFilm`, `voiceMix`, `dataUri`.
- Produces: `loadPictures(pictures, root) → { name: dataURI }`: throws `The picture "<name>" is not at <path>.` for a missing file, and `dataUri`'s own message for a type that is not svg, png or jpg. That message says "The logo …" today; reword it to fit a picture too, keeping the words "is not an svg, png or jpg", which `test/config.test.mjs` may match.
- Produces: `castOf(cast) → { voice, figure, at }`: the one entry; throws `A film has one figure for now; the cast names <n>.` for any other count.
- Produces: `sampleFrames(count, of = 12) → number[]`: up to `of` frame numbers spread evenly from the first frame to the last, in descending order.
- Produces: `film(config, name, { set, cast, pictures = {} }, { preview = process.argv.includes("--preview") } = {})`.
- `package.json` exports: `"./cartoon": "./src/cartoon/index.mjs"`, `"./cartoon/figures/*": "./src/cartoon/figures/*"`, `"./cartoon/sets/*": "./src/cartoon/sets/*"`.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { castOf, loadPictures, sampleFrames } from "../src/cartoon/film.mjs";

describe("loadPictures", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ng-"));
  writeFileSync(path.join(root, "a.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  writeFileSync(path.join(root, "a.gif"), "GIF89a");

  it("embeds a picture from the project", () => {
    assert.match(loadPictures({ forside: "a.svg" }, root).forside, /^data:image\/svg\+xml;base64,/);
  });

  it("names the picture that is not there", () => {
    assert.throws(() => loadPictures({ forside: "b.svg" }, root), /"forside".*b\.svg/s);
  });

  it("refuses a kind of picture it cannot show", () => {
    assert.throws(() => loadPictures({ forside: "a.gif" }, root), /svg, png or jpg/);
  });
});

describe("castOf", () => {
  const figure = { name: "dennis" };

  it("is the one figure and where it starts", () => {
    assert.deepEqual(castOf({ default: { figure, at: "midt" } }), { voice: "default", figure, at: "midt" });
  });

  it("says a film has one figure for now", () => {
    assert.throws(() => castOf({ default: { figure, at: "midt" }, bent: { figure, at: "midt" } }), /one figure.*2/s);
    assert.throws(() => castOf({}), /one figure.*0/s);
  });
});

describe("sampleFrames", () => {
  it("spreads its sample over the whole film, last frame first", () => {
    const frames = sampleFrames(444);
    assert.equal(frames.length, 12);
    assert.equal(frames[0], 443);
    assert.equal(frames.at(-1), 0);
  });

  it("takes every frame of a film shorter than its sample", () => assert.deepEqual(sampleFrames(3), [2, 1, 0]));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cartoon-film.test.mjs`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `film`**, in this order, so that everything that can be wrong is found before a browser opens:

  1. `readScenes`, `filmTimeline`, `filmEvents`.
  2. `castOf`; the set must have the mark the figure starts at.
  3. `loadPictures`; `checkCues`; if there are problems, print them and throw `<n> problem(s) in the manuscript; nothing was rendered.`
  4. `scoreOf`, with `shoulderY = set.floor − figure.shoulderHeight · figure.scale`. Print each late cue as the recorder does (`{verb: target} 0.16 s late`).
  5. For `--preview`: mix the voice into `<out>/film-voice.mp3` with `voiceMix`, `serveFilm({ data, voice })`, print the URL and stay up until interrupted.
  6. Otherwise: `serveFilm`, open Chromium at 1920 × 1080, wait for `data-ready`, and for each frame evaluate `render(frame / 30)` and take a **PNG** screenshot, keeping its SHA-256 and writing it to ffmpeg's stdin (`-f image2pipe -framerate 30 -c:v png -i -`), encoded lossless to `<out>/raw.mp4` (`-c:v libx264 -qp 0 -preset ultrafast -pix_fmt yuv444p`).
  7. Close the browser, open a **new** one, render `sampleFrames(count)` and compare each hash with the first pass. If any differs, throw `Frames <list> were not the same when rendered again.`
  8. Write `timeline.json`: the film's timeline plus `picture: "raw.mp4"` and `viewport: { width: 1920, height: 1080 }`. Print what was written and `<n> frames checked again in a new browser: identical`.

- [ ] **Step 4: Write the example.** A manuscript of four short scenes in Danish that uses every verb once: a wave, a walk to the screen, a picture on it, a pointing at it, the camera in and out again, raised eyebrows and open arms. `film-demo.mjs` as in the spec's section "The film script". `forside.svg` is a simple drawn mock of an app's front page, made for this example. The README gives the four commands.

- [ ] **Step 5: Run all tests**

Run: `npm test`. Expected: PASS.

- [ ] **Step 6: Run the example end to end**

```bash
cd examples/cartoon
node ../../cli.mjs tts demo --say
node video/film-demo.mjs
node ../../cli.mjs assemble demo
node ../../cli.mjs frames demo
```

Expected: `film-demo.mjs` ends with `… frames checked again in a new browser: identical`; `video/out/demo/demo.mp4` and `demo.srt` exist; `video/out/demo/frames/` holds a still for every cue. **Look at every still, one at a time**, against the spike's sheets: the pose each cue asks for is there on its still, the shoulder is one piece with the jacket, no arm is behind the back, the picture is on the screen after `{vis}`, and the camera is on the screen after `{kamera: skærm}`. Fix what is wrong before going on.

- [ ] **Step 7: Watch it live**

Run: `node video/film-demo.mjs --preview`, open the URL, press play. Expected: the same film, with sound, the mouth moving with the words.

- [ ] **Step 8: Commit**

```bash
git add src/cartoon/film.mjs src/cartoon/index.mjs src/config.mjs package.json test/cartoon-film.test.mjs examples/cartoon
git commit -m "Render a cartoon frame by frame, and check that it comes out the same twice"
```

---

### Task 12: Documentation

**Files:**
- Modify: `README.md`, `skill/SKILL.md`

- [ ] **Step 1: README.** Add `tts <name> --say` and the film script to "Commands"; extend the opening and the diagram to name the third track; add a section "Cartoon films" after "Narrated PowerPoint decks" with: the chain, the film script, the cue table with its "Lasts" column, what stays across scenes, how a gesture and a walk are timed, the set's marks, things and shots, the determinism check and what it promises (same machine, same browser version), `--preview`, and the example. Add the new test areas to "Tests". The ElevenLabs licence section already covers films "whether from a manuscript or a deck"; add "or a film".

- [ ] **Step 2: Skill.** Add the film chain beside the deck paragraph, and the stops for a film: plan, manuscript, voice (`preview.mp3`), film (the mp4 and the frames). Add what the spike taught about writing for a figure: give a walk words to walk through; put a `{peg}` on the word that names the thing; a gesture near a scene's start needs a word or two before it, or it is reported late.

- [ ] **Step 3: Check the docs against the code.** Every command in the README section runs as written from `examples/cartoon/`; every verb in its table is one `checkCues` accepts.

- [ ] **Step 4: Commit**

```bash
git add README.md skill/SKILL.md
git commit -m "Document cartoon films in the README and the skill"
```
