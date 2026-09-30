/**
 * When things happen: spoken words from the voice's character timings, cues
 * from the words they are anchored to, and the moment the recorder should
 * start acting on a cue.
 */
import { spokenWords } from "./manuscript.mjs";

/**
 * Seconds a cue starts before its word. The cursor needs time to travel before
 * a click or a point lands on the word; a card or a ring barely any.
 */
export const DEFAULT_LEADS = { peg: 0.65, klik: 0.65, ring: 0.15, vis: 0.1, fremhæv: 0.1, trin: 0.1, skriv: 0 };

/** Groups per-character timings into words, skipping audio tags. */
export const wordsFromCharacters = (characters, starts, ends) => {
  const words = [];
  let word = null;
  let inTag = false;
  characters.forEach((char, i) => {
    if (char === "[") inTag = true;
    if (inTag) {
      if (char === "]") inTag = false;
      word = null;
      return;
    }
    if (/\s/.test(char)) {
      word = null;
      return;
    }
    if (!word) {
      word = { text: "", start: starts[i], end: ends[i] };
      words.push(word);
    }
    word.text += char;
    word.end = ends[i];
  });
  return words;
};

/**
 * Each cue with `at`, the second its word starts, and `anchor`, the word. A cue
 * after the last word is timed at that word's end. When the voice timed a
 * different number of words than the text holds, cues are still matched by
 * position and `warning` says so.
 */
export const anchorCues = (scene, words) => {
  const expected = spokenWords(scene.text).length;
  const warning =
    words.length === expected
      ? null
      : `scene ${scene.number}: ${words.length} timed words, ${expected} in the text — cues are matched by position`;
  const cues = scene.cues.map((cue) => {
    const word = words[Math.min(cue.word, words.length - 1)];
    return { ...cue, at: cue.word < words.length ? word.start : word.end, anchor: word?.text };
  });
  return { cues, warning };
};

/** The wall-clock millisecond to act on a cue in a scene that started at `sceneStart`. */
export const cueDue = (sceneStart, cue, leads) => sceneStart + (cue.at - (leads[cue.verb] ?? 0)) * 1000;
