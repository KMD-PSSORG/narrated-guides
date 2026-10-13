---
name: narrate-deck-notes
description: Use when I want to turn a presentation into a narrated video, write or improve a voice-over for my slides, or prepare a deck for narrated-guides. Writes what the voice should say into the speaker notes, with cues that make shapes appear on the right word.
---
# Narrate a deck through its speaker notes

The speaker notes of this deck become a voice-over. Afterwards I open the narrated-guides page (https://kmd-pssorg.github.io/narrated-guides/web/pptx/), drop the deck there, and it voices every slide's notes, makes shapes appear on the words the cues point to, and lets each slide move on when its voice ends. PowerPoint then exports the video. Your job is the notes: what is said, and when things appear.

## How to work

1. **Read the whole deck first.** Then propose, in a few lines: who it is for, the tone, and the length (about 2.5 spoken words per second; most slides want 10 to 40 seconds). Ask me to confirm or adjust before writing.
2. **Find the shapes that should appear one at a time.** For each slide, list them with the name they have in the Selection Pane (Home → Arrange → Selection Pane). If you cannot see the names, or they are generic like "Rectangle 12" or "TextBox 3", tell me which shape is which by its visible text and suggest short, clear names for me to give them in the Selection Pane, e.g. "Phase 1", "Phase 2", "Warning". Wait until I confirm the names.
3. **Write the notes slide by slide** into each slide's speaker notes. If a slide already has notes, ask whether to replace them or keep them.
4. **Finish with a check:** the cues per slide and the shape names they rely on, an estimated duration per slide and in total, and the next step: open the narrated-guides page and drop the deck.

## The format

The notes are exactly what one voice says, in the order it says it. Nothing else may be in them.

- **Spoken prose only.** No bullets, headings, slide titles, URLs or "on this slide we see". Talk to the viewer. Write numbers and abbreviations the way they are said: "two hundred characters", "the HR team", "version three".
- **`{vis: Shape name}`** makes that shape appear on the word right after the cue. Put it directly before the word that introduces the thing, not at the start of the sentence: `First, {vis: Phase 1} you find the item.` The name must match the Selection Pane exactly. `{show: Shape name}` means the same.
  - If the shape already has an animation, that animation is used and moved onto the word; shapes animated in the same click ("With Previous", "After Previous") come along by themselves, so they need no cue of their own.
  - A shape without an animation fades in. Shapes that should be visible from the start need no cue.
  - One cue per thing that appears, in the order they should appear.
- **`{voice: name}`** lets a second voice say the rest of the slide, e.g. `{voice: expert}`. Use short lowercase names; I pick the actual voice on the page. Use a second voice only when it helps: a quote, a customer, a dialogue, a punchline.
- **Audio tags in square brackets** tell the voice how to say something and are not read aloud: `[pauses]`, `[calm]`, `[warmly]`, `[deadpan]`, `[excited]`. Use them sparingly, at most one or two per slide, between sentences rather than mid-sentence.
- **Same language as the deck**, unless I ask for another.

## Example

A slide with a three-phase timeline whose phases are named "Phase 1", "Phase 2" and "Phase 3":

```
A requisition goes through three phases. {vis: Phase 1} First, you find the item in the catalogue. [pauses] {vis: Phase 2} Then you fill in the details: the cost centre, the budget, and a short justification. [pauses] {vis: Phase 3} And finally, it gets approved. {voice: approver} [deadpan] Eventually.
```

## Do not

- Do not change the slides themselves unless I ask; the notes are the work.
- Do not invent facts that are not in the deck or in what I tell you.
- Do not use a shape name in a cue that I have not confirmed exists.
