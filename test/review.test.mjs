import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stillTimes } from "../src/review.mjs";

describe("stillTimes", () => {
  const timeline = { start: 2, scenes: [{ scene: 1, start: 3.2 }] };
  const cues = { 1: [{ verb: "klik", target: "Save all", at: 1 }] };

  it("takes a scene's still just after its voice starts, on the finished video's clock", () => {
    const [name, at] = stillTimes(timeline, cues)[0];
    assert.equal(name, "s01-start");
    assert.ok(Math.abs(at - 1.5) < 1e-9);
  });

  it("takes a cue's still `after` seconds past its word, without adding the lead-in twice", () => {
    const [name, at] = stillTimes(timeline, cues, 1.5)[1];
    assert.equal(name, "s01-klik-Save_all");
    assert.ok(Math.abs(at - 3.7) < 1e-9);
  });

  it("gives a scene without cues only its start", () => {
    assert.equal(stillTimes(timeline, { 1: [] }).length, 1);
  });
});
