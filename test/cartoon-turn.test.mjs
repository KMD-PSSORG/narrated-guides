import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { morph } from "../src/cartoon/morph.mjs";
import { featureSeen, limbSeen, viewOf } from "../src/cartoon/project.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("morph", () => {
  const slide = morph("M0,0 L10,0 Z", "M0,0 L20,10 Z");

  it("is the front drawing at 0 and the side drawing at 1", () => {
    assert.equal(slide(0), "M0.00,0.00 L10.00,0.00 Z");
    assert.equal(slide(1), "M0.00,0.00 L20.00,10.00 Z");
  });

  it("slides every number in between", () => assert.equal(slide(0.5), "M0.00,0.00 L15.00,5.00 Z"));

  it("refuses two drawings with different points", () => {
    assert.throws(() => morph("M0,0 L10,0", "M0,0 L10,0 L5,5"), /differ/);
  });
});

describe("viewOf", () => {
  it("faces the front at 0 and is side on at either end", () => {
    close(viewOf(0).c, 1);
    close(viewOf(-1).s, 1);
    assert.equal(viewOf(-1).to, 1);
    assert.equal(viewOf(1).to, -1);
  });

  it("does not turn past the profile", () => close(viewOf(-1.3).s, 1));
});

describe("limbSeen", () => {
  const open = [105, 35]; // the forearm in the open-arms gesture

  it("hangs straight down from every side", () => {
    for (const turn of [0, -0.5, -1, 1]) {
      const { v } = limbSeen(-1, 0, 0, viewOf(turn));
      close(v[0], 0);
      close(v[1], 1);
    }
  });

  it("spreads the same pose to both sides from the front", () => {
    const l = limbSeen(-1, ...open, viewOf(0)), r = limbSeen(1, ...open, viewOf(0));
    close(l.v[0], -r.v[0]);
    close(l.v[1], r.v[1]);
    assert.ok(l.v[0] < 0);
  });

  it("brings both hands in front of a body seen from the side", () => {
    const left = viewOf(-1);
    const l = limbSeen(-1, ...open, left), r = limbSeen(1, ...open, left);
    close(l.v[0], r.v[0]);
    assert.ok(l.v[0] < 0, "forward is to the left when it faces left");
    assert.ok(limbSeen(1, ...open, viewOf(1)).v[0] > 0, "and to the right when it faces right");
  });

  it("shortens an arm that points at us, and gives it a direction anyway", () => {
    const seen = limbSeen(-1, 0, 90, viewOf(0));
    assert.ok(seen.length < 0.05);
    assert.deepEqual(seen.dir, [0, 1]);
  });
});

describe("featureSeen", () => {
  it("leaves an eye where it is from the front", () => {
    close(featureSeen(30, 58, viewOf(0)).x, 30);
    close(featureSeen(30, 58, viewOf(0)).towards, 1);
  });

  it("hides the far eye in profile and keeps the near one", () => {
    assert.equal(featureSeen(-30, 58, viewOf(-1)).towards, 0);
    assert.ok(featureSeen(30, 58, viewOf(-1)).towards > 0);
    close(featureSeen(30, 58, viewOf(-1)).x, -58);
  });
});
