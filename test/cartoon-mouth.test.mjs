import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mouthTrack, shapeAt } from "../src/cartoon/mouth.mjs";

const words = [{ text: "Mama,", start: 0, end: 1.2 }, { text: "FY", start: 2, end: 2.3 }, { text: "Åh", start: 3, end: 3.3 }];

describe("shapeAt", () => {
  it("takes the shape of the letter being said, vowels lasting twice as long", () => {
    assert.equal(shapeAt(words, 0.05), "M");
    assert.equal(shapeAt(words, 0.4), "A");
    assert.equal(shapeAt(words, 0.7), "M");
    assert.equal(shapeAt(words, 1.1), "A");
  });

  it("ignores case and punctuation, and knows the Danish vowels", () => {
    assert.equal(shapeAt(words, 2.01), "F");
    assert.equal(shapeAt(words, 2.25), "O");
    assert.equal(shapeAt(words, 3.05), "O");
  });

  it("is shut between words and when nothing is said", () => {
    assert.equal(shapeAt(words, 1.5), "X");
    assert.equal(shapeAt([], 1), "X");
    assert.equal(shapeAt([{ text: "…", start: 0, end: 1 }], 0.5), "X");
  });
});

describe("mouthTrack", () => {
  const track = mouthTrack(words, 4, 30);

  it("has a shape for every frame", () => assert.equal(track.length, 120));
  it("holds each shape for two frames", () => {
    for (let f = 0; f < track.length; f += 2) assert.equal(track[f], track[f + 1]);
  });
  it("is shut all the way through a film without words", () => {
    assert.ok(mouthTrack([], 1, 30).every((shape) => shape === "X"));
  });
});
