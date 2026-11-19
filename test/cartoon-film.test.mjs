import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { castOf, loadPictures, sampleFrames } from "../src/cartoon/film.mjs";

describe("loadPictures", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ng-"));
  writeFileSync(path.join(root, "a.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  writeFileSync(path.join(root, "a.gif"), "GIF89a");

  it("embeds a picture from the project", () => {
    assert.match(loadPictures({ forside: "a.svg" }, root).forside, /^data:image\/svg\+xml;base64,/);
  });

  it("names the picture that is not there", () => {
    assert.throws(() => loadPictures({ forside: "b.svg" }, root), /"forside".*b\.svg/s);
  });

  it("refuses a kind of picture it cannot show", () => {
    assert.throws(() => loadPictures({ forside: "a.gif" }, root), /svg, png or jpg/);
  });
});

describe("castOf", () => {
  const figure = { name: "dennis" };

  it("is the one figure and where it starts", () => {
    assert.deepEqual(castOf({ default: { figure, at: "midt" } }), { voice: "default", figure, at: "midt" });
  });

  it("says a film has one figure for now", () => {
    assert.throws(() => castOf({ default: { figure, at: "midt" }, bent: { figure, at: "midt" } }), /one figure.*2/s);
    assert.throws(() => castOf({}), /one figure.*0/s);
  });
});

describe("sampleFrames", () => {
  it("spreads its sample over the whole film, last frame first", () => {
    const frames = sampleFrames(444);
    assert.equal(frames.length, 12);
    assert.equal(frames[0], 443);
    assert.equal(frames.at(-1), 0);
  });

  it("takes every frame of a film shorter than its sample", () => assert.deepEqual(sampleFrames(3), [2, 1, 0]));
});
