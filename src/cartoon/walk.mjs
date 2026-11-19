/**
 * Walking. The body eases from one place to another in a whole number of even
 * steps. One foot swings forward through an arc while the other stays where
 * it landed, so nothing slides on the floor.
 *
 * Pure, so it also runs in a browser.
 */
export const SPEED = 190; // pixels a second
export const STEP = 85; // the length a step is as near to as the distance allows

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** A walk from `from` to `to` that sets off at `start`. A walk of no distance takes no time and no steps. */
export const planWalk = (from, to, start) => {
  const distance = Math.abs(to - from);
  const steps = distance === 0 ? 0 : Math.max(1, Math.round(distance / STEP));
  return { start, from, to, duration: distance / SPEED, steps, step: steps ? distance / steps : 0 };
};

/**
 * Where the body is at `t`. `progress` is how many steps it has taken in the
 * walk it is on; `weight` fades the walk in and out over its first and last
 * seventh; `dir` is the way it goes, -1 to the left. A walk that has set off
 * takes over from the one before it, wherever that had got to.
 */
export const walkAt = (walks, t, startX) => {
  let at = { x: startX, progress: 0, weight: 0, dir: 0, step: 0 };
  for (const [i, walk] of walks.entries()) {
    if (t < walk.start) continue;
    const f = walk.duration ? Math.min(1, (t - walk.start) / walk.duration) : 1;
    const x = walk.from + (walk.to - walk.from) * ease(f);
    at = f < 1
      ? { x, progress: Math.abs(x - walk.from) / walk.step, weight: Math.min(1, f * 7, (1 - f) * 7), dir: Math.sign(walk.to - walk.from), step: walk.step }
      : { x: walk.to, progress: 0, weight: 0, dir: 0, step: 0 };

    // A walk that takes over from one in mid-stride starts with its own
    // weight at nothing, which would snap the legs together in one frame. So
    // it carries the stride it interrupted and lets it fade as its own fades in.
    const interrupted = walkAt(walks.slice(0, i), walk.start, startX);
    const fade = 1 - ease((t - walk.start) / LET_GO);
    if (fade > 0 && (interrupted.weight > 0 || interrupted.carry)) at.carry = { ...interrupted, fade };
  }
  return at;
};

const LET_GO = 0.3; // seconds an interrupted stride takes to fade

/** A stride on its own, without what it may carry. */
const strideOf = ({ progress, weight, dir, step }) => {
  const n = Math.floor(progress), f = progress - n;
  const swinging = [(-0.5 + ease(f)) * step * dir * weight, -Math.sin(Math.PI * f) * 34 * weight];
  const planted = [(0.5 - f) * step * dir * weight, 0];
  return n % 2 === 0 ? { l: swinging, r: planted } : { l: planted, r: swinging };
};

/**
 * Each foot's offset from the body, `[along, up]`, before the hips' own
 * spread; `up` is zero or negative. Within a step the planted foot falls
 * behind the body exactly as fast as the body moves on, which is what keeps
 * it still on the floor. The left foot swings on even steps.
 */
export const feetAt = (walk) => {
  const own = strideOf(walk);
  if (!walk.carry) return own;
  const carried = feetAt(walk.carry), k = walk.carry.fade;
  return { l: [own.l[0] + carried.l[0] * k, own.l[1] + carried.l[1] * k], r: [own.r[0] + carried.r[0] * k, own.r[1] + carried.r[1] * k] };
};

/**
 * What the walk does to the body: `bob`, down as a foot lands and up as it
 * passes, and `lean`, in degrees, the way it is going.
 */
export const bodyAt = (walk) => {
  const f = walk.progress - Math.floor(walk.progress);
  const own = { bob: 8 * walk.weight * Math.cos(2 * Math.PI * f), lean: walk.dir * 3 * walk.weight };
  if (!walk.carry) return own;
  const carried = bodyAt(walk.carry), k = walk.carry.fade;
  return { bob: own.bob + carried.bob * k, lean: own.lean + carried.lean * k };
};
