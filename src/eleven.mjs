/**
 * The ElevenLabs calls that need nothing but fetch, so the same code voices a
 * manuscript from Node and a deck from a browser. The key goes to ElevenLabs
 * and nowhere else.
 */
import { wordsFromCharacters } from "./timing.mjs";

export const API = "https://api.elevenlabs.io/v1";

export const failure = async (response, what) => {
  const body = await response.text();
  return new Error(`${what}: HTTP ${response.status} ${body.slice(0, 300)}`);
};

const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** Audio for `text`, and its words with start and end, or null when the model gives no timings. */
export const withTimestamps = async ({ key, voice, model, format }, text) => {
  const response = await fetch(`${API}/text-to-speech/${voice}/with-timestamps?output_format=${format}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!response.ok) throw await failure(response, "text-to-speech/with-timestamps");
  const body = await response.json();
  const alignment = body.alignment ?? body.normalized_alignment;
  return {
    audio: fromBase64(body.audio_base64),
    words: alignment
      ? wordsFromCharacters(
          alignment.characters,
          alignment.character_start_times_seconds,
          alignment.character_end_times_seconds,
        )
      : null,
  };
};

/** The voices on the key's account, as `{ id, name }`, sorted by name. */
export const listVoices = async (key) => {
  const response = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!response.ok) throw await failure(response, "voices");
  const { voices } = await response.json();
  return voices.map((v) => ({ id: v.voice_id, name: v.name })).sort((a, b) => a.name.localeCompare(b.name));
};
