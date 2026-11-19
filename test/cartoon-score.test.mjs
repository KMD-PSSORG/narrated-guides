import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aimAt } from "../src/cartoon/aim.mjs";
import { checkCues, scoreOf } from "../src/cartoon/score.mjs";

const set = {
  floor: 905,
  marks: { midt: { x: 1240 }, tavle: { x: 900 } },
  things: { tavle: { x: 425, y: 400 }, vindue: { x: 1575, y: 300 } },
  shots: { total: { x: 0, y: 0, width: 1920, height: 1080 } },
  screen: { x: 150, y: 230, width: 550, height: 340 },
};
const cue = (verb, target, at, sceneStart = 0) => ({ verb, target, at, sceneStart, scene: 1, voice: null });
const score = (cues) => scoreOf(cues, { set, startX: 1240, shoulderY: 460 });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

describe("aimAt", () => {
  it("points with the arm on the thing's side and turns half way to it", () => {
    const left = aimAt(1240, 400, { x: 425, y: 400 });
    assert.deepEqual([left.arm, left.body, left.turn], ["l", -0.5, -1]);
    close(left.out, 90);
    const right = aimAt(1240, 400, { x: 1575, y: 400 });
    assert.deepEqual([right.arm, right.body, right.turn], ["r", 0.5, 1]);
  });

  it("lifts the arm to the thing's height", () => {
    close(aimAt(1000, 500, { x: 900, y: 400 }).out, 135);
    close(aimAt(1000, 500, { x: 900, y: 600 }).out, 45);
  });
});

describe("checkCues", () => {
  const check = (cues) => checkCues(cues, { set, pictures: { forside: "data:…" } });

  it("passes what the set and the film can perform", () => {
    assert.deepEqual(check([
      cue("gå", "tavle", 1), cue("peg", "vindue", 2), cue("se", "kamera", 3), cue("vis", "forside", 4), cue("vis", "intet", 5),
      cue("kamera", "total", 6), cue("vink", "hej", 7), cue("gestus", "åben", 8), cue("bryn", "op", 9),
    ]), []);
  });

  it("names the cue and lists what there is, for each kind of name", () => {
    assert.match(check([cue("gå", "døren", 1)])[0], /\{gå: døren\}.*midt.*tavle/s);
    assert.match(check([cue("peg", "døren", 1)])[0], /tavle.*vindue/s);
    assert.match(check([cue("vis", "bagside", 1)])[0], /forside/);
    assert.match(check([cue("kamera", "tæt", 1)])[0], /total/);
    assert.match(check([cue("gestus", "bue", 1)])[0], /åben/);
  });

  it("does not know a verb from another track", () => {
    assert.match(check([cue("klik", "Save", 1)])[0], /\{klik: Save\}/);
  });

  it("finds every problem, not only the first", () => {
    assert.equal(check([cue("gå", "x", 1), cue("peg", "y", 2)]).length, 2);
  });
});

describe("scoreOf", () => {
  it("is a figure standing still when there are no cues", () => {
    assert.deepEqual(score([]), { startX: 1240, walks: [], moments: [], gaze: [], pictures: [], shots: [], late: [] });
  });

  it("starts a walk on its word, from where the figure stands", () => {
    const { walks } = score([cue("gå", "tavle", 3)]);
    assert.equal(walks[0].start, 3);
    assert.equal(walks[0].from, 1240);
    assert.equal(walks[0].to, 900);
  });

  it("remembers where the figure went, across scenes", () => {
    const { walks } = score([cue("gå", "tavle", 3), cue("gå", "midt", 20, 18)]);
    assert.equal(walks[1].from, 900);
  });

  it("sets off from where it is when a walk interrupts a walk", () => {
    const { walks } = score([cue("gå", "tavle", 3), cue("gå", "midt", 3.9)]);
    assert.ok(walks[1].from < 1240 && walks[1].from > 900);
  });

  it("starts a gesture early enough to arrive on its word", () => {
    const [moment] = score([cue("gestus", "åben", 5)]).moments;
    close(moment.start, 4.72);
    assert.equal(moment.at, 5);
  });

  it("holds a gesture back to its scene's start, and says by how much", () => {
    const { moments, late } = score([cue("vink", "hej", 10.1, 10)]);
    assert.equal(moments[0].start, 10);
    assert.equal(late.length, 1);
    close(late[0].by, 0.16);
  });

  it("aims a pointing from where the figure is by then", () => {
    const { moments } = score([cue("gå", "tavle", 1), cue("peg", "vindue", 10)]);
    assert.equal(moments[0].aim.arm, "r");
    close(moments[0].aim.out, aimAt(900, 460, set.things.vindue).out);
  });

  it("keeps a gaze, a picture and a shot as states with the moment they change", () => {
    const { gaze, pictures, shots } = score([cue("se", "tavle", 1), cue("se", "kamera", 2), cue("vis", "forside", 3), cue("vis", "intet", 4), cue("kamera", "total", 5)]);
    assert.deepEqual(gaze, [{ at: 1, turn: -0.8 }, { at: 2, turn: 0 }]);
    assert.deepEqual(pictures, [{ at: 3, name: "forside" }, { at: 4, name: null }]);
    assert.deepEqual(shots, [{ at: 5, name: "total" }]);
  });
});
