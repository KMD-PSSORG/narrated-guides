/**
 * Subtitles from the voice's word timings: cues broken at sentence ends and
 * pauses, at most two lines each, written as srt.
 */

const DEFAULT_MAX_LINE = 42;

export const stamp = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

/** The text on two lines, broken at the space nearest the middle, when it is longer than one. */
export const twoLines = (text, maxLine = DEFAULT_MAX_LINE) => {
  if (text.length <= maxLine) return text;
  const middle = text.length / 2;
  let split = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (split < 0 || Math.abs(i - middle) < Math.abs(split - middle))) split = i;
  }
  return `${text.slice(0, split)}\n${text.slice(split + 1)}`;
};

/**
 * `scenes` are `{ start, words }`: when the scene's audio starts in the video,
 * and its timed words. A cue ends at a sentence end, a pause over half a
 * second, or before it would grow past two lines.
 */
export const subtitleCues = (scenes, { maxLine = DEFAULT_MAX_LINE } = {}) => {
  const cues = [];
  for (const { start, words } of scenes) {
    let group = [];
    const flush = () => {
      if (!group.length) return;
      cues.push({
        from: start + group[0].start,
        to: start + group[group.length - 1].end,
        text: twoLines(group.map((w) => w.text).join(" ").replace(/\.\.\./g, "…"), maxLine),
      });
      group = [];
    };
    words.forEach((word, i) => {
      const next = words[i + 1];
      const candidate = [...group, word].map((w) => w.text).join(" ");
      if (group.length && candidate.length > 2 * maxLine) flush();
      group.push(word);
      const sentenceEnds = /[.!?…:]$/.test(word.text);
      const pause = next ? next.start - word.end > 0.5 : true;
      if (sentenceEnds || pause) flush();
    });
    flush();
  }
  return cues;
};

/** A cue stays up until just before the next, but no more than a second past its last word. */
export const toSrt = (cues) =>
  cues
    .map((cue, i) => {
      const next = cues[i + 1];
      const to = Math.min(cue.to + 1, next ? next.from - 0.05 : cue.to + 1);
      return `${i + 1}\n${stamp(cue.from)} --> ${stamp(Math.max(to, cue.to))}\n${cue.text}\n`;
    })
    .join("\n");
