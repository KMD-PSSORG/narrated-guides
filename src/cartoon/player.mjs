/**
 * A film as one function of time. `createFilm` builds the room and the figure
 * and simulates the springs once; after that `render(t)` sets everything from
 * `t` alone. That is what lets a film be rendered one frame at a time, in any
 * order, and come out the same every time: nothing here may read a clock, a
 * random number or the frame before.
 *
 * The same function is what a person watches in the preview, driven by the
 * audio's clock.
 *
 * A set's drawing and a film's pictures are inserted into the page as they
 * are. They come from the project, like its film script, and must never be
 * built from anything a user typed.
 *
 * Runs in a browser.
 */
import { cameraAt } from "./camera.mjs";
import { mouthTrack } from "./mouth.mjs";
import { SPRINGS, handsAt, targetAt } from "./pose.mjs";
import { buildFigure } from "./rig.mjs";
import { sample, simulate } from "./springs.mjs";
import { walkAt } from "./walk.mjs";

const NS = "http://www.w3.org/2000/svg";
const INK = "#14121f";
// The two line styles every drawing uses: `o` an outlined shape, `l` a line.
const STYLE = `
  .o { stroke: ${INK}; stroke-width: 6; stroke-linejoin: round; stroke-linecap: round; }
  .l { fill: none; stroke: ${INK}; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
  text { font-family: Menlo, Consolas, monospace; }`;
const FADE = 0.25; // seconds a picture takes to come up on the screen

/**
 * `data` is `{ fps, length, set, figure, voice, startX, score, words, pictures }`:
 * `voice` is the name of the voice the figure speaks with (null for the
 * default), `pictures` maps a name to a data URI. Returns the film's `length`,
 * `render(t)`, and `ready`, which resolves when its pictures have loaded.
 */
export const createFilm = (svg, data) => {
  const { fps, length, set, figure, score } = data;
  svg.innerHTML = `<style>${STYLE}</style><g data-part="room">${set.svg}</g><g data-part="screen"></g><g data-part="figures"></g>`;
  const group = (name) => svg.querySelector(`[data-part="${name}"]`);

  const loading = [];
  const pictures = {};
  for (const name in data.pictures) {
    const image = document.createElementNS(NS, "image");
    for (const key of ["x", "y", "width", "height"]) image.setAttribute(key, set.screen[key]);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    image.setAttribute("display", "none");
    loading.push(new Promise((done) => { image.addEventListener("load", done); image.addEventListener("error", done); }));
    image.setAttribute("href", data.pictures[name]);
    group("screen").appendChild(image);
    pictures[name] = image;
  }

  // Only the figure's own words move its mouth and its head; a scene spoken
  // by another voice is a narrator off screen.
  const words = data.words.filter((word) => word.voice === data.voice);
  const springs = simulate((t) => targetAt(score, words, t), SPRINGS, length);
  const mouths = mouthTrack(words, length, fps);
  const puppet = buildFigure(group("figures"), figure);

  const render = (t) => {
    const pose = {};
    for (const key in SPRINGS) pose[key] = sample(springs, key, t);
    const walk = walkAt(score.walks, t, score.startX);
    const frame = Math.min(mouths.length - 1, Math.max(0, Math.floor(t * fps)));
    puppet.draw({ x: walk.x, floor: set.floor, pose, walk, hands: handsAt(score, t), mouth: mouths[frame] ?? "X", t });

    const camera = cameraAt(score.shots, set, t);
    svg.setAttribute("viewBox", [camera.x, camera.y, camera.width, camera.height].map((v) => v.toFixed(2)).join(" "));

    let showing = null;
    for (const picture of score.pictures) if (picture.at <= t) showing = picture;
    for (const name in pictures) {
      const on = showing?.name === name;
      pictures[name].setAttribute("display", on ? "inline" : "none");
      if (on) pictures[name].setAttribute("opacity", Math.min(1, (t - showing.at) / FADE).toFixed(3));
    }

    // Chromium only repaints what changed, and the anti-aliasing along the
    // edge of a repainted area depends on what was there before. Taking the
    // drawing out and putting it back repaints all of it, so a frame depends
    // on t alone. Only when a film is being rendered; a person watching does
    // not need it.
    if (navigator.webdriver) {
      svg.style.display = "none";
      svg.getBoundingClientRect();
      svg.style.display = "";
    }
  };

  return { length, render, ready: Promise.all(loading) };
};
