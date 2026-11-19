/**
 * The voiced scenes of a video, as `tts` left them in
 * <outDir>/<video>/audio/scene-NN.json: the words with their times, the cues
 * with the time of their word, and the scene's length.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** The scenes in order, each with `number` beside the file's own `scene`. */
export const readScenes = (audioDir) => {
  const files = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => /^scene-\d+\.json$/.test(f)).sort() : [];
  if (!files.length) {
    const video = path.basename(path.dirname(audioDir));
    throw new Error(`No voiced scenes in ${audioDir}. Run "narrated-guides tts ${video}" first.`);
  }
  return files
    .map((f) => JSON.parse(readFileSync(path.join(audioDir, f), "utf8")))
    .map((scene) => ({ ...scene, number: scene.scene }));
};
