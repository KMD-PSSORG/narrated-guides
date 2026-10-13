#!/usr/bin/env node
/**
 * narrated-guides <command> — run from the project root, next to guides.config.mjs.
 *
 *   tts <manuscript>          voice a manuscript (a path, or a name in the manuscript folder)
 *   preview <video>           the voice as one mp3 to listen to
 *   assemble <video> [name]   recording + voice → <name>.mp4 and <name>.srt
 *   frames <video> [name]     a still at every cue, for review
 *   pptx <deck.pptx> [--dry | --say]
 *                             narrate a deck from its speaker notes → <deck>-narrated.pptx
 *
 * Recording is the project's own script, which calls record() from this package.
 */
import { assemble, frames, loadConfig, preview, voiceManuscript } from "./src/index.mjs";
import { narratePptxFile } from "./src/pptx-file.mjs";

const [command, first, ...rest] = process.argv.slice(2);
const usage =
  "usage: narrated-guides tts <manuscript> | preview <video> | assemble <video> [name] | frames <video> [name] | pptx <deck.pptx> [--dry | --say]";

const main = async () => {
  if (!command || !first) throw new Error(usage);
  const config = await loadConfig();
  switch (command) {
    case "tts": {
      const video = await voiceManuscript(config, first);
      return preview(config, video);
    }
    case "preview":
      return preview(config, first);
    case "assemble":
      return assemble(config, first, rest[0]);
    case "frames":
      return frames(config, first, rest[0]);
    case "pptx":
      return narratePptxFile(config, first, { dry: rest.includes("--dry"), say: rest.includes("--say") });
    default:
      throw new Error(usage);
  }
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
