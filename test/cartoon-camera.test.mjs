import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVE, cameraAt } from "../src/cartoon/camera.mjs";

const total = { x: 0, y: 0, width: 1920, height: 1080 };
const tavle = { x: 105, y: 220, width: 640, height: 360 };
const set = { shots: { total, tavle } };

describe("cameraAt", () => {
  it("shows the whole room until it is told otherwise", () => {
    assert.deepEqual(cameraAt([], set, 3), total);
    assert.deepEqual(cameraAt([{ at: 5, name: "tavle" }], set, 4.9), total);
  });

  it("is on its way a moment after the cue, and there once the move is over", () => {
    const shots = [{ at: 5, name: "tavle" }];
    const moving = cameraAt(shots, set, 5 + MOVE / 2);
    assert.ok(moving.width < 1920 && moving.width > 640);
    assert.deepEqual(cameraAt(shots, set, 5 + MOVE), tavle);
    assert.deepEqual(cameraAt(shots, set, 60), tavle);
  });

  it("sets off from wherever it had got to when it is told again mid-move", () => {
    const shots = [{ at: 5, name: "tavle" }, { at: 5.3, name: "total" }];
    const turned = cameraAt(shots, set, 5.3);
    assert.ok(turned.width < 1920 && turned.width > 640);
    assert.deepEqual(cameraAt(shots, set, 5.3 + MOVE), total);
  });
});
