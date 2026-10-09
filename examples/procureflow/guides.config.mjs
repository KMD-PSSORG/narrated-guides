export default {
  viewport: { width: 1760, height: 990 },
  outDir: "video/out",
  manuscripts: "video/manuscripts",
  voice: {
    // The key and voices stay outside the repo; point elsewhere with an env var.
    envFile: process.env.NARRATED_GUIDES_VOICE_FILE ?? ".elevenlabs.env",
    voices: {
      compliance: "VOICE_ID_COMPLIANCE",
      bent: "VOICE_ID_BENT",
      pumpkin: "VOICE_ID_PUMPKIN",
    },
  },
  theme: { accent: "#2f4fd8", dark: "#14213d", text: "#1c2333", logo: "site/logo-card.svg" },
  labels: { kicker: "ProcureFlow 365 · Video guide", next: "Next video", phase: "Phase", step: "Step", overview: "The process" },
  process: {
    phases: [
      { name: "Find the item", steps: [1, 1] },
      { name: "Fill in the details", steps: [2, 3] },
      { name: "Get it approved", steps: [4, 5] },
    ],
    steps: [
      "Find the item",
      "Choose the cost centre",
      "Write the justification",
      "Check the approval chain",
      "Approve the requisition",
    ],
    roles: [
      { id: "requester", html: "<b>You</b> request." },
      { id: "approver", html: "<b>Your manager</b> approves." },
      { id: "bent", html: "<b>Bent</b> approves too. Nobody knows why." },
    ],
  },
  initScripts: ["window.__PF_RECORDING = true;"],
};
