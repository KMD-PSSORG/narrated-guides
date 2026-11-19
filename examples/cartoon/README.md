# A cartoon

A short film: Dennis in his office waves, walks to the screen on the wall,
shows a made-up app's front page on it, points at it while the camera moves
in, and closes with raised eyebrows and open arms. It uses each of a film's
cue verbs once.

It runs without an ElevenLabs key, on the free macOS voice:

```bash
cd examples/cartoon
node ../../cli.mjs tts demo --say      # voice the manuscript, with estimated word times
node video/film-demo.mjs               # render the picture; ends by checking it comes out the same twice
node ../../cli.mjs assemble demo       # video/out/demo/demo.mp4 and demo.srt
node ../../cli.mjs frames demo         # a still at every cue, in video/out/demo/frames
```

To watch it live in a browser instead of rendering it:

```bash
node video/film-demo.mjs --preview
```

With the free voice the mouth is roughly right, not exactly: `say` gives no
word times, so they are estimated. Drop `--say` to voice it with the
project's ElevenLabs voice (see the licence rule in the package README).

## Layout

```text
guides.config.mjs              no settings needed
video/manuscripts/demo.md      the manuscript
video/film-demo.mjs            which set, which figure, which pictures
video/pictures/forside.svg     the still {vis: forside} shows
```

The app on the screen and everything in it is made up.
