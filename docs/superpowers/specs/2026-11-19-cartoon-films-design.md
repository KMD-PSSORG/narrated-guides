# Cartoon films: design

Date: 2026-11-19. Status: awaiting approval.

## Intent

narrated-guides makes two kinds of video today: a screen recording of a web
app that follows a voice, and a PowerPoint deck narrated from its notes. This
adds a third: a cartoon, where a drawn figure stands in a room, walks about
and explains something, for example what is clever about an app. Serious
enough to be used at work, light enough to be watched.

The figure could be generated as AI video. The point of this design is not
to: the film is built from a manuscript, in HTML, and the same manuscript
gives the same film every time. A correction is a change to a line of text,
not a new roll of the dice.

The first figure is a drawn Dennis. More figures come later.

## What the spike showed

A throwaway prototype was built over five rounds on the branch
`spike/cartoon` (last commit `af621c0`, `spike/cartoon/film.html` and
`render.mjs`). It is the reference for how things should look and move, and
none of its code is kept as it is. It established:

- **A figure can be drawn in code.** Flat fills and a dark outline in SVG
  reach the wanted style. No image generation was needed.
- **The whole film can be one pure function, `render(t)`.** Every transform
  is computed from the time alone, so frames can be rendered one at a time, in
  any order. 444 frames took about 11 seconds.
- **Byte-identical frames need a full repaint.** Chromium repaints only what
  changed, and the anti-aliasing at the edge of a repainted area depends on
  the frame before. Taking the drawing out of the layout and putting it back
  before each screenshot made 28 of 28 frames identical when rendered again,
  out of order, in the same browser session (JPEG, quality 95). Across two
  browser launches only two frames were compared (`check.mjs`, as JPEG and as
  PNG); both were identical. That is thinner evidence than goal 4 asks for,
  which is why the check below is part of every render.
- **Springs give cartoon motion and stay deterministic** when they are
  simulated once from the start in fixed steps and `render(t)` only looks
  the result up.
- **A figure must be posed against its own body.** Poses given as angles on
  the screen were right from the front and wrong as soon as the body turned
  (an arm ended up behind the back). Posing each arm piece by how far it is
  lifted to its side and how far it comes forward, then projecting through the
  body's turn, fixed it and gave foreshortening for free.
- **A turn is two drawings with the same points.** Head, hair, beard and
  jacket are each drawn from the front and from the side with the same number
  of path points, and every number slides between them. Features sit on a
  turned ball. Three-quarter views fall out; the right profile is the left
  one mirrored, which is invisible because the front view is symmetric.
- **One outline for jacket and upper arm.** Drawing all dark strokes first
  and all fills after makes a sleeve grow out of the shoulder; drawn as a
  separate outlined piece it looked like a jumping jack.

## Goals

1. A cartoon is made from a manuscript in the existing format: scenes, one
   `speak` block each, `[audio tags]`, `{verb: target}` cues that land on the
   word after them, and named voices.
2. The voice leads, as everywhere in this package. `tts` is used unchanged,
   with its cache; moving a cue costs nothing.
3. A figure that can: stand and breathe, turn head and body from front to
   either profile, walk to a named place with planted feet, wave, gesture,
   point at a named thing, raise its eyebrows, blink, and speak with a mouth
   that follows the letters being said.
4. Rendering is frame by frame, and a frame rendered again on the same
   machine and browser version is the same bytes.
5. The finished film is an mp4 and an srt, 1920 × 1080, 30 frames a second,
   made by the same assembly as the other videos.
6. The film can be watched live in a browser, with sound, before it is
   rendered.
7. A second figure or a second room is new files, not a change to the engine.
8. The film can show an app: a screen in the room shows pictures the cues
   put on it, and the camera can move in on it.

## Non-goals

- More than one figure on screen at a time. The design must not close the
  door on it (see Cast), but nothing is built for it now.
- Figures or rooms made from generated or bitmap images.
- A graphical editor. Everything is text.
- Moving clips of an app on the room's screen. Version one shows stills.
- Lip-sync finer than letters spread over a word's time.
- Replacing the renderer with HyperFrames or another framework. Possible
  later; nothing here depends on it.
- Changing the manuscript parser or the two existing tracks, beyond what
  sharing code with them requires.
- Title and end cards. The lead-in and the tail show the figure standing in
  the room. The app track's cards live in a layer a film does not have.

## Anti-goals

These would make it a failure even if it worked:

- Anything that makes two renders of the same manuscript differ: `Math.random`,
  the clock, CSS transitions or animations, timers, real-time capture, a
  `<video>` element.
- A figure that only looks right from the angle it was drawn at.
- A Node-only import in a module the browser loads (see Constraints).
- Tests or examples that spend ElevenLabs characters.
- A stiff or pinned-on look. The spike's later rounds are the bar, not its first.

## Constraints

From the repository as it is:

- Plain ESM `.mjs`, no build step, no TypeScript, Node 20 or later.
- The rig and `render(t)` run in a browser, both for the live preview and
  inside the page that is screenshotted. They must be browser-safe like
  `manuscript.mjs` and `timing.mjs` are: no `node:` imports, no `Buffer`, and
  only relative imports. The page loads the package's modules as they are,
  with no import map, so a bare specifier (as `pptx.mjs` has for `jszip`)
  would not resolve.
- Tests are `node --test` over the pure parts. Nothing that needs a browser,
  ffmpeg or a voice runs in `npm test`.
- Cue verbs are Danish. Code, comments, docs and commits are English.
- The ElevenLabs key and voice ids are never printed or committed.
- `README.md` and `skill/SKILL.md` are the product's documentation and are
  updated in the same change.
- Work follows GS-TDD: tests are written first and approved before the
  implementation.

## Approaches

Three ways of building it were considered.

- **A. A third track in narrated-guides, in our own code.** Reuses voices,
  word timings, cache, subtitles and assembly. No new dependencies. We
  maintain the rig and the renderer ourselves; the spike is about 600 lines.
- **B. On top of HyperFrames (and perhaps GSAP).** Their renderer for free
  and maintained by others, but the framework is seven months old, sets its
  own conventions, and the renderer is the smallest part of the work. Whether
  its frames are byte-exact was not tested.
- **C. A separate package beside narrated-guides.** Cleaner separation, but
  two repositories, two sets of docs, and a manuscript format that lives in
  one place and is used in another.

Rive and Spine were dropped because a figure would be made in a graphical
tool and stop being text; Remotion because of React and its licence terms.

**Dennis chose A.** The cartoons share manuscript, voice and timing with the
rest, which is what this package is already good at.

## Design

### The chain

```text
manuscript.md ──tts──▶ scene-NN.mp3 + word timings ──film──▶ picture + timeline.json ──assemble──▶ mp4 + srt
```

`tts`, `preview` and `frames` are the existing commands. `film` is new and
takes the place `record` has in the app track. Unlike the recorder it does
not wait for anything, so the timeline is computed, not measured: each scene
starts when the one before it ends, with the pause between scenes, the
lead-in and the tail the recorder uses (0.45, 1.2 and 2.5 seconds, private
constants in `recorder.mjs` today, to be shared). The spike's own values are
not the reference.

### Commands

```bash
npx narrated-guides tts <name>            # unchanged
npx narrated-guides tts <name> --say      # new: the free macOS voice, to try a film without a key
node video/film-<name>.mjs                # render the picture, timed by the voice
node video/film-<name>.mjs --preview      # serve it and print a URL to watch it live
npx narrated-guides assemble <name>       # unchanged for the user
npx narrated-guides frames <name>         # unchanged for the user
```

*My call, not yet Dennis's:* a film has its own small script, like a
recording has `video/record-<name>.mjs`, and for the same reason: it is where
the project says things the manuscript should not carry. See The film script.

### The manuscript

Unchanged format. The cue verbs a film understands:

| Cue | What happens | Lasts |
|---|---|---|
| `{gå: X}` | Walks to the mark X, turning to face the way it goes, and back to the front on arrival | It stays there |
| `{se: X}` | Looks at the thing X: the head turns, the body does not. `{se: kamera}` looks out | Until the next `se` |
| `{vis: X}` | Puts the picture X on the room's screen. `{vis: intet}` clears it | Until the next `vis` |
| `{kamera: X}` | Moves the camera to the shot X | Until the next `kamera` |
| `{peg: X}` | Points at the thing X, turning head and body towards it | A moment, then back |
| `{vink: X}` | Waves. The target is free text, kept for the reader | A moment |
| `{gestus: X}` | A named gesture. Version one has `åben` (open arms) | A moment |
| `{bryn: op}` | Raises the eyebrows | A moment |

*My calls, all of this section:*

**What stays.** Where the figure stands, where it looks, what is on the
screen and where the camera is are states. They stay until a cue changes
them, across scenes too; a film is one continuous take, unlike the app track,
which clears its rings at every scene. A pointing or a walk borrows the head
and gives it back to wherever `se` last put it. A film starts with the figure
at its starting mark, looking out, an empty screen and the shot `total`.

**When.** A momentary gesture arrives on its word: it starts early by its own
wind-up, as the cursor does in the app track. A walk starts on its word,
because it takes seconds and nobody writes to where a walk ends. The camera
and the screen change on their word. How long a moment lasts is the figure's
(the spike held a pointing about 2.3 seconds); it is not a setting in version
one.

**Overlap is allowed.** The figure may point or gesture while it walks; the
gesture takes the arm from the walk's swing for as long as it lasts. A cue
whose head start would begin before its scene does starts at the scene's
start instead and is reported as late, the way the recorder reports a late
cue.

**Pointing aims in height, not in depth.** The room is flat. `{peg: X}`
turns the body half way towards the side X is on, points with the arm on that
side, and lifts it to the angle from the shoulder to X on the screen. That is
one computed angle on top of the spike's fixed pointing pose.

An unknown verb, mark, thing, picture or shot stops the run before anything is
rendered, with the list of what exists. This is stricter than the deck
track, which stops for an unknown shape but only warns about an unknown verb:
a film has no other way to perform a cue it does not know.

### The film script

```js
import { loadConfig } from "narrated-guides";
import { film } from "narrated-guides/cartoon";
import dennis from "narrated-guides/cartoon/figures/dennis.mjs";
import office from "narrated-guides/cartoon/sets/office.mjs";

const config = await loadConfig();

await film(config, "demo", {
  set: office,
  cast: { default: { figure: dennis, at: "midt" } },   // voice name → figure and where it starts
  pictures: { forside: "video/pictures/forside.png" }, // what {vis: X} can show
});
```

The three imports do not resolve today: `package.json` exports only `"."`.
Exports for the cartoon entry, its figures and its sets are part of this work.

**Cast.** `cast` maps a voice name from the manuscript to a figure; `default`
is the manuscript's default voice. Version one accepts one entry and says so
if given more. The map is the hook for several figures later, and the reason
it exists now.

A scene spoken by a voice that is not in the cast is a narrator off screen:
nobody's mouth moves. That is allowed, and is what a film uses while the
camera is on the screen. In version one a scene's cues act on the one figure
there is, whoever speaks.

**Marks, things and shots belong to the set**, so a manuscript says
`{gå: skærm}` and never a pixel. A set is a module that provides its drawing,
its floor line, named marks (places to stand), named things (places to point
or look at), where its screen is, and named camera shots. Version one has one
set, an office in the spike's style, with at least the shots `total` (the
whole room) and `skærm` (the screen fills the frame).

**Pictures** are stills (png, jpg or svg) from the project. They are embedded
in the page as data URIs, as the logo is in the app track.

### The figure

A figure is a module with its drawings and proportions; the rig that moves
it is shared. The split to hold on to:

- **Shared rig:** posing, springs, walking, the projection from body to
  screen, the turn, the layering of arms and legs, blinking, the mouth's
  choice of shape, the head following the body.
- **The figure's own:** the front and side drawings of head, hair, beard and
  torso; the features and where they sit; the mouth shapes; the hands;
  colours; sizes and limb lengths.

How much of the spike's Dennis-specific code turns out to be shared is for
the builder to find while building it; the second figure will test it. What
must hold is goal 7.

The rules the spike paid for, which the rig must keep:

1. Limbs are posed against the body (out to the side, forward), never the screen.
2. A drawing that turns exists from the front and from the side with the
   same points, and the front view is symmetric.
3. Jacket and upper arms share an outline; the line between arm and body
   starts below the shoulder.
4. Feet stay where they land while the body travels.
5. Every joint chases its target through a spring; the forearm is slower than
   the upper arm; a gesture winds up the other way first.
6. The far arm goes behind a turned body, and the near leg is drawn last.

### The mouth

*My call:* the mouth shape comes from the letters of the word being spoken,
spread over that word's start and end, with vowels given twice the time of
consonants, and it is shut between words. The seven shapes and the letter
table are the spike's. Word times from ElevenLabs are exact, so the spike's
use of loudness is dropped, both where it shut the mouth and where it nudged
the head: the head nods on words alone. This is the one place the film
deliberately differs from how the spike behaves.

This needs nothing new from `tts`. Per-letter times are available from
ElevenLabs but are not stored today; using them is a later refinement.

### Determinism

- `render(t)` reads nothing but `t` and the film's data.
- Springs are simulated once in fixed steps when the film is set up.
- Before each screenshot the drawing is taken out of the layout and put back,
  so all of it is repainted.
- The promise is: same machine, same browser version, same bytes. Text in a
  set uses system fonts, so another machine may differ.
- `film` ends every render by opening a fresh browser, rendering a sample of
  frames out of order, and failing if any differs from the first pass. A new
  launch is the stronger test, and the one the spike barely made.

### Preview and rendering share one page

The page that is screenshotted and the page a person watches are the same
page with the same `render(t)`; the preview drives it from the audio's clock.
A browser will not load ES modules from `file:`, so `film` serves the page
and the package's modules over a local port for as long as it runs, the way
`examples/procureflow/server.mjs` serves that example.

### Assembly

The audio mix, the scaling to 1920 × 1080 and the srt are `assemble.mjs`'s
today, and stay in one place. `assemble` currently reads `raw.webm`; it is
changed to take whichever picture the video has. How `film` hands over its
frames (an intermediate file, or frames piped straight to ffmpeg) is the
builder's choice, as long as there is one mixing implementation and the user
runs the same `assemble` command.

`frames` is reused as it is. It has a known fault that affects the app track
too: it adds the 1.2 second lead-in to a time that already includes it, so
its stills are 1.2 seconds late. It is fixed as part of this work, since
reviewing a film depends on it.

### Trying it without a voice

*My call:* the voice is made in one place, so the free voice belongs there
too: `tts <name> --say` writes the same `scene-NN.mp3` and `scene-NN.json`
that `tts` does, from the macOS voice with estimated word times, the way
`pptx --say` does for decks. `film`, `assemble` and `frames` then need to know
nothing about it. It is how the example runs without a key, and how a film
is tried before characters are spent.

Two rules keep it from costing anything:

- A `say` scene is marked as such where the hash is, so a later `tts` sees it
  as changed and voices it properly.
- `tts --say` refuses to replace a scene that ElevenLabs voiced, and says how
  to remove it by hand. Paid audio is never overwritten by a trial.

With estimated word times the mouth is roughly right, not exactly. That is
accepted for a trial.

### An example

`examples/cartoon/`: a short film with Dennis in the office that walks,
points at the screen, shows a picture on it and moves the camera in. It is
to this track what `example/` is to the app track, and is what exercises the
renderer, since `npm test` cannot.

### Tests

Written first and approved before implementation. The pure parts carry them:

- cues to targets: each verb, unknown names, the head start, a head start
  that does not fit, what stays across scenes, a gesture during a walk;
- pointing: the side, the arm and the height follow from where the thing is;
- `tts --say`: marks its scenes, and refuses to replace a voiced one;
- springs: the same input gives the same track, and a track settles on its target;
- walking: a planted foot does not move while the body does; a walk ends on its mark;
- projection: open arms are symmetric from the front, and both hands are
  in front of the body from the side;
- the turn: a drawing whose two versions differ in points is refused;
- the mouth: shapes for letters, shut between words;
- the computed timeline: scene starts, pauses, lead-in and tail.

### Documentation

README gets a section for the track beside the deck one. `skill/SKILL.md`
gets the chain and the stops for a film: plan, manuscript, voice, film. The
licence rule applies unchanged.

## Left to the builder

- Module boundaries and names inside `src/cartoon/`.
- The exact angles, spring speeds and timings; the spike's are the starting point.
- The office set's drawing.
- How frames reach ffmpeg.
- How a set describes a camera shot, and how the camera moves between two.

## Calls I made that Dennis has not confirmed

The first two shape the plan most.

1. Each film has its own script, `video/film-<name>.mjs`, instead of a
   `narrated-guides film` command.
2. The camera is included in version one, with named shots.
3. The room's screen shows stills in version one, not moving clips.
4. One figure on screen in version one; a voice outside the cast is a
   narrator off screen.
5. No title or end cards.
6. Position, gaze, screen and camera stay until changed, across scenes;
   pointing, waving, gestures and eyebrows last a moment.
7. A gesture arrives on its word; a walk starts on its word. Gestures may
   overlap a walk.
8. Pointing aims in height only.
9. The mouth uses word times with letters spread over them, and loudness is
   not used.
10. `tts --say` exists, and never replaces paid audio.
11. The fault in `frames` is fixed as part of this work. It also moves the
    app track's stills 1.2 seconds earlier.
