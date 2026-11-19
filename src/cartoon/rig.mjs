/**
 * The rig: builds a figure's SVG and draws it in a pose. The figure brings
 * its drawings and sizes (see figures/dennis.mjs); everything here is shared.
 *
 * Six rules, each paid for by a version that looked wrong:
 * 1. Limbs are posed against the body, never the screen (project.mjs).
 * 2. What turns is drawn from the front and from the side with the same
 *    points, and the front view is symmetric, so the right profile can be the
 *    left one mirrored.
 * 3. The jacket and the upper arms share one outline: all their dark strokes
 *    first, then all their fills. Drawn as a separate outlined piece, an arm
 *    looks pinned on. The line between arm and body starts below the shoulder.
 * 4. Feet stay where they land while the body travels (walk.mjs).
 * 5. Every joint has been through a spring before it gets here (springs.mjs).
 * 6. The far arm goes behind a turned body, and the near leg is drawn last.
 *
 * A figure's drawings are inserted into the page as they are. They are the
 * project's own code, like the film script that names the figure, and must
 * never be built from anything a user typed.
 *
 * Runs in a browser.
 */
import { morph } from "./morph.mjs";
import { featureSeen, limbSeen, viewOf } from "./project.mjs";
import { feetAt } from "./walk.mjs";

const NS = "http://www.w3.org/2000/svg";
const n = (v) => v.toFixed(2);
const pt = ([x, y]) => `${n(x)},${n(y)}`;
const along = ([x, y], [dx, dy], d) => [x + dx * d, y + dy * d];
const make = (parent, tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  parent.appendChild(node);
  return node;
};
const set = (node, attrs) => { for (const key in attrs) node.setAttribute(key, attrs[key]); };

/** Moments in every sixteen seconds at which the figure blinks. */
const BLINKS = [1.5, 4.5, 6.4, 9.9, 13.6];
const BLINK = 0.18;

let built = 0; // figures built on this page, for ids that do not collide

/** Builds `figure` inside `parent` and returns `draw`, which poses it. */
export const buildFigure = (parent, figure) => {
  const id = `figure${built++}`;
  const { colors: C, body: B, head: H } = figure;
  const root = make(parent, "g", {});
  root.innerHTML = `
    <ellipse data-part="shadow" cx="0" cy="8" ry="24" fill="#000" opacity=".28"/>
    <g data-part="legs"></g>
    <g data-part="body">
      <g data-part="armBehind"></g>
      <rect data-part="pelvis" class="o" fill="${C.trouser}" y="${B.pelvis.y}" height="${B.pelvis.height}" rx="18"/>
      <path class="o" fill="${C.skin}" d="${figure.neck}"/>
      <g><path data-part="torsoLine" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/><g data-part="upperOut"></g></g>
      <g><path data-part="torsoFill" fill="${C.jacket}"/><g data-part="upperFill"></g></g>
      <clipPath id="${id}-torso"><path data-part="torsoClip"/><rect data-part="collarClip" x="${figure.collar.x}" y="${figure.collar.y}" width="${figure.collar.width}"/></clipPath>
      <g clip-path="url(#${id}-torso)"><g data-part="details">${figure.details}</g></g>
      <g data-part="armLines"></g>
      <g data-part="armFront"></g>
      <g data-part="head">
        <clipPath id="${id}-face"><path data-part="faceClip"/></clipPath>
        <g data-part="headSide">
          <ellipse data-part="earFar" class="o" fill="${C.skin}" cy="${H.ear.y}" rx="${H.ear.rx}" ry="${H.ear.ry}"/>
          <ellipse data-part="earBack" class="o" fill="${C.skin}" cy="${H.ear.y}" ry="${H.ear.ry}"/>
          <path data-part="faceFill" fill="${C.skin}"/>
          <path data-part="beard" fill="${C.beard}" clip-path="url(#${id}-face)"/>
          <path data-part="faceLine" class="l"/>
          <path data-part="hair" class="o" fill="${C.hair}"/>
          <g data-part="earFront">
            <ellipse data-part="earFrontShape" class="o" fill="${C.skin}" cy="${H.ear.y}" ry="${H.ear.ry}"/>
            <path data-part="earFrontFold" class="l" stroke-width="4"/>
          </g>
          <ellipse data-part="eyeFar" class="o" fill="#fff" cy="${H.eye.y}"/>
          <ellipse data-part="pupilFar" fill="${C.ink}" cy="${H.eye.y + 1}"/>
          <ellipse data-part="eyeNear" class="o" fill="#fff" cy="${H.eye.y}"/>
          <ellipse data-part="pupilNear" fill="${C.ink}" cy="${H.eye.y + 1}"/>
          <path data-part="lids" class="l"/>
          <path data-part="browFar" class="l" stroke="${C.hair}" stroke-width="9"/>
          <path data-part="browNear" class="l" stroke="${C.hair}" stroke-width="9"/>
          <path data-part="nose" class="l" stroke-width="5" style="fill:${C.skin}"/>
          <g data-part="mouth">${Object.entries(figure.mouths).map(([shape, drawing]) => `<g data-mouth="${shape}">${drawing}</g>`).join("")}</g>
        </g>
      </g>
    </g>`;
  const parts = Object.fromEntries([...root.querySelectorAll("[data-part]")].map((node) => [node.dataset.part, node]));
  const mouths = [...parts.mouth.children];

  const turning = {
    torso: morph(figure.torso.front, figure.torso.profile),
    face: morph(H.face.front, H.face.profile),
    beard: morph(H.beard.front, H.beard.profile),
    hair: morph(H.hair.front, H.hair.profile),
    nose: morph(H.nose.front, H.nose.profile),
  };

  // A soft limb: one line drawn twice, dark and wide under the colour.
  const line = (group, color, width, cap = "round") => make(group, "path", { fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": cap, "stroke-linejoin": "round" });
  const tube = (group, color, width, cap) => {
    const under = line(group, C.ink, width + 12, cap), over = line(group, color, width, cap);
    return (d) => { under.setAttribute("d", d); over.setAttribute("d", d); };
  };

  // An arm in pieces that can sit in different layers: the upper arm's
  // outline and fill go in with the jacket's, the forearm and hand on top, and
  // all of it behind the body when the body has turned it away.
  const buildArm = (side) => {
    const upperOut = line(parts.upperOut, C.ink, B.upperArm.width + 12);
    const upperFill = line(parts.upperFill, C.jacket, B.upperArm.width);
    const lines = make(parts.armLines, "path", { class: "l" });
    const fore = make(parts.armFront, "g", {});
    const lower = tube(fore, C.jacket, B.foreArm.width);
    const elbow = line(fore, C.jacket, B.upperArm.width); // the upper arm again, over the forearm's end
    const cuff = tube(fore, C.shirt, B.foreArm.width - 2, "butt");
    const handGroup = make(fore, "g", {});
    const mirrored = make(handGroup, "g", { transform: `scale(${-side * 1.08},1.08)` });
    const hand = {};
    for (const pose in figure.hands) {
      hand[pose] = make(mirrored, "g", {});
      hand[pose].innerHTML = figure.hands[pose];
    }
    return { side, upperOut, upperFill, lines, fore, lower, elbow, cuff, handGroup, hand, behind: false };
  };
  const arms = { l: buildArm(-1), r: buildArm(1) };

  const buildLeg = () => {
    const group = make(parts.legs, "g", {});
    return { group, trouser: tube(group, C.trouser, B.leg.width, "butt"), shoe: make(group, "path", { class: "o", fill: C.shoe, d: figure.shoe }) };
  };
  const legs = { l: buildLeg(), r: buildLeg() };

  const placeArm = (arm, behind) => {
    if (arm.behind === behind) return;
    arm.behind = behind;
    if (behind) parts.armBehind.append(arm.upperOut, arm.upperFill, arm.fore);
    else { parts.upperOut.append(arm.upperOut); parts.upperFill.append(arm.upperFill); parts.armFront.append(arm.fore); }
  };

  const drawTorso = ({ c, s, to }) => {
    const d = turning.torso(s);
    for (const name of ["torsoLine", "torsoFill", "torsoClip"]) set(parts[name], { d, transform: `scale(${to},1)` });
    const slide = `translate(${n(-66 * s * to)},0) scale(${n(Math.max(c, 0.2))},1)`;
    set(parts.details, { transform: slide });
    // Side on, the collar would hang in front of the neck.
    set(parts.collarClip, { transform: slide, height: s > 0.45 ? 0 : figure.collar.height });
    const hips = B.pelvis.width * (0.62 + 0.38 * c);
    set(parts.pelvis, { x: n(-hips / 2), width: n(hips) });
  };

  const drawArm = (arm, sx, [upOut, upFwd, foreOut, foreFwd], view, handPose, { behind, bothSides }) => {
    placeArm(arm, behind);
    const upper = limbSeen(arm.side, upOut, upFwd, view), lower = limbSeen(arm.side, foreOut, foreFwd, view);
    const s = [sx, -figure.shoulderHeight];
    const e = along(s, upper.v, B.upperArm.length);
    const w = along(e, lower.v, B.foreArm.length);
    const whole = `M${pt(s)} L${pt(e)}`;
    arm.upperOut.setAttribute("d", whole);
    arm.upperFill.setAttribute("d", whole);
    arm.lower(`M${pt(e)} L${pt(w)}`);
    arm.elbow.setAttribute("d", `M${pt(along(e, upper.dir, -Math.min(26, B.upperArm.length * upper.length)))} L${pt(e)}`);
    arm.cuff(`M${pt(along(w, lower.dir, -6))} L${pt(along(w, lower.dir, 9))}`);
    const turned = (Math.atan2(-lower.dir[0], lower.dir[1]) * 180) / Math.PI;
    arm.handGroup.setAttribute("transform", `translate(${pt(along(w, lower.dir, 7))}) rotate(${n(turned)})`);
    for (const pose in arm.hand) arm.hand[pose].setAttribute("display", pose === handPose ? "inline" : "none");

    // The line down the arm's inner side starts below the shoulder, so the
    // shoulder stays open to the jacket. An arm hanging in front of a body
    // seen from the side needs its outer line too. A foreshortened arm has no
    // side to draw a line down.
    const edge = B.upperArm.width / 2 + 3;
    const inner = [-arm.side * upper.dir[1], arm.side * upper.dir[0]];
    const down = (normal) => `M${pt(along(along(s, upper.v, 44), normal, edge))} L${pt(along(along(e, upper.dir, -8), normal, edge))}`;
    arm.lines.setAttribute("d", behind || upper.length <= 0.6 ? "" : down(inner) + (bothSides ? down([-inner[0], -inner[1]]) : ""));
  };

  // A leg from the hip to wherever the foot is; the knee gives when the leg is too short.
  const drawLeg = (leg, hip, foot, kneeTo, toe) => {
    const ankle = [foot[0], foot[1] - 28];
    const d = Math.hypot(ankle[0] - hip[0], ankle[1] - hip[1]);
    const bend = Math.sqrt(Math.max(0, B.leg.length ** 2 - d * d)) * 0.6;
    const knee = [(hip[0] + ankle[0]) / 2 + kneeTo * bend, (hip[1] + ankle[1]) / 2];
    leg.trouser(`M${pt(hip)} Q${pt(knee)} ${pt(ankle)}`);
    leg.shoe.setAttribute("transform", `translate(${pt(foot)}) scale(${n(toe)},1)`);
  };

  // The head at a turn, drawn facing left. The outline, beard, hair and nose
  // slide between their two drawings; the features sit on a turned ball.
  const drawHead = (view, { shut, half, brow, mouth }) => {
    const { c, s } = view;
    const face = turning.face(s);
    for (const name of ["faceFill", "faceClip", "faceLine"]) parts[name].setAttribute("d", face);
    parts.beard.setAttribute("d", turning.beard(s));
    parts.hair.setAttribute("d", turning.hair(s));
    parts.nose.setAttribute("d", turning.nose(s));

    const E = H.eye;
    const eye = (name, x) => {
      const cx = featureSeen(x, E.place, view).x, towards = Math.min(1, featureSeen(x, E.depth, view).towards);
      const rx = E.rx * (x > 0 ? 0.62 + 0.38 * towards : towards);
      const ry = E.ry * (half ? 0.45 : 1);
      const seen = rx > 2.5;
      set(parts[`eye${name}`], { cx: n(cx), rx: n(rx), ry: n(ry), display: seen && !shut ? "inline" : "none" });
      set(parts[`pupil${name}`], { cx: n(cx - 4 * s), rx: n(Math.min(E.pupil, rx * 0.42)), ry: n(Math.min(E.pupil, ry * 0.8)), display: rx > 6 && !shut ? "inline" : "none" });
      const out = Math.sign(x);
      set(parts[`brow${name}`], {
        d: `M${n(cx + out * rx * 1.12)},${n(H.brow.y - brow)} L${n(cx - out * rx)},${n(H.brow.y + 2 - brow)}`,
        display: seen ? "inline" : "none",
      });
      return seen && shut ? `M${n(cx - rx)},${E.y} H${n(cx + rx)}` : "";
    };
    parts.lids.setAttribute("d", eye("Far", -E.x) + eye("Near", E.x));
    parts.mouth.setAttribute("transform", `translate(${n(-H.mouth.slide * s)},${H.mouth.y}) scale(${n(1 - 0.45 * s)},1)`);
    for (const node of mouths) node.setAttribute("display", node.dataset.mouth === mouth ? "inline" : "none");

    // The far ear slides behind the head. The near one comes round onto it.
    const ear = H.ear;
    parts.earFar.setAttribute("cx", n(featureSeen(-ear.x, ear.depth, view).x));
    const nearX = featureSeen(ear.x, ear.depth, view).x;
    const near = { cx: n(nearX), rx: n(ear.rx + 5 * s) };
    set(parts.earBack, { ...near, display: s > 0.35 ? "none" : "inline" });
    set(parts.earFrontShape, near);
    parts.earFrontFold.setAttribute("d", `M${n(nearX + 5)},${ear.y - 10} q${n(-10 * s)},8 0,20`);
    parts.earFront.setAttribute("display", s > 0.35 ? "inline" : "none");
  };

  /**
   * Draws the figure. `x` and `floor` are where its feet are in the room,
   * `pose` the sprung joints (see pose.mjs), `walk` from walkAt, `hands` from
   * handsAt, `mouth` a shape, and `t` the film's time, for breathing and blinks.
   */
  const draw = ({ x, floor, pose, walk, hands, mouth, t }) => {
    const wt = walk.weight, f = walk.progress - Math.floor(walk.progress);
    const lag = pose.sway - walk.x; // how far the body's sprung place trails its real one
    // Down as a foot lands, up as it passes; breathing on top.
    const bodyY = 8 * wt * Math.cos(2 * Math.PI * f) + Math.sin(t * 1.9) * 1.5;
    const lean = walk.dir * 3 * wt + lag * 0.09 + Math.sin(t * 0.9) * 0.5;
    root.setAttribute("transform", `translate(${n(x)},${n(floor)}) scale(${figure.scale})`);
    parts.body.setAttribute("transform", `translate(0,${n(bodyY)}) rotate(${n(lean)},0,${-B.hip.height})`);
    parts.shadow.setAttribute("rx", n(160 + 20 * wt));

    const view = viewOf(pose.body);
    const { c, s, to } = view;
    drawTorso(view);

    // Legs: hips and feet close up as the body turns, knees and toes go the
    // way it faces, and the near leg is drawn last.
    const feet = feetAt(walk);
    const mix = (front, side) => front * c + side * s;
    const toe = (front) => { const v = mix(front, to); return Math.abs(v) < 0.4 ? 0.4 * (Math.sign(v) || to) : v; };
    const order = to === 1 ? ["l", "r"] : ["r", "l"];
    if (parts.legs.lastChild !== legs[order[1]].group) for (const which of order) parts.legs.append(legs[which].group);
    for (const [which, sign] of [["l", -1], ["r", 1]]) {
      const hip = [sign * B.hip.spread * c, -B.hip.height + bodyY];
      drawLeg(legs[which], hip, [sign * B.foot.spread * c + feet[which][0], feet[which][1]], mix(sign, -to), toe(-sign));
    }

    for (const [which, sign] of [["l", -1], ["r", 1]]) {
      const angles = ["UpOut", "UpFwd", "ForeOut", "ForeFwd"].map((piece) => pose[which + piece]);
      drawArm(arms[which], sign * B.shoulder.spread * c + to * B.shoulder.back * s, angles, view, hands[which], {
        behind: sign !== to && s > 0.5,
        bothSides: sign === to && s > 0.3,
      });
    }

    // The head follows the body late, nods, and turns towards what it looks
    // at. Facing right is the same drawing, mirrored.
    const headView = viewOf(pose.turn);
    parts.head.setAttribute("transform",
      `translate(${n(pose.turn * 6)},${n(-H.height + pose.nod)}) rotate(${n(Math.sin(t * 1.3) * 1.6 + pose.turn * 3 - lag * 0.16)},0,${H.pivot})`);
    parts.headSide.setAttribute("transform", `scale(${headView.to},1)`);
    const blink = BLINKS.map((at) => (t % 16) - at).find((since) => since >= 0 && since < BLINK);
    const shut = blink !== undefined && blink >= 0.05 && blink < 0.13;
    drawHead(headView, { shut, half: blink !== undefined && !shut, brow: H.brow.lift * pose.brow, mouth });
  };

  return { draw };
};
