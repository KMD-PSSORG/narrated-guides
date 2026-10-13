// The narrated-decks page: the engine's pptx core, run in the browser with the
// user's own ElevenLabs key. Clips are cached in IndexedDB under the hash of
// model, voice and text, so running a deck again only voices what changed.
import { listVoices, withTimestamps } from "../../src/eleven.mjs";
import { checkDeck, narrateDeck, openDeck } from "../../src/pptx.mjs";
import { LANGUAGES, message, startLanguage } from "./i18n.mjs";

const FORMAT = "mp3_44100_128";
const NARRATOR = "narrator";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const $ = (selector) => document.querySelector(selector);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
};

const state = {
  deck: null,
  name: "",
  problems: [],
  warnings: [],
  characters: 0,
  voices: [],
  picks: JSON.parse(localStorage.getItem("ng-picks") ?? "{}"),
  urls: [],
  hint: null,
  result: null,
};
let t = LANGUAGES[startLanguage()];

// --- language ---

const setLanguage = (lang) => {
  t = LANGUAGES[lang];
  document.documentElement.lang = lang;
  document.title = t.title;
  for (const node of document.querySelectorAll("[data-i18n]")) node.innerHTML = t[node.dataset.i18n];
  if (state.deck) {
    renderCheck();
    renderVoicePicks();
    update();
  }
  if (state.result) renderReport();
};

$("#lang").addEventListener("click", () => {
  const lang = document.documentElement.lang === "da" ? "en" : "da";
  localStorage.setItem("ng-lang", lang);
  setLanguage(lang);
});

// --- cache ---

const db = new Promise((resolve, reject) => {
  const open = indexedDB.open("narrated-guides", 1);
  open.onupgradeneeded = () => open.result.createObjectStore("clips");
  open.onsuccess = () => resolve(open.result);
  open.onerror = () => reject(open.error);
});
const store = async (mode) => (await db).transaction("clips", mode).objectStore("clips");
const cacheGet = async (key) =>
  new Promise(async (resolve) => {
    const req = (await store("readonly")).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
const cachePut = async (key, value) => (await store("readwrite")).put(value, key);
const hash = async (text) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

// --- step 1: the deck ---

const load = async (data, name) => {
  try {
    state.deck = await openDeck(data);
  } catch {
    showError(t.badFile);
    return;
  }
  state.name = name.replace(/\.pptx$/i, "").replace(/-narrated$/, "");
  Object.assign(state, await checkDeck(state.deck), { result: null });
  renderCheck();
  renderVoicePicks();
  for (const id of ["#step-check", "#step-voices", "#step-make"]) $(id).hidden = false;
  $("#result").hidden = true;
  $("#progress").replaceChildren();
  update();
};

const showError = (message) => {
  $("#step-check").hidden = false;
  $("#summary").replaceChildren(el("span", { class: "problem" }, message));
  $("#slides").replaceChildren();
};

$("#file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) await load(await file.arrayBuffer(), file.name);
});
const drop = $("#drop");
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  const file = e.dataTransfer.files[0];
  if (file) await load(await file.arrayBuffer(), file.name);
});
document.addEventListener("click", async (e) => {
  if (e.target.id !== "sample") return;
  const response = await fetch(t.sampleFile);
  await load(await response.arrayBuffer(), t.sampleFile);
});

// --- step 2: what will happen ---

/** The notes with cues, voice switches and audio tags marked. */
const marked = (notes) => {
  const out = el("p", { class: "notes" });
  let last = 0;
  for (const m of notes.matchAll(/\{[^}]*\}|\[[^\]]*\]/g)) {
    out.append(notes.slice(last, m.index));
    const kind = m[0].startsWith("[") ? "tag" : /^\{(voice|stemme):/i.test(m[0]) ? "voice" : "cue";
    out.append(el("span", { class: kind }, m[0]));
    last = m.index + m[0].length;
  }
  out.append(notes.slice(last));
  return out;
};

const renderCheck = () => {
  const withNotes = state.deck.slides.filter((s) => s.segments.length);
  $("#summary").replaceChildren(
    t.summary(state.deck.slides.length, withNotes.length, t.number(state.characters)),
    ...(state.problems.length ? [el("span", { class: "problem" }, t.fixFirst(state.problems.length))] : []),
  );
  $("#slides").replaceChildren(
    ...state.deck.slides.map((slide) => {
      const mine = (list) => list.filter((x) => x.slide === slide.number).map((x) => message(t, x));
      return el(
        "li",
        { class: slide.segments.length ? "" : "quiet" },
        el("strong", {}, t.slide(slide.number)),
        slide.segments.length ? marked(slide.notes) : el("p", { class: "notes" }, t.noNotes),
        ...mine(state.problems).map((m) => el("p", { class: "problem" }, m)),
        ...mine(state.warnings).map((m) => el("p", { class: "warning" }, m)),
      );
    }),
  );
};

// --- step 3: voices ---

const voiceNames = () => [
  ...(state.deck.segments.some((s) => !s.voice) ? [NARRATOR] : []),
  ...new Set(state.deck.segments.map((s) => s.voice).filter(Boolean)),
];

const renderVoicePicks = () => {
  $("#voice-picks").replaceChildren(
    ...voiceNames().map((name) => {
      const select = el("select", { id: `voice-${name}`, "data-name": name });
      const fill = () => {
        select.replaceChildren(
          el("option", { value: "" }, state.voices.length ? t.chooseVoice : t.getVoicesFirst),
          ...state.voices.map((v) => {
            const option = el("option", { value: v.id }, v.name);
            if (state.picks[name] === v.id) option.selected = true;
            return option;
          }),
        );
      };
      fill();
      select.addEventListener("change", () => {
        state.picks[name] = select.value;
        localStorage.setItem("ng-picks", JSON.stringify(state.picks));
        update();
      });
      return el(
        "div",
        { class: "field" },
        el("label", { for: select.id }, name === NARRATOR ? t.narratorLabel : t.voiceLabel(name)),
        select,
      );
    }),
  );
};

const key = $("#key");
const remember = $("#remember");
key.value = localStorage.getItem("ng-key") ?? "";
remember.checked = Boolean(key.value);
const keepKey = () => {
  if (remember.checked && key.value) localStorage.setItem("ng-key", key.value.trim());
  else localStorage.removeItem("ng-key");
};
key.addEventListener("input", () => {
  state.hint = null;
  keepKey();
  update();
});
remember.addEventListener("change", keepKey);

$("#load-voices").addEventListener("click", async () => {
  const button = $("#load-voices");
  button.disabled = true;
  button.textContent = t.gettingVoices;
  state.hint = null;
  try {
    state.voices = await listVoices(key.value.trim());
    renderVoicePicks();
  } catch (err) {
    state.hint = /HTTP 401/.test(err.message) ? () => t.keyRejected : () => t.voicesFailed(err.message);
  } finally {
    button.disabled = false;
    button.textContent = t["load-voices"];
    update();
  }
});

// --- step 4: make it ---

const update = () => {
  if (!state.deck) return;
  const missing = voiceNames().filter((n) => !state.picks[n] || (state.voices.length && !state.voices.some((v) => v.id === state.picks[n])));
  const reasons = [
    state.problems.length ? t.fixProblems : null,
    !state.deck.segments.length ? t.addNotes : null,
    !key.value.trim() ? t.enterKey : null,
    !state.voices.length ? t.getVoices : missing.length ? t.chooseFor(missing) : null,
  ].filter(Boolean);
  $("#make").disabled = reasons.length > 0;
  $("#make-hint").textContent = state.hint?.() ?? (reasons.length ? t.start(reasons.join(", ")) : "");
};

const step = (text) => {
  const item = el("li", {}, text);
  $("#progress").append(item);
  return item;
};

$("#make").addEventListener("click", async () => {
  const button = $("#make");
  button.disabled = true;
  $("#result").hidden = true;
  $("#progress").replaceChildren();
  for (const url of state.urls) URL.revokeObjectURL(url);
  state.urls = [];
  const model = $("#model").value.trim() || "eleven_v4";
  const clips = [];
  let sent = 0;
  try {
    for (const seg of state.deck.segments) {
      const voiceId = state.picks[seg.voice ?? NARRATOR];
      const who = seg.voice ?? t.narrator;
      const item = step(t.voicing(seg.slide, who));
      const id = await hash(`${model}\n${voiceId}\n${seg.text}`);
      let clip = await cacheGet(id);
      if (clip) {
        item.textContent = t.cached(seg.slide, who);
      } else {
        const { audio, words } = await withTimestamps({ key: key.value.trim(), voice: voiceId, model, format: FORMAT }, seg.text);
        if (!words) throw new Error(t.noTimings);
        clip = { audio, words };
        await cachePut(id, clip);
        sent += seg.text.length;
        item.textContent = t.voiced(seg.slide, who);
      }
      const url = URL.createObjectURL(new Blob([clip.audio], { type: "audio/mpeg" }));
      state.urls.push(url);
      item.append(" ", el("audio", { controls: "", src: url, preload: "none" }));
      clips.push(clip);
    }
    const { bytes, report, warnings } = await narrateDeck(state.deck, clips);
    const url = URL.createObjectURL(new Blob([bytes], { type: PPTX }));
    state.urls.push(url);
    const download = $("#download");
    download.href = url;
    download.download = `${state.name}-narrated.pptx`;
    state.result = { sent, report, warnings };
    renderReport();
    $("#result").hidden = false;
  } catch (err) {
    const text = /HTTP 401/.test(err.message) ? t.errKey : /quota|HTTP 402|HTTP 429/i.test(err.message) ? t.errQuota : err.message;
    step(text).className = "problem";
  } finally {
    update();
  }
});

const renderReport = () => {
  const { sent, report, warnings } = state.result;
  const names = (slide) => new Map([...state.deck.slides[slide - 1].shapes].map(([n, id]) => [id, n]));
  $("#report").replaceChildren(
    el("p", {}, t.sent(t.number(sent))),
    ...warnings.map((w) => el("p", { class: "warning" }, `${t.slide(w.slide)}: ${t.messages[w.code]?.(w.params) ?? w.message}`)),
    el(
      "ul",
      { class: "report" },
      ...report.map((r) => {
        const shapes = names(r.slide);
        const fx = r.effects.filter((e) => e.kind !== "mediacall").map((e) => t.fxAt(shapes.get(e.spid) ?? t.shape, t.seconds(e.ms)));
        return el("li", {}, t.reportLine(r.slide, t.seconds(r.durationMs), fx));
      }),
    ),
  );
};

setLanguage(startLanguage());
