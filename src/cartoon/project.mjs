/**
 * From the body's own directions to the screen.
 *
 * A figure is posed against itself: an arm is lifted out to its side and
 * brought forward, wherever the body happens to face. Posed as angles on the
 * screen instead, a pose is right from the front and wrong from everywhere
 * else: open arms on a body seen from the side put one arm behind its back.
 * Here the body's turn is applied last, which also shortens what points at us.
 *
 * Pure, so it also runs in a browser.
 */
const RAD = Math.PI / 180;

/**
 * How a turn is seen. `turn` runs from -1 (side on, facing left) through 0
 * (the front) to 1 (facing right). `c` and `s` are the cosine and sine of the
 * angle turned; `to` is 1 when it faces left or the front, -1 facing right.
 */
export const viewOf = (turn) => {
  const angle = (Math.min(1, Math.abs(turn)) * Math.PI) / 2;
  return { c: Math.cos(angle), s: Math.sin(angle), to: turn > 0 ? -1 : 1 };
};

/**
 * A piece of a limb as the picture sees it. `side` is -1 for the limb on the
 * left of the picture from the front, 1 for the right. `out` lifts it to its
 * own side (0 hangs, 90 is straight out, 180 straight up) and `fwd` brings it
 * forward (90 points where the chest does), both in degrees. `v` is its
 * direction on screen, shorter the more it points at us; `dir` is `v` at
 * length one, or straight down when there is too little of it to tell.
 */
export const limbSeen = (side, out, fwd, view) => {
  const x = side * Math.sin(out * RAD) * Math.cos(fwd * RAD);
  const y = Math.cos(out * RAD) * Math.cos(fwd * RAD);
  const z = Math.sin(fwd * RAD);
  const v = [x * view.c - view.to * z * view.s, y];
  const length = Math.hypot(v[0], v[1]);
  return { v, length, dir: length < 0.05 ? [0, 1] : [v[0] / length, v[1] / length] };
};

/**
 * A feature on a turned head or body, drawn facing left: it sits `x` across
 * and `depth` out from the middle. Gives where it lands across the picture,
 * and how much it faces us, from 1 (towards us) to 0 (edge on, or behind).
 */
export const featureSeen = (x, depth, view) => ({
  x: x * view.c - depth * view.s,
  towards: Math.max(0, (x * view.s + depth * view.c) / depth),
});
