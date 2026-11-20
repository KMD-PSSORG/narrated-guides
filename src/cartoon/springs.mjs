/**
 * Springs. Every joint chases the pose it is asked for like a weight on a
 * spring, so it overshoots a little and settles, and a slower joint trails a
 * faster one. That is most of what makes a drawn figure move like a cartoon.
 *
 * A spring remembers where it was, which a film rendered one frame at a time,
 * in any order, cannot allow. So the springs are simulated once, from the
 * start, in fixed steps, and a frame only looks the result up.
 *
 * Pure, so it also runs in a browser.
 */

/**
 * `targetAt(t)` gives what each joint is asked to be; `springs` gives each
 * joint's `[speed, damping]` (damping under 1 overshoots). Every joint starts
 * at rest on its first target. Steps `rate` times a second and keeps every
 * `keep`-th value.
 */
export const simulate = (targetAt, springs, length, rate = 240, keep = 2) => {
  const dt = 1 / rate;
  const steps = Math.ceil(length * rate) + 1;
  const first = targetAt(0);
  const state = {};
  const tracks = {};
  for (const key in springs) {
    state[key] = { x: first[key], v: 0 };
    tracks[key] = new Float32Array(Math.ceil(steps / keep));
  }
  for (let i = 0; i < steps; i++) {
    const target = targetAt(i * dt);
    for (const key in springs) {
      const [speed, damping] = springs[key];
      const s = state[key];
      s.v += (speed * speed * (target[key] - s.x) - 2 * damping * speed * s.v) * dt;
      s.x += s.v * dt;
      if (i % keep === 0) tracks[key][i / keep] = s.x;
    }
  }
  return { perSecond: rate / keep, tracks };
};

/** A joint's value at `t`, between the two kept values around it, and the track's end beyond its ends. */
export const sample = (sim, key, t) => {
  const track = sim.tracks[key];
  const at = Math.min(track.length - 1, Math.max(0, t * sim.perSecond));
  const i = Math.min(track.length - 2, Math.floor(at));
  return track[i] + (track[i + 1] - track[i]) * (at - i);
};
