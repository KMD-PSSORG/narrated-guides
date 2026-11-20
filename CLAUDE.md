# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Node package (ESM, plain `.mjs`, no build step, no linter, no TypeScript) that makes
narrated guide videos. The voice is generated first; everything else is timed
by the words of the finished audio. Never time anything by estimating how long
a sentence takes.

Three tracks share the same core:

- **Manuscript → recording**: `manuscript.md ─tts→ scene-NN.mp3 + word timings ─record→ raw.webm + timeline.json ─assemble→ mp4 + srt`
- **Manuscript → cartoon**: the same, with `film` in place of `record`: a
  drawn figure in a room, rendered one frame at a time (`raw.mkv`).
- **PowerPoint → narrated deck**: the speaker notes are the manuscript; the
  output is a `.pptx` with audio and animations moved onto the words, which
  PowerPoint itself exports to video.

`README.md` is the API reference (manuscript format, cue verbs, recording
script, film script, config). `skill/SKILL.md` is the workflow for an agent
*using* the package in another project, including the approval stops and the
recording lessons. Read both before changing behaviour, and update them in the
same change: they are the product's documentation, and the skill is copied into
consuming projects.

## Commands

```bash
npm test                                         # node --test, all of test/
node --test test/pptx.test.mjs                   # one file
node --test --test-name-pattern="cueDue"         # tests whose name matches

node cli.mjs pptx test/fixtures/animated.pptx --dry   # check a deck, nothing is voiced (from the repo
                                                      # root it reports the unset voice "bent" and exits 1)
python3 -m http.server                           # then open /web/pptx/ (serve the repo root)
```

The CLI (`tts`, `preview`, `assemble`, `frames`, `pptx`) reads
`guides.config.mjs` from the current directory, so run it from a project
root: `cd example && node ../cli.mjs tts demo`. Recording and filming are not
CLI commands; they are the project's own scripts calling `record()` or
`film()` (`node video/record-demo.mjs`, `node video/film-demo.mjs`; a film
script takes `--preview` to serve the film live instead of rendering it).

Tests cover only the parts that need no browser, ffmpeg, voice or network:
manuscript, timing, subtitles, stage, config, decks against
`test/fixtures/*.pptx`, and for films the timeline, the score, poses,
walking, turning, the mouth, the springs, the camera and the local server.
The recorder, the film renderer, the rig, the voice and ffmpeg have no tests;
they are exercised by running `example/`, `examples/procureflow/` or
`examples/cartoon/`, which needs `ffmpeg`/`ffprobe` and Playwright's Chromium.

`tts` and `pptx` spend ElevenLabs characters unless given `--say` (or `--dry`
for a deck). `--say` uses the free macOS voice with estimated word times and
the system's default voice, whatever language that is. It is for checking
mechanics. A video handed over to be judged is voiced with ElevenLabs: say how
many characters it costs, and use the voice file the maintainer points to
with `NARRATED_GUIDES_VOICE_FILE`.

## Architecture

### Browser-safe and Node-only modules

Two places load `src/` straight into a browser with no bundler: the deck
page (`web/pptx/app.mjs`) and a film's page (`src/cartoon/page.html`). What
they load, and what that imports, must run there: no `node:` imports, no
`Buffer`, no ffprobe (that is why `mp3.mjs` reads frame headers itself).

- Deck page: `manuscript.mjs`, `timing.mjs`, `mp3.mjs`, `eleven.mjs`,
  `pptx.mjs`. `pptx.mjs` picks `DOMParser` natively or from `@xmldom/xmldom`.
  The page resolves `jszip` through an inline import map to
  `web/vendor/jszip.mjs`; its Content-Security-Policy allows that inline
  script by SHA-256 hash and connections to `api.elevenlabs.io` only, so
  changing the import map means recomputing the hash in `web/pptx/index.html`.
  The page is served as is from GitHub Pages (`.nojekyll`), so paths into
  `src/` are part of the deployed site.
- Film page: everything in `src/cartoon/` except `film.mjs`, `serve.mjs` and
  `index.mjs`, plus `src/pacing.mjs`. It has no import map, so these may only
  use **relative** imports. `serve.mjs` serves them over a local port by
  allow-list; it must never serve anything outside `src/`.

Node-only work lives in `tts.mjs`, `say.mjs`, `scenes.mjs`, `recorder.mjs`,
`assemble.mjs`, `review.mjs`, `config.mjs`, `pptx-file.mjs`, and
`cartoon/film.mjs` and `cartoon/serve.mjs`.

### How timing flows

1. `manuscript.mjs` strips `{verb: target}` cues from the speak text and
   records each cue's index among the *spoken* words (`[audio tags]` do not
   count).
2. `tts.mjs` voices a scene and gets per-character timings
   (`with-timestamps`, falling back to forced alignment). `timing.mjs` groups
   them into words and anchors each cue to its word's start. Result:
   `<outDir>/<video>/audio/scene-NN.{mp3,json}`.
3. `recorder.mjs` plays no audio. It sleeps until `cueDue` (the word's time
   minus the verb's lead from `DEFAULT_LEADS`), performs the cue, and writes
   when each scene started to `timeline.json`. A film measures nothing:
   `cartoon/timeline.mjs` computes the same timeline from the scenes' lengths
   and the pauses in `pacing.mjs`.
4. `assemble.mjs` lays each mp3 onto the picture the timeline names
   (`raw.webm` unless it says otherwise) at the scene's start, and
   `subtitles.mjs` builds the srt from the same word timings. `review.mjs`
   cuts stills at the cue times.

Cues are matched to timed words by position. If the voice splits or merges a
word, the counts differ, a warning is printed, and later cues in the scene
drift.

A scene is only sent to ElevenLabs when the hash of model, voice and text
changes. Cues are deliberately not in the hash: moving a cue re-anchors it
against the cached words for free. The deck track caches the same way, on
disk in `<outDir>/<deck>-pptx/` and in IndexedDB on the page. A `--say` scene's
hash starts with `say:`, so the next real `tts` voices it properly, and
`guardSay` keeps `--say` from ever replacing paid audio.

### The stage

`stage.mjs` builds one script string that is injected with `addInitScript`
and exposes `window.vstage` (cursor, rings, step badge, cards) in a fixed
layer inside the app's own page. It is reinstalled on every document load, so
cards and badges do not survive navigation, and the app's CSS can reach them.
Card and role HTML is inserted unescaped and must only come from the project.

### Films

A film is one function of time. `score.mjs` turns the cues into what happens
and when; `player.mjs` simulates the springs once and exposes `render(t)`;
`film.mjs` screenshots `render(frame / 30)` for every frame and ends by
rendering twelve frames again in a fresh browser, failing if any differs.
What keeps that true, and must be kept:

- `render(t)` reads nothing but `t`: no clock, no random numbers, no timers,
  no CSS transitions or animations, no `<video>`.
- Nothing is left over from the frame before. Attributes and the order of
  elements are set on every frame, also for what is hidden. A value set only
  "when it changes" is state.
- The drawing is taken out of the layout and put back before each
  screenshot: Chromium only repaints what changed, and the anti-aliasing at
  the edge of a repaint depends on the frame before.
- Springs remember, so they are simulated once in fixed steps
  (`springs.mjs`) and looked up. `targetAt` runs 240 times for every second
  of film: keep it cheap.

The figure (`rig.mjs`) follows rules that each cost a wrong-looking version:

- Limbs are posed against the body (out to the side, forward) and projected
  through its turn (`project.mjs`). Posed as angles on the screen, open arms
  put one arm behind a body seen from the side. The same goes for pointing:
  `aim.mjs` solves the arm's lift through that projection.
- What turns is drawn from the front and from the side with the same number
  of points and slides between them (`morph.mjs`); the front view is
  symmetric, so the right profile is the left one mirrored.
- The jacket and the upper arms share one outline: all dark strokes first,
  then all fills.
- A walk's steps are measured in the room; the rig draws inside the figure's
  scale and must convert.

Figures and sets are plain data (`src/cartoon/figures/`, `src/cartoon/sets/`):
`film` sends them to the page as JSON. Their drawings are inserted unescaped
and must only come from the project.

### Decks

`pptx.mjs` edits the OOXML directly: `openDeck` → `checkDeck` (problems stop
the run, warnings do not) → `narrateDeck`. Narration it adds is marked
(`descr="narrated-guides narration"`, media named `narrated-guides-*`, a list
of the entrances it made), so narrating a deck again replaces the narration
instead of stacking a second one. Keep that idempotence when changing what is
written. Reports carry a `code` and `params` alongside the English `message`
from `MESSAGES`; `web/pptx/i18n.mjs` renders the same codes in Danish. A new
message code or effect name needs both languages.

## Conventions

- **Tests first, then approval.** Tests for a change are written, seen to
  fail and shown to the maintainer, who approves them before any
  implementation is written. That holds for tests added later too, including
  for a fix a review asks for. Follow the style of the files in `test/`: one
  sentence per `it` that says what holds.
- Cue verbs in manuscripts are Danish (`peg`, `klik`, `ring`, `skriv`, `vis`,
  `fremhæv`, `trin`, and the target `slutkort` in a recording; `gå`, `se`,
  `vis`, `kamera`, `peg`, `vink`, `gestus`, `bryn` in a film); the deck track
  also accepts English (`show`, `voice`) beside `vis` and `stemme`. Code,
  comments, docs and commit messages are English. Commit subjects are plain
  sentences saying what changed for the user.
- Each module opens with a comment explaining what it does and why. Keep it
  true when the behaviour changes.
- Changes land through pull requests. Copilot reviews every push
  automatically, and `main` cannot be merged into until every review thread is
  resolved: weigh each finding on its merits, fix what is real, and answer the
  thread.
- The ElevenLabs key and voice ids live in a git-ignored env file
  (`voice.envFile`, default `.elevenlabs.env`). They must never be printed,
  logged, put in an error message or committed, not even partly.
- ElevenLabs' free plan is for internal use only. That rule is stated in the
  README and, in Danish and English, on the deck page next to the key
  (`license` in `web/pptx/i18n.mjs`); keep them in step.
- Examples use fictional people and data only.
