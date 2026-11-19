/**
 * The mouth. Its shape comes from the letter being spoken: a word's letters
 * share the word's time, vowels lasting twice as long as consonants, and the
 * mouth is shut between words. The voice gives exact word times, so nothing
 * here listens to the audio.
 *
 * The shapes: X at rest, M pressed shut, C a consonant, E wide, A open,
 * O round, F teeth on the lip.
 *
 * Pure, so it also runs in a browser.
 */
const VOWELS = "aeiouyæøå";
const SHAPES = { a: "A", æ: "A", e: "E", i: "E", o: "O", å: "O", u: "O", ø: "O", y: "O", m: "M", b: "M", p: "M", f: "F", v: "F" };

/** The mouth's shape at `t`. `words` hold `text`, `start` and `end`. */
export const shapeAt = (words, t) => {
  const word = words.find((w) => t >= w.start && t < w.end);
  if (!word) return "X";
  const letters = [...word.text.toLowerCase()].filter((c) => /\p{L}/u.test(c));
  if (!letters.length) return "X";
  const weights = letters.map((c) => (VOWELS.includes(c) ? 2 : 1));
  let left = ((t - word.start) / (word.end - word.start)) * weights.reduce((a, b) => a + b, 0);
  for (const [i, letter] of letters.entries()) {
    left -= weights[i];
    if (left < 0) return SHAPES[letter] ?? "C";
  }
  return SHAPES[letters.at(-1)] ?? "C";
};

/** A shape for every frame, each held for two frames, the way drawn animation holds a mouth. */
export const mouthTrack = (words, length, fps) =>
  Array.from({ length: Math.ceil(length * fps) }, (_, frame) => shapeAt(words, (frame - (frame % 2) + 1) / fps));
