/**
 * Pointing at a thing in the room. The room is flat, so a pointing aims in
 * height and not in depth: the figure turns half way towards the side the
 * thing is on and points with the arm on that side, reaching half forward.
 *
 * What has to come out right is where the arm points in the picture. The
 * half turn and the reach forward both change that, so the arm's lift is
 * solved for through the same projection the rig draws with (project.mjs),
 * and not taken as the angle on screen.
 *
 * Pure, so it also runs in a browser.
 */
export const FORWARD = 45; // degrees a pointing arm comes forward
const HALF_TURN = 0.5; // how far the body turns towards the thing

const RAD = Math.PI / 180;

/**
 * `figureX` is where the figure stands, `shoulderY` its shoulder's height on
 * screen, `thing` a point `{ x, y }`. Gives the arm that points, how far the
 * body and the head turn, and `out`, the arm's lift in degrees (0 hangs, 180
 * is straight up) at which it points at the thing on screen. A thing straight
 * above or below cannot be reached by an arm that reaches forward from a
 * half-turned body; the arm then points as near to it as it can.
 */
export const aimAt = (figureX, shoulderY, thing) => {
  const left = thing.x < figureX;
  const across = Math.abs(thing.x - figureX), down = thing.y - shoulderY;

  // Seen on screen, the arm reaches `a·sin(out) + b` towards the thing's side
  // and `f·cos(out)` down. It points at the thing when those two are in the
  // proportion `across : down`, which is one sine equation in `out`.
  const turned = (HALF_TURN * Math.PI) / 2;
  const f = Math.cos(FORWARD * RAD), a = f * Math.cos(turned), b = Math.sin(FORWARD * RAD) * Math.sin(turned);
  const size = Math.hypot(a * down, f * across);
  let out = 90;
  if (size > 0) {
    const phase = Math.atan2(f * across, a * down);
    const swing = Math.asin(Math.min(1, Math.max(-1, (-b * down) / size)));
    const within = (angle) => Math.min(Math.PI, Math.max(0, angle));
    const agreement = (angle) => {
      const x = a * Math.sin(angle) + b, y = f * Math.cos(angle);
      return (x * across + y * down) / Math.hypot(x, y);
    };
    const [first, second] = [within(phase + swing), within(phase + Math.PI - swing)];
    out = (agreement(first) >= agreement(second) ? first : second) / RAD;
  }
  return { arm: left ? "l" : "r", body: left ? -HALF_TURN : HALF_TURN, turn: left ? -1 : 1, out };
};
