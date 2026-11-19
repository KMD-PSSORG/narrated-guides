/**
 * What every joint is asked to be at a moment of the film, before the
 * springs: the rest pose, whatever gestures are under way, the walk, where
 * the figure was told to look, and a nod on the long words.
 *
 * An arm is posed against the body, not the screen (see project.mjs). Each of
 * its two pieces has two angles in degrees: how far it is lifted out to its
 * own side (0 hangs, 90 is straight out, 180 straight up) and how far it comes
 * forward (90 points where the chest does). `lUpOut` is the left upper arm's
 * lift, `rForeFwd` how far the right forearm comes forward, and so on. Left
 * and right are the picture's, with the figure seen from the front.
 *
 * Pure, so it also runs in a browser.
 */
import { walkAt } from "./walk.mjs";

const arm = (side, [upOut, upFwd, foreOut, foreFwd]) => ({
  [`${side}UpOut`]: upOut,
  [`${side}UpFwd`]: upFwd,
  [`${side}ForeOut`]: foreOut,
  [`${side}ForeFwd`]: foreFwd,
});

/** Standing, arms hanging a little out and the forearms a little forward, looking out. */
export const REST = { ...arm("l", [7, 0, 13, 10]), ...arm("r", [7, 0, 13, 10]), brow: 0, turn: 0, body: 0, nod: 0, sway: 0 };

/** How each joint chases its target: [speed, damping]. The forearm is slower than the upper arm, so it trails. */
const UPPER = [21, 0.62], FORE = [18, 0.58];
export const SPRINGS = {
  lUpOut: UPPER, lUpFwd: UPPER, rUpOut: UPPER, rUpFwd: UPPER,
  lForeOut: FORE, lForeFwd: FORE, rForeOut: FORE, rForeFwd: FORE,
  brow: [30, 0.45], turn: [12, 0.75], body: [9, 0.85], nod: [20, 0.45], sway: [9, 0.35],
};

/** How long each momentary verb rises, holds and falls, in seconds. */
export const MOMENTS = {
  vink: { rise: 0.16, hold: 1.05, fall: 0.3 },
  gestus: { rise: 0.18, hold: 1.2, fall: 0.35 },
  peg: { rise: 0.2, hold: 2.3, fall: 0.35 },
  bryn: { rise: 0.1, hold: 1.1, fall: 0.25 },
};

const WIND_UP = 0.13;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * How much of a moment there is at `t`: a small dip the other way first, the
 * wind-up before a move, then 0 to 1 over `rise`, held for `hold`, and back
 * over `fall`.
 */
export const envelope = (t, { start, rise, hold, fall }) =>
  t < start - WIND_UP ? 0
  : t < start ? -0.16 * Math.sin((Math.PI * (t - start + WIND_UP)) / WIND_UP)
  : t < start + rise ? ease((t - start) / rise)
  : t < start + rise + hold ? 1
  : 1 - ease((t - start - rise - hold) / fall);

/** What a moment asks for: the joints it sets, which arms those are, the hands, and where head and body turn. */
const asked = (moment) => {
  switch (moment.verb) {
    case "vink":
      return { pose: arm("r", [72, 10, 165, 10]), arms: ["r"], hands: { r: "open" } };
    case "gestus":
      return { pose: { ...arm("l", [30, 15, 105, 35]), ...arm("r", [30, 15, 105, 35]) }, arms: ["l", "r"], hands: { l: "open", r: "open" } };
    case "peg": {
      const { arm: side, out, turn, body } = moment.aim;
      return { pose: arm(side, [out, 45, out + 3, 45]), arms: [side], hands: { [side]: "point" }, turn, body };
    }
    case "bryn":
      return { pose: { brow: 1 }, arms: [], hands: {} };
    default:
      throw new Error(`No pose for {${moment.verb}: ${moment.target}}.`);
  }
};

const weightOf = (moment, t) => envelope(t, { start: moment.start, ...MOMENTS[moment.verb] });

/** The pose asked for at `t`. `words` are the film's words, on its clock. */
export const targetAt = (score, words, t) => {
  const pose = { ...REST };
  const walk = walkAt(score.walks, t, score.startX);

  // Where it was last told to look; a walk and a pointing borrow the head and give it back.
  for (const gaze of score.gaze) if (gaze.at <= t) pose.turn = gaze.turn;
  pose.turn += walk.weight * (walk.dir - pose.turn);
  pose.body += walk.weight * (walk.dir - pose.body);

  const taken = { l: 0, r: 0 }; // how much of each arm a gesture holds
  for (const moment of score.moments) {
    const w = weightOf(moment, t);
    if (!w) continue;
    const ask = asked(moment);
    for (const key in ask.pose) pose[key] += w * (ask.pose[key] - REST[key]);
    for (const side of ask.arms) taken[side] = Math.max(taken[side], Math.min(1, Math.max(0, w)));
    if (ask.turn !== undefined) pose.turn += w * (ask.turn - pose.turn);
    if (ask.body !== undefined) pose.body += w * (ask.body - pose.body);
    if (moment.verb === "vink" && w > 0) {
      pose.rForeOut += w * 22 * Math.sin((t - moment.start) * 15);
      pose.rUpOut += w * 5 * Math.sin((t - moment.start) * 15 + 1);
    }
  }

  // The arms swing against each other with the steps, elbows a little bent,
  // unless a gesture has taken them.
  const swing = Math.sin(walk.progress * Math.PI) * walk.weight;
  pose.lUpFwd += 24 * swing * (1 - taken.l);
  pose.rUpFwd -= 24 * swing * (1 - taken.r);
  pose.lForeFwd += (24 * swing + 22 * walk.weight) * (1 - taken.l);
  pose.rForeFwd += (-24 * swing + 22 * walk.weight) * (1 - taken.r);

  const long = (word) => [...word.text].filter((c) => /\p{L}/u.test(c)).length >= 6;
  // The time first: this runs for every step of the springs, and counting
  // the letters of every word in the film each time would add up.
  pose.nod = words.some((word) => t >= word.start && t < word.start + 0.12 && long(word)) ? 6 : 0;
  pose.sway = walk.x;
  return pose;
};

/** Each hand's pose at `t`: "rest", "open" or "point". A gesture has the hand while most of it is there. */
export const handsAt = (score, t) => {
  const hands = { l: "rest", r: "rest" };
  for (const moment of score.moments) if (weightOf(moment, t) > 0.4) Object.assign(hands, asked(moment).hands);
  return hands;
};
