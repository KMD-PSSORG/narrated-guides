/**
 * The free macOS voice as a clip, to try a video or a deck before any
 * ElevenLabs characters are spent. `say` gives no word times, so they are
 * estimated from the words' lengths: good enough to see the mechanics, not to
 * judge the timing.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { spokenWords } from "./manuscript.mjs";
import { spreadWords } from "./timing.mjs";
import { durationOf } from "./tts.mjs";

/** Speaks `text` into `<dir>/<id>.mp3`. Audio tags are not spoken. */
export const sayClip = (dir, id, text) => {
  const aiff = path.join(dir, `${id}.aiff`);
  const mp3 = path.join(dir, `${id}.mp3`);
  const spoken = spokenWords(text);
  execFileSync("say", ["-o", aiff, spoken.join(" ")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "44100", "-b:a", "128k", mp3]);
  rmSync(aiff);
  const duration = durationOf(mp3);
  return { audio: readFileSync(mp3), words: spreadWords(spoken, duration), duration };
};
