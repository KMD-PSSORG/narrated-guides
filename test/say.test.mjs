import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spreadWords } from "../src/timing.mjs";
import { guardSay, sayHash } from "../src/tts.mjs";

describe("spreadWords", () => {
  const words = spreadWords(["Hej", "verden"], 2.2);

  it("shares the time by each word's length plus one", () => {
    assert.deepEqual(words.map((w) => w.text), ["Hej", "verden"]);
    assert.ok(Math.abs(words[0].end - 0.8) < 1e-9);
  });

  it("covers the whole clip without gaps", () => {
    assert.equal(words[0].start, 0);
    assert.equal(words[1].start, words[0].end);
    assert.ok(Math.abs(words[1].end - 2.2) < 1e-9);
  });

  it("gives no words for no speech", () => assert.deepEqual(spreadWords([], 1), []));
});

describe("sayHash", () => {
  it("can never be mistaken for a voiced scene's hash", () => {
    assert.match(sayHash("Hej"), /^say:[0-9a-f]{16}$/);
    assert.notEqual(sayHash("Hej"), sayHash("Hej!"));
  });
});

describe("guardSay", () => {
  it("lets a new scene and an earlier trial through", () => {
    guardSay(null, "scene-01");
    guardSay({ timing: "say", hash: sayHash("Hej") }, "scene-01");
  });

  it("refuses to replace a scene that ElevenLabs voiced", () => {
    assert.throws(() => guardSay({ timing: "with-timestamps", hash: "0123456789abcdef" }, "scene-01"), /scene-01.*ElevenLabs/s);
    assert.throws(() => guardSay({ timing: "forced-alignment", hash: "0123456789abcdef" }, "scene-01"), /ElevenLabs/);
  });
});
