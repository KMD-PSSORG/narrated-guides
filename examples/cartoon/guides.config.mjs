// A film needs no settings of its own: the defaults put manuscripts in
// video/manuscripts and everything generated in video/out.
export default {
  // The key and voice stay outside the repo; point elsewhere with an env var.
  voice: { envFile: process.env.NARRATED_GUIDES_VOICE_FILE ?? ".elevenlabs.env" },
};
