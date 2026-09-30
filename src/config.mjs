/**
 * The project's settings, from `guides.config.mjs` in its root, with defaults
 * filled in and paths made absolute.
 *
 * The ElevenLabs key and voice live in a file the project keeps out of git
 * (`voice.envFile`, KEY=VALUE lines). They are read when voicing, never logged,
 * and never part of an error message.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_LEADS } from "./timing.mjs";

export const CONFIG_FILE = "guides.config.mjs";

const DEFAULTS = {
  viewport: { width: 1760, height: 990 },
  outDir: "video/out",
  manuscripts: "video/manuscripts",
  voice: { envFile: ".elevenlabs.env", model: "eleven_v4", format: "mp3_44100_128" },
  theme: {},
  labels: {},
  process: null,
  initScripts: [],
  openBrowser: null,
};

const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

const dataUri = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`The logo ${file} is not an svg, png or jpg.`);
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
};

export const resolveConfig = (user, root) => {
  if (user.openBrowser !== undefined && user.openBrowser !== null && typeof user.openBrowser !== "function") {
    throw new Error("openBrowser must be a function (viewport, contextOptions) => ({ browser, page }).");
  }
  const at = (p) => path.resolve(root, p);
  const voice = { ...DEFAULTS.voice, ...user.voice };
  const theme = { ...user.theme };
  if (theme.logo && !theme.logo.startsWith("data:")) theme.logo = dataUri(at(theme.logo));

  return {
    ...DEFAULTS,
    ...user,
    root,
    viewport: { ...DEFAULTS.viewport, ...user.viewport },
    outDir: at(user.outDir ?? DEFAULTS.outDir),
    manuscripts: at(user.manuscripts ?? DEFAULTS.manuscripts),
    voice: { ...voice, envFile: at(voice.envFile) },
    theme,
    labels: { ...user.labels },
    leads: { ...DEFAULT_LEADS, ...user.leads },
    initScripts: user.initScripts ?? [],
  };
};

/** `guides.config.mjs` from `root`, resolved; defaults alone when there is none. */
export const loadConfig = async (root = process.cwd()) => {
  const file = path.join(root, CONFIG_FILE);
  const user = existsSync(file) ? (await import(pathToFileURL(file).href)).default : {};
  return resolveConfig(user ?? {}, root);
};

export const readVoiceSecrets = (file) => {
  if (!existsSync(file)) throw new Error(`No voice settings at ${file}. It needs ELEVEN_LABS_API_KEY and VOICE_ID.`);
  const values = Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
  const missing = ["ELEVEN_LABS_API_KEY", "VOICE_ID"].filter((name) => !values[name]);
  if (missing.length) throw new Error(`${file} has no ${missing.join(" and ")}.`);
  return { key: values.ELEVEN_LABS_API_KEY, voice: values.VOICE_ID };
};
