/**
 * Reads a video manuscript: `## Scene N · Title` headings, each followed by one
 * ```speak block. Inside the block, `[tags]` are ElevenLabs audio tags and go
 * to the voice; `{verb: target}` are screen cues and do not. ```speak <name>
 * voices the scene with the named voice from `voice.voices` instead of the
 * default one.
 *
 * A cue is anchored to the spoken word right after it, counted among the words
 * the voice actually says — audio tags excluded. The recorder later looks that
 * word up in the audio's timestamps.
 *
 * Pure text handling, so it also runs in a browser.
 */
const SCENE = /^## Scene (\d+) · (.+)$/;
const SPEAK = /^```speak(?:\s+([\p{L}\p{N}_-]+))?\s*$/u;
const CUE = /\{(\p{L}+):\s*([^}]+)\}/gu;
const TAG = /^\[[^\]]*\]$/;

export const spokenWords = (text) =>
  text
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !TAG.test(word));

/** Speak text without its cues, and the cues with the index of their word. */
export const splitCues = (raw) => {
  const cues = [];
  let text = "";
  let last = 0;
  for (const match of raw.matchAll(CUE)) {
    text += raw.slice(last, match.index);
    cues.push({
      verb: match[1],
      target: match[2].trim(),
      word: spokenWords(text).length,
    });
    last = match.index + match[0].length;
  }
  text += raw.slice(last);
  text = text.replace(/\s{2,}/g, " ").trim();
  return { text, cues };
};

export const parseManuscript = (source) => {
  const scenes = [];
  let current = null;
  let inSpeak = false;
  let speak = [];

  for (const line of source.split("\n")) {
    const heading = line.match(SCENE);
    if (heading) {
      current = { number: Number(heading[1]), title: heading[2].trim() };
      scenes.push(current);
      continue;
    }
    const fence = line.match(SPEAK);
    if (fence) {
      if (!current) throw new Error("A speak block before the first scene heading.");
      if (fence[1]) current.voice = fence[1];
      inSpeak = true;
      speak = [];
      continue;
    }
    if (inSpeak && line.startsWith("```")) {
      inSpeak = false;
      Object.assign(current, splitCues(speak.join(" ").trim()));
      continue;
    }
    if (inSpeak) speak.push(line);
  }

  for (const scene of scenes) {
    if (scene.text === undefined) throw new Error(`Scene ${scene.number} has no speak block.`);
  }
  return scenes;
};
