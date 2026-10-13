/**
 * `narrated-guides pptx <deck.pptx>`: narrates a deck from the command line,
 * writing `<deck>-narrated.pptx` beside it.
 *
 * Voices come from the project's config like a manuscript's. Each segment's
 * audio is kept in `<outDir>/<deck>-pptx/`, under the hash of its text, voice
 * and model, so moving a cue or changing one slide only voices what changed.
 * `--dry` checks the deck without voicing it; `--say` uses the free macOS
 * voice with estimated word times, to try the mechanics first.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readVoiceSecrets } from "./config.mjs";
import { spokenWords } from "./manuscript.mjs";
import { checkDeck, narrateDeck, openDeck } from "./pptx.mjs";
import { durationOf, voiceScene } from "./tts.mjs";

const sayClip = (dir, id, text) => {
  const aiff = path.join(dir, `${id}.aiff`);
  const mp3 = path.join(dir, `${id}.mp3`);
  const spoken = spokenWords(text);
  execFileSync("say", ["-o", aiff, spoken.join(" ")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "44100", "-b:a", "128k", mp3]);
  const duration = durationOf(mp3);
  const total = spoken.reduce((n, w) => n + w.length + 1, 0);
  let t = 0;
  const words = spoken.map((word) => {
    const start = (t / total) * duration;
    t += word.length + 1;
    return { text: word, start, end: (t / total) * duration };
  });
  return { audio: readFileSync(mp3), words };
};

export const narratePptxFile = async (config, file, { dry = false, say = false } = {}) => {
  const name = path.basename(file, path.extname(file));
  const deck = await openDeck(readFileSync(file));
  const { problems, warnings, characters } = await checkDeck(deck, { voices: Object.keys(config.voice.voices) });
  for (const w of warnings) console.warn(`  ${w.message}`);
  for (const p of problems) console.error(`  ${p.message}`);
  const slides = new Set(deck.segments.map((s) => s.slide)).size;
  console.log(`${slides} slides with notes, ${deck.segments.length} voice segments, ${characters} characters`);
  if (problems.length) throw new Error(`${problems.length} problem(s) in the deck; nothing was voiced.`);
  if (dry) return null;

  const dir = path.join(config.outDir, `${name}-pptx`);
  mkdirSync(dir, { recursive: true });
  const secrets = say ? null : readVoiceSecrets(config.voice.envFile, config.voice.voices);
  let sent = 0;
  const clips = [];
  for (const seg of deck.segments) {
    if (say) {
      clips.push(sayClip(dir, `say-${clips.length + 1}`, seg.text));
      continue;
    }
    const voice = {
      key: secrets.key,
      voice: seg.voice ? secrets.voices[seg.voice] : secrets.voice,
      model: config.voice.model,
      format: config.voice.format,
    };
    const hash = createHash("sha256").update(`${voice.model}\n${voice.voice}\n${seg.text}`).digest("hex").slice(0, 16);
    const mp3 = path.join(dir, `${hash}.mp3`);
    const json = path.join(dir, `${hash}.json`);
    if (!existsSync(mp3) || !existsSync(json)) {
      const { audio, words } = await voiceScene(voice, { number: seg.slide, text: seg.text });
      writeFileSync(mp3, audio);
      writeFileSync(json, JSON.stringify({ slide: seg.slide, voice: seg.voice, text: seg.text, words }, null, 2));
      sent += seg.text.length;
    }
    clips.push({ audio: readFileSync(mp3), words: JSON.parse(readFileSync(json, "utf8")).words });
  }
  if (!say) console.log(`sent ${sent} characters to ElevenLabs`);

  const { bytes, report, warnings: late } = await narrateDeck(deck, clips, { leads: config.leads });
  for (const w of late) console.warn(`  ${w.message}`);
  for (const r of report) {
    const at = (ms) => (ms / 1000).toFixed(2);
    console.log(`slide ${r.slide}: ${at(r.durationMs)} s, animations at ${r.effects.map((e) => at(e.ms)).join(", ") || "-"}`);
  }
  const out = path.join(path.dirname(file), `${name}-narrated.pptx`);
  writeFileSync(out, bytes);
  console.log(`wrote ${out}`);
  return out;
};
