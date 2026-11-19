import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STEP, feetAt, planWalk, walkAt } from "../src/cartoon/walk.mjs";

const close = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);
const walk = planWalk(1240, 900, 5);

describe("planWalk", () => {
  it("takes a whole number of even steps", () => {
    assert.equal(walk.steps, 4);
    close(walk.step, STEP);
    close(walk.duration, 340 / 190);
  });

  it("has nothing to do when it is already there", () => {
    assert.deepEqual(planWalk(900, 900, 5), { start: 5, from: 900, to: 900, duration: 0, steps: 0, step: 0 });
  });
});

describe("walkAt", () => {
  it("stands at the start before the walk and on the mark after it", () => {
    assert.equal(walkAt([walk], 4, 1240).x, 1240);
    assert.equal(walkAt([walk], 20, 1240).x, 900);
    assert.equal(walkAt([walk], 20, 1240).weight, 0);
  });

  it("faces the way it goes while it walks", () => assert.equal(walkAt([walk], 5.9, 1240).dir, -1));

  it("is never anything but a number, even for a walk of no distance", () => {
    const still = walkAt([planWalk(900, 900, 5)], 5, 900);
    for (const key of ["x", "progress", "weight", "dir", "step"]) assert.ok(Number.isFinite(still[key]), key);
    for (const foot of Object.values(feetAt(still))) assert.ok(foot.every(Number.isFinite));
  });
});

describe("feetAt", () => {
  // Two moments in the same step, in the middle of the walk where the weight is 1.
  const moments = [5.75, 5.8].map((t) => walkAt([walk], t, 1240));

  it("keeps the planted foot where it landed while the body travels", () => {
    assert.equal(Math.floor(moments[0].progress), Math.floor(moments[1].progress));
    assert.equal(moments[0].weight, 1);
    const planted = Math.floor(moments[0].progress) % 2 === 0 ? "r" : "l";
    const [a, b] = moments.map((m) => m.x + feetAt(m)[planted][0]);
    close(a, b, 1e-6);
    assert.notEqual(moments[0].x, moments[1].x);
  });

  it("lifts one foot at a time", () => {
    for (let t = 5; t < 7; t += 0.03) {
      const feet = feetAt(walkAt([walk], t, 1240));
      assert.ok(feet.l[1] === 0 || feet.r[1] === 0);
    }
  });
});
