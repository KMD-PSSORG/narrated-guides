import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStage, phaseOfStep } from "../src/stage.mjs";

const process = {
  phases: [
    { name: "Find", steps: [1, 2] },
    { name: "Document", steps: [3, 3] },
    { name: "Pay", steps: [4, 5] },
  ],
  steps: ["Look up", "Set dates", "Write it", "Tell them", "Pay it"],
};

describe("phaseOfStep", () => {
  it("finds the phase whose step range holds the step", () => {
    assert.equal(phaseOfStep(process.phases, 1), 1);
    assert.equal(phaseOfStep(process.phases, 3), 2);
    assert.equal(phaseOfStep(process.phases, 5), 3);
  });

  it("returns 0 for a step no phase covers", () => {
    assert.equal(phaseOfStep(process.phases, 9), 0);
  });
});

describe("createStage", () => {
  const stage = createStage({
    theme: { accent: "#123456", dark: "#0a0b0c", logo: "data:image/svg+xml;base64,AAAA" },
    labels: { kicker: "Video guide", next: "Next video", phase: "Phase", step: "Step", overview: "The process" },
    process,
  });

  it("puts the theme's colours into the stage script", () => {
    assert.match(stage.stageScript, /#123456/);
    assert.match(stage.stageScript, /#0a0b0c/);
  });

  it("puts the logo on every card", () => {
    for (const card of [stage.titleCard({ title: "T", subtitle: "S" }), stage.endCard({ next: "N" }), stage.phasesCard({ current: 1 })]) {
      assert.match(card, /data:image\/svg\+xml;base64,AAAA/);
    }
  });

  it("labels the title card and end card from config", () => {
    assert.match(stage.titleCard({ title: "Guide", subtitle: "Video 1" }), /Video guide[\s\S]*Guide[\s\S]*Video 1/);
    assert.match(stage.endCard({ next: "Video 2" }), /Next video[\s\S]*Video 2/);
  });

  it("names the phase and the step on the step badge", () => {
    const badge = stage.stepBadge(4);
    assert.match(badge, /Phase 3 · Step 4/);
    assert.match(badge, /Tell them/);
  });

  it("marks the current phase and makes each phase addressable on the phases card", () => {
    const card = stage.phasesCard({ current: 2 });
    assert.match(card, /The process/);
    assert.match(card, /data-id="phase 2" data-current="true"/);
    assert.match(card, /data-id="phase 1" data-current="false"/);
    assert.match(card, /data-id="phases"/);
  });

  it("refuses step badges and the phases card without a process", () => {
    const bare = createStage({ theme: {}, labels: {} });
    assert.throws(() => bare.stepBadge(1), /no process configured/);
    assert.throws(() => bare.phasesCard({ current: 1 }), /no process configured/);
  });

  it("falls back to default colours and labels", () => {
    const bare = createStage({});
    assert.match(bare.stageScript, /#43b02a/);
    assert.match(bare.endCard({ next: "X" }), /Next video/);
  });
});
