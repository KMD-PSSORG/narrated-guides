import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filmEvents, filmTimeline } from "../src/cartoon/timeline.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const scenes = [
  { scene: 1, duration: 2, voice: null, words: [{ text: "Hej", start: 0.1, end: 0.4 }], cues: [{ verb: "vink", target: "hej", word: 0, at: 0.1 }] },
  { scene: 2, duration: 3, voice: "bent", words: [], cues: [] },
];

describe("filmTimeline", () => {
  const timeline = filmTimeline(scenes);

  it("starts the first scene after the lead-in", () => close(timeline.scenes[0].start, 1.2));
  it("starts each scene when the one before has ended and paused", () => close(timeline.scenes[1].start, 3.65));
  it("ends after the last scene's pause and the tail", () => close(timeline.end, 9.6));
  it("starts at zero, so nothing is trimmed in assembly", () => assert.equal(timeline.start, 0));
});

describe("filmEvents", () => {
  const { cues, words } = filmEvents(scenes, filmTimeline(scenes));

  it("puts cues on the film's clock and remembers where their scene began", () => {
    close(cues[0].at, 1.3);
    close(cues[0].sceneStart, 1.2);
    assert.equal(cues[0].verb, "vink");
  });

  it("puts words on the film's clock with the voice that says them", () => {
    close(words[0].start, 1.3);
    close(words[0].end, 1.6);
    assert.equal(words[0].voice, null);
  });

  it("gets on with a scene that has no cues and no words", () => {
    assert.equal(cues.length, 1);
    assert.equal(words.length, 1);
  });
});
