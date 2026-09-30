import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stamp, subtitleCues, toSrt, twoLines } from "../src/subtitles.mjs";

describe("stamp", () => {
  it("formats seconds as an srt timestamp", () => {
    assert.equal(stamp(3723.456), "01:02:03,456");
  });

  it("clamps negative times to zero", () => {
    assert.equal(stamp(-1), "00:00:00,000");
  });
});

describe("twoLines", () => {
  it("leaves a short line alone", () => {
    assert.equal(twoLines("Short line.", 42), "Short line.");
  });

  it("breaks a long line at the space nearest the middle", () => {
    assert.equal(twoLines("aaaa bbbb cccc dddd", 10), "aaaa bbbb\ncccc dddd");
  });
});

describe("subtitleCues", () => {
  const w = (text, start, end) => ({ text, start, end });

  it("ends a cue at a sentence end and offsets it by the scene's start", () => {
    const cues = subtitleCues([{ start: 10, words: [w("Hello", 0, 0.4), w("there.", 0.5, 0.9), w("Next", 1.0, 1.3)] }]);
    assert.deepEqual(cues, [
      { from: 10, to: 10.9, text: "Hello there." },
      { from: 11, to: 11.3, text: "Next" },
    ]);
  });

  it("ends a cue at a pause longer than half a second", () => {
    const cues = subtitleCues([{ start: 0, words: [w("One", 0, 0.3), w("two", 1.0, 1.3)] }]);
    assert.deepEqual(cues.map((c) => c.text), ["One", "two"]);
  });

  it("writes three dots as an ellipsis", () => {
    const [cue] = subtitleCues([{ start: 0, words: [w("Well...", 0, 0.5)] }]);
    assert.equal(cue.text, "Well…");
  });

  it("starts a new cue before a group grows past two lines", () => {
    const words = Array.from({ length: 30 }, (_, i) => w("word", i * 0.3, i * 0.3 + 0.2));
    const cues = subtitleCues([{ start: 0, words }], { maxLine: 20 });
    assert.ok(cues.length > 1);
    for (const cue of cues) for (const line of cue.text.split("\n")) assert.ok(line.length <= 20, line);
  });
});

describe("toSrt", () => {
  it("numbers the cues and holds each up to a second after its last word", () => {
    assert.equal(
      toSrt([{ from: 1, to: 2, text: "A" }, { from: 5, to: 6, text: "B" }]),
      "1\n00:00:01,000 --> 00:00:03,000\nA\n\n2\n00:00:05,000 --> 00:00:07,000\nB\n",
    );
  });

  it("takes a cue down just before the next one starts", () => {
    const srt = toSrt([{ from: 1, to: 2, text: "A" }, { from: 2.4, to: 3, text: "B" }]);
    assert.match(srt, /00:00:01,000 --> 00:00:02,350/);
  });

  it("never takes a cue down before its last word", () => {
    const srt = toSrt([{ from: 1, to: 2, text: "A" }, { from: 1.9, to: 3, text: "B" }]);
    assert.match(srt, /00:00:01,000 --> 00:00:02,000/);
  });
});
