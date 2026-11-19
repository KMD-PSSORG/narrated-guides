import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REST, SPRINGS, envelope, handsAt, targetAt } from "../src/cartoon/pose.mjs";
import { planWalk } from "../src/cartoon/walk.mjs";

const empty = { startX: 1240, walks: [], moments: [], gaze: [], pictures: [], shots: [], late: [] };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("envelope", () => {
  const shape = { start: 1, rise: 0.2, hold: 1, fall: 0.3 };

  it("winds up the other way before it starts", () => {
    assert.equal(envelope(0.8, shape), 0);
    assert.ok(envelope(0.935, shape) < -0.1);
  });

  it("rises, holds and falls back to nothing", () => {
    assert.ok(envelope(1.1, shape) > 0 && envelope(1.1, shape) < 1);
    assert.equal(envelope(1.7, shape), 1);
    assert.equal(envelope(3, shape), 0);
  });
});

describe("targetAt", () => {
  it("is the rest pose where it stands, when nothing is asked", () => {
    assert.deepEqual(targetAt(empty, [], 2), { ...REST, sway: 1240 });
  });

  it("has a spring for every joint it poses", () => {
    assert.deepEqual(Object.keys(SPRINGS).sort(), Object.keys(REST).filter((k) => k !== "point").sort());
  });

  it("opens both arms alike", () => {
    const pose = targetAt({ ...empty, moments: [{ verb: "gestus", target: "åben", at: 5, start: 4.72 }] }, [], 5.5);
    assert.deepEqual([pose.lUpOut, pose.lUpFwd, pose.lForeOut, pose.lForeFwd], [30, 15, 105, 35]);
    assert.deepEqual([pose.rUpOut, pose.rForeOut], [30, 105]);
  });

  it("points with the aiming arm only, and turns head and body its way", () => {
    const aim = { arm: "l", body: -0.5, turn: -1, out: 100 };
    const pose = targetAt({ ...empty, moments: [{ verb: "peg", target: "tavle", at: 5, start: 4.7, aim }] }, [], 6);
    assert.deepEqual([pose.lUpOut, pose.lUpFwd, pose.lForeOut, pose.lForeFwd], [100, 45, 103, 45]);
    assert.equal(pose.rUpOut, REST.rUpOut);
    assert.equal(pose.turn, -1);
    assert.equal(pose.body, -0.5);
  });

  it("faces the way it walks and swings its arms against each other", () => {
    const pose = targetAt({ ...empty, walks: [planWalk(1240, 900, 5)] }, [], 5.6);
    assert.equal(pose.turn, -1);
    assert.equal(pose.body, -1);
    close(pose.lUpFwd - REST.lUpFwd, -(pose.rUpFwd - REST.rUpFwd));
    assert.notEqual(pose.sway, 1240);
  });

  it("lets a gesture take the arms from the walk's swing", () => {
    const walking = { ...empty, walks: [planWalk(1240, 900, 5)], moments: [{ verb: "gestus", target: "åben", at: 5.6, start: 5.3 }] };
    const pose = targetAt(walking, [], 5.9);
    assert.equal(pose.lUpFwd, 15);
    assert.equal(pose.rUpFwd, 15);
  });

  it("keeps looking where it was last told to", () => {
    const looking = { ...empty, gaze: [{ at: 1, turn: -0.8 }, { at: 9, turn: 0 }] };
    assert.equal(targetAt(looking, [], 5).turn, -0.8);
    assert.equal(targetAt(looking, [], 10).turn, 0);
  });

  it("nods at the start of a long word", () => {
    const words = [{ text: "manuskript", start: 2, end: 2.8, voice: null }, { text: "og", start: 3, end: 3.2, voice: null }];
    assert.equal(targetAt(empty, words, 2.05).nod, 6);
    assert.equal(targetAt(empty, words, 2.5).nod, 0);
    assert.equal(targetAt(empty, words, 3.05).nod, 0);
  });
});

describe("handsAt", () => {
  const waving = { ...empty, moments: [{ verb: "vink", target: "hej", at: 2, start: 1.74 }] };

  it("opens the hand that waves, and leaves the other", () => {
    assert.deepEqual(handsAt(waving, 2.5), { l: "rest", r: "open" });
  });

  it("rests both when nothing is going on", () => assert.deepEqual(handsAt(waving, 9), { l: "rest", r: "rest" }));

  it("points with the aiming hand", () => {
    const pointing = { ...empty, moments: [{ verb: "peg", target: "x", at: 2, start: 1.7, aim: { arm: "r", body: 0.5, turn: 1, out: 90 } }] };
    assert.deepEqual(handsAt(pointing, 3), { l: "rest", r: "point" });
  });
});
