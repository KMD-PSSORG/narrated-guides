/**
 * Renders the demo film: Dennis in his office.
 *
 *   cd examples/cartoon
 *   node ../../cli.mjs tts demo --say      # the free macOS voice; in a project: npx narrated-guides tts demo
 *   node video/film-demo.mjs               # add --preview to watch it live instead
 *   node ../../cli.mjs assemble demo
 *   node ../../cli.mjs frames demo
 */
import { loadConfig } from "narrated-guides";
import { film } from "narrated-guides/cartoon";
import dennis from "narrated-guides/cartoon/figures/dennis.mjs";
import office from "narrated-guides/cartoon/sets/office.mjs";

const config = await loadConfig();

await film(config, "demo", {
  set: office,
  cast: { default: { figure: dennis, at: "midt" } }, // the default voice is Dennis, and he starts in the middle
  pictures: { forside: "video/pictures/forside.svg" }, // what {vis: forside} puts on the screen
});
