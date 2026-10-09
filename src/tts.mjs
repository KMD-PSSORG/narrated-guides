/**
 * Voices a manuscript with ElevenLabs, one mp3 per scene, plus the start and
 * end of every spoken word.
 *
 * Timing comes from the with-timestamps endpoint. Should the model not offer
 * it, the finished mp3 is sent to forced alignment instead. Either way the
 * result is `scene-NN.json`: the words with their times, and the cues with
 * the time of the word they are anchored to.
 *
 * Each scene is voiced by the default voice, or by the named voice its speak
 * block asks for. A scene is only sent again when its text, its voice or the model changes;
 * the hash of the three is stored beside the audio. Cues are not part of the
 * hash, so moving a cue re-anchors it without a new recording of the voice.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readVoiceSecrets } from "./config.mjs";
import { readManuscript } from "./manuscript.mjs";
import { anchorCues, wordsFromCharacters } from "./timing.mjs";

const API = "https://api.elevenlabs.io/v1";

const failure = async (response, what) => {
  const body = await response.text();
  return new Error(`${what}: HTTP ${response.status} ${body.slice(0, 300)}`);
};

const withTimestamps = async ({ key, voice, model, format }, text) => {
  const response = await fetch(`${API}/text-to-speech/${voice}/with-timestamps?output_format=${format}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!response.ok) throw await failure(response, "text-to-speech/with-timestamps");
  const body = await response.json();
  const alignment = body.alignment ?? body.normalized_alignment;
  return {
    audio: Buffer.from(body.audio_base64, "base64"),
    words: alignment
      ? wordsFromCharacters(
          alignment.characters,
          alignment.character_start_times_seconds,
          alignment.character_end_times_seconds,
        )
      : null,
  };
};

const plain = async ({ key, voice, model, format }, text) => {
  const response = await fetch(`${API}/text-to-speech/${voice}?output_format=${format}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!response.ok) throw await failure(response, "text-to-speech");
  return Buffer.from(await response.arrayBuffer());
};

const forcedAlignment = async ({ key }, audio, text) => {
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "scene.mp3");
  form.append("text", text.replace(/\[[^\]]*\]/g, " ").replace(/\s{2,}/g, " ").trim());
  const response = await fetch(`${API}/forced-alignment`, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!response.ok) throw await failure(response, "forced-alignment");
  const body = await response.json();
  return body.words.map((w) => ({ text: w.text.trim(), start: w.start, end: w.end })).filter((w) => w.text);
};

const voiceScene = async (voice, scene) => {
  try {
    const { audio, words } = await withTimestamps(voice, scene.text);
    if (words) return { audio, words, timing: "with-timestamps" };
    return { audio, words: await forcedAlignment(voice, audio, scene.text), timing: "forced-alignment" };
  } catch (err) {
    console.warn(`  scene ${scene.number}: ${err.message.split("\n")[0]} — trying plain + forced alignment`);
    const audio = await plain(voice, scene.text);
    return { audio, words: await forcedAlignment(voice, audio, scene.text), timing: "forced-alignment" };
  }
};

export const durationOf = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

/** The manuscript given by path, or by name in the project's manuscript folder. */
export const manuscriptPath = (config, manuscript) =>
  existsSync(manuscript) ? path.resolve(manuscript) : path.join(config.manuscripts, `${manuscript.replace(/\.md$/, "")}.md`);

/** Voices `manuscript` into `<outDir>/<name>/audio`. Returns the video's name. */
export const voiceManuscript = async (config, manuscript) => {
  const file = manuscriptPath(config, manuscript);
  const name = path.basename(file, ".md");
  const out = path.join(config.outDir, name, "audio");
  mkdirSync(out, { recursive: true });

  const { key, voice: defaultVoice, voices } = readVoiceSecrets(config.voice.envFile, config.voice.voices);
  const scenes = readManuscript(file);
  let characters = 0;

  for (const scene of scenes) {
    if (scene.voice && !voices[scene.voice]) {
      throw new Error(`Scene ${scene.number} uses the voice "${scene.voice}", which voice.voices in the config does not name.`);
    }
    const voice = {
      key,
      voice: scene.voice ? voices[scene.voice] : defaultVoice,
      model: config.voice.model,
      format: config.voice.format,
    };
    const id = `scene-${String(scene.number).padStart(2, "0")}`;
    const hash = createHash("sha256").update(`${voice.model}\n${voice.voice}\n${scene.text}`).digest("hex").slice(0, 16);
    const mp3 = path.join(out, `${id}.mp3`);
    const json = path.join(out, `${id}.json`);

    const cached = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : null;
    if (cached?.hash === hash && existsSync(mp3)) {
      const { cues, warning } = anchorCues(scene, cached.words);
      if (warning) console.warn(`  ${warning}`);
      writeFileSync(json, JSON.stringify({ ...cached, title: scene.title, voice: scene.voice ?? null, cues }, null, 2));
      console.log(`${id}: unchanged audio, ${cues.length} cues`);
      continue;
    }

    const { audio, words, timing } = await voiceScene(voice, scene);
    writeFileSync(mp3, audio);
    const { cues, warning } = anchorCues(scene, words);
    if (warning) console.warn(`  ${warning}`);
    const duration = durationOf(mp3);
    writeFileSync(
      json,
      JSON.stringify(
        { scene: scene.number, title: scene.title, voice: scene.voice ?? null, hash, timing, duration, text: scene.text, words, cues },
        null,
        2,
      ),
    );
    characters += scene.text.length;
    const by = scene.voice ? `, voice ${scene.voice}` : "";
    console.log(`${id}: ${duration.toFixed(1)} s, ${words.length} words, ${cues.length} cues (${timing}${by})`);
  }

  console.log(`sent ${characters} characters to ElevenLabs`);
  return name;
};
