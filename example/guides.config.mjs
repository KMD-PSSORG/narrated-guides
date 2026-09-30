export default {
  viewport: { width: 1280, height: 720 },
  outDir: "video/out",
  manuscripts: "video/manuscripts",
  // The key and voice stay outside the repo; point elsewhere with an env var.
  voice: { envFile: process.env.NARRATED_GUIDES_VOICE_FILE ?? ".elevenlabs.env" },
  theme: { accent: "#2f7fd8", dark: "#173b63" },
  labels: { kicker: "Video guide", next: "Next video", phase: "Phase", step: "Step", overview: "The process" },
  process: {
    phases: [
      { name: "Collect receipts", steps: [1, 1] },
      { name: "Register", steps: [2, 3] },
      { name: "Approve", steps: [4, 4] },
    ],
    steps: ["Collect the receipt", "Register the amount", "Attach the receipt", "Approve the expense"],
  },
};
