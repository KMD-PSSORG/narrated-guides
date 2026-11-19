/**
 * A drawing that turns. It is drawn twice with the same points, from the
 * front and from the side, and every number slides from the one drawing to
 * the other. Three-quarter views fall out in between.
 *
 * Pure, so it also runs in a browser.
 */
// Every way SVG writes a number: 12, -3.5, .5, 1., +2, 1e-3.
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/**
 * `front` and `profile` are SVG path data with the same count of numbers. The
 * result gives the path at `k`, 0 being the front and 1 the side.
 */
export const morph = (front, profile) => {
  const a = front.match(NUMBER).map(Number);
  const b = profile.match(NUMBER).map(Number);
  if (a.length !== b.length) throw new Error(`The two drawings differ: ${a.length} numbers in "${front}", ${b.length} in "${profile}".`);
  const between = front.split(NUMBER);
  // SVG lets two numbers run together (".5.5", "1-2"). Written out in full
  // they would merge into one, so they get a space.
  const apart = between.map((text, i) => (text === "" && i > 0 && i < a.length ? " " : text));
  return (k) => apart.reduce((d, text, i) => d + text + (i < a.length ? (a[i] + (b[i] - a[i]) * k).toFixed(2) : ""), "");
};
