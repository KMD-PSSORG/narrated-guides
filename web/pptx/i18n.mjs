// The page's words in Danish and English. Static text is keyed by the
// data-i18n attribute on its element; the rest are functions called by app.mjs.
import { MESSAGES, effectNames } from "../../src/pptx.mjs";

const da = {
  title: "Præsentationer der fortæller sig selv · narrated-guides",
  h1: "Præsentationer der fortæller sig selv",
  lede: "Skriv i noterne, hvad hvert slide skal sige. Få præsentationen tilbage med stemme på hvert slide, animationerne på de rigtige ord og slides, der skifter af sig selv. Bagefter laver PowerPoint videoen.",
  privacy: "Det hele sker i din browser. Præsentationen bliver ikke uploadet nogen steder, og din ElevenLabs-nøgle sendes kun til ElevenLabs sammen med teksten fra noterne.",
  s1: "Din præsentation",
  drop: "<strong>Træk en .pptx herind</strong> eller klik for at vælge en",
  sample: 'Har du ikke en ved hånden? <button type="button" class="link" id="sample">Prøv eksemplet</button>: en marketingekspert, der viser alle effekterne, mens fortælleren prøver at komme til orde.',
  "help-notes-summary": "Sådan skriver du noterne",
  "help-notes-body": `<p>Skriv i noterne, hvad stemmen skal sige på det slide. Slides uden noter bliver ikke rørt.</p>
<pre>En indkøbsrekvisition går gennem tre faser.
{vis: Fase 1} Først finder du varen. [pauses]
{vis: Fase 2} Så udfylder du detaljerne.
{stemme: bent} [deadpan] Bent godkender. På et tidspunkt.</pre>
<ul>
<li><code>{vis: Fase 1}</code> får figuren “Fase 1” frem på det næste ord. Navnet er det, der står i markeringsruden (Hjem → Arranger → Markeringsrude), hvor du også kan omdøbe figurer.</li>
<li>Har figuren allerede en animation, bruges den og flyttes til ordet. Figurer i samme klik (“Med forrige” og “Efter forrige”) følger med. En figur uden animation toner frem.</li>
<li>Skriv en effekt efter et komma for at vælge, hvordan en figur uden animation kommer ind: <code>{vis: Fase 1, zoom}</code>. Effekterne er ${effectNames("da")}.</li>
<li><code>{stemme: bent}</code> lader en anden stemme sige resten af slidet. Du vælger stemmen nedenfor. <code>{voice: …}</code> virker også.</li>
<li><code>[pauses]</code>, <code>[deadpan]</code> og andre ord i firkantede parenteser fortæller stemmen, hvordan den skal sige det. De læses ikke op. Skriv dem på engelsk, også i danske noter.</li>
<li>Skriv tal, datoer og forkortelser, som de siges: “for eksempel”, “fem hundrede kroner”, “K M D”.</li>
</ul>`,
  "help-copilot-summary": "Lad Copilot i PowerPoint skrive noterne",
  "help-copilot-body": `<p>Skill'en <a href="../../copilot/narrate-deck-notes/SKILL.md" download="SKILL.md">narrate-deck-notes</a> lærer Copilot formatet. Den skriver noterne, foreslår navne til figurerne og anslår, hvor lang videoen bliver.</p>
<ol>
<li>Åbn Copilot i PowerPoint, vælg … → Manage skills → Custom skills, og slå custom skills til.</li>
<li>Vælg Add skill, og upload filen SKILL.md.</li>
<li>Skriv til Copilot: <em>@narrate-deck-notes skriv et speak til den her præsentation, cirka to minutter, roligt og venligt.</em></li>
</ol>`,
  s2: "Det her sker",
  s3: "Stemmer",
  "key-label": "Din ElevenLabs API-nøgle",
  "load-voices": "Hent mine stemmer",
  remember: "Husk nøglen på denne computer",
  "key-aside": "Du finder den under ElevenLabs → Developers → API keys. Hvert tegn, stemmerne siger, tæller med i dit ElevenLabs-abonnement.",
  "key-help-summary": "Sådan får du en nøgle",
  "key-help-body": `<ol>
<li>Opret en konto på <a href="https://elevenlabs.io" target="_blank" rel="noopener">elevenlabs.io</a>. Den gratis konto giver 10.000 credits om måneden, nok til omkring 10 til 20 minutters tale afhængigt af modellen. Eksemplet her bruger under 600.</li>
<li>Gå til <a href="https://elevenlabs.io/app/developers/api-keys" target="_blank" rel="noopener">Developers → API Keys</a>, og vælg Create Key.</li>
<li>Giv nøglen et navn, du kan genkende, for eksempel “PowerPoint”, og vælg, hvornår den skal udløbe.</li>
<li>Lad <strong>Restrict Key</strong> være slået til, og giv kun adgang til to ting:
<ul>
<li><strong>Text to Speech:</strong> Access</li>
<li><strong>Voices:</strong> Read</li>
</ul>
Alt andet kan stå på No Access. Så kan nøglen kun lave tale og se dine stemmer, også hvis den slipper ud.</li>
<li>Vil du sætte et loft, så skriv et antal credits ud for <strong>Per credit refresh period</strong>.</li>
<li>Vælg Create Key, kopiér nøglen, og sæt den ind her. ElevenLabs viser den kun én gang.</li>
</ol>`,
  license: `<strong>Gratiskontoen er kun til intern brug.</strong> Skal videoen bruges til andet end intern brug, for eksempel til kunder, på en offentlig hjemmeside eller i markedsføring, <strong>skal</strong> du have en betalt ElevenLabs-plan. Er du i tvivl, så vælg en betalt plan, og se <a href="https://elevenlabs.io/pricing" target="_blank" rel="noopener">ElevenLabs' planer og vilkår</a>.`,
  "voices-help-summary": "Danske stemmer",
  "voices-help-body": `<p>En engelsk stemme kan godt tale dansk, men den lyder som en turist. Find en dansk stemme i ElevenLabs:</p>
<ol>
<li>Gå til Voices → Voice Library, og filtrer på sproget Danish.</li>
<li>Lyt et par stykker igennem, og vælg Add to my voices ved dem, du kan lide.</li>
<li>Kom tilbage hertil, og tryk Hent mine stemmer igen.</li>
</ol>`,
  advanced: "Avanceret",
  "model-label": "Model",
  "model-aside": "Ordene i firkantede parenteser kræver en model, der forstår dem.",
  s4: "Lav den",
  make: "Lav præsentationen med stemme",
  download: "Hent præsentationen med stemme",
  then: "Bagefter, i PowerPoint",
  "then-body": `<li>Åbn præsentationen, og tryk Afspil fra start for at se den køre af sig selv.</li>
<li>Filer → Eksportér → Opret en video. Vælg <em>Brug indspillede tidsindstillinger og speak</em>.</li>
<li>Vil du ændre et ord? Ret noterne, træk præsentationen herind igen, og kør den en gang til. Kun slides med ændret tekst koster tegn.</li>`,
  footer: 'En del af <a href="https://github.com/KMD-PSSORG/narrated-guides">narrated-guides</a>. Det samme fra kommandolinjen: <code>narrated-guides pptx deck.pptx</code>.',
  lang: "English",
  sampleFile: "sample.da.pptx",

  summary: (slides, notes, chars) => `${slides} slides, ${notes} med noter. Stemmerne kommer til at sige ${chars} tegn.`,
  fixFirst: (n) => ` Ret ${n === 1 ? "problemet" : "problemerne"} nedenfor først.`,
  slide: (n) => `Slide ${n}`,
  noNotes: "Ingen noter. Slidet bliver ikke rørt.",
  narratorLabel: "Fortæller (noterne uden {stemme: …})",
  voiceLabel: (name) => `{stemme: ${name}}`,
  chooseVoice: "Vælg en stemme",
  getVoicesFirst: "Hent dine stemmer først",
  gettingVoices: "Henter stemmer…",
  keyRejected: "ElevenLabs godtog ikke den nøgle.",
  voicesFailed: (m) => `Kunne ikke hente stemmerne: ${m}`,
  start: (list) => `For at gå i gang: ${list}.`,
  fixProblems: "ret problemerne i trin 2",
  addNotes: "skriv noter på mindst ét slide",
  enterKey: "indsæt din nøgle",
  getVoices: "hent dine stemmer",
  chooseFor: (names) => `vælg en stemme til ${names.join(" og ")}`,
  narrator: "fortæller",
  voicing: (s, who) => `Slide ${s} · ${who} · laver stemme…`,
  cached: (s, who) => `Slide ${s} · ${who} · havde den allerede`,
  voiced: (s, who) => `Slide ${s} · ${who} · færdig`,
  noTimings: "ElevenLabs sendte ingen ordtider med denne model. Prøv en anden model under Avanceret.",
  sent: (n) => `${n} tegn sendt til ElevenLabs denne gang.`,
  reportLine: (s, secs, fx) => `Slide ${s}: ${secs} s${fx.length ? `. ${fx.join(", ")}` : ""}`,
  fxAt: (name, secs) => `${name} ved ${secs} s`,
  shape: "figur",
  errKey: "ElevenLabs godtog ikke nøglen.",
  errQuota: "ElevenLabs siger, at abonnementet er løbet tør for tegn, eller at der er travlt. Der blev ikke brugt mere.",
  badFile: "Filen kunne ikke læses som en PowerPoint-præsentation (.pptx).",
  number: (n) => n.toLocaleString("da-DK"),
  seconds: (ms) => (ms / 1000).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  messages: {
    "voice-missing": ({ voice }) => `der er ikke valgt en stemme til “${voice}”.`,
    "unknown-verb": ({ verb }) => `{${verb}: …} kan en præsentation ikke, så det bliver sprunget over. Brug {vis: figur}.`,
    "no-shape": ({ target, shapes }) => `der er ingen figur, der hedder “${target}”. Figurerne hedder: ${shapes}.`,
    twice: ({ target }) => `to figurer hedder “${target}”; den første bliver brugt.`,
    "uncued-with": ({ shape, leader }) => `animationen på “${shape}” har ingen cue, så den kører sammen med “${leader}”.`,
    "uncued-before": ({ shape }) => `animationen på “${shape}” har ingen cue, så den kører sammen med trinnet før.`,
    "spare-cue": ({ shape }) => `“${shape}” har flere cues end animationer; den ekstra cue gør ingenting.`,
    "unknown-effect": ({ effect, shape }) => `“${effect}” er ikke en effekt, så “${shape}” toner frem. Effekterne er: ${effectNames("da")}.`,
    "effect-kept": ({ effect, shape }) => `“${shape}” har allerede en animation, og den bruges i stedet for “${effect}”.`,
    "word-count": ({ timed, expected }) => `stemmen gav tider for ${timed} ord, noterne har ${expected}; cues bliver matchet efter placering.`,
  },
};

const en = {
  title: "Narrated decks · narrated-guides",
  h1: "Narrated decks",
  lede: "Write what the slides should say in the speaker notes. Get the deck back with a voice on every slide, the animations on the right words, and slides that move on by themselves. PowerPoint then makes the video.",
  privacy: "Everything happens in this browser. Your deck is not uploaded anywhere, and your ElevenLabs key goes only to ElevenLabs, along with the text from the notes.",
  s1: "Your deck",
  drop: "<strong>Drop a .pptx here</strong> or click to choose one",
  sample: 'No deck at hand? <button type="button" class="link" id="sample">Try the sample deck</button>, a three-phase timeline with one extra voice.',
  "help-notes-summary": "How to write the speaker notes",
  "help-notes-body": `<p>Write in the notes what the voice should say on that slide. Slides without notes are left as they are.</p>
<pre>A requisition goes through three phases.
{vis: Phase 1} First, you find the item. [pauses]
{vis: Phase 2} Then you fill in the details.
{voice: bent} [deadpan] Bent approves. Eventually.</pre>
<ul>
<li><code>{vis: Phase 1}</code> makes the shape called “Phase 1” appear on the next word. <code>{show: …}</code> works too. The name is the one in the Selection Pane (Home → Arrange → Selection Pane), where you can also rename shapes.</li>
<li>If the shape already has an animation, that animation is used and moved onto the word. Shapes in the same click (“With Previous” and “After Previous”) come along. A shape without an animation fades in.</li>
<li>Add an effect after a comma to choose how a shape without an animation comes in: <code>{vis: Phase 1, zoom}</code>. The effects are ${effectNames("en")}.</li>
<li><code>{voice: bent}</code> lets another voice say the rest of the slide. You pick the voice below.</li>
<li><code>[pauses]</code>, <code>[deadpan]</code> and other words in square brackets tell the voice how to say it. They are not read aloud.</li>
</ul>`,
  "help-copilot-summary": "Let Copilot in PowerPoint write the notes",
  "help-copilot-body": `<p>The <a href="../../copilot/narrate-deck-notes/SKILL.md" download="SKILL.md">narrate-deck-notes skill</a> teaches Copilot this format. It writes the notes, suggests names for the shapes, and estimates how long the video will be.</p>
<ol>
<li>In PowerPoint, open Copilot, choose … → Manage skills → Custom skills, and switch custom skills on.</li>
<li>Choose Add skill and upload the SKILL.md file.</li>
<li>Ask Copilot: <em>@narrate-deck-notes write a voice-over for this deck, about two minutes, calm and friendly.</em></li>
</ol>`,
  s2: "What will happen",
  s3: "Voices",
  "key-label": "Your ElevenLabs API key",
  "load-voices": "Get my voices",
  remember: "Remember the key on this computer",
  "key-aside": "Find it under ElevenLabs → Developers → API keys. Every character the voices say counts towards your ElevenLabs plan.",
  "key-help-summary": "How to get a key",
  "key-help-body": `<ol>
<li>Create an account at <a href="https://elevenlabs.io" target="_blank" rel="noopener">elevenlabs.io</a>. The free plan gives 10,000 credits a month, enough for about 10 to 20 minutes of speech depending on the model. The sample deck uses fewer than 600.</li>
<li>Go to <a href="https://elevenlabs.io/app/developers/api-keys" target="_blank" rel="noopener">Developers → API Keys</a> and choose Create Key.</li>
<li>Give the key a name you will recognise, such as “PowerPoint”, and choose when it expires.</li>
<li>Leave <strong>Restrict Key</strong> on and allow only two things:
<ul>
<li><strong>Text to Speech:</strong> Access</li>
<li><strong>Voices:</strong> Read</li>
</ul>
Leave everything else on No Access. The key can then only make speech and list your voices, even if it leaks.</li>
<li>To set a ceiling, enter a number of credits next to <strong>Per credit refresh period</strong>.</li>
<li>Choose Create Key, copy the key and paste it here. ElevenLabs shows it only once.</li>
</ol>`,
  license: `<strong>The free plan is for internal use only.</strong> If the video is used for anything other than internal use, such as for customers, on a public website or in marketing, you <strong>must</strong> have a paid ElevenLabs plan. If in doubt, choose a paid plan, and see <a href="https://elevenlabs.io/pricing" target="_blank" rel="noopener">ElevenLabs' plans and terms</a>.`,
  "voices-help-summary": "Voices in other languages",
  "voices-help-body": `<p>Any voice can speak any language, but a voice made for the language sounds far more natural. To find one in ElevenLabs:</p>
<ol>
<li>Go to Voices → Voice Library and filter by language.</li>
<li>Listen to a few and choose Add to my voices for the ones you like.</li>
<li>Come back here and press Get my voices again.</li>
</ol>`,
  advanced: "Advanced",
  "model-label": "Model",
  "model-aside": "The audio tags in square brackets need a model that understands them.",
  s4: "Make it",
  make: "Narrate the deck",
  download: "Download the narrated deck",
  then: "Then, in PowerPoint",
  "then-body": `<li>Open the deck and press Play from start to watch it run by itself.</li>
<li>File → Export → Create a Video. Choose <em>Use Recorded Timings and Narrations</em>.</li>
<li>Changed a word? Change the notes, drop the narrated deck here again and run it once more. Only slides whose text changed cost characters.</li>`,
  footer: 'Part of <a href="https://github.com/KMD-PSSORG/narrated-guides">narrated-guides</a>. The same thing from the command line: <code>narrated-guides pptx deck.pptx</code>.',
  lang: "Dansk",
  sampleFile: "sample.pptx",

  summary: (slides, notes, chars) => `${slides} slides, ${notes} with notes. The voices will say ${chars} characters.`,
  fixFirst: (n) => ` Fix the ${n === 1 ? "problem" : "problems"} below first.`,
  slide: (n) => `Slide ${n}`,
  noNotes: "No notes. This slide is left as it is.",
  narratorLabel: "Narrator (the notes without {voice: …})",
  voiceLabel: (name) => `{voice: ${name}}`,
  chooseVoice: "Choose a voice",
  getVoicesFirst: "Get your voices first",
  gettingVoices: "Getting voices…",
  keyRejected: "ElevenLabs did not accept that key.",
  voicesFailed: (m) => `Could not get the voices: ${m}`,
  start: (list) => `To start: ${list}.`,
  fixProblems: "fix the problems in step 2",
  addNotes: "add speaker notes to at least one slide",
  enterKey: "enter your key",
  getVoices: "get your voices",
  chooseFor: (names) => `choose a voice for ${names.join(" and ")}`,
  narrator: "narrator",
  voicing: (s, who) => `Slide ${s} · ${who} · voicing…`,
  cached: (s, who) => `Slide ${s} · ${who} · already voiced`,
  voiced: (s, who) => `Slide ${s} · ${who} · voiced`,
  noTimings: "ElevenLabs sent no word timings for this model. Try another model under Advanced.",
  sent: (n) => `${n} characters sent to ElevenLabs this time.`,
  reportLine: (s, secs, fx) => `Slide ${s}: ${secs} s${fx.length ? `. ${fx.join(", ")}` : ""}`,
  fxAt: (name, secs) => `${name} at ${secs} s`,
  shape: "shape",
  errKey: "ElevenLabs did not accept the key.",
  errQuota: "ElevenLabs says the plan has run out of characters, or is busy. Nothing else was spent.",
  badFile: "That file could not be read as a PowerPoint deck (.pptx).",
  number: (n) => n.toLocaleString("en"),
  seconds: (ms) => (ms / 1000).toFixed(1),
  messages: MESSAGES,
};

export const LANGUAGES = { da, en };

export const startLanguage = () => {
  const saved = localStorage.getItem("ng-lang");
  return LANGUAGES[saved] ? saved : "da";
};

/** A report from the engine, in the page's language, starting with a capital. */
export const message = (t, report) => {
  const text = t.messages[report.code]?.(report.params) ?? report.message;
  return text.charAt(0).toUpperCase() + text.slice(1);
};
