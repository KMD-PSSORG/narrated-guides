/**
 * The voiced scenes of a video, as `tts` left them in
 * <outDir>/<video>/audio/scene-NN.json: the words with their times, the cues
 * with the time of their word, and the scene's length.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** The hash of a scene whose trial voicing has begun and not finished. */
export const UNFINISHED = "say:unfinished";

/** The scenes in order, each with `number` beside the file's own `scene`. */
export const readScenes = (audioDir) => {
  const files = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => /^scene-\d+\.json$/.test(f)).sort() : [];
  if (!files.length) {
    const video = path.basename(path.dirname(audioDir));
    throw new Error(`No voiced scenes in ${audioDir}. Run "narrated-guides tts ${video}" first.`);
  }
  return files.map((f) => {
    const scene = JSON.parse(readFileSync(path.join(audioDir, f), "utf8"));
    // A trial voicing marks a scene before its audio exists (see tts.mjs). If
    // it was interrupted, the mark is all there is: no length, no words.
    if (scene.hash === UNFINISHED) {
      const video = path.basename(path.dirname(audioDir));
      throw new Error(`${path.basename(f, ".json")} was left unfinished by a voicing that was interrupted. Run "narrated-guides tts ${video} --say" again.`);
    }
    return { ...scene, number: scene.scene };
  });
};
