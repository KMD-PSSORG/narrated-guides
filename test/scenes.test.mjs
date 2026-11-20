import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readScenes } from "../src/scenes.mjs";

describe("readScenes", () => {
  it("reads the scenes in order", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ng-"));
    writeFileSync(path.join(dir, "scene-02.json"), JSON.stringify({ scene: 2 }));
    writeFileSync(path.join(dir, "scene-01.json"), JSON.stringify({ scene: 1 }));
    assert.deepEqual(readScenes(dir).map((s) => s.number), [1, 2]);
  });

  it("says to voice again when a voicing was interrupted and left a scene unfinished", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ng-"));
    writeFileSync(path.join(dir, "scene-01.json"), JSON.stringify({ scene: 1, duration: 2, words: [], cues: [] }));
    writeFileSync(path.join(dir, "scene-02.json"), JSON.stringify({ scene: 2, hash: "say:unfinished", timing: "say" }));
    assert.throws(() => readScenes(dir), /scene-02.*unfinished.*tts/s);
  });

  it("says to run tts when there is nothing to read", () => {
    assert.throws(() => readScenes(path.join(tmpdir(), "ng-not-there")), /tts/);
    assert.throws(() => readScenes(mkdtempSync(path.join(tmpdir(), "ng-"))), /tts/);
  });
});
