# narrated-guides

Narrated, screen-recorded guide videos made from a manuscript. The voice
is generated first with ElevenLabs. The screen recording is then made with
Playwright and follows the voice word by word. Finally ffmpeg lays the voice
onto the picture and writes an mp4 and an srt.

```text
manuscript.md ──tts──▶ scene-NN.mp3 + word timings ──record──▶ raw.webm + timeline.json ──assemble──▶ video.mp4 + video.srt
```

The voice leads and the picture follows. Nobody can tell from the text when
a word will be spoken, but the finished audio can. Each scene therefore lasts
exactly as long as its speech, and each action on screen happens on the word
it is written in front of.

The workflow for an AI agent (stops, lessons, data and secret rules) is in
[`skill/SKILL.md`](skill/SKILL.md).

## Requirements

- Node 20 or later
- `ffmpeg` and `ffprobe` on the PATH
- Playwright with Chromium (`npx playwright install chromium`)
- An ElevenLabs API key, and a voice id for each voice in the video

## Install in a project

```bash
npm install --save-dev github:KMD-PSSORG/narrated-guides playwright
npx playwright install chromium
```

To give an AI agent the workflow, copy the skill into the project:

```bash
mkdir -p .cursor/skills && cp -r node_modules/narrated-guides/skill .cursor/skills/narrated-guides   # or .claude/skills/
```

Keep the voice settings in a file that git ignores, by default
`.elevenlabs.env` in the project root:

```text
ELEVEN_LABS_API_KEY=...        # ELEVENLABS_API_KEY works too
VOICE_ID=...                   # the default voice
VOICE_ID_FINANCE=...           # optional: one entry per named voice in voice.voices
```

## Project layout

```text
guides.config.mjs            settings (optional; defaults below)
video/manuscripts/<name>.md  one manuscript per video
video/record-<name>.mjs      one recording script per video
video/out/<name>/            generated: audio, raw.webm, timeline.json, mp4, srt, frames (git-ignore it)
```

## Commands

Run the commands from the project root, next to `guides.config.mjs`.

```bash
npx narrated-guides tts <name>             # voice the manuscript, then write preview.mp3
npx narrated-guides preview <name>         # preview.mp3 again: all scenes with short pauses
node video/record-<name>.mjs               # record the screen, timed by the voice
npx narrated-guides assemble <name> [file] # <file>.mp4 and <file>.srt, 1920 × 1080
npx narrated-guides frames <name> [file]   # a still at each scene start and 1.5 s after each cue
```

`tts` sends a scene to ElevenLabs only when its text, its voice or the model
has changed. Moving a cue costs nothing. It only moves the cue to another word.

## The manuscript

````markdown
## Scene 3 · Register

*Screen:* The expense form. The amount is typed, Save is clicked, and the total is circled.

```speak
{trin: 2} {skriv: Amount} Type the amount, [pauses] {klik: Save} save it... {ring: Total} and the total is updated straight away.
```

## Scene 4 · A word from Finance

*Screen:* The total is circled again.

```speak finance
[stern] {ring: Total} Receipts above five hundred kroner need a second approver.
```
````

- `## Scene N · Title` starts a scene. Each scene has exactly one ```` ```speak ```` block.
- ```` ```speak finance ```` voices the scene with the named voice from
  `voice.voices` in the config instead of the default voice. A video can switch
  voices from scene to scene; a dialogue is split into scenes, one speaker each.
- Everything outside the speak blocks is notes for the people who read the manuscript.
- `[tags]` are ElevenLabs audio tags (`[warmly]`, `[pauses]`, `[calm, clear]`). They reach the voice but are not spoken.
- `{verb: target}` is a cue. It is removed before voicing and is performed
  when the voice reaches the next word. A cue after the last word is performed
  at the end of that word.

### Cue verbs

| Cue | What happens | Provided by the recording script |
|---|---|---|
| `{peg: X}` | The cursor glides to X | `point[X]()`, a locator |
| `{klik: X}` | The cursor glides to X and clicks, with a pulse | `point[X]()` |
| `{ring: X}` | A ring is drawn around X | `ring[X]()`, a box `{x, y, width, height}` |
| `{skriv: X}` | Typing | `type(X)` |
| `{vis: X}` | Reveals the card element `data-id="X"`, or `show(X)` if given | optional `show(X)` |
| `{vis: slutkort}` | The end card; rings and the step badge are cleared | `next`, or a whole `endCard` |
| `{fremhæv: X}` | Lights up the card element `data-id="X"`, e.g. `phase 2` | nothing |
| `{trin: N}` | The step badge for step N | nothing (needs `process`) |

The cursor starts moving a little before the word so it arrives on time.
The head start (`leads`, in seconds) is `peg`/`klik` 0.65, `ring` 0.15,
`vis`/`fremhæv`/`trin` 0.1 and `skriv` 0. Adjust it in the config.

A `{klik}` before the first word of a scene is an *opening click*. It is
performed, and the page is left to settle, before the scene's voice starts.
Use it, or the scene's `before`, for anything that waits for a server. The
wait then becomes a longer pause between scenes, never a gap inside one.

## The recording script

```js
import { loadConfig, record } from "narrated-guides";

const config = await loadConfig();

await record(config, "demo", ({ page, stage, moveTo, rest, pointAt, cards, sleep, viewport }) => ({
  next: "Attaching the receipt",                       // end card text
  point: { Save: () => page.getByRole("button", { name: "Save" }) },
  ring: { Total: () => page.getByLabel("Total").boundingBox() },
  type: async (target) => { /* click the field, page.keyboard.type(...) */ },
  before: {
    1: async () => {
      await page.goto(APP);
      await stage("cursorVisible", false);
      await stage("swap", cards.titleCard({ title: "Expenses", subtitle: "Registering an expense" }));
    },
    3: async () => { await stage("hide"); await sleep(700); await stage("cursorVisible", true); await rest(); },
  },
  onStart: {
    4: ({ words }) => page.evaluate((w) => window.mascot.talk(w), words), // the app's own talking character
  },
}));
```

`record` reads `video/out/<name>/audio/scene-NN.json`, so run `tts` first. Before each
scene it clears the rings and runs `before[N]`. After the last scene the end
card stays on screen for 2.5 seconds.

`onStart[N]({ words, duration, voice })` is called the moment scene N's audio
starts, and is not awaited. Each word has `start` and `end` in seconds from
that moment, so the page can follow the speech itself, for example a talking
character whose mouth opens on every word.

**Tools passed to `setup`:**

| Tool | Purpose |
|---|---|
| `page` | The Playwright page |
| `stage(fn, ...args)` | Calls the stage layer in the page (see below) |
| `moveTo({x, y}, ms)` | Moves the visible cursor and the real mouse |
| `rest()` | Parks the cursor in a neutral spot |
| `pointAt(locator)` | Scrolls it into view, clearing rings if the page scrolled, and moves the cursor to it |
| `cards` | `titleCard({title, subtitle})`, `endCard({next})`, `phasesCard({current})`, `stepBadge(n)` |
| `sleep(ms)`, `viewport` | |

**Stage functions:**

| Function | Effect |
|---|---|
| `swap(html)` | Shows a card at once |
| `show(html)` | Fades a card in |
| `hide()` | Fades the card out |
| `reveal(id)` / `light(id)` | Reveals or lights up a card element |
| `ring(box)` / `clear()` | Draws a ring / removes all rings |
| `step(html \| null)` | Shows, replaces or hides the step badge |
| `cursorVisible(bool)` | Shows or hides the cursor |
| `move(x, y, ms)` / `pulse(x, y)` | Moves the cursor / shows a click pulse |

The stage lives inside the app's own page and is reinstalled on every page
load. The cursor position survives navigation, but a card or a step badge
does not.

## guides.config.mjs

```js
export default {
  viewport: { width: 1760, height: 990 },       // recorded size; scaled to 1920 × 1080
  outDir: "video/out",
  manuscripts: "video/manuscripts",
  voice: {
    envFile: ".elevenlabs.env", model: "eleven_v4", format: "mp3_44100_128",
    voices: { finance: "VOICE_ID_FINANCE" },    // voice name in the manuscript → entry in envFile
  },
  theme: { accent: "#43b02a", dark: "#1f614e", text: "#1a1a1a", logo: "public/logo.svg" },
  labels: { kicker: "Video guide", next: "Next video", phase: "Phase", step: "Step", overview: "The process" },
  process: {                                     // only for step badges and the phases card
    phases: [{ name: "Collect receipts", steps: [1, 1] }, { name: "Register", steps: [2, 3] }],
    steps: ["Collect the receipt", "Register the amount", "Attach the receipt"],
    roles: [{ id: "roles", html: "<b>You</b> decide" }],   // optional lines under the phases, revealed by id
  },
  leads: { peg: 0.8 },                           // merged with the defaults
  initScripts: [],                               // page.addInitScript for every page, e.g. auth tokens
  openBrowser: async (viewport, contextOptions) => ({ browser, page }), // custom login or browser
};
```

The logo is a path (svg, png or jpg) and is embedded as a data URI. The HTML
of the cards and roles is inserted into the page as is, so it must come from
the project and never from user input.

## Example

`example/` is a small static app with a four-scene video:

```bash
cd example
NARRATED_GUIDES_VOICE_FILE=/path/to/voice.env node ../cli.mjs tts demo
node video/record-demo.mjs
node ../cli.mjs assemble demo
node ../cli.mjs frames demo
```

`examples/procureflow/` is a larger example: a fake procurement portal and an
18-scene guide with four voices, a talking pumpkin driven by `onStart`, and
scenes that explain how the guide itself was made. See its
[README](examples/procureflow/README.md).

## Tests

```bash
npm test
```

These cover the manuscript parser, timing, subtitles, the stage and the
config. The recorder, the voice and ffmpeg are exercised by the example.
