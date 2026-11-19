import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sample, simulate } from "../src/cartoon/springs.mjs";

const step = (t) => ({ arm: t < 1 ? 0 : 10 });

describe("simulate", () => {
  const loose = simulate(step, { arm: [21, 0.5] }, 5);

  it("starts where the target starts, at rest", () => assert.equal(sample(loose, "arm", 0.5), 0));

  it("settles on its target", () => assert.ok(Math.abs(sample(loose, "arm", 4.5) - 10) < 0.01));

  it("overshoots when it is loosely damped, and does not when it is not", () => {
    assert.ok(Math.max(...loose.tracks.arm) > 10.2);
    assert.ok(Math.max(...simulate(step, { arm: [21, 1] }, 5).tracks.arm) <= 10.001);
  });

  it("gives the same track every time", () => {
    assert.deepEqual(simulate(step, { arm: [21, 0.5] }, 5).tracks.arm, loose.tracks.arm);
  });

  it("can be asked about any moment, before the start and after the end too", () => {
    assert.equal(sample(loose, "arm", -1), 0);
    assert.ok(Number.isFinite(sample(loose, "arm", 99)));
  });
});
