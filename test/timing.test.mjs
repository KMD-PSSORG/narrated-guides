import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_LEADS, anchorCues, cueDue, wordsFromCharacters } from "../src/timing.mjs";

const chars = (text) => [...text];

describe("wordsFromCharacters", () => {
  it("groups character timings into words and skips audio tags", () => {
    const text = "[calm] Hi yo";
    const starts = chars(text).map((_, i) => i);
    const ends = chars(text).map((_, i) => i + 0.5);
    assert.deepEqual(wordsFromCharacters(chars(text), starts, ends), [
      { text: "Hi", start: 7, end: 8.5 },
      { text: "yo", start: 10, end: 11.5 },
    ]);
  });

  it("splits a word that runs straight into a tag", () => {
    const text = "Hi[pause]yo";
    const times = chars(text).map((_, i) => i);
    assert.deepEqual(
      wordsFromCharacters(chars(text), times, times).map((w) => w.text),
      ["Hi", "yo"],
    );
  });
});

describe("anchorCues", () => {
  const words = [
    { text: "One", start: 0.1, end: 0.4 },
    { text: "two", start: 0.5, end: 0.8 },
    { text: "three", start: 0.9, end: 1.3 },
  ];
  const scene = (cues, text = "One two three") => ({ number: 4, text, cues });

  it("times a cue at the start of the word it is anchored to", () => {
    const { cues } = anchorCues(scene([{ verb: "klik", target: "Save", word: 1 }]), words);
    assert.deepEqual(cues, [{ verb: "klik", target: "Save", word: 1, at: 0.5, anchor: "two" }]);
  });

  it("times a cue after the last word at that word's end", () => {
    const { cues } = anchorCues(scene([{ verb: "vis", target: "card", word: 3 }]), words);
    assert.equal(cues[0].at, 1.3);
    assert.equal(cues[0].anchor, "three");
  });

  it("warns when the voice timed a different number of words than the text holds", () => {
    const { warning } = anchorCues(scene([], "One two three four"), words);
    assert.match(warning, /scene 4: 3 timed words, 4 in the text/);
  });

  it("does not warn when the counts agree", () => {
    assert.equal(anchorCues(scene([]), words).warning, null);
  });
});

describe("cueDue", () => {
  it("brings a cue forward by its verb's lead", () => {
    assert.equal(cueDue(10_000, { verb: "peg", at: 2 }, DEFAULT_LEADS), 10_000 + (2 - 0.65) * 1000);
  });

  it("gives verbs without a lead none", () => {
    assert.equal(cueDue(0, { verb: "custom", at: 1.5 }, DEFAULT_LEADS), 1500);
  });

  it("has the leads the recorder was tuned with", () => {
    assert.deepEqual(DEFAULT_LEADS, { peg: 0.65, klik: 0.65, ring: 0.15, vis: 0.1, fremhæv: 0.1, trin: 0.1, skriv: 0 });
  });
});
