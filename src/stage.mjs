/**
 * The layer the recorder draws on top of the app: a visible cursor, rings
 * around what the voice talks about, the step badge, and full-screen cards
 * (title, the process's phases, the end card).
 *
 * Screen recordings do not show the mouse, and a card shown as its own page
 * would flash white on the way back to the app. So everything lives in one
 * fixed layer inside the app's own page, installed on every document load.
 *
 * Colours, logo and wording come from the project; the process (phases and
 * steps) is optional and only needed for step badges and the phases card.
 */

export const DEFAULT_THEME = { accent: "#43b02a", dark: "#1f614e", text: "#1a1a1a", logo: null };
export const DEFAULT_LABELS = {
  kicker: "Video guide",
  next: "Next video",
  phase: "Phase",
  step: "Step",
  overview: "The process",
};

/** The 1-based phase whose step range holds `step`, or 0. */
export const phaseOfStep = (phases, step) =>
  phases.findIndex(({ steps: [from, to = from] }) => step >= from && step <= to) + 1;

const rgba = (hex, alpha) => {
  const [r, g, b] = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};

const css = ({ accent, dark, text }) => `
  #vstage { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
  #vstage .slot { position: absolute; inset: 0; opacity: 0; transition: opacity 600ms ease; }
  #vstage .slot.on { opacity: 1; }
  #vstage .card { position: absolute; inset: 0; background: #fff; color: ${text}; }
  #vstage .logo { position: absolute; top: 48px; left: 64px; width: 150px; }
  #vstage .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 14px; background: ${accent}; }
  #vstage .center { position: absolute; inset: 0; display: flex; flex-direction: column;
    justify-content: center; padding: 0 120px; }
  #vstage .kicker { font-size: 26px; letter-spacing: .08em; text-transform: uppercase; color: ${accent}; font-weight: 600; }
  #vstage h1 { font-size: 72px; line-height: 1.1; color: ${dark}; margin: 18px 0 20px; font-weight: 500; }
  #vstage h2 { font-size: 40px; color: ${dark}; margin: 0 0 36px; font-weight: 500; }
  #vstage .subtitle { font-size: 34px; color: #333; }
  #vstage .phases { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 18px; }
  #vstage .phase { border: 2px solid #d6d6d6; border-radius: 10px; padding: 20px 18px; min-height: 150px;
    transition: all 500ms ease; background: #fff; }
  #vstage .phase .number { font-size: 18px; color: #777; text-transform: uppercase; letter-spacing: .06em; }
  #vstage .phase .name { font-size: 25px; line-height: 1.2; margin: 10px 0; color: ${text}; }
  #vstage .phase .steps { font-size: 18px; color: #777; }
  #vstage .phase.lit { border-color: ${accent}; background: ${rgba(accent, 0.09)}; transform: translateY(-6px);
    box-shadow: 0 8px 24px ${rgba(accent, 0.25)}; }
  #vstage .phase.lit .number, #vstage .phase.lit .steps { color: ${dark}; }
  #vstage .roles { margin-top: 56px; display: flex; flex-direction: column; gap: 18px; font-size: 34px; }
  #vstage .roles b { color: ${dark}; }
  #vstage .step { position: absolute; top: 14px; left: 50%; transform: translate(-50%, -12px); opacity: 0;
    transition: opacity 300ms ease, transform 300ms ease; background: #fff; border: 2px solid ${accent};
    border-radius: 10px; padding: 8px 22px 10px; box-shadow: 0 6px 20px rgba(0,0,0,.18); text-align: center; }
  #vstage .step.on { opacity: 1; transform: translate(-50%, 0); }
  #vstage .step .kicker { font-size: 13px; }
  #vstage .step .name { font-size: 20px; color: ${dark}; font-weight: 500; margin-top: 2px; }
  #vstage .reveal { opacity: 0; transform: translateY(10px); transition: opacity 500ms ease, transform 500ms ease; }
  #vstage .reveal.shown { opacity: 1; transform: none; }
  #vstage .ring { position: absolute; border: 4px solid ${accent}; border-radius: 12px;
    box-shadow: 0 0 0 6px ${rgba(accent, 0.18)}; opacity: 0; transition: opacity 400ms ease; }
  #vstage .ring.on { opacity: 1; }
  #vstage .cursor { position: absolute; left: 0; top: 0; width: 28px; height: 28px;
    transition: transform 550ms cubic-bezier(.4,0,.2,1); filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
  #vstage .pulse { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
    background: ${rgba(accent, 0.45)}; animation: vpulse 500ms ease-out forwards; }
  @keyframes vpulse { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
`;

const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2l16 10.5-7.2 1.4 4.3 7.6-2.8 1.5-4.3-7.6L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

/** Runs in the page. Installs `window.vstage` on every document. */
const stageScriptFor = (theme) => `(() => {
  const install = () => {
    if (document.getElementById("vstage")) return;
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(css(theme))};
    document.head.appendChild(style);
    const root = document.createElement("div");
    root.id = "vstage";
    root.innerHTML = '<div class="slot"></div><div class="step"></div><div class="marks"></div><div class="cursor">' + ${JSON.stringify(CURSOR_SVG)} + '</div>';
    document.body.appendChild(root);
    const slot = root.querySelector(".slot");
    const step = root.querySelector(".step");
    const marks = root.querySelector(".marks");
    const cursor = root.querySelector(".cursor");
    const saved = JSON.parse(sessionStorage.getItem("vcursor") || "[768, 600]");
    const place = (x, y, ms) => {
      cursor.style.transitionDuration = ms + "ms";
      cursor.style.transform = "translate(" + (x - 4) + "px," + (y - 2) + "px)";
      sessionStorage.setItem("vcursor", JSON.stringify([x, y]));
    };
    place(saved[0], saved[1], 0);
    window.vstage = {
      move: place,
      pulse: (x, y) => {
        const p = document.createElement("div");
        p.className = "pulse";
        p.style.left = x + "px";
        p.style.top = y + "px";
        marks.appendChild(p);
        setTimeout(() => p.remove(), 600);
      },
      ring: (box) => {
        const r = document.createElement("div");
        r.className = "ring";
        const pad = 10;
        Object.assign(r.style, {
          left: box.x - pad + "px", top: box.y - pad + "px",
          width: box.width + 2 * pad + "px", height: box.height + 2 * pad + "px",
        });
        marks.appendChild(r);
        requestAnimationFrame(() => r.classList.add("on"));
      },
      clear: () => marks.querySelectorAll(".ring").forEach((r) => r.remove()),
      show: (html) => { slot.innerHTML = html; requestAnimationFrame(() => slot.classList.add("on")); },
      swap: (html) => { slot.innerHTML = html; slot.classList.add("on"); },
      hide: () => slot.classList.remove("on"),
      reveal: (id) => slot.querySelector('[data-id="' + id + '"]')?.classList.add("shown"),
      light: (id) => slot.querySelector('[data-id="' + id + '"]')?.classList.add("lit"),
      cursorVisible: (on) => { cursor.style.opacity = on ? "1" : "0"; },
      // Replaces the step badge, fading the old one out first; null hides it.
      step: (html) => {
        const wasOn = step.classList.contains("on");
        step.classList.remove("on");
        if (html === null) return;
        setTimeout(() => {
          step.innerHTML = html;
          step.classList.add("on");
        }, wasOn ? 320 : 0);
      },
    };
  };
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
})();`;

/**
 * The stage script and card builders for one project.
 *
 * `process` is `{ phases: [{ name, steps: [from, to] }], steps: [name, ...],
 * roles?: [{ id, html }] }`. Phases are addressable as `phase N` and the row
 * as `phases`, for `{fremhæv: phase 2}` and `{vis: phases}`; roles by their id.
 */
export const createStage = ({ theme = {}, labels = {}, process = null } = {}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  const l = { ...DEFAULT_LABELS, ...labels };

  const needProcess = () => {
    if (!process) throw new Error("Step badges and the phases card need a process, and there is no process configured.");
  };

  const card = (body) => `
  <div class="card">
    ${t.logo ? `<img class="logo" src="${t.logo}" alt="" />` : ""}
    ${body}
    <div class="bar"></div>
  </div>`;

  const range = ([from, to = from]) => (from === to ? `${l.step} ${from}` : `${l.step} ${from}–${to}`);

  return {
    stageScript: stageScriptFor(t),

    titleCard: ({ title, subtitle }) =>
      card(`
    <div class="center">
      <div class="kicker">${l.kicker}</div>
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>`),

    endCard: ({ next }) =>
      card(`
    <div class="center">
      <div class="kicker">${l.next}</div>
      <h1>${next}</h1>
    </div>`),

    phasesCard: ({ current }) => {
      needProcess();
      const roles = process.roles ?? [];
      return card(`
    <div class="center">
      <h2>${l.overview}</h2>
      <div class="phases reveal" data-id="phases">
        ${process.phases
          .map(
            ({ name, steps }, i) => `
          <div class="phase" data-id="phase ${i + 1}" data-current="${i + 1 === current}">
            <div class="number">${l.phase} ${i + 1}</div>
            <div class="name">${name}</div>
            <div class="steps">${range(steps)}</div>
          </div>`,
          )
          .join("")}
      </div>
      ${roles.length ? `<div class="roles">${roles.map(({ id, html }) => `<div class="role reveal" data-id="${id}">${html}</div>`).join("")}</div>` : ""}
    </div>`);
    },

    stepBadge: (step) => {
      needProcess();
      return `
  <div class="kicker">${l.phase} ${phaseOfStep(process.phases, step)} · ${l.step} ${step}</div>
  <div class="name">${process.steps[step - 1]}</div>`;
    },
  };
};
