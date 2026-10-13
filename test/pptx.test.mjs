import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import { spokenWords } from "../src/manuscript.mjs";
import { mp3Duration } from "../src/mp3.mjs";
import { checkDeck, narrateDeck, openDeck } from "../src/pptx.mjs";

const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const fixture = (name) => readFileSync(new URL(`fixtures/${name}.pptx`, import.meta.url));

const FRAME = 417;
const FRAME_SECONDS = 1152 / 44100;
const silentMp3 = (seconds) => {
  const n = Math.round(seconds / FRAME_SECONDS);
  const out = new Uint8Array(FRAME * n);
  for (let i = 0; i < n; i++) out.set([0xff, 0xfb, 0x90, 0x64], i * FRAME);
  return out;
};

/** A clip per segment: every word 0.4 s long. */
const clipsFor = (deck) =>
  deck.segments.map((s) => {
    const words = spokenWords(s.text).map((text, i) => ({ text, start: i * 0.4, end: i * 0.4 + 0.35 }));
    return { audio: silentMp3(words.length * 0.4 + 0.3), words };
  });

const slideXml = async (bytes, n) => {
  const zip = await JSZip.loadAsync(bytes);
  return new DOMParser().parseFromString(await zip.file(`ppt/slides/slide${n}.xml`).async("string"), "application/xml");
};
const els = (doc, name) => Array.from(doc.getElementsByTagNameNS(P, name));
const delayOf = (ctn) => Number(els(ctn, "cond")[0].getAttribute("delay"));
const effectsBySpid = (doc) =>
  Object.fromEntries(
    els(doc, "cTn")
      .filter((c) => c.getAttribute("presetClass") === "entr")
      .map((c) => [els(c, "spTgt")[0].getAttribute("spid"), { delay: delayOf(c), nodeType: c.getAttribute("nodeType") }]),
  );

describe("mp3Duration", () => {
  it("adds up the frames", () => {
    assert.ok(Math.abs(mp3Duration(silentMp3(2)) - 2) < FRAME_SECONDS);
  });

  it("skips an ID3 tag", () => {
    const tag = new Uint8Array(10 + 20);
    tag.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20]);
    const audio = silentMp3(1);
    const both = new Uint8Array(tag.length + audio.length);
    both.set(tag);
    both.set(audio, tag.length);
    assert.equal(mp3Duration(both), mp3Duration(audio));
  });
});

describe("openDeck", () => {
  it("reads the notes of every slide, split by voice", async () => {
    const deck = await openDeck(fixture("plain"));
    assert.equal(deck.slides.length, 3);
    assert.deepEqual(
      deck.segments.map((s) => [s.slide, s.voice]),
      [[1, null], [2, null], [3, null], [3, "bent"]],
    );
    const timeline = deck.slides[1].segments[0];
    assert.deepEqual(timeline.cues.map((c) => c.target), ["Phase 1", "Phase 2", "Phase 3", "Bent"]);
    assert.ok(!timeline.text.includes("{"));
    assert.equal(deck.slides[1].shapes.get("Phase 2"), 7);
  });
});

/** A fixture with one slide's notes replaced. */
const withNotes = async (name, slide, text, rename = null) => {
  const zip = await JSZip.loadAsync(fixture(name));
  if (rename) {
    const part = `ppt/slides/slide${slide}.xml`;
    zip.file(part, (await zip.file(part).async("string")).replace(`name="${rename[0]}"`, `name="${rename[1]}"`));
  }
  const part = `ppt/notesSlides/notesSlide${slide}.xml`;
  const xml = await zip.file(part).async("string");
  zip.file(part, xml.replace(/(<p:ph type="body"[\s\S]*?<a:t>)[^<]*(<\/a:t>)/, `$1${text}$2`));
  return zip.generateAsync({ type: "uint8array" });
};
const withNotes3 = (text) => withNotes("plain", 3, text);

describe("Danish notes", () => {
  it("takes {stemme: …} and voice names with æ, ø and å", async () => {
    const deck = await openDeck(await withNotes3("Det var processen. {vis: Punchline} Spørgsmål sendes som rekvisition. {stemme: bjørn} Bent vender tilbage. {voice: Ærlig} Måske."));
    assert.deepEqual(
      deck.slides[2].segments.map((s) => [s.voice, s.text]),
      [
        [null, "Det var processen. Spørgsmål sendes som rekvisition."],
        ["bjørn", "Bent vender tilbage."],
        ["Ærlig", "Måske."],
      ],
    );
    assert.equal(deck.slides[2].segments[0].cues[0].target, "Punchline");
  });

  it("reports by code, so a page can translate", async () => {
    const deck = await openDeck(await withNotes3("{vis: Pointe} Spørgsmål? {stemme: bjørn} Nej."));
    const { problems } = await checkDeck(deck, { voices: [] });
    assert.deepEqual(problems.map((p) => p.code), ["no-shape", "voice-missing"]);
    assert.equal(problems[0].params.target, "Pointe");
    assert.deepEqual(problems[1].params, { voice: "bjørn" });
  });
});

describe("picked effects", () => {
  const presetOf = (doc, spid) =>
    els(doc, "cTn").find((c) => c.getAttribute("presetClass") === "entr" && c.getElementsByTagNameNS(P, "spTgt")[0]?.getAttribute("spid") === spid);

  it("brings a shape in with the effect its cue names, in Danish or English", async () => {
    for (const [name, id, sub] of [
      ["straks", "1", "0"],
      ["zoom", "53", "16"],
      ["svæv", "42", "0"],
      ["fly", "2", "4"],
      ["Fly venstre", "2", "8"],
      ["fly right", "2", "2"],
      ["fly top", "2", "1"],
      ["wipe", "22", "8"],
      ["voks", "31", "0"],
    ]) {
      const deck = await openDeck(await withNotes3(`Det var processen. {vis: Punchline, ${name}} Spørgsmål?`));
      const { bytes, report } = await narrateDeck(deck, clipsFor(deck));
      const spid = String(deck.slides[2].shapes.get("Punchline"));
      const ctn = presetOf(await slideXml(bytes, 3), spid);
      assert.deepEqual([ctn.getAttribute("presetID"), ctn.getAttribute("presetSubtype")], [id, sub], name);
      assert.notEqual(report.find((r) => r.slide === 3).effects.find((e) => e.spid === Number(spid)).kind, "fade");
    }
  });

  it("fades in, with a warning, when the effect is not one it knows", async () => {
    const deck = await openDeck(await withNotes3("{vis: Punchline, kaboom} Spørgsmål?"));
    const { warnings } = await checkDeck(deck);
    assert.deepEqual(warnings.map((w) => [w.code, w.params.effect, w.params.shape]), [["unknown-effect", "kaboom", "Punchline"]]);
    assert.match(warnings[0].message, /The effects are: fade, appear, zoom/);
    const { bytes } = await narrateDeck(deck, clipsFor(deck));
    assert.equal(presetOf(await slideXml(bytes, 3), String(deck.slides[2].shapes.get("Punchline"))).getAttribute("presetID"), "10");
  });

  it("takes a shape whose name has a comma as that shape, not as an effect", async () => {
    const deck = await openDeck(await withNotes("plain", 3, "{vis: Punchline, FY26} Spørgsmål?", ["Punchline", "Punchline, FY26"]));
    const cue = deck.slides[2].segments[0].cues[0];
    assert.deepEqual([cue.target, cue.effect], ["Punchline, FY26", undefined]);
    const { problems, warnings } = await checkDeck(deck);
    assert.deepEqual([problems, warnings], [[], []]);
  });

  it("says only that the animation is kept when an animated shape names an unknown effect", async () => {
    const deck = await openDeck(await withNotes("animated", 2, "Tre faser. {vis: Phase 1, kaboom} Først."));
    const codes = (await checkDeck(deck)).warnings.map((w) => w.code);
    assert.ok(codes.includes("effect-kept"));
    assert.ok(!codes.includes("unknown-effect"));
  });

  it("replaces the entrances it made when a narrated deck is narrated again", async () => {
    const spidOf = (deck) => String(deck.slides[2].shapes.get("Punchline"));
    const first = await openDeck(await withNotes3("{vis: Punchline, zoom} Spørgsmål?"));
    const once = await narrateDeck(first, clipsFor(first));
    const zip = await JSZip.loadAsync(once.bytes);
    const part = "ppt/notesSlides/notesSlide3.xml";
    zip.file(part, (await zip.file(part).async("string")).replace("{vis: Punchline, zoom}", "{vis: Punchline, wipe}"));
    const second = await openDeck(await zip.generateAsync({ type: "uint8array" }));
    assert.deepEqual((await checkDeck(second)).warnings, []);
    const twice = await narrateDeck(second, clipsFor(second));
    const doc = await slideXml(twice.bytes, 3);
    const entrances = els(doc, "cTn").filter((c) => c.getAttribute("presetClass") === "entr" && c.getElementsByTagNameNS(P, "spTgt")[0]?.getAttribute("spid") === spidOf(second));
    assert.deepEqual(entrances.map((c) => c.getAttribute("presetID")), ["22"]);
    assert.equal(els(doc, "bldP").filter((b) => b.getAttribute("spid") === spidOf(second)).length, 1);
  });

  it("keeps an animation made in PowerPoint and says so", async () => {
    const deck = await openDeck(await withNotes("animated", 2, "Tre faser. {vis: Phase 1, zoom} Først."));
    const { warnings } = await checkDeck(deck);
    assert.ok(warnings.some((w) => w.code === "effect-kept" && w.params.shape === "Phase 1" && w.params.effect === "zoom"));
  });
});

describe("checkDeck", () => {
  it("passes a deck whose cues and voices exist", async () => {
    const { problems, characters } = await checkDeck(await openDeck(fixture("plain")), { voices: ["bent"] });
    assert.deepEqual(problems, []);
    assert.equal(characters, 612);
  });

  it("stops on a voice nobody set", async () => {
    const { problems } = await checkDeck(await openDeck(fixture("plain")), { voices: [] });
    assert.match(problems[0].message, /Slide 3: no voice is set for "bent"/);
  });

  it("stops on a shape that is not there, and lists the ones that are", async () => {
    const deck = await openDeck(fixture("plain"));
    deck.slides[1].segments[0].cues[0].target = "Phase 4";
    const { problems } = await checkDeck(deck);
    assert.match(problems[0].message, /no shape called "Phase 4".*Phase 1 dot/);
  });

  it("explains animations without a cue", async () => {
    const { warnings } = await checkDeck(await openDeck(fixture("animated")));
    assert.deepEqual(
      warnings.map((w) => w.message),
      ["Phase 1", "Phase 2", "Phase 3"].map((p) => `Slide 2: the animation on "${p} dot" has no cue, so it plays along with "${p}".`),
    );
  });
});

describe("narrateDeck", () => {
  it("moves existing animations onto the words and keeps their click groups together", async () => {
    const deck = await openDeck(fixture("animated"));
    const { bytes } = await narrateDeck(deck, clipsFor(deck));
    const fx = effectsBySpid(await slideXml(bytes, 2));
    // "Phase 1" is word 6 (2.4 s), minus the 0.1 s lead; its dot shares the click
    assert.deepEqual(fx["5"], { delay: 2300, nodeType: "withEffect" });
    assert.equal(fx["4"].delay, 2300);
    // "Phase 3" came 500 ms after its dot; the dot keeps that distance
    assert.equal(fx["8"].delay, fx["9"].delay - 500);
    assert.ok(Object.values(fx).every((e) => e.nodeType === "withEffect"));
  });

  it("starts the main sequence with the slide, not on a click", async () => {
    const deck = await openDeck(fixture("animated"));
    const doc = await slideXml((await narrateDeck(deck, clipsFor(deck))).bytes, 2);
    const main = els(doc, "cTn").find((c) => c.getAttribute("nodeType") === "mainSeq");
    const groups = Array.from(els(main, "childTnLst")[0].childNodes).filter((n) => n.nodeType === 1);
    assert.equal(groups.length, 1);
    const begin = els(groups[0], "cond").find((c) => c.getAttribute("evt") === "onBegin");
    assert.equal(els(begin, "tn")[0].getAttribute("val"), main.getAttribute("id"));
  });

  it("gives every timing node its own id", async () => {
    const deck = await openDeck(fixture("animated"));
    const doc = await slideXml((await narrateDeck(deck, clipsFor(deck))).bytes, 2);
    const ids = els(doc, "cTn").map((c) => c.getAttribute("id"));
    assert.equal(new Set(ids).size, ids.length);
  });

  it("fades in cued shapes that had no animation", async () => {
    const deck = await openDeck(fixture("plain"));
    const doc = await slideXml((await narrateDeck(deck, clipsFor(deck))).bytes, 2);
    assert.deepEqual(Object.keys(effectsBySpid(doc)).sort(), ["10", "5", "7", "9"]);
    assert.deepEqual(els(doc, "bldP").map((b) => b.getAttribute("spid")).sort(), ["10", "5", "7", "9"]);
  });

  it("plays a slide's voices one after another and advances when they end", async () => {
    const deck = await openDeck(fixture("plain"));
    const { bytes, report } = await narrateDeck(deck, clipsFor(deck));
    const slide3 = report.find((r) => r.slide === 3);
    assert.equal(slide3.clips.length, 2);
    assert.equal(slide3.clips[1], Math.round(mp3Duration(clipsFor(deck)[2].audio) * 1000) + 400);
    const doc = await slideXml(bytes, 3);
    assert.equal(Number(els(doc, "transition")[0].getAttribute("advTm")), slide3.durationMs + 700);
    assert.equal(els(doc, "audio").length, 2);
  });

  it("replaces an earlier narration instead of adding to it", async () => {
    const deck = await openDeck(fixture("animated"));
    const once = await narrateDeck(deck, clipsFor(deck));
    const twice = await narrateDeck(await openDeck(once.bytes), clipsFor(deck));
    assert.deepEqual(twice.report, once.report);
    const zip = await JSZip.loadAsync(twice.bytes);
    assert.equal(Object.keys(zip.files).filter((f) => f.startsWith("ppt/media/narrated-guides-")).length, 5);
    const doc = await slideXml(twice.bytes, 3);
    assert.equal(els(doc, "pic").length, 2);
    const rels = await zip.file("ppt/slides/_rels/slide3.xml.rels").async("string");
    assert.equal(rels.match(/relationships\/audio"/g).length, 2);
  });

  it("leaves slides without notes alone", async () => {
    const deck = await openDeck(fixture("plain"));
    deck.slides[0].segments = [];
    deck.segments = deck.segments.filter((s) => s.slide !== 1);
    const { bytes, report } = await narrateDeck(deck, clipsFor(deck));
    assert.deepEqual(report.map((r) => r.slide), [2, 3]);
    assert.equal(els(await slideXml(bytes, 1), "timing").length, 0);
  });
});
