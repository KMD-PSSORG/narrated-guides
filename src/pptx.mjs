/**
 * Narrated PowerPoint decks: the speaker notes are the manuscript.
 *
 * Each slide's notes are speak text with the usual `[audio tags]` and cues.
 * `{vis: Shape name}` (or `{show: …}`) names a shape as PowerPoint's Selection
 * Pane shows it; `{voice: name}` hands the rest of the slide's notes to a named
 * voice, and the slide's clips then play one after another.
 *
 * Narrating a deck puts, on every slide with notes: its audio, hidden off the
 * slide and playing as the slide appears; every animation the slide already
 * has, moved off the clicks and onto the words — a cued shape's animation
 * starts on its word, the rest of its click group keeps its place relative to
 * it, and a click group without cues plays with the one before; a fade-in for
 * a cued shape that had no animation; and an automatic advance when the audio
 * ends. PowerPoint then exports the video itself. Running it again on a
 * narrated deck replaces the narration rather than adding a second one.
 *
 * Runs in a browser (native DOMParser) and in Node (@xmldom/xmldom).
 */
import JSZip from "jszip";
import { splitCues } from "./manuscript.mjs";
import { mp3Duration } from "./mp3.mjs";
import { DEFAULT_LEADS, anchorCues } from "./timing.mjs";

const NS = {
  p: "http://schemas.openxmlformats.org/presentationml/2006/main",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  p14: "http://schemas.microsoft.com/office/powerpoint/2010/main",
  rel: "http://schemas.openxmlformats.org/package/2006/relationships",
  ct: "http://schemas.openxmlformats.org/package/2006/content-types",
};
const REL_AUDIO = `${NS.r}/audio`;
const REL_IMAGE = `${NS.r}/image`;
const REL_MEDIA = "http://schemas.microsoft.com/office/2007/relationships/media";
const MARK = "narrated-guides narration";
const MEDIA_PREFIX = "ppt/media/narrated-guides-";
const PIXEL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const VOICE = /\{voice:\s*([\w-]+)\s*\}/;
const VERBS = { vis: "vis", show: "vis" };
const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const FADE_MS = 500;

let xml;
const xmlTools = async () => {
  xml ??= globalThis.DOMParser && globalThis.XMLSerializer
    ? { DOMParser: globalThis.DOMParser, XMLSerializer: globalThis.XMLSerializer }
    : await import("@xmldom/xmldom");
  return xml;
};

const parse = (text) => {
  const doc = new xml.DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("A part of the deck is not valid XML.");
  return doc;
};
const serialize = (doc) => DECLARATION + new xml.XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>\s*/, "");

const all = (node, ns, name) => Array.from(node.getElementsByTagNameNS(ns, name));
const kids = (node, ns, name) =>
  Array.from(node.childNodes).filter((n) => n.nodeType === 1 && n.namespaceURI === ns && n.localName === name);
const kid = (node, ns, name) => kids(node, ns, name)[0] ?? null;
const ancestor = (node, ns, name) => {
  for (let n = node.parentNode; n; n = n.parentNode) if (n.namespaceURI === ns && n.localName === name) return n;
  return null;
};

/** Elements from markup, ready to insert into `doc`. */
const fragment = (doc, markup) => {
  const holder = parse(
    `<w xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p14="${NS.p14}">${markup}</w>`,
  ).documentElement;
  return Array.from(holder.childNodes)
    .filter((n) => n.nodeType === 1)
    .map((n) => doc.importNode(n, true));
};

const partRels = (part) => `${part.slice(0, part.lastIndexOf("/"))}/_rels/${part.slice(part.lastIndexOf("/") + 1)}.rels`;
const resolve = (from, target) => {
  const parts = from.split("/").slice(0, -1);
  for (const step of target.split("/")) {
    if (step === "..") parts.pop();
    else if (step !== ".") parts.push(step);
  }
  return parts.join("/");
};

const readRels = async (zip, part) => {
  const file = zip.file(partRels(part));
  return file ? parse(await file.async("string")) : null;
};
const relTarget = (rels, predicate) => {
  const rel = rels && all(rels, NS.rel, "Relationship").find(predicate);
  return rel ? rel.getAttribute("Target") : null;
};

const notesText = (doc) => {
  const body = all(doc, NS.p, "sp").find((sp) => all(sp, NS.p, "ph").some((ph) => ph.getAttribute("type") === "body"));
  if (!body) return "";
  return all(body, NS.a, "p")
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(NS.a, "*"))
        .map((n) => (n.localName === "t" ? n.textContent : n.localName === "br" ? " " : ""))
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const isNarration = (cNvPr) => cNvPr.getAttribute("descr") === MARK;

/** Shape name → id, narration excluded; names used twice are reported. */
const shapesOf = (doc) => {
  const shapes = new Map();
  const twice = new Set();
  for (const c of all(doc, NS.p, "cNvPr")) {
    const name = c.getAttribute("name");
    if (!name || isNarration(c)) continue;
    if (shapes.has(name)) twice.add(name);
    else shapes.set(name, Number(c.getAttribute("id")));
  }
  return { shapes, twice };
};

const findShape = (shapes, target) => {
  if (shapes.has(target)) return target;
  const lower = target.toLowerCase();
  return [...shapes.keys()].find((name) => name.toLowerCase() === lower) ?? null;
};

const segmentsOf = (notes) => {
  const parts = notes.split(VOICE);
  const segments = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (!parts[i].trim()) continue;
    const { text, cues } = splitCues(parts[i].trim());
    segments.push({
      voice: parts[i - 1] ?? null,
      text,
      cues: cues.map((c) => ({ ...c, verb: VERBS[c.verb.toLowerCase()] ?? c.verb })),
    });
  }
  return segments;
};

/**
 * Reads a deck: its slides in order, each with its notes, its shapes and its
 * segments (the notes split by voice, each with its speak text and cues).
 */
export const openDeck = async (data) => {
  await xmlTools();
  const zip = await JSZip.loadAsync(data);
  const presentation = parse(await zip.file("ppt/presentation.xml").async("string"));
  const presRels = await readRels(zip, "ppt/presentation.xml");
  const slides = [];
  for (const sldId of all(presentation, NS.p, "sldId")) {
    const rid = sldId.getAttributeNS(NS.r, "id");
    const part = resolve("ppt/presentation.xml", relTarget(presRels, (r) => r.getAttribute("Id") === rid));
    const doc = parse(await zip.file(part).async("string"));
    const notesTarget = relTarget(await readRels(zip, part), (r) => r.getAttribute("Type").endsWith("/notesSlide"));
    const notes = notesTarget ? notesText(parse(await zip.file(resolve(part, notesTarget)).async("string"))) : "";
    const { shapes, twice } = shapesOf(doc);
    slides.push({ number: slides.length + 1, part, notes, shapes, twice, segments: segmentsOf(notes) });
  }
  return { data, slides, segments: slides.flatMap((s) => s.segments.map((seg) => ({ ...seg, slide: s.number }))) };
};

// --- the slide's animations ---

const numeric = (ctn) => {
  const cond = kid(kid(ctn, NS.p, "stCondLst") ?? ctn, NS.p, "cond");
  const delay = Number(cond?.getAttribute("delay"));
  return Number.isFinite(delay) ? delay : 0;
};

const targetOf = (node) => {
  const t = all(node, NS.p, "spTgt")[0];
  return t ? Number(t.getAttribute("spid")) : null;
};

const mainSequence = (doc) => all(doc, NS.p, "cTn").find((c) => c.getAttribute("nodeType") === "mainSeq") ?? null;

/**
 * The effects of the main sequence in order, each with its click group and
 * its offset from the start of that group (inner group delay + own delay).
 */
const effectsOf = (doc, skip = new Set()) => {
  const main = mainSequence(doc);
  if (!main) return [];
  const effects = [];
  kids(kid(main, NS.p, "childTnLst"), NS.p, "par").forEach((click, group) => {
    for (const ctn of all(click, NS.p, "cTn")) {
      if (!ctn.getAttribute("presetClass")) continue;
      const spid = targetOf(ctn);
      if (skip.has(spid)) continue;
      const inner = ancestor(ctn.parentNode, NS.p, "cTn");
      const innerDelay = inner && inner !== ctn && ancestor(inner, NS.p, "cTn") !== main ? numeric(inner) : 0;
      effects.push({ ctn, par: ctn.parentNode, spid, group, offset: innerDelay + numeric(ctn) });
    }
  });
  return effects;
};

/**
 * When every effect starts, in ms from the slide's start. `cues` are
 * `{ spid, ms }` in spoken order (ms null when only planning). Each cue takes
 * the first unclaimed effect of its shape; a click group starts so that its
 * first cued effect lands on its word; a group without cues starts with the
 * one before. Cued shapes without an effect get a fade, listed in `fades`.
 */
const plan = (effects, cues) => {
  const claimed = new Map();
  const fades = [];
  const spare = [];
  for (const cue of cues) {
    const effect = effects.find((e) => e.spid === cue.spid && !claimed.has(e));
    if (effect) claimed.set(effect, cue);
    else if (effects.some((e) => e.spid === cue.spid) || fades.some((f) => f.spid === cue.spid)) spare.push(cue);
    else fades.push(cue);
  }
  const starts = [];
  let previous = 0;
  for (const effect of effects) {
    if (starts[effect.group] !== undefined) continue;
    const anchor = effects.find((e) => e.group === effect.group && claimed.has(e));
    starts[effect.group] = anchor && claimed.get(anchor).ms !== null ? claimed.get(anchor).ms - anchor.offset : previous;
    previous = starts[effect.group];
  }
  const timed = effects.map((e) => {
    const cue = claimed.get(e);
    const ms = cue ? cue.ms : starts[e.group] + e.offset;
    return { ...e, cue, ms: ms === null || Number.isNaN(ms) ? null : Math.max(0, Math.round(ms)) };
  });
  return { timed, fades, spare };
};

const slideCues = (slide) =>
  slide.segments.flatMap((seg) =>
    seg.cues
      .filter((c) => c.verb === "vis")
      .map((c) => ({ ...c, name: findShape(slide.shapes, c.target) }))
      .filter((c) => c.name)
      .map((c) => ({ spid: slide.shapes.get(c.name), ms: null, name: c.name })),
  );

/**
 * What would happen to the deck, without voicing it. `voices` lists the voice
 * names that can be used, or is null to skip that check. Problems stop
 * narration; warnings are worth reading.
 */
export const checkDeck = async (deck, { voices = null } = {}) => {
  const problems = [];
  const warnings = [];
  const zip = await JSZip.loadAsync(deck.data);
  for (const slide of deck.slides) {
    if (!slide.segments.length) continue;
    const at = `Slide ${slide.number}`;
    for (const seg of slide.segments) {
      if (seg.voice && voices && !voices.includes(seg.voice)) problems.push({ slide: slide.number, message: `${at}: no voice is set for "${seg.voice}".` });
      for (const cue of seg.cues) {
        if (cue.verb !== "vis") {
          warnings.push({ slide: slide.number, message: `${at}: {${cue.verb}: …} is not something a deck can do, so it is left out. Use {vis: shape}.` });
        } else if (!findShape(slide.shapes, cue.target)) {
          problems.push({
            slide: slide.number,
            message: `${at}: there is no shape called "${cue.target}". The shapes are: ${[...slide.shapes.keys()].join(", ")}.`,
          });
        } else if (slide.twice.has(findShape(slide.shapes, cue.target))) {
          warnings.push({ slide: slide.number, message: `${at}: two shapes are called "${cue.target}"; the first one is used.` });
        }
      }
    }
    const doc = parse(await zip.file(slide.part).async("string"));
    const narration = new Set(all(doc, NS.p, "cNvPr").filter(isNarration).map((c) => Number(c.getAttribute("id"))));
    const { timed, spare } = plan(effectsOf(doc, narration), slideCues(slide));
    const nameOf = (spid) => [...slide.shapes].find(([, id]) => id === spid)?.[0] ?? `shape ${spid}`;
    const uncued = timed.filter((e) => !e.cue && e.ctn.getAttribute("presetClass") !== "mediacall");
    for (const e of uncued) {
      const leader = timed.find((o) => o.group === e.group && o.cue);
      warnings.push({
        slide: slide.number,
        message: leader
          ? `${at}: the animation on "${nameOf(e.spid)}" has no cue, so it plays along with "${nameOf(leader.spid)}".`
          : `${at}: the animation on "${nameOf(e.spid)}" has no cue, so it plays with the step before it.`,
      });
    }
    for (const cue of spare) warnings.push({ slide: slide.number, message: `${at}: "${cue.name}" has more cues than animations; the extra cue does nothing.` });
  }
  const characters = deck.segments.reduce((n, s) => n + s.text.length, 0);
  return { problems, warnings, characters };
};

// --- writing ---

const fadeMarkup = (spid, ms, grpId) => `<p:par><p:cTn id="0" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="${grpId}" nodeType="withEffect"><p:stCondLst><p:cond delay="${ms}"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="0" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="0" dur="${FADE_MS}"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;

const playMarkup = (spid, ms, durMs) => `<p:par><p:cTn id="0" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="${ms}"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="0" dur="${durMs}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par>`;

const mediaMarkup = (spid) => `<p:audio><p:cMediaNode vol="80000"><p:cTn id="0" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cMediaNode></p:audio>`;

const pictureMarkup = (spid, n, rAudio, rMedia, rImage) => `<p:pic><p:nvPicPr><p:cNvPr id="${spid}" name="Narration ${n}" descr="${MARK}"><a:hlinkClick r:id="" action="ppaction://media"/></p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr><a:audioFile r:link="${rAudio}"/><p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}"><p14:media r:embed="${rMedia}"/></p:ext></p:extLst></p:nvPr></p:nvPicPr><p:blipFill><a:blip r:embed="${rImage}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${-914400 * n}" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;

const timingSkeleton = `<p:timing><p:tnLst><p:par><p:cTn id="0" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
const mainSkeleton = `<p:seq concurrent="1" nextAc="seek"><p:cTn id="0" dur="indefinite" nodeType="mainSeq"><p:childTnLst></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`;
const groupSkeleton = `<p:par><p:cTn id="0" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="MAIN"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="0" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;

/** Inserts `node` into the slide before the first of `before` present, else at the end. */
const insertInSlide = (sld, node, before) => {
  const next = Array.from(sld.childNodes).find((n) => n.nodeType === 1 && before.includes(n.localName));
  sld.insertBefore(node, next ?? null);
};

/** Removes an earlier narration; returns the ids of its pictures and their rels. */
const removeNarration = (doc) => {
  const spids = new Set();
  const rids = new Set();
  for (const c of all(doc, NS.p, "cNvPr").filter(isNarration)) {
    const pic = ancestor(c, NS.p, "pic");
    spids.add(Number(c.getAttribute("id")));
    for (const el of all(pic, NS.a, "audioFile")) rids.add(el.getAttributeNS(NS.r, "link"));
    for (const el of all(pic, NS.p14, "media")) rids.add(el.getAttributeNS(NS.r, "embed"));
    for (const el of all(pic, NS.a, "blip")) rids.add(el.getAttributeNS(NS.r, "embed"));
    pic.parentNode.removeChild(pic);
  }
  return { spids, rids };
};

const renumber = (timing) => {
  const ids = new Map();
  let next = 0;
  let mainId = null;
  for (const ctn of all(timing, NS.p, "cTn")) {
    const old = ctn.getAttribute("id");
    ctn.setAttribute("id", String(++next));
    if (old !== "0") ids.set(old, String(next));
    if (ctn.getAttribute("nodeType") === "mainSeq") mainId = String(next);
  }
  for (const tn of all(timing, NS.p, "tn")) {
    const val = tn.getAttribute("val");
    tn.setAttribute("val", val === "MAIN" ? mainId : (ids.get(val) ?? val));
  }
};

const narrateSlide = (doc, rels, slide, clips, { leadMs, gapMs, tailMs }) => {
  const sld = doc.documentElement;
  const spTree = all(doc, NS.p, "spTree")[0];
  const old = removeNarration(doc);
  for (const rel of all(rels, NS.rel, "Relationship")) if (old.rids.has(rel.getAttribute("Id"))) rel.parentNode.removeChild(rel);

  // drop what played the old narration
  let timing = all(doc, NS.p, "timing")[0] ?? null;
  if (timing) {
    for (const node of [...all(timing, NS.p, "audio"), ...all(timing, NS.p, "par")]) {
      if (!node.parentNode) continue;
      const isMediaNode = node.localName === "audio";
      const ctn = kid(node, NS.p, "cTn");
      if ((isMediaNode || ctn?.getAttribute("presetClass")) && old.spids.has(targetOf(node))) node.parentNode.removeChild(node);
    }
  }

  // the clips, one after another
  const usedIds = all(doc, NS.p, "cNvPr").map((c) => Number(c.getAttribute("id")));
  let nextSpid = Math.max(0, ...usedIds) + 1;
  let nextRid = Math.max(0, ...all(rels, NS.rel, "Relationship").map((r) => Number(r.getAttribute("Id").replace(/\D/g, "")) || 0)) + 1;
  const addRel = (type, target) => {
    const rel = rels.createElementNS(NS.rel, "Relationship");
    const id = `rId${nextRid++}`;
    rel.setAttribute("Id", id);
    rel.setAttribute("Type", type);
    rel.setAttribute("Target", target);
    rels.documentElement.appendChild(rel);
    return id;
  };
  let offset = 0;
  const plays = [];
  const cues = [];
  clips.forEach((clip, i) => {
    const spid = nextSpid++;
    const rAudio = addRel(REL_AUDIO, `../media/${clip.media}`);
    const rMedia = addRel(REL_MEDIA, `../media/${clip.media}`);
    const rImage = addRel(REL_IMAGE, "../media/narrated-guides-pixel.png");
    for (const node of fragment(doc, pictureMarkup(spid, i + 1, rAudio, rMedia, rImage))) spTree.appendChild(node);
    plays.push({ spid, ms: offset, durMs: clip.durMs });
    for (const cue of clip.cues) {
      const name = findShape(slide.shapes, cue.target);
      if (cue.verb === "vis" && name) cues.push({ spid: slide.shapes.get(name), ms: offset + cue.at * 1000 - leadMs, name });
    }
    offset += clip.durMs + gapMs;
  });
  const totalMs = offset - gapMs;

  // the timing tree
  if (!timing) {
    timing = fragment(doc, timingSkeleton)[0];
    insertInSlide(sld, timing, ["extLst"]);
  }
  const root = kid(kid(kid(kid(timing, NS.p, "tnLst"), NS.p, "par"), NS.p, "cTn"), NS.p, "childTnLst");
  let main = mainSequence(doc);
  if (!main) {
    const seq = fragment(doc, mainSkeleton)[0];
    root.insertBefore(seq, root.firstChild);
    main = kid(seq, NS.p, "cTn");
  }
  const effects = effectsOf(doc);
  const { timed, fades } = plan(effects, cues.sort((a, b) => a.ms - b.ms));
  const mainList = kid(main, NS.p, "childTnLst");
  while (mainList.firstChild) mainList.removeChild(mainList.firstChild);
  const group = fragment(doc, groupSkeleton)[0];
  mainList.appendChild(group);
  const list = all(group, NS.p, "childTnLst")[1];

  for (const p of plays) for (const node of fragment(doc, playMarkup(p.spid, p.ms, p.durMs))) list.appendChild(node);

  let bldLst = kid(timing, NS.p, "bldLst");
  const builds = bldLst ? kids(bldLst, NS.p, "bldP") : [];
  const placed = [
    ...timed.map((e) => ({ ms: e.ms, node: e.par, ctn: e.ctn })),
    ...fades.map((f) => {
      const grpId = Math.max(-1, ...builds.filter((b) => Number(b.getAttribute("spid")) === f.spid).map((b) => Number(b.getAttribute("grpId")))) + 1;
      const sp = all(doc, NS.p, "cNvPr").find((c) => Number(c.getAttribute("id")) === f.spid);
      const shape = sp && ancestor(sp, NS.p, "sp");
      if (shape && kid(shape, NS.p, "txBody")) {
        if (!bldLst) {
          bldLst = doc.createElementNS(NS.p, "p:bldLst");
          timing.appendChild(bldLst);
        }
        const b = doc.createElementNS(NS.p, "p:bldP");
        b.setAttribute("spid", String(f.spid));
        b.setAttribute("grpId", String(grpId));
        b.setAttribute("animBg", "1");
        bldLst.appendChild(b);
      }
      return { ms: Math.max(0, Math.round(f.ms)), node: fragment(doc, fadeMarkup(f.spid, Math.max(0, Math.round(f.ms)), grpId))[0] };
    }),
  ].sort((a, b) => a.ms - b.ms);
  for (const { ms, node, ctn } of placed) {
    if (ctn) {
      ctn.setAttribute("nodeType", "withEffect");
      const conds = kid(ctn, NS.p, "stCondLst");
      if (conds) ctn.removeChild(conds);
      ctn.insertBefore(fragment(doc, `<p:stCondLst><p:cond delay="${ms}"/></p:stCondLst>`)[0], ctn.firstChild);
    }
    list.appendChild(node);
  }
  for (const p of plays) root.appendChild(fragment(doc, mediaMarkup(p.spid))[0]);
  renumber(timing);

  // advance when the audio ends
  const transitions = all(doc, NS.p, "transition");
  if (!transitions.length) {
    const t = doc.createElementNS(NS.p, "p:transition");
    insertInSlide(sld, t, ["timing", "extLst"]);
    transitions.push(t);
  }
  for (const t of transitions) t.setAttribute("advTm", String(totalMs + tailMs));

  return {
    durationMs: totalMs,
    clips: plays.map((p) => p.ms),
    effects: [
      ...timed.map((e) => ({ spid: e.spid, ms: e.ms, cued: Boolean(e.cue), kind: e.ctn.getAttribute("presetClass") })),
      ...fades.map((f) => ({ spid: f.spid, ms: Math.max(0, Math.round(f.ms)), cued: true, kind: "fade" })),
    ].sort((a, b) => a.ms - b.ms),
  };
};

/**
 * A narrated copy of the deck. `clips` follow `deck.segments`, one per
 * segment: `{ audio: Uint8Array (mp3), words: [{ text, start, end }] }`.
 * Returns the new deck's bytes, a report per slide and any warnings.
 */
export const narrateDeck = async (deck, clips, options = {}) => {
  if (clips.length !== deck.segments.length) throw new Error(`${deck.segments.length} segments, but ${clips.length} clips.`);
  await xmlTools();
  const leadMs = (options.leads?.vis ?? DEFAULT_LEADS.vis) * 1000;
  const settings = { leadMs, gapMs: options.gapMs ?? 400, tailMs: options.tailMs ?? 700 };
  const zip = await JSZip.loadAsync(deck.data);
  for (const name of Object.keys(zip.files)) if (name.startsWith(MEDIA_PREFIX)) zip.remove(name);
  zip.file(`${MEDIA_PREFIX}pixel.png`, PIXEL, { base64: true });

  const types = parse(await zip.file("[Content_Types].xml").async("string"));
  for (const [ext, mime] of [["mp3", "audio/mpeg"], ["png", "image/png"]]) {
    if (all(types, NS.ct, "Default").some((d) => d.getAttribute("Extension").toLowerCase() === ext)) continue;
    const d = types.createElementNS(NS.ct, "Default");
    d.setAttribute("Extension", ext);
    d.setAttribute("ContentType", mime);
    types.documentElement.insertBefore(d, types.documentElement.firstChild);
  }
  zip.file("[Content_Types].xml", serialize(types));

  const warnings = [];
  const report = [];
  let n = 0;
  for (const slide of deck.slides) {
    if (!slide.segments.length) continue;
    const slideClips = slide.segments.map((seg, i) => {
      const clip = clips[n++];
      const { cues, warning } = anchorCues({ number: slide.number, text: seg.text, cues: seg.cues }, clip.words);
      if (warning) warnings.push({ slide: slide.number, message: `Slide ${slide.number}: ${warning.replace(/^scene \d+: /, "")}` });
      const media = `${MEDIA_PREFIX.slice("ppt/media/".length)}${slide.number}-${i + 1}.mp3`;
      zip.file(`ppt/media/${media}`, clip.audio);
      return { media, durMs: Math.round(mp3Duration(clip.audio) * 1000), cues };
    });
    const doc = parse(await zip.file(slide.part).async("string"));
    const relsPart = partRels(slide.part);
    const rels = parse(await zip.file(relsPart).async("string"));
    report.push({ slide: slide.number, ...narrateSlide(doc, rels, slide, slideClips, settings) });
    zip.file(slide.part, serialize(doc));
    zip.file(relsPart, serialize(rels));
  }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, report, warnings };
};
