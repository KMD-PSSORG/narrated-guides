# ProcureFlow 365

A larger example: a fake procurement portal and an 18-scene video guide with
four voices. The guide walks through requesting a stapler, from catalogue
search to final approval, and on the way it explains how the guide itself was
made. It ends in the archive, where a pumpkin has waited since 1987.

**Watch it:** [procureflow.mp4](https://github.com/KMD-PSSORG/narrated-guides/releases/download/example-procureflow-video/procureflow.mp4)
(4:45, with [subtitles](https://github.com/KMD-PSSORG/narrated-guides/releases/download/example-procureflow-video/procureflow.vtt)),
attached to the [example-procureflow-video](https://github.com/KMD-PSSORG/narrated-guides/releases/tag/example-procureflow-video) release.

It shows:

- **Named voices.** The narrator uses the default voice. Scenes 8, 11 and 16
  use ```` ```speak compliance ````, ```` ```speak bent ```` and
  ```` ```speak pumpkin ````, mapped in `guides.config.mjs` under `voice.voices`.
- **`onStart`.** Scene 16 passes the word timings to the page, and the
  pumpkin's jaw opens on every word.
- **A meta section.** The site's Behind the scenes page reads
  `video/manuscripts/procureflow.md` from the server and highlights tags and
  cues. Scenes 5 and 14 point at the manuscript of the scene being watched.
- **A single-page app.** Navigation changes the hash, so the cursor and the
  step badge survive between pages.
- **Waits between scenes.** Scene 8 clicks Next in `before`, and typing that
  takes a while runs without blocking the following cues.

## Layout

```text
site/                      the app: static HTML, CSS and JS, state in localStorage
server.mjs                 serves site/, the manuscripts and the finished video
guides.config.mjs          viewport, theme, process, voices
video/manuscripts/         the manuscript
video/record-procureflow.mjs
```

`?seed=demo` resets the app to its fixed, fictional data. All people and data
are made up.

## Run it

The voice file needs the key and four voice ids:

```text
ELEVEN_LABS_API_KEY=...
VOICE_ID=...               # narrator
VOICE_ID_COMPLIANCE=...
VOICE_ID_BENT=...
VOICE_ID_PUMPKIN=...
```

```bash
cd examples/procureflow
node server.mjs &                                   # http://localhost:4417
NARRATED_GUIDES_VOICE_FILE=/path/to/voice.env node ../../cli.mjs tts procureflow
node video/record-procureflow.mjs
node ../../cli.mjs assemble procureflow procureflow
node ../../cli.mjs frames procureflow procureflow
```

Voicing sends about 3,900 characters to ElevenLabs. Recording takes about five
minutes.

To show the guide in the app's Help centre, copy the result to `video/published/`
(git-ignored) and add a WebVTT version of the subtitles:

```bash
mkdir -p video/published && cp video/out/procureflow/procureflow.mp4 video/published/
(echo WEBVTT; echo; sed -E 's/([0-9]{2}:[0-9]{2}:[0-9]{2}),/\1./g' video/out/procureflow/procureflow.srt) > video/published/procureflow.vtt
```
