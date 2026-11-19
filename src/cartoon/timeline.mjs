/**
 * A film's clock. A recording measures when each scene started, because it
 * waits for the app. A cartoon waits for nothing, so its timeline follows from
 * the lengths of its scenes' voices and the pauses every video keeps.
 *
 * Pure, so it also runs in a browser.
 */
import { GAP, HOLD_END, LEAD_IN } from "../pacing.mjs";

/**
 * When each scene's voice starts, and when the film ends. `scenes` hold
 * `scene` (its number) and `duration`. The film starts at zero, so assembly
 * trims nothing.
 */
export const filmTimeline = (scenes) => {
  let at = LEAD_IN;
  const starts = scenes.map(({ scene, duration }) => {
    const start = at;
    at += duration + GAP;
    return { scene, start, duration };
  });
  return { start: 0, end: at + HOLD_END, scenes: starts };
};

/**
 * Every cue and every word of the film on the film's own clock. A cue also
 * remembers when its scene began, and both carry the name of the voice that
 * speaks the scene (null for the default voice).
 */
export const filmEvents = (scenes, timeline) => {
  const cues = [];
  const words = [];
  scenes.forEach((scene, i) => {
    const sceneStart = timeline.scenes[i].start;
    const voice = scene.voice ?? null;
    for (const cue of scene.cues ?? []) {
      cues.push({ verb: cue.verb, target: cue.target, at: sceneStart + cue.at, scene: scene.scene, sceneStart, voice });
    }
    for (const word of scene.words ?? []) {
      words.push({ text: word.text, start: sceneStart + word.start, end: sceneStart + word.end, voice });
    }
  });
  return { cues, words };
};
