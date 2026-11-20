/**
 * The camera: which part of the room is in the picture. A set names its
 * shots, and a {kamera} cue moves from wherever the camera is to the one it
 * names, easing over a little more than half a second.
 *
 * Pure, so it also runs in a browser.
 */
export const MOVE = 0.6; // seconds a move takes

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * The visible rectangle `{ x, y, width, height }` at `t`. `shots` are the
 * score's, in order: `{ at, name }`. The film opens on the set's `total`.
 */
export const cameraAt = (shots, set, t) => {
  let from = set.shots.total, to = set.shots.total, since = -MOVE;
  const at = (moment) => {
    // Subtracting two times leaves dust; a move that is over is exactly over.
    const k = (moment - since) / MOVE > 1 - 1e-9 ? 1 : ease((moment - since) / MOVE);
    const between = (key) => from[key] + (to[key] - from[key]) * k;
    return { x: between("x"), y: between("y"), width: between("width"), height: between("height") };
  };
  for (const shot of shots) {
    if (shot.at > t) break;
    from = at(shot.at);
    to = set.shots[shot.name];
    since = shot.at;
  }
  return at(t);
};
