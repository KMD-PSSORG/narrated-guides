# A cartoon

A short film: Dennis in his office waves, walks to the screen on the wall,
shows a made-up app's front page on it, points at it while the camera moves
in, and closes with raised eyebrows and open arms. It uses each of a film's
cue verbs once.

It is voiced with ElevenLabs like every other video, from a voice file that
stays outside the repo (`ELEVEN_LABS_API_KEY` and `VOICE_ID`, see the package
README and its licence rule). The manuscript is Danish, so use a Danish voice:

```bash
cd examples/cartoon
NARRATED_GUIDES_VOICE_FILE=/path/to/voice.env node ../../cli.mjs tts demo   # about 280 characters
node video/film-demo.mjs               # render the picture; ends by checking it comes out the same twice
node ../../cli.mjs assemble demo       # video/out/demo/demo.mp4 and demo.srt
node ../../cli.mjs frames demo         # a still at every cue, in video/out/demo/frames
```

To watch it live in a browser instead of rendering it:

```bash
node video/film-demo.mjs --preview
```

To try the mechanics before any characters are spent, `tts demo --say` uses
the free macOS voice instead. It is a trial and not a voice to publish: it
speaks with the system's default voice, whatever language that is (an English
one will read this Danish manuscript as English), and its word times are
estimates, so the mouth is only roughly right. A later `tts demo` without
`--say` replaces the trial with the real voice.

## Layout

```text
guides.config.mjs              no settings needed
video/manuscripts/demo.md      the manuscript
video/film-demo.mjs            which set, which figure, which pictures
video/pictures/forside.svg     the still {vis: forside} shows
```

The app on the screen and everything in it is made up.
