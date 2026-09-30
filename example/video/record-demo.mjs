/**
 * Records the demo against the static page in example/app.
 *
 *   cd example
 *   node ../cli.mjs tts demo          # in a project: npx narrated-guides tts demo
 *   node video/record-demo.mjs
 *   node ../cli.mjs assemble demo
 *   node ../cli.mjs frames demo
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfig, record } from "narrated-guides";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = pathToFileURL(path.join(root, "app", "index.html")).href;

const config = await loadConfig(root);

await record(config, "demo", ({ page, stage, moveTo, rest, cards }) => {
  const amount = page.getByLabel("Amount", { exact: true });

  return {
    next: "Attaching the receipt",

    point: {
      Save: () => page.getByRole("button", { name: "Save" }),
    },

    ring: {
      Total: () => page.getByLabel("Total").boundingBox(),
    },

    type: async () => {
      const box = await amount.boundingBox();
      const at = await moveTo({ x: box.x + 40, y: box.y + box.height / 2 });
      await page.mouse.click(at.x, at.y);
      await page.keyboard.type("249.00", { delay: 90 });
    },

    before: {
      1: async () => {
        await page.goto(APP);
        await stage("cursorVisible", false);
        await stage("swap", cards.titleCard({ title: "Expenses", subtitle: "Registering an expense" }));
      },
      2: async () => {
        await stage("swap", cards.phasesCard({ current: 2 }));
        await stage("reveal", "phases");
      },
      3: async () => {
        await stage("hide");
        await new Promise((r) => setTimeout(r, 700));
        await stage("cursorVisible", true);
        await rest();
      },
    },
  };
});
