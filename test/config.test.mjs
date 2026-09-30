import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readVoiceSecrets, resolveConfig } from "../src/config.mjs";

describe("resolveConfig", () => {
  const root = "/project";

  it("fills in defaults", () => {
    const config = resolveConfig({}, root);
    assert.deepEqual(config.viewport, { width: 1760, height: 990 });
    assert.equal(config.voice.model, "eleven_v4");
    assert.equal(config.outDir, "/project/video/out");
    assert.equal(config.manuscripts, "/project/video/manuscripts");
    assert.equal(config.voice.envFile, "/project/.elevenlabs.env");
    assert.deepEqual(config.initScripts, []);
  });

  it("resolves the project's relative paths against its root", () => {
    const config = resolveConfig(
      { outDir: "docs/video/out", manuscripts: "docs/video/manuskript", voice: { envFile: "ignored/elevenlabs.txt" } },
      root,
    );
    assert.equal(config.outDir, "/project/docs/video/out");
    assert.equal(config.manuscripts, "/project/docs/video/manuskript");
    assert.equal(config.voice.envFile, "/project/ignored/elevenlabs.txt");
    assert.equal(config.voice.model, "eleven_v4");
  });

  it("keeps absolute paths", () => {
    assert.equal(resolveConfig({ outDir: "/elsewhere/out" }, root).outDir, "/elsewhere/out");
  });

  it("merges the project's leads over the defaults", () => {
    const { leads } = resolveConfig({ leads: { peg: 0.8, zoom: 0.2 } }, root);
    assert.equal(leads.peg, 0.8);
    assert.equal(leads.zoom, 0.2);
    assert.equal(leads.klik, 0.65);
  });

  it("refuses a browser opener that is not a function", () => {
    assert.throws(() => resolveConfig({ openBrowser: "chromium" }, root), /openBrowser must be a function/);
  });
});

describe("readVoiceSecrets", () => {
  const file = (content) => {
    const dir = mkdtempSync(path.join(tmpdir(), "ng-"));
    const at = path.join(dir, "voice.env");
    writeFileSync(at, content);
    return at;
  };

  it("reads the key and the voice", () => {
    assert.deepEqual(
      readVoiceSecrets(file("ELEVEN_LABS_API_KEY=abc=123\n\nVOICE_ID = v1 \n")),
      { key: "abc=123", voice: "v1" },
    );
  });

  it("names the file and the missing entry, and never the values", () => {
    const at = file("ELEVEN_LABS_API_KEY=supersecret\n");
    assert.throws(
      () => readVoiceSecrets(at),
      (err) => err.message.includes(at) && err.message.includes("VOICE_ID") && !err.message.includes("supersecret"),
    );
  });

  it("says where it looked when the file is missing", () => {
    assert.throws(() => readVoiceSecrets("/no/such/voice.env"), /\/no\/such\/voice\.env/);
  });
});
