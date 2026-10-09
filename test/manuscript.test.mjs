import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseManuscript, spokenWords } from "../src/manuscript.mjs";

const scene = (heading, speak) => `${heading}\n\n*Screen:* notes\n\n\`\`\`speak\n${speak}\n\`\`\`\n`;

describe("spokenWords", () => {
  it("leaves out audio tags, standalone or glued to a word", () => {
    assert.deepEqual(spokenWords("[warmly] Hello... there [pauses] you"), ["Hello...", "there", "you"]);
  });

  it("returns nothing for tags alone", () => {
    assert.deepEqual(spokenWords("[calm, clear] [pauses]"), []);
  });
});

describe("parseManuscript", () => {
  it("reads number, title and text of each scene", () => {
    const scenes = parseManuscript(
      scene("## Scene 1 · Title", "Welcome.") + scene("## Scene 2 · The phase", "Second scene."),
    );
    assert.deepEqual(
      scenes.map(({ number, title, text }) => ({ number, title, text })),
      [
        { number: 1, title: "Title", text: "Welcome." },
        { number: 2, title: "The phase", text: "Second scene." },
      ],
    );
  });

  it("joins a speak block over several lines with single spaces", () => {
    const [first] = parseManuscript(scene("## Scene 1 · A", "One line\nand   the next"));
    assert.equal(first.text, "One line and the next");
  });

  it("keeps audio tags in the text sent to the voice", () => {
    const [first] = parseManuscript(scene("## Scene 1 · A", "[warmly] Hello."));
    assert.equal(first.text, "[warmly] Hello.");
  });

  it("takes cues out of the text and anchors each to the next spoken word", () => {
    const [first] = parseManuscript(scene("## Scene 1 · A", "One two {klik: Save} three {ring: total}"));
    assert.equal(first.text, "One two three");
    assert.deepEqual(first.cues, [
      { verb: "klik", target: "Save", word: 2 },
      { verb: "ring", target: "total", word: 3 },
    ]);
  });

  it("does not count audio tags when anchoring a cue", () => {
    const [first] = parseManuscript(scene("## Scene 1 · A", "[calm] {peg: field} The field [pauses] {vis: card} here"));
    assert.deepEqual(first.cues.map((c) => c.word), [0, 2]);
  });

  it("accepts verbs with non-ASCII letters and targets with spaces and punctuation", () => {
    const [first] = parseManuscript(scene("## Scene 1 · A", "{fremhæv: fase 6} Look {peg: Org.enhed} here"));
    assert.deepEqual(first.cues, [
      { verb: "fremhæv", target: "fase 6", word: 0 },
      { verb: "peg", target: "Org.enhed", word: 1 },
    ]);
  });

  it("reads the voice named on the speak fence, and leaves it out when none is named", () => {
    const named = "## Scene 2 · B\n\n```speak pumpkin\nBoo.\n```\n";
    const scenes = parseManuscript(scene("## Scene 1 · A", "Hello.") + named);
    assert.deepEqual(
      scenes.map(({ voice, text }) => ({ voice, text })),
      [
        { voice: undefined, text: "Hello." },
        { voice: "pumpkin", text: "Boo." },
      ],
    );
  });

  it("does not take another fence for a speak block", () => {
    const [first] = parseManuscript(`## Scene 1 · A\n\n\`\`\`speaker\nNo.\n\`\`\`\n\n\`\`\`speak\nYes.\n\`\`\`\n`);
    assert.equal(first.text, "Yes.");
  });

  it("ignores text outside speak blocks", () => {
    const [first] = parseManuscript(`# Video\n\nIntro {peg: x} text.\n\n${scene("## Scene 1 · A", "Spoken.")}`);
    assert.equal(first.text, "Spoken.");
    assert.deepEqual(first.cues, []);
  });

  it("refuses a scene without a speak block", () => {
    assert.throws(
      () => parseManuscript(`## Scene 1 · A\n\nNo block.\n${scene("## Scene 2 · B", "Spoken.")}`),
      /Scene 1 has no speak block/,
    );
  });

  it("refuses a speak block before the first scene heading", () => {
    assert.throws(() => parseManuscript("```speak\nHello\n```\n"), /before the first scene heading/);
  });
});
