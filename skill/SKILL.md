---
name: narrated-guides
description: Make narrated, screen-recorded guide videos of a web app from a manuscript, with an ElevenLabs voice, a Playwright recording timed by the voice, and ffmpeg assembly with subtitles. Use when the user wants instruction videos, video guides, walkthroughs or tutorial videos of an application, or works with narrated-guides manuscripts, cues or recording scripts.
---

# Narrated guides

Guide videos built with the `narrated-guides` package. The API, manuscript
format and config are documented in the package README
(`node_modules/narrated-guides/README.md`). Read it before writing a
manuscript or a recording script.

## The chain

1. **Manuscript** (`video/manuscripts/<name>.md`): scenes with speech, audio tags and cues.
2. **Voice**: `npx narrated-guides tts <name>` writes one mp3 per scene, the word timings, and `preview.mp3`.
3. **Recording**: `node video/record-<name>.mjs` records the screen. Each scene lasts as long as its speech.
4. **Assembly**: `npx narrated-guides assemble <name> <file>` writes the mp4 and srt.
5. **Review**: `npx narrated-guides frames <name> <file>` writes a still at every cue.

The voice comes first and the picture follows it. Never time anything by
guessing how long a sentence takes.

## Stops: wait for the human at each one

Each stop costs something to undo: ElevenLabs characters, recording time, or
the reviewers' time. Present the result, then wait for an explicit approval
before going on.

1. **Plan**: what the videos are, one line per scene (what is said and what the screen shows), and which data is needed.
2. **Manuscript**: the full text with tags and cues. Domain reviewers approve
   the wording here, before any characters are spent.
3. **Voice**: point the human to `video/out/<name>/preview.mp3`. A text
   change only re-voices the scenes that changed.
4. **Video**: the mp4 plus the frames that show each cue landing. Look at the
   frames yourself first, one image at a time, and fix what is wrong before
   presenting.

When a later stop reveals a wording problem, go back to the manuscript and
have the change approved there. Do not reword silently while fixing the
recording.

## Writing the manuscript

- Write one short thought per scene. A scene that waits on the server should start with that wait (see below).
- Put a cue directly in front of the word it should land on: `{peg: Save} Save`.
- Give actions that move the cursor room. Two cursor cues two words apart
  collide, because each starts 0.65 s early. Put `{skriv}` a few words before
  a following `{klik}`.
- Use `[pauses]` or `...` where the viewer needs time to see a result.
- Write numbers and abbreviations the way they should be spoken. If `tts`
  warns that the timed and written word counts differ, find the word the
  voice split or merged and rewrite it. Otherwise later cues in the scene
  drift.
- Keep the speech consistent with the app's own words. Use the labels on
  screen, not paraphrases.
- Let videos in a series hand over cleanly. Stop before an action that
  belongs to the next video, such as a Save that fetches data, and let the
  next video start with it.

## Recording lessons

- **Waits belong between scenes.** Navigation, lookups and clicks that load
  data go in `before[N]` or in an opening `{klik}` before the first word. A
  wait inside a scene makes the picture lag behind the voice. The recorder
  prints `… s late` for each cue that ran late. Fix every one.
- **Rings use screen coordinates.** Measure a ring box only after the page
  has settled. If an earlier scene scrolled, scroll back in `before` and wait
  for `window.scrollY === 0` before measuring. `pointAt` clears rings when it
  scrolls, but a ring drawn before a later scroll is left behind.
- **Text search matches ancestors.** `page.getByText("x")` can match a whole
  panel. Prefer roles and labels with `exact: true`. For a word inside a
  sentence, find the text node and measure it with a DOM `Range`. When digits
  are split across several nodes, measure the parent's last line box. The
  `point` target may be a fake locator: any object with
  `scrollIntoViewIfNeeded()` and `boundingBox()` works.
- **Regions without a box.** An element with `role="group"` or `display: contents` can have no usable box. Ring the union of its children's boxes.
- **Menus stay open.** A multi-select often stays open after a pick. Close it with `Escape` before the next cue.
- **Layout shifts strand the cursor.** When content loads and moves, call `rest()` in `before` so the cursor isn't left sitting on a random button.
- **Navigation resets the stage.** After `page.goto`, show the step badge
  again with `{trin: N}`. The badge from before the navigation is gone,
  though the cursor stays where it was.
- **Cards are part of the page.** Title and end cards live in the app's
  page, so there is no white flash. Hide them with `stage("hide")`, wait
  about 700 ms, and only then show the cursor.
- **Run long commands in the foreground.** A voicing or recording started in
  the background can die when the shell session ends.

## Constructed data

- Only use fictional people and data made for the videos. Never use real people.
- A seed script creates everything the video needs and has a `--remove` that deletes exactly those rows.
- Mark seeded rows in a column the app does not display. A marker that
  shows up on screen, such as a "created by" value, ends up in the video.
- Fix dates and amounts in the seed so re-recordings look the same.
- Remove the seeded data after the video is approved, and say what was removed.

## Secrets

- The ElevenLabs key and voice id stay in the file named by
  `voice.envFile`. That file must be git-ignored. Never print, log, echo or
  commit the values, not even partly.
- Before committing, scan the staged diff for the key and voice id without
  printing them, for example with `git diff --cached | grep -c -F -f <(...)`,
  and report only the count.
- Logins and tokens for the app go in `initScripts` or a custom
  `openBrowser`, read from the environment. Never write them into
  manuscripts or recording scripts.
- The HTML of cards and roles is inserted into the page as is. Build it only from the project's own text.

## Files

- Commit manuscripts, recording scripts, `guides.config.mjs` and seed scripts.
- Git-ignore `video/out/`, which holds audio, recordings, mp4, srt and frames. Hand the finished videos over separately.
