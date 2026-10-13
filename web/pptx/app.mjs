// The narrated-decks page: the engine's pptx core, run in the browser with the
// user's own ElevenLabs key. Clips are cached in IndexedDB under the hash of
// model, voice and text, so running a deck again only voices what changed.
import { listVoices, withTimestamps } from "../../src/eleven.mjs";
import { checkDeck, narrateDeck, openDeck } from "../../src/pptx.mjs";

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

const state = { deck: null, name: "", problems: [], voices: [], picks: JSON.parse(localStorage.getItem("ng-picks") ?? "{}"), urls: [] };

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
    showError("That file could not be read as a PowerPoint deck (.pptx).");
    return;
  }
  state.name = name.replace(/\.pptx$/i, "").replace(/-narrated$/, "");
  const { problems, warnings, characters } = await checkDeck(state.deck);
  state.problems = problems;
  renderCheck(warnings, characters);
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
$("#sample").addEventListener("click", async () => {
  const response = await fetch("sample.pptx");
  await load(await response.arrayBuffer(), "sample.pptx");
});

// --- step 2: what will happen ---

/** The notes with cues, voice switches and audio tags marked. */
const marked = (notes) => {
  const out = el("p", { class: "notes" });
  let last = 0;
  for (const m of notes.matchAll(/\{[^}]*\}|\[[^\]]*\]/g)) {
    out.append(notes.slice(last, m.index));
    const kind = m[0].startsWith("[") ? "tag" : /^\{voice:/i.test(m[0]) ? "voice" : "cue";
    out.append(el("span", { class: kind }, m[0]));
    last = m.index + m[0].length;
  }
  out.append(notes.slice(last));
  return out;
};

const renderCheck = (warnings, characters) => {
  const withNotes = state.deck.slides.filter((s) => s.segments.length);
  $("#summary").replaceChildren(
    `${state.deck.slides.length} slides, ${withNotes.length} with notes. The voices will say ${characters.toLocaleString("en")} characters.`,
    ...(state.problems.length ? [el("span", { class: "problem" }, ` Fix the ${state.problems.length === 1 ? "problem" : "problems"} below first.`)] : []),
  );
  $("#slides").replaceChildren(
    ...state.deck.slides.map((slide) => {
      const mine = (list) =>
        list
          .filter((x) => x.slide === slide.number)
          .map((x) => x.message.replace(/^Slide \d+: (.)/, (_, c) => c.toUpperCase()));
      return el(
        "li",
        { class: slide.segments.length ? "" : "quiet" },
        el("strong", {}, `Slide ${slide.number}`),
        slide.segments.length ? marked(slide.notes) : el("p", { class: "notes" }, "No notes. This slide is left as it is."),
        ...mine(state.problems).map((m) => el("p", { class: "problem" }, m)),
        ...mine(warnings).map((m) => el("p", { class: "warning" }, m)),
      );
    }),
  );
};

// --- step 3: voices ---

const voiceNames = () => [NARRATOR, ...new Set(state.deck.segments.map((s) => s.voice).filter(Boolean))];

const renderVoicePicks = () => {
  $("#voice-picks").replaceChildren(
    ...voiceNames().map((name) => {
      const select = el("select", { id: `voice-${name}`, "data-name": name });
      const fill = () => {
        select.replaceChildren(
          el("option", { value: "" }, state.voices.length ? "Choose a voice" : "Get your voices first"),
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
        el("label", { for: select.id }, name === NARRATOR ? "Narrator (the notes without {voice: …})" : `{voice: ${name}}`),
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
  keepKey();
  update();
});
remember.addEventListener("change", keepKey);

$("#load-voices").addEventListener("click", async () => {
  const button = $("#load-voices");
  button.disabled = true;
  button.textContent = "Getting voices…";
  try {
    state.voices = await listVoices(key.value.trim());
    renderVoicePicks();
    $("#make-hint").textContent = "";
  } catch (err) {
    $("#make-hint").textContent = /HTTP 401/.test(err.message) ? "ElevenLabs did not accept that key." : `Could not get the voices: ${err.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Get my voices";
    update();
  }
});

// --- step 4: make it ---

const update = () => {
  if (!state.deck) return;
  const missing = voiceNames().filter((n) => !state.picks[n] || (state.voices.length && !state.voices.some((v) => v.id === state.picks[n])));
  const reasons = [
    state.problems.length ? "fix the problems in step 2" : null,
    !state.deck.segments.length ? "add speaker notes to at least one slide" : null,
    !key.value.trim() ? "enter your key" : null,
    !state.voices.length ? "get your voices" : missing.length ? `choose a voice for ${missing.join(" and ")}` : null,
  ].filter(Boolean);
  $("#make").disabled = reasons.length > 0;
  if (reasons.length) $("#make-hint").textContent = `To start: ${reasons.join(", ")}.`;
  else if (!/did not accept|Could not/.test($("#make-hint").textContent)) $("#make-hint").textContent = "";
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
      const who = seg.voice ?? "narrator";
      const item = step(`Slide ${seg.slide} · ${who} · voicing…`);
      const id = await hash(`${model}\n${voiceId}\n${seg.text}`);
      let clip = await cacheGet(id);
      if (clip) {
        item.textContent = `Slide ${seg.slide} · ${who} · already voiced`;
      } else {
        const { audio, words } = await withTimestamps({ key: key.value.trim(), voice: voiceId, model, format: FORMAT }, seg.text);
        if (!words) throw new Error("ElevenLabs sent no word timings for this model. Try another model under Advanced.");
        clip = { audio, words };
        await cachePut(id, clip);
        sent += seg.text.length;
        item.textContent = `Slide ${seg.slide} · ${who} · voiced`;
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
    const names = (slide) => new Map([...state.deck.slides[slide - 1].shapes].map(([n, id]) => [id, n]));
    $("#report").replaceChildren(
      el("p", {}, `${sent.toLocaleString("en")} characters sent to ElevenLabs this time.`),
      ...warnings.map((w) => el("p", { class: "warning" }, w.message)),
      el(
        "ul",
        { class: "report" },
        ...report.map((r) => {
          const shapes = names(r.slide);
          const fx = r.effects
            .filter((e) => e.kind !== "mediacall")
            .map((e) => `${shapes.get(e.spid) ?? "shape"} at ${(e.ms / 1000).toFixed(1)} s`);
          return el("li", {}, `Slide ${r.slide}: ${(r.durationMs / 1000).toFixed(1)} s${fx.length ? `. ${fx.join(", ")}` : ""}`);
        }),
      ),
    );
    $("#result").hidden = false;
  } catch (err) {
    const message = /HTTP 401/.test(err.message)
      ? "ElevenLabs did not accept the key."
      : /quota|HTTP 402|HTTP 429/i.test(err.message)
        ? "ElevenLabs says the plan has run out of characters, or is busy. Nothing else was spent."
        : err.message;
    step(message).className = "problem";
  } finally {
    update();
  }
});
