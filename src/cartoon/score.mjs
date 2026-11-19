/**
 * From a film's cues to its score: what the figure, the screen and the camera
 * do, and when.
 *
 * Some cues set a state that stays until another cue changes it, across
 * scenes too: where the figure stands ({gå}), where it looks ({se}), what is
 * on the screen ({vis}) and where the camera is ({kamera}). The others last a
 * moment: {peg}, {vink}, {gestus} and {bryn}.
 *
 * A moment arrives on its word, so it starts a little before it. A walk
 * starts on its word: it takes seconds, and nobody writes to where a walk
 * ends.
 *
 * Pure, so it also runs in a browser.
 */
import { aimAt } from "./aim.mjs";
import { planWalk, walkAt } from "./walk.mjs";

export const GESTURE_NAMES = ["åben"];

/** Seconds a moment starts before its word: its own rise, and a tenth for the springs to arrive. */
const LEAD = { peg: 0.3, vink: 0.26, gestus: 0.28, bryn: 0.2 };
const VERBS = ["gå", "se", "vis", "kamera", "peg", "vink", "gestus", "bryn"];

const list = (names) => names.join(", ") || "none";

/**
 * A line for each cue the film cannot perform, naming the cue and listing
 * what there is. A film has no other way to perform a cue it does not know,
 * so every one of these stops the run.
 */
export const checkCues = (cues, { set, pictures }) => {
  const missing = (cue, kind, names) => `{${cue.verb}: ${cue.target}}: there is no ${kind} called "${cue.target}". There is: ${list(names)}.`;
  const problems = [];
  for (const cue of cues) {
    const has = (names) => names.includes(cue.target);
    switch (cue.verb) {
      case "gå":
        if (!has(Object.keys(set.marks))) problems.push(missing(cue, "mark", Object.keys(set.marks)));
        break;
      case "peg":
        if (!has(Object.keys(set.things))) problems.push(missing(cue, "thing", Object.keys(set.things)));
        break;
      case "se":
        if (!has([...Object.keys(set.things), "kamera"])) problems.push(missing(cue, "thing", [...Object.keys(set.things), "kamera"]));
        break;
      case "vis":
        if (!has([...Object.keys(pictures), "intet"])) problems.push(missing(cue, "picture", [...Object.keys(pictures), "intet"]));
        break;
      case "kamera":
        if (!has(Object.keys(set.shots))) problems.push(missing(cue, "shot", Object.keys(set.shots)));
        break;
      case "gestus":
        if (!has(GESTURE_NAMES)) problems.push(missing(cue, "gesture", GESTURE_NAMES));
        break;
      case "bryn":
        if (cue.target !== "op") problems.push(`{bryn: ${cue.target}}: the eyebrows can only go "op".`);
        break;
      case "vink":
        break;
      default:
        problems.push(`{${cue.verb}: ${cue.target}} is not something a film can do. A film knows: ${list(VERBS)}.`);
    }
  }
  return problems;
};

/**
 * The score. `cues` are on the film's clock and carry `sceneStart` (see
 * filmEvents) and have passed checkCues. `startX` is where the figure
 * starts, `shoulderY` its shoulder's height on screen.
 *
 * - `walks`: each from where the figure is when it sets off, so a walk can
 *   interrupt a walk without a jump.
 * - `moments`: `{ verb, target, at, start }`, and `aim` for a pointing. A
 *   moment that would start before its scene starts with the scene instead
 *   and is listed in `late` with how much it was held back.
 * - `gaze`, `pictures`, `shots`: states, with the moment they change.
 */
export const scoreOf = (cues, { set, startX, shoulderY }) => {
  const score = { startX, walks: [], moments: [], gaze: [], pictures: [], shots: [], late: [] };
  const standsAt = (t) => walkAt(score.walks, t, startX).x;

  for (const cue of cues) {
    const { verb, target, at } = cue;
    switch (verb) {
      case "gå":
        score.walks.push(planWalk(standsAt(at), set.marks[target].x, at));
        break;
      case "se":
        score.gaze.push({ at, turn: target === "kamera" ? 0 : set.things[target].x < standsAt(at) ? -0.8 : 0.8 });
        break;
      case "vis":
        score.pictures.push({ at, name: target === "intet" ? null : target });
        break;
      case "kamera":
        score.shots.push({ at, name: target });
        break;
      default: {
        const wanted = at - LEAD[verb];
        const start = Math.max(cue.sceneStart, wanted);
        if (start > wanted) score.late.push({ verb, target, by: start - wanted });
        const moment = { verb, target, at, start };
        if (verb === "peg") moment.aim = aimAt(standsAt(at), shoulderY, set.things[target]);
        score.moments.push(moment);
      }
    }
  }
  return score;
};
