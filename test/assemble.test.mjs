import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pictureOf, voiceMix } from "../src/assemble.mjs";

describe("pictureOf", () => {
  it("is the recording unless the timeline names another picture", () => {
    assert.equal(pictureOf({}), "raw.webm");
    assert.equal(pictureOf({ picture: "raw.mp4" }), "raw.mp4");
  });
});

describe("voiceMix", () => {
  const mix = voiceMix([{ start: 0.5, mp3: "a.mp3" }, { start: 3, mp3: "b.mp3" }]);

  it("takes each scene's audio as an input after the picture", () => {
    assert.deepEqual(mix.inputs, ["-i", "a.mp3", "-i", "b.mp3"]);
  });

  it("delays each to its start and mixes them without changing their level", () => {
    assert.match(mix.filter, /\[1:a\]adelay=500:all=1\[a0\]/);
    assert.match(mix.filter, /\[2:a\]adelay=3000:all=1\[a1\]/);
    assert.match(mix.filter, /amix=inputs=2:normalize=0,apad\[a\]$/);
  });
});
