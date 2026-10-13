---
name: narrate-deck-notes
description: Use when I want to turn a presentation into a narrated video, write or improve a voice-over for my slides, or prepare a deck for narrated-guides — also when I ask in Danish, e.g. for speak, en fortællerstemme, en video af præsentationen eller noter til oplæsning. Writes what the voice should say into the speaker notes, with cues that make shapes appear on the right word.
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
- **An effect after a comma** chooses how a shape without an animation of its own comes in: `{vis: Phase 1, fly left}`. Without one it fades in. The effects, in Danish and English: tone/fade, straks/appear, zoom, svæv/float, fly (from below), fly venstre/fly left, fly højre/fly right, fly top, visk/wipe, voks/grow. Pick them with taste: one effect for a row of similar shapes (`fly venstre` along a timeline, `svæv` for text), `zoom` or `voks` for the one thing that should stand out, and never a different effect on every shape. If the shape already has an animation in PowerPoint, that one is kept and the effect is ignored.
  - If the shape already has an animation, that animation is used and moved onto the word; shapes animated in the same click ("With Previous", "After Previous") come along by themselves, so they need no cue of their own.
  - A shape without an animation fades in. Shapes that should be visible from the start need no cue.
  - One cue per thing that appears, in the order they should appear.
- **`{voice: name}`** (in Danish `{stemme: navn}`) lets a second voice say the rest of the slide, e.g. `{voice: expert}` or `{stemme: borger}`. Use short lowercase names; I pick the actual voice on the page. Use a second voice only when it helps: a quote, a customer, a dialogue, a punchline.
- **Audio tags in square brackets** tell the voice how to say something and are not read aloud: `[pauses]`, `[calm]`, `[warmly]`, `[deadpan]`, `[excited]`. Write them in English even when the notes are in Danish. Use them sparingly, at most one or two per slide, between sentences rather than mid-sentence.
- **Same language as the deck**, unless I ask for another. The cue word `vis` is Danish already, so Danish notes need no English apart from the audio tags.

## Danish notes

A voice reads exactly what is written, so write Danish the way it is said:

- **No abbreviations:** "for eksempel", not "fx" or "f.eks."; "blandt andet", not "bl.a."; "og så videre", not "osv."; "kroner", not "kr." or "DKK".
- **Acronyms the way people say them:** spelled out letter by letter when they are spoken that way ("K M D", "C P R-nummer"), as a word when they are said as one ("NemID", "MitID").
- **Numbers and dates as words when they matter for the rhythm:** "fem hundrede kroner", "den første marts", "klokken halv ti". Short, plain numbers may stay as digits.
- **Short sentences, everyday words.** Prefer "du" to "man", active to passive, and Danish words to English ones where a Danish word is normal.
- **No parentheses, slashes or arrows;** say "eller" or "og" instead, and turn menu paths into a sentence: "Vælg Filer, og så Eksportér."

## Example

A slide with a three-phase timeline whose phases are named "Phase 1", "Phase 2" and "Phase 3":

```
A requisition goes through three phases. {vis: Phase 1} First, you find the item in the catalogue. [pauses] {vis: Phase 2} Then you fill in the details: the cost centre, the budget, and a short justification. [pauses] {vis: Phase 3} And finally, it gets approved. {voice: approver} [deadpan] Eventually.
```

The same in Danish, with phases named "Fase 1", "Fase 2" and "Fase 3":

```
En indkøbsrekvisition går gennem tre faser. {vis: Fase 1, fly venstre} Først finder du varen i kataloget. [pauses] {vis: Fase 2, fly venstre} Så udfylder du detaljerne: omkostningssted, budget og en kort begrundelse. [pauses] {vis: Fase 3, fly venstre} Og til sidst bliver den godkendt. {stemme: godkender} [deadpan] På et tidspunkt.
```

## Do not

- Do not change the slides themselves unless I ask; the notes are the work.
- Do not invent facts that are not in the deck or in what I tell you.
- Do not use a shape name in a cue that I have not confirmed exists.
