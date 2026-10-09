/**
 * Records the ProcureFlow guide against the site served by server.mjs.
 *
 *   cd examples/procureflow
 *   node server.mjs &                       # http://localhost:4417
 *   node ../../cli.mjs tts procureflow      # in a project: npx narrated-guides tts procureflow
 *   node video/record-procureflow.mjs
 *   node ../../cli.mjs assemble procureflow procureflow
 *   node ../../cli.mjs frames procureflow procureflow
 */
import { loadConfig, record } from "narrated-guides";

const BASE = process.env.PROCUREFLOW_URL ?? "http://localhost:4417";

const JUSTIFICATION =
  "Our team of nine currently shares one stapler. It is kept in Henrik's drawer, and access requires a calendar invite. " +
  "A second stapler would reduce stapling-related meetings by an estimated forty percent and support our strategic goal of fewer meetings.";

const config = await loadConfig();

await record(config, "procureflow", ({ page, stage, rest, pointAt, cards, sleep }) => {
  const $ = (selector) => page.locator(selector).first();
  let typing = Promise.resolve();

  // Hash navigation keeps the document, so the cursor and step badge survive.
  const go = async (hash, ready) => {
    await page.evaluate((h) => (location.hash = h), hash);
    if (ready) await $(ready).waitFor();
    await sleep(300);
  };

  const box = async (selector, pad = 10) => {
    const b = await $(selector).boundingBox();
    if (!b) throw new Error(`No box for ${selector}`);
    return { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
  };

  // The cast members sit close together, so only one is circled at a time.
  const castMember = async (id) => {
    await stage("clear");
    return box(`[data-id="${id}"]`, 4);
  };

  const clickOn = async (selector) => {
    const { x, y } = await pointAt($(selector));
    await stage("pulse", x, y);
    await page.mouse.click(x, y);
  };

  const pf = (fn, ...args) => page.evaluate(([f, a]) => window.procureflow[f](...a), [fn, args]);

  return {
    next: "Approving a pumpkin. Coming Q2 2027.",

    point: {
      "New requisition": () => $('.sidebar a[data-route="new"]'),
      Select: () => page.getByRole("button", { name: "Select Stapler, standard (black)" }),
      Next: () => $("#next"),
      paperclip: async () => {
        await typing;
        return $("#paperclip");
      },
      "Submit requisition": () => $("#next"),
      Approvals: () => $('.sidebar a[data-route="approvals"]'),
      Approve: () => $("#approve"),
      Archive: () => $('.sidebar a[data-route="archive"]'),
      1987: () => $('[data-id="REQ-1987-000013"]'),
    },

    ring: {
      budget: () => box('[data-id="budget-kpi"]'),
      script: () => box("#script", 6),
      "a tag": () => box("#script .tag", 4),
      "a cue": () => box('#script [data-cue="ring:a cue"]', 4),
      results: () => box('[data-id="results"]'),
      remaining: () => box('[data-id="remaining"]', 2),
      exception: () => box('[data-id="exception"]', 6),
      requirement: () => box("#wizard .callout.info", 6),
      counter: () => box("#counter", 8),
      chain: () => box('[data-id="chain"]'),
      Bent: async () => ((await page.locator('[data-id="chain-bent"]').count()) ? box('[data-id="chain-bent"]', 6) : castMember("cast-bent")),
      reference: () => box('[data-id="reference"]', 6),
      tracker: () => box('[data-id="tracker"]'),
      justification: () => box('[data-id="justification"]', 8),
      "submit cue": () => box('#script [data-cue="klik:Submit requisition"]', 4),
      1987: () => box('[data-id="REQ-1987-000013"]', 4),
      Janet: () => castMember("cast-narrator"),
      Daniel: () => castMember("cast-compliance"),
      Gourdon: () => castMember("cast-pumpkin"),
    },

    type: async (target) => {
      switch (target) {
        case "catalogue":
          await clickOn("#catalogue");
          return page.locator("#catalogue").pressSequentially("stapler", { delay: 110 });
        case "cost centre":
          await pointAt($("#costCentre"));
          return page.locator("#costCentre").selectOption("4100");
        case "justification":
          await clickOn("#justification");
          typing = page.locator("#justification").pressSequentially(JUSTIFICATION, { delay: 26 });
          return;
        case "role":
          await pointAt($("#role"));
          return page.locator("#role").selectOption("approver");
        case "comment":
          await clickOn("#comment");
          return page.locator("#comment").pressSequentially("Fine. Return the old one to my drawer.", { delay: 6 });
        default:
          throw new Error(`Nothing to type for ${target}`);
      }
    },

    show: async (target) => {
      if (["manuscript", "voice", "recording", "assembly"].includes(target)) return pf("light", target);
      return stage("reveal", target);
    },

    before: {
      1: async () => {
        await page.goto(`${BASE}/?seed=demo#/dashboard`);
        await $(".kpi").waitFor();
        await stage("cursorVisible", false);
        await stage("swap", cards.titleCard({ title: "Requesting a stapler", subtitle: "From catalogue search to final approval. And Bent." }));
      },
      2: async () => {
        await stage("hide");
        await sleep(700);
        await stage("cursorVisible", true);
        await rest();
      },
      3: async () => {
        await stage("cursorVisible", false);
        await stage("show", cards.phasesCard({ current: 0 }));
        await sleep(600);
      },
      4: async () => {
        await go("#/behind-the-scenes?scenes=5", "#script .cue");
        await stage("hide");
        await sleep(700);
      },
      6: async () => {
        await pf("light", null);
        await stage("cursorVisible", true);
        await rest();
      },
      8: async () => {
        await clickOn("#next");
        await $("#justification").waitFor();
        await rest();
      },
      14: async () => {
        await stage("step", null);
        await go("#/behind-the-scenes?scenes=12", '#script [data-cue="klik:Submit requisition"]');
        await rest();
      },
      16: async () => {
        await stage("cursorVisible", false);
        await pf("haunt", true);
        await sleep(2400);
      },
      18: async () => {
        await pf("haunt", false);
        await go("#/behind-the-scenes?scenes=18", '[data-id="cast-pumpkin"]');
        await sleep(900);
      },
    },

    onStart: {
      16: ({ words }) => pf("talk", words),
    },
  };
});
