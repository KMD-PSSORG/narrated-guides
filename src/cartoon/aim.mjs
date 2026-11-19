/**
 * Pointing at a thing in the room. The room is flat, so a pointing aims in
 * height and not in depth: the figure turns half way towards the side the
 * thing is on, points with the arm on that side, and lifts it to the angle
 * from its shoulder to the thing.
 *
 * Pure, so it also runs in a browser.
 */

/**
 * `figureX` is where the figure stands, `shoulderY` its shoulder's height on
 * screen, `thing` a point `{ x, y }`. `out` is the arm's lift in degrees: 0
 * hangs, 90 points level, more points up.
 */
export const aimAt = (figureX, shoulderY, thing) => {
  const left = thing.x < figureX;
  return {
    arm: left ? "l" : "r",
    body: left ? -0.5 : 0.5,
    turn: left ? -1 : 1,
    out: (Math.atan2(Math.abs(thing.x - figureX), thing.y - shoulderY) * 180) / Math.PI,
  };
};
