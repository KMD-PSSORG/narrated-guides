import {
  ACTIVITY,
  ANNOUNCEMENTS,
  APPROVAL_QUEUE,
  ARCHIVE,
  CATALOGUE,
  CHAIN,
  COST_CENTRES,
  HELP_ARTICLES,
  JUSTIFICATION_MIN,
  NEW_REQUISITION_ID,
  PEOPLE,
  REQUISITIONS,
  TODAY,
} from "./data.js";

const STORE = "procureflow-v1";
const view = document.getElementById("view");

const fresh = () => ({
  role: "requester",
  wizard: { step: 1, query: "", itemId: null, costCentre: "", justification: "", paperclip: false },
  submitted: false,
  approved: false,
  approvalComment: "",
});

const params = new URLSearchParams(location.search);
if (params.has("seed")) localStorage.removeItem(STORE);
let state = { ...fresh(), ...JSON.parse(localStorage.getItem(STORE) ?? "{}") };
const save = () => localStorage.setItem(STORE, JSON.stringify(state));

// Helpers

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dkk = (n) => `DKK ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const item = () => CATALOGUE.find((i) => i.id === state.wizard.itemId);
const centre = () => COST_CENTRES.find((c) => c.id === state.wizard.costCentre);
const me = () => PEOPLE[state.role];

const toast = (text) => {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("on"), 4200);
};

const statusBadge = (status) => {
  const kind = /reject/i.test(status) ? "bad" : /deliver|approved/i.test(status) ? "ok" : /escalat/i.test(status) ? "info" : "waiting";
  return `<span class="badge ${kind}">${esc(status)}</span>`;
};

// The status of the new requisition through its approval chain.
const trackerSteps = () => {
  const lineDone = state.approved;
  return [
    { label: "Submitted", sub: date(TODAY), state: "done" },
    { label: "Line manager", sub: lineDone ? "Approved" : "Henrik Dal", state: lineDone ? "done" : "now" },
    { label: "Budget owner", sub: "Susanne Krog", state: lineDone ? "now" : "" },
    { label: "Procurement", sub: "Whenever", state: "" },
    { label: "Bent", sub: "Instant", state: "" },
    { label: "Ordered", sub: "", state: "" },
    { label: "Delivered", sub: "Q2 2027 (est.)", state: "" },
  ];
};

const tracker = (steps) => `
  <div class="tracker" data-id="tracker">
    ${steps
      .map(
        (s, i) => `<div class="t ${s.state}"><div class="dot">${s.state === "done" ? "✓" : i + 1}</div>${esc(s.label)}<span class="sub">${esc(s.sub)}</span></div>`,
      )
      .join("")}
  </div>`;

// Pages

const dashboard = () => {
  const person = me();
  const first = person.name.split(" ")[0];
  return `
  <div class="page-head">
    <div>
      <h1>Good morning, ${esc(first)}.</h1>
      <p>You have ${state.role === "approver" ? APPROVAL_QUEUE.length + (state.submitted && !state.approved ? 1 : 0) : 3} pending approvals and a healthy amount of resignation.</p>
    </div>
    <a class="btn primary" href="#/new">+ New requisition</a>
  </div>
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Open requisitions</div><div class="value">${3 + (state.submitted ? 1 : 0)}</div><div class="hint">Oldest: 39 years</div></div>
    <div class="card kpi"><div class="label">Average approval time</div><div class="value">41 days</div><div class="hint">Down from 43. Celebrate responsibly.</div></div>
    <div class="card kpi"><div class="label">Staplers delivered in 2026</div><div class="value">0</div><div class="hint">Target: 1</div></div>
    <div class="card kpi" data-id="budget-kpi"><div class="label">Budget remaining</div><div class="value bad">${dkk(12.4)}</div><div class="hint">Cost centre 4100</div></div>
  </div>
  <div class="grid two" style="margin-top:20px">
    <div class="card">
      <h2>Recent activity</h2>
      <ul class="activity">${ACTIVITY.map((a) => `<li><span class="when">${esc(a.when)}</span>${esc(a.text)}</li>`).join("")}</ul>
    </div>
    <div class="card">
      <h2>Need help?</h2>
      <p class="muted" style="margin-top:0">Our video guides explain everything, slowly and with feeling.</p>
      <a class="btn secondary" href="#/help">Open the help centre</a>
    </div>
  </div>`;
};

const STEPS = ["Item", "Cost centre", "Justification", "Approval chain"];

const stepper = (current) => `
  <div class="stepper">
    ${STEPS.map((name, i) => {
      const n = i + 1;
      const cls = n === current ? "current" : n < current ? "done" : "";
      return `<div class="s ${cls}" data-id="step-${n}"><span class="n">${n < current ? "✓" : n}</span>${esc(name)}</div>`;
    }).join("")}
  </div>`;

const stepItem = () => {
  const q = state.wizard.query.trim().toLowerCase();
  const hits = q ? CATALOGUE.filter((i) => i.name.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q))) : [];
  const list = !q
    ? `<div class="empty">Start typing to search 14,000 approved items. Or 7. We stopped counting.</div>`
    : hits.length
      ? hits
          .map(
            (i) => `
        <div class="result ${i.id === state.wizard.itemId ? "selected" : ""} ${i.unavailable ? "unavailable" : ""}" data-item="${i.id}">
          <div><div class="name">${esc(i.name)}</div><div class="meta">${esc(i.supplier)} · ${esc(i.lead)} · ${esc(i.note)}</div></div>
          <div class="price">${dkk(i.price)}</div>
          <button class="btn ${i.id === state.wizard.itemId ? "success" : "secondary"} small" data-select="${i.id}" ${i.unavailable ? "disabled" : ""}
            aria-label="Select ${esc(i.name)}">${i.id === state.wizard.itemId ? "Selected" : i.unavailable ? "Unavailable" : "Select"}</button>
        </div>`,
          )
          .join("")
      : `<div class="empty">No items match “${esc(q)}”. Consider whether you really need it.</div>`;
  return `
    <h2>What do you need?</h2>
    <div class="field">
      <label for="catalogue">Search catalogue</label>
      <input id="catalogue" type="search" autocomplete="off" value="${esc(state.wizard.query)}" placeholder="e.g. stapler" />
      <span class="help">Quantity is fixed at 1. Larger quantities require a framework agreement.</span>
    </div>
    <div class="results" data-id="results">${list}</div>`;
};

const stepCostCentre = () => {
  const c = centre();
  const price = item()?.price ?? 0;
  const remaining = c ? c.budget - c.committed : 0;
  const over = c ? price - remaining : 0;
  return `
    <h2>Who is paying?</h2>
    <div class="field" style="max-width:520px">
      <label for="costCentre">Cost centre</label>
      <select id="costCentre">
        <option value="">Select a cost centre…</option>
        ${COST_CENTRES.map((x) => `<option value="${x.id}" ${x.id === state.wizard.costCentre ? "selected" : ""} ${x.frozen ? "disabled" : ""}>${esc(x.name)}${x.frozen ? " (frozen)" : ""}</option>`).join("")}
      </select>
    </div>
    ${
      c
        ? `
      <div class="budget" data-id="budget">
        <div><div class="label">Annual budget</div><div class="value">${dkk(c.budget)}</div></div>
        <div><div class="label">Committed</div><div class="value">${dkk(c.committed)}</div></div>
        <div class="remaining" data-id="remaining"><div class="label">Remaining</div><div class="value">${dkk(remaining)}</div></div>
      </div>
      <div class="bar"><i style="width:${Math.min(100, (c.committed / c.budget) * 100)}%"></i></div>
      <div class="field" style="max-width:520px"><label>Account</label><input value="${esc(c.account)}" readonly /></div>
      ${
        over > 0
          ? `<div class="callout warn" data-id="exception">⚠️ <div>This requisition exceeds the remaining budget by <b>${dkk(over)}</b>. It will be routed for a <b>budget exception</b>, which adds one approval step. You're welcome.</div></div>`
          : c.discouraged
            ? `<div class="callout warn">⚠️ <div>Miscellaneous is technically allowed. Finance will still find you.</div></div>`
            : ""
      }`
        : ""
    }`;
};

const stepJustification = () => {
  const left = JUSTIFICATION_MIN - state.wizard.justification.length;
  return `
    <h2>Why do you need it?</h2>
    <div class="callout info" style="margin-bottom:18px">ℹ️ <div>A business justification of at least ${JUSTIFICATION_MIN} characters is required for all requisitions, including this one.</div></div>
    <div class="field">
      <label for="justification">Business justification</label>
      <textarea id="justification" placeholder="Describe the business need, expected benefits, alternatives considered and alignment with the company strategy.">${esc(state.wizard.justification)}</textarea>
      <span class="counter ${left <= 0 ? "ok" : ""}" id="counter" data-id="counter">${left > 0 ? `${left} characters until compliance` : "Compliant. Barely."}</span>
    </div>
    <label class="check"><input type="checkbox" id="paperclip" ${state.wizard.paperclip ? "checked" : ""} /> I confirm that I have considered using a paper clip instead.</label>`;
};

const stepChain = () => `
  <div class="grid two">
    <div>
      <h2>Your approval chain</h2>
      <p class="muted" style="margin-top:-6px">Built automatically from your amount, cost centre, item category and the phase of the moon.</p>
      <ul class="chain" data-id="chain">
        ${CHAIN.map(
          (s) => `
          <li class="${s.id ?? ""}" data-id="chain-${s.id ?? s.role.toLowerCase().replace(/\s+/g, "-")}">
            <div class="who">${esc(s.initials)}</div>
            <div><div class="role">${esc(s.role)}${s.reason ? ` · ${esc(s.reason)}` : ""}</div><div class="name">${esc(s.name)}</div>${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}</div>
            <div class="eta">${esc(s.eta)}</div>
          </li>`,
        ).join("")}
      </ul>
    </div>
    <div class="card summary">
      <h3>Summary</h3>
      <dl>
        <dt>Item</dt><dd>${esc(item()?.name ?? "–")}</dd>
        <dt>Amount</dt><dd>${dkk(item()?.price ?? 0)}</dd>
        <dt>Cost centre</dt><dd>${esc(centre()?.name ?? "–")}</dd>
        <dt>Approvers</dt><dd>${CHAIN.length}</dd>
        <dt>Estimated delivery</dt><dd data-id="eta">Q2 2027</dd>
      </dl>
    </div>
  </div>`;

const canContinue = () => {
  const w = state.wizard;
  if (w.step === 1) return !!w.itemId;
  if (w.step === 2) return !!w.costCentre;
  if (w.step === 3) return w.justification.length >= JUSTIFICATION_MIN && w.paperclip;
  return true;
};

const wizard = () => {
  if (state.submitted && state.wizard.step === 5) return confirmation();
  const step = state.wizard.step;
  const body = [stepItem, stepCostCentre, stepJustification, stepChain][step - 1]();
  const next = step < 4 ? `Next: ${STEPS[step]}` : "Submit requisition";
  return `
    <div class="page-head"><div><h1>New requisition</h1><p>Four simple steps. Some of them are simple.</p></div></div>
    ${stepper(step)}
    <div class="card" id="wizard">
      ${body}
      <div class="wizard-foot">
        ${step > 1 ? `<button class="btn secondary" id="back">Back</button>` : `<span class="muted">Draft saved automatically. Like it or not.</span>`}
        <button class="btn primary" id="next" ${canContinue() ? "" : "disabled"}>${next}</button>
      </div>
    </div>`;
};

const confirmation = () => `
  <div class="card">
    <div class="confirm-head">
      <div class="tick">✓</div>
      <div>
        <h1>Requisition submitted</h1>
        <p class="muted" style="margin:0">Your reference is <b class="mono" data-id="reference">${NEW_REQUISITION_ID}</b>. We'll notify you when something happens. Something rarely happens.</p>
      </div>
    </div>
    ${tracker(trackerSteps())}
    <div class="actions" style="margin-top:24px">
      <a class="btn primary" href="#/requisitions/${NEW_REQUISITION_ID}">View requisition</a>
      <a class="btn secondary" href="#/dashboard">Back to dashboard</a>
    </div>
  </div>`;

const myRequisitions = () => {
  const rows = [
    ...(state.submitted
      ? [{ id: NEW_REQUISITION_ID, item: item()?.name ?? "Stapler, standard (black)", submitted: TODAY, amount: item()?.price ?? 89, status: state.approved ? "With Budget owner" : "Awaiting approval", detail: state.approved ? "Approved by Henrik Dal. Now with Susanne Krog." : "With Henrik Dal." }]
      : []),
    ...REQUISITIONS,
  ];
  return `
    <div class="page-head"><div><h1>My requisitions</h1><p>Everything you have ever wanted, and its current status.</p></div></div>
    <div class="card" style="padding:8px 10px">
      <table>
        <thead><tr><th>Reference</th><th>Item</th><th>Submitted</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr class="clickable" data-href="#/requisitions/${r.id}"><td class="mono">${r.id}</td><td>${esc(r.item)}<div class="sub">${esc(r.detail)}</div></td><td>${date(r.submitted)}</td><td>${dkk(r.amount)}</td><td>${statusBadge(r.status)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
};

const requisitionDetail = (id) => {
  if (id === NEW_REQUISITION_ID && state.submitted) {
    return `
      <div class="page-head"><div><h1 class="mono">${id}</h1><p>${esc(item()?.name ?? "Stapler")} · ${dkk(item()?.price ?? 89)}</p></div>${statusBadge(state.approved ? "With Budget owner" : "Awaiting approval")}</div>
      <div class="card">${tracker(trackerSteps())}
        <h3 style="margin-top:28px">Business justification</h3><div class="quote">${esc(state.wizard.justification)}</div>
        ${state.approvalComment ? `<h3>Comment from Henrik Dal</h3><div class="quote">${esc(state.approvalComment)}</div>` : ""}
      </div>`;
  }
  const r = REQUISITIONS.find((x) => x.id === id);
  if (!r) return `<div class="card">Requisition not found. It may have been approved out of existence.</div>`;
  return `<div class="page-head"><div><h1 class="mono">${r.id}</h1><p>${esc(r.item)} · ${dkk(r.amount)}</p></div>${statusBadge(r.status)}</div><div class="card"><p>${esc(r.detail)}</p></div>`;
};

const approvals = () => {
  if (state.role !== "approver") {
    return `
      <div class="page-head"><div><h1>Approvals</h1><p>Where requisitions go to think about what they've done.</p></div></div>
      <div class="card"><div class="callout info">ℹ️ <div>You are viewing ProcureFlow as a requester. Switch <b>Viewing as</b> to an approver to see the approvals queue.</div></div></div>`;
  }
  const mine = state.submitted
    ? [{ id: NEW_REQUISITION_ID, item: item()?.name ?? "Stapler, standard (black)", requester: PEOPLE.requester.name, amount: item()?.price ?? 89, waiting: "Just now", justification: state.wizard.justification, fresh: true }]
    : [];
  const queue = [...mine.filter(() => !state.approved), ...APPROVAL_QUEUE];
  const selected = queue.find((q) => q.id === approvals.selected) ?? queue[0];
  const done = state.approved && approvals.selected === NEW_REQUISITION_ID;
  return `
    <div class="page-head"><div><h1>Approvals</h1><p>${queue.length} requisitions are waiting for you. Some of them since before lunch.</p></div></div>
    <div class="grid two" style="grid-template-columns: 1fr 1.6fr">
      <div class="queue">
        ${queue
          .map(
            (q) => `<div class="q ${selected && q.id === selected.id && !done ? "active" : ""}" data-pick="${q.id}"><div class="top"><span class="item">${esc(q.item)}</span><span class="badge ${q.fresh ? "info" : "waiting"}">${esc(q.waiting)}</span></div><div class="muted mono" style="font-size:13px;margin-top:4px">${q.id} · ${esc(q.requester)} · ${dkk(q.amount)}</div></div>`,
          )
          .join("")}
      </div>
      <div class="card" id="decision">
        ${
          done
            ? `<div class="callout ok" data-id="approved">✓ <div><b>Approved.</b> ${NEW_REQUISITION_ID} has been forwarded to Susanne Krog. Good luck to it.</div></div>${tracker(trackerSteps())}`
            : selected
              ? `
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">${selected.id} · from ${esc(selected.requester)}</div>
          <h2 style="margin-top:6px">${esc(selected.item)} · ${dkk(selected.amount)}</h2>
          <h3>Business justification</h3>
          <div class="quote" data-id="justification">${esc(selected.justification)}</div>
          <div class="field"><label for="comment">Comment (required)</label><textarea id="comment" style="min-height:90px" placeholder="Explain your decision. It will be read by nobody, but it is required."></textarea></div>
          <div class="actions">
            <button class="btn success" id="approve" disabled>Approve</button>
            <button class="btn danger" id="reject" disabled>Reject</button>
            <button class="btn secondary" id="more">Ask for more justification</button>
            <span class="stat">Used 4,112 times this year</span>
          </div>`
              : `<div class="empty">Nothing to approve. Enjoy it while it lasts.</div>`
        }
      </div>
    </div>`;
};

const archive = () => `
  <div class="page-head"><div><h1>Archive</h1><p>Requisitions older than ten years. Kept for compliance. And other reasons.</p></div></div>
  <div class="callout warn" style="margin-bottom:18px">⚠️ <div>Please do not open requisitions submitted before 1990. Facilities has asked us to stop mentioning why.</div></div>
  <div class="card" style="padding:8px 10px">
    <table>
      <thead><tr><th>Reference</th><th>Item</th><th>Requester</th><th>Submitted</th><th>Status</th></tr></thead>
      <tbody>
        ${ARCHIVE.map(
          (r) => `<tr class="clickable ${r.haunted ? "haunted-row" : ""}" data-href="#/archive/${r.id}" data-id="${r.id}"><td class="mono">${r.id}</td><td>${esc(r.item)}</td><td>${esc(r.requester)}</td><td>${date(r.submitted)}</td><td>${r.haunted ? `<span class="badge ghostly">${esc(r.status)}</span>` : statusBadge(r.status)}</td></tr>`,
        ).join("")}
      </tbody>
    </table>
  </div>`;

const archiveDetail = (id) => {
  const r = ARCHIVE.find((x) => x.id === id);
  if (!r) return archive();
  if (!r.haunted) return `<div class="page-head"><div><h1 class="mono">${r.id}</h1><p>${esc(r.item)}</p></div>${statusBadge(r.status)}</div><div class="card">Nothing to see here. Genuinely.</div>`;
  return `
    <div class="page-head"><div><h1 class="mono">${r.id}</h1><p>${esc(r.item)} · requested by ${esc(r.requester)}</p></div><span class="badge ghostly">Awaiting approval · 14,223 days</span></div>
    <div class="card">
      ${tracker([
        { label: "Submitted", sub: "31 Oct 1987", state: "done" },
        { label: "Line manager", sub: "Retired 1994", state: "now" },
        { label: "Budget owner", sub: "Position abolished", state: "" },
        { label: "Procurement", sub: "Whenever", state: "" },
        { label: "Bent", sub: "Instant", state: "" },
        { label: "Ordered", sub: "", state: "" },
        { label: "Delivered", sub: "Never", state: "" },
      ])}
      <h3 style="margin-top:28px">Business justification</h3>
      <div class="quote" data-id="old-justification">It is Halloween. The department needs a pumpkin. This is not complicated. I will wait.</div>
    </div>`;
};

const help = () => {
  const video = HELP_ARTICLES.find((a) => a.video);
  return `
    <div class="page-head"><div><h1>Help centre</h1><p>Answers to questions you didn't know you had to ask.</p></div><a class="btn secondary" href="#/behind-the-scenes">How our video guides are made</a></div>
    <div class="card">
      <span class="badge info">${esc(video.kind)}</span>
      <h2 style="margin-top:10px">${esc(video.title)}</h2>
      <p class="muted" style="margin:0">Everything from finding the item to getting it past Bent. About ${video.minutes} minutes. Contains one pumpkin.</p>
      <div class="player" id="player"><div>Video guide loading…</div></div>
    </div>
    <h2 style="margin:28px 0 14px">Articles</h2>
    <div class="articles">
      ${HELP_ARTICLES.filter((a) => !a.video)
        .map((a) => `<div class="card article"><div class="icon">📄</div><div><span class="badge info">${esc(a.kind)}</span><h3 style="margin-top:8px">${esc(a.title)}</h3><small>${a.minutes} min read</small></div></div>`)
        .join("")}
    </div>`;
};

// Behind the scenes reads the real manuscript the video was made from.

const parseManuscript = (md) => {
  const scenes = [];
  let current = null;
  let inSpeak = false;
  for (const line of md.split("\n")) {
    const h = line.match(/^## Scene (\d+) · (.+)$/);
    if (h) {
      current = { number: Number(h[1]), lines: [line] };
      scenes.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("```speak")) inSpeak = true;
    else if (inSpeak && line.startsWith("```")) inSpeak = false;
    current.lines.push(line);
  }
  return scenes.map((s) => ({ ...s, lines: s.lines.join("\n").trim().split("\n") }));
};

const highlight = (lines) => {
  let inSpeak = false;
  return lines
    .map((line) => {
      if (line.startsWith("## ")) return `<span class="h">${esc(line)}</span>`;
      if (line.startsWith("```")) {
        inSpeak = line.startsWith("```speak");
        return `<span class="fence">${esc(line)}</span>`;
      }
      if (!inSpeak) return `<span class="note">${esc(line)}</span>`;
      return esc(line)
        .replace(/\{([^}:]+):\s*([^}]+)\}/g, (m, verb, target) => `<span class="cue" data-cue="${esc(verb)}:${esc(target.trim())}">${m}</span>`)
        .replace(/\[[^\]]+\]/g, (m) => `<span class="tag">${m}</span>`);
    })
    .join("\n");
};

const behindTheScenes = (query) => {
  const wanted = (new URLSearchParams(query).get("scenes") ?? "3").split(",").map(Number);
  setTimeout(async () => {
    const box = document.getElementById("script");
    if (!box) return;
    try {
      const md = await (await fetch("/manuscripts/procureflow.md", { cache: "no-store" })).text();
      const scenes = parseManuscript(md).filter((s) => wanted.includes(s.number));
      box.innerHTML = scenes.length ? scenes.map((s) => highlight(s.lines)).join("\n\n") : "The manuscript is being approved.";
    } catch {
      box.textContent = "The manuscript could not be loaded. It is probably awaiting approval.";
    }
  });
  return `
    <div class="page-head"><div><h1>Behind the scenes</h1><p>How a ProcureFlow video guide is made. Faster than a requisition, at least.</p></div></div>
    <div class="pipeline">
      <div class="p" data-id="manuscript"><div class="k">1 · Manuscript</div><div class="t">Write it</div><div class="d">Scenes in Markdown. What is said, the tone, and what happens on screen.</div><div class="f">video/manuscripts/*.md</div></div>
      <div class="p" data-id="voice"><div class="k">2 · Voice</div><div class="t">Say it</div><div class="d">ElevenLabs voices every scene and returns when each word is spoken.</div><div class="f">npx narrated-guides tts</div></div>
      <div class="p" data-id="recording"><div class="k">3 · Recording</div><div class="t">Show it</div><div class="d">Playwright drives the app. Every click lands on its word.</div><div class="f">node video/record-*.mjs</div></div>
      <div class="p" data-id="assembly"><div class="k">4 · Assembly</div><div class="t">Ship it</div><div class="d">ffmpeg lays the voice on the picture and writes subtitles.</div><div class="f">npx narrated-guides assemble</div></div>
    </div>
    <div class="grid two" style="grid-template-columns: 1.7fr 1fr">
      <div><h2>From the manuscript</h2><div class="script" id="script" data-id="script">Loading the manuscript…</div></div>
      <div class="card">
        <h2>The cast</h2>
        <div class="cast" style="grid-template-columns:1fr">
          <div class="c" data-id="cast-narrator"><div class="who">Janet</div><div class="as">The narrator. Patient, mostly.</div><code>\`\`\`speak</code></div>
          <div class="c" data-id="cast-compliance"><div class="who">Daniel</div><div class="as">The Compliance Officer.</div><code>\`\`\`speak compliance</code></div>
          <div class="c" data-id="cast-bent"><div class="who">Bent</div><div class="as">Final approval. Since 2004.</div><code>\`\`\`speak bent</code></div>
          <div class="c" data-id="cast-pumpkin"><div class="who">G. Gourdon</div><div class="as">Senior Procurement Officer. Deceased.</div><code>\`\`\`speak pumpkin</code></div>
        </div>
      </div>
    </div>`;
};

// Haunting: the pumpkin's mouth opens on each spoken word.

const PF = {
  haunt(on = true) {
    document.body.classList.toggle("haunted", on);
    document.getElementById("haunt").classList.toggle("on", on);
  },
  talk(words, offsetMs = 0) {
    const pumpkin = document.querySelector(".pumpkin");
    const t0 = performance.now() - offsetMs;
    clearInterval(PF.timer);
    PF.timer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const speaking = words.some((w) => t >= w.start && t <= w.end - 0.03);
      const syllable = Math.floor(t * 9) % 2 === 0;
      pumpkin.classList.toggle("talking", speaking && syllable);
      if (t > (words.at(-1)?.end ?? 0) + 0.2) {
        clearInterval(PF.timer);
        pumpkin.classList.remove("talking");
      }
    }, 30);
  },
  light(id) {
    document.querySelectorAll(".pipeline .p").forEach((p) => p.classList.toggle("lit", p.dataset.id === id));
  },
  autoHaunt: !window.__PF_RECORDING,
};
window.procureflow = PF;

// Routing

const routes = (hash) => {
  const [pathPart, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [page, id] = pathPart.split("/");
  switch (page || "dashboard") {
    case "dashboard": return ["dashboard", dashboard()];
    case "new": return ["new", wizard()];
    case "requisitions": return ["requisitions", id ? requisitionDetail(id) : myRequisitions()];
    case "approvals": return ["approvals", approvals()];
    case "archive": return ["archive", id ? archiveDetail(id) : archive()];
    case "help": return ["help", help()];
    case "behind-the-scenes": return ["help", behindTheScenes(query)];
    default: return ["dashboard", dashboard()];
  }
};

const render = () => {
  const [active, html] = routes(location.hash);
  view.innerHTML = html;
  document.querySelectorAll(".sidebar a").forEach((a) => a.classList.toggle("active", a.dataset.route === active));
  document.getElementById("role").value = state.role;
  document.getElementById("avatar").textContent = me().initials;
  document.getElementById("approvalCount").textContent = APPROVAL_QUEUE.length + (state.submitted && !state.approved ? 1 : 0);
  const haunted = location.hash.startsWith("#/archive/REQ-1987");
  if (!haunted) PF.haunt(false);
  else if (PF.autoHaunt) {
    setTimeout(() => {
      PF.haunt(true);
      const words = "Approve... my... pumpkin.".split(" ").map((w, i) => ({ text: w, start: 0.4 + i * 0.9, end: 1.1 + i * 0.9 }));
      PF.talk(words);
    }, 1200);
  }
  if (location.hash.startsWith("#/help")) loadPlayer();
  wire();
};

const loadPlayer = async () => {
  const box = document.getElementById("player");
  const res = await fetch("/videos/procureflow.mp4", { method: "HEAD" }).catch(() => null);
  if (!box) return;
  box.innerHTML = res?.ok
    ? `<video controls preload="metadata" poster="/videos/procureflow.jpg" src="/videos/procureflow.mp4"><track kind="subtitles" srclang="en" label="English" src="/videos/procureflow.vtt" default /></video>`
    : `<div><b>The video guide is awaiting approval.</b><br /><small style="color:#9aa3c7">Estimated: Q2 2027. Bent has been notified.</small></div>`;
};

// Events

const rerender = () => {
  save();
  render();
};

function wire() {
  const w = state.wizard;
  const on = (id, event, fn) => document.getElementById(id)?.addEventListener(event, fn);

  view.querySelectorAll("[data-href]").forEach((row) => row.addEventListener("click", () => (location.hash = row.dataset.href)));

  on("catalogue", "input", (e) => {
    w.query = e.target.value;
    save();
    const caret = e.target.selectionStart;
    render();
    const input = document.getElementById("catalogue");
    input.focus();
    input.setSelectionRange(caret, caret);
  });
  view.querySelectorAll("[data-select]").forEach((b) =>
    b.addEventListener("click", () => {
      w.itemId = b.dataset.select;
      rerender();
    }),
  );
  on("costCentre", "change", (e) => {
    w.costCentre = e.target.value;
    rerender();
  });
  on("justification", "input", (e) => {
    w.justification = e.target.value;
    save();
    const left = JUSTIFICATION_MIN - w.justification.length;
    const counter = document.getElementById("counter");
    counter.textContent = left > 0 ? `${left} characters until compliance` : "Compliant. Barely.";
    counter.classList.toggle("ok", left <= 0);
    document.getElementById("next").disabled = !canContinue();
  });
  on("paperclip", "change", (e) => {
    w.paperclip = e.target.checked;
    save();
    document.getElementById("next").disabled = !canContinue();
  });
  on("back", "click", () => {
    w.step -= 1;
    rerender();
  });
  on("next", "click", () => {
    if (!canContinue()) return;
    if (w.step < 4) {
      w.step += 1;
    } else {
      state.submitted = true;
      w.step = 5;
      toast(`${NEW_REQUISITION_ID} submitted. Henrik Dal has been notified, in theory.`);
    }
    rerender();
    window.scrollTo(0, 0);
  });

  view.querySelectorAll("[data-pick]").forEach((q) =>
    q.addEventListener("click", () => {
      approvals.selected = q.dataset.pick;
      render();
    }),
  );
  on("comment", "input", (e) => {
    const ok = e.target.value.trim().length > 0;
    document.getElementById("approve").disabled = !ok;
    document.getElementById("reject").disabled = !ok;
  });
  on("approve", "click", () => {
    const picked = approvals.selected ?? view.querySelector("[data-pick]")?.dataset.pick;
    const comment = document.getElementById("comment").value.trim();
    if (picked === NEW_REQUISITION_ID) {
      state.approved = true;
      state.approvalComment = comment;
      approvals.selected = NEW_REQUISITION_ID;
      toast("Approved. Forwarded to Susanne Krog. Good luck.");
    } else {
      toast("Approved. It now waits for someone else.");
    }
    rerender();
  });
  on("reject", "click", () => toast("Rejected. The requester has been notified and is now writing a longer justification."));
  on("more", "click", () => toast("More justification requested. The cycle continues."));
}

document.getElementById("role").addEventListener("change", (e) => {
  state.role = e.target.value;
  rerender();
});

document.getElementById("ticker").innerHTML = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((a) => `<span>${esc(a)}</span>`).join("");

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/dashboard";
render();
