/**
 * The length of an mp3 in seconds, from its frame headers — what ffprobe would
 * say, without ffprobe, so it also works in a browser. Layer III only, which
 * is what ElevenLabs sends.
 */
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };
const VERSIONS = { 3: 1, 2: 2, 0: 2.5 };

const skipId3 = (bytes) => {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
  return 10 + size + (bytes[5] & 0x10 ? 10 : 0);
};

/** The encoder's Xing/Info frame carries no sound. */
const isInfoFrame = (bytes, at, length) => {
  const tag = (i) => String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
  for (let i = at + 4; i < Math.min(at + 40, at + length - 4); i++) if (tag(i) === "Xing" || tag(i) === "Info") return true;
  return false;
};

export const mp3Duration = (bytes) => {
  let at = skipId3(bytes);
  let seconds = 0;
  let first = true;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff || (bytes[at + 1] & 0xe0) !== 0xe0) {
      at++;
      continue;
    }
    const version = VERSIONS[(bytes[at + 1] >> 3) & 3];
    const layer = (bytes[at + 1] >> 1) & 3;
    const bitrate = BITRATES[version === 1 ? 1 : 2]?.[bytes[at + 2] >> 4];
    const rate = RATES[version]?.[(bytes[at + 2] >> 2) & 3];
    if (!version || layer !== 1 || !bitrate || !rate) {
      at++;
      continue;
    }
    const padding = (bytes[at + 2] >> 1) & 1;
    const samples = version === 1 ? 1152 : 576;
    const length = Math.floor(((samples / 8) * bitrate * 1000) / rate) + padding;
    if (!(first && isInfoFrame(bytes, at, length))) seconds += samples / rate;
    first = false;
    at += length;
  }
  return seconds;
};
