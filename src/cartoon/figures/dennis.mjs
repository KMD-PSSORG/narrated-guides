/**
 * Dennis: short dark hair, a beard, a dark jacket over a white shirt, and a
 * red pocket square.
 *
 * A figure is data and nothing else, because a film sends it to the page as
 * JSON; the rig that moves it is shared (rig.mjs). What is a figure's own is
 * here: its drawings, its colours and its sizes.
 *
 * Everything that turns is drawn twice with the same points, `front` and
 * `profile` (facing left), and the front view is symmetric, so that the right
 * profile can be the left one mirrored. Sizes are in the figure's own units,
 * measured up from its feet; `scale` brings them to the picture.
 */
const INK = "#14121f";
const SKIN = "#e8b99a";

// A finger or thumb: one line drawn twice, dark and wide under the colour.
const digit = (width, d) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + 12}" stroke-linecap="round"/>` +
  `<path d="${d}" fill="none" stroke="${SKIN}" stroke-width="${width}" stroke-linecap="round"/>`;
const palm = (d) => `<path class="o" stroke-width="5" fill="${SKIN}" d="${d}"/>`;
const creases = (d) => `<path class="l" stroke-width="3" d="${d}"/>`;

export default {
  name: "dennis",
  scale: 0.88,
  shoulderHeight: 506,
  colors: { ink: INK, skin: SKIN, jacket: "#2f2d45", trouser: "#3b3954", shoe: "#1d1b29", shirt: "#f1eff5", hair: "#3b2d2a", beard: "#6a5148" },

  // Lengths and widths of the pieces the rig draws itself.
  body: {
    hip: { height: 290, spread: 42 },
    foot: { spread: 46 },
    leg: { length: 264, width: 58 },
    shoulder: { spread: 88, back: 8 },
    upperArm: { length: 104, width: 52 },
    foreArm: { length: 96, width: 42 },
    pelvis: { y: -306, height: 66, width: 160 },
  },

  neck: "M-24,-612 H24 V-548 H-24 Z",
  shoe: "M-34,-30 L32,-30 L34,-8 C34,2 24,6 12,6 L-48,6 C-64,6 -64,-12 -48,-18 Z", // toe to the left

  torso: {
    front: "M-108,-512 C-108,-548 -70,-560 -34,-562 L34,-562 C70,-560 108,-548 108,-512 L102,-262 C60,-250 -60,-250 -102,-262 Z",
    profile: "M-62,-496 C-62,-540 -44,-558 -22,-562 L24,-562 C50,-560 64,-540 64,-500 L58,-262 C34,-252 -40,-252 -62,-262 Z",
  },
  // What is on the chest, drawn from the front. It slides to the front edge
  // and narrows as the body turns, cut off by the jacket's shape.
  details:
    `<path class="o" fill="#f1eff5" d="M-36,-566 L0,-418 L36,-566 Z"/>` +
    `<path fill="${SKIN}" d="M-21,-570 L0,-528 L21,-570 Z"/>` +
    `<path class="o" fill="#f1eff5" d="M-40,-574 L-4,-516 L-48,-528 Z"/>` +
    `<path class="o" fill="#f1eff5" d="M40,-574 L4,-516 L48,-528 Z"/>` +
    `<path class="o" fill="#3a3856" d="M-40,-560 L-70,-480 L-46,-468 L0,-404 L0,-430 L-34,-548 Z"/>` +
    `<path class="o" fill="#3a3856" d="M40,-560 L70,-480 L46,-468 L0,-404 L0,-430 L34,-548 Z"/>` +
    `<circle cx="0" cy="-380" r="7" fill="${INK}"/>` +
    `<path class="o" fill="#c8323c" d="M42,-462 l10,-24 l10,14 l10,-16 l12,26 Z"/>` +
    `<path class="l" d="M36,-462 H90"/>`,
  collar: { x: -56, y: -592, width: 112, height: 44 }, // the part of the details allowed above the jacket

  head: {
    height: 668, // its middle, above the feet
    pivot: 92, // it tilts about a point this far below its middle
    face: {
      front: "M-80,-30 C-80,-100 80,-100 80,-30 L78,30 C76,82 40,102 0,102 C-40,102 -76,82 -78,30 Z",
      profile: "M-74,-30 C-78,-106 86,-110 88,-26 L78,36 C72,72 14,72 -38,100 C-64,108 -82,86 -76,30 Z",
    },
    beard: {
      front: "M-79,2 C-72,26 -56,34 -44,24 C-28,12 -14,22 0,22 C14,22 28,12 44,24 C56,34 72,26 79,2 L78,30 C76,82 40,102 0,102 C-40,102 -76,82 -78,30 Z",
      profile: "M-80,20 C-74,28 -62,32 -52,26 C-40,20 -26,14 -10,12 C2,10 12,10 22,8 C28,6 32,0 32,-10 L40,34 C38,68 4,78 -38,104 C-66,112 -86,88 -80,30 Z",
    },
    hair: {
      front: "M-84,-22 C-96,-84 -62,-122 0,-122 C62,-122 96,-84 84,-22 C80,-48 72,-62 58,-72 C24,-58 -24,-58 -58,-72 C-72,-62 -80,-48 -84,-22 Z",
      profile: "M-78,-56 C-88,-104 -44,-128 8,-126 C72,-126 108,-54 86,26 C76,26 60,14 50,-8 C44,-50 2,-58 -42,-62 C-56,-66 -68,-68 -78,-56 Z",
    },
    nose: {
      front: "M-9,8 C-9,17 -5,22 0,22 C5,22 9,17 9,8",
      profile: "M-74,-12 C-82,-2 -101,8 -97,16 C-94,24 -84,22 -75,22",
    },
    // Features sit on a ball that is turned: `x` across, `depth` out. An eye
    // is placed by one depth and judged hidden by another, which keeps it
    // from hugging the edge of the face in profile.
    eye: { x: 30, y: -18, rx: 16, ry: 18, place: 50, depth: 58, pupil: 6.5 },
    brow: { y: -46, lift: 11 },
    ear: { x: 84, y: 4, rx: 15, ry: 22, depth: -5 },
    mouth: { y: 58, slide: 63 },
  },

  // X at rest, M pressed, C a consonant, E wide, A open, O round, F teeth on the lip.
  mouths: {
    X: `<path class="l" stroke-width="5" d="M-22,-2 Q0,9 22,-2"/>`,
    M: `<path class="l" stroke-width="6" d="M-17,2 Q0,5 17,2"/>`,
    C: `<ellipse class="o" stroke-width="5" fill="#3a1820" cx="0" cy="1" rx="14" ry="7"/>`,
    E: `<ellipse class="o" stroke-width="5" fill="#3a1820" cx="0" cy="1" rx="22" ry="10"/><path fill="#fff" d="M-17,-5 Q0,-9 17,-5 L15,0 Q0,-2 -15,0 Z"/>`,
    A: `<ellipse class="o" stroke-width="5" fill="#3a1820" cx="0" cy="4" rx="19" ry="20"/><path fill="#fff" d="M-14,-10 Q0,-17 14,-10 L12,-5 Q0,-9 -12,-5 Z"/><ellipse cx="0" cy="15" rx="11" ry="6" fill="#d7737a"/>`,
    O: `<ellipse class="o" stroke-width="5" fill="#3a1820" cx="0" cy="3" rx="10" ry="13"/>`,
    F: `<ellipse class="o" stroke-width="5" fill="#3a1820" cx="0" cy="1" rx="15" ry="7"/><path class="o" stroke-width="3" fill="#fff" d="M-11,-3 Q0,-6 11,-3 L9,5 Q0,3 -9,5 Z"/>`,
  },

  // A hand hangs down from the wrist with the thumb to the right; the rig
  // mirrors it for the other arm and turns it with the forearm.
  hands: {
    rest:
      palm("M-18,0 C-23,18 -24,38 -16,52 C-8,62 10,62 17,52 C24,38 22,18 18,0 Z") + creases("M-7,50 V59 M2,52 V61") + digit(10, "M15,13 L20,34"),
    open:
      digit(9, "M-13,42 L-23,70") + digit(9, "M-5,44 L-9,81") + digit(9, "M4,44 L6,80") + digit(9, "M12,42 L19,69") + digit(10, "M16,16 L37,29") +
      palm("M-18,0 C-24,16 -24,34 -18,46 L16,46 C23,36 23,16 18,0 Z"),
    point:
      digit(11, "M9,36 L9,86") + palm("M-18,0 C-23,14 -24,30 -17,42 C-8,50 10,50 17,42 C23,30 22,14 18,0 Z") + creases("M-9,38 V47 M0,40 V49") + digit(10, "M15,11 L27,28"),
  },
};
