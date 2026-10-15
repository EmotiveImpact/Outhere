// The prototype's light, as data. Each layer is one CSS radial-gradient:
// an ellipse rx by ry (fractions of the box), centred at x, y (fractions,
// may sit outside the box), with colour stops as [position, colour] where
// position is a fraction of the radius. `base` fills the box first.
//
// GlowBackdrop draws these with Skia; the names say where each came from in
// demo-v29.html so they can be checked against it.

const T = "rgba(42,106,240,0)";

export const GLOWS = {
  // .slab / .oh-slab: radial-gradient(75% 60% at 72% 38%, #0e2756, #060b16 55%, #030407)
  slab: { base: "#030407", layers: [{ x: 0.72, y: 0.38, rx: 0.75, ry: 0.6, stops: [[0, "#0e2756"], [0.55, "#060b16"], [1, "#030407"]] }] },
  // .slab with the light on the left, for heroes whose object sits left
  slabLeft: { base: "#030407", layers: [{ x: 0.28, y: 0.38, rx: 0.75, ry: 0.6, stops: [[0, "#0e2756"], [0.55, "#060b16"], [1, "#030407"]] }] },
  // .oh-show: the ambient light behind a whole screen, high and to the bottom right
  screen: {
    base: null,
    layers: [
      { x: 0.5, y: -0.12, rx: 0.7, ry: 0.85, stops: [[0, "rgba(42,106,240,0.16)"], [0.62, T]] },
      { x: 1.04, y: 1.12, rx: 0.45, ry: 0.6, stops: [[0, "rgba(42,106,240,0.07)"], [0.7, T]] },
    ],
  },
  // .slab.photo / .oh-slab.photo: blue light rising from below a photo
  photo: { base: null, layers: [{ x: 0.5, y: 1.2, rx: 1.2, ry: 0.7, stops: [[0, "rgba(42,106,240,0.25)"], [0.6, T]] }] },
  // .hype .hveil and .oh-hype: the countdown
  hype: { base: "#03050a", layers: [{ x: 0.5, y: 0.44, rx: 0.6, ry: 0.4, stops: [[0, "rgba(10,30,70,0.6)"], [0.75, "rgba(3,5,10,0.92)"]] }] },
  // .hype.go .hveil: the screen floods blue on GO
  hypeGo: { base: "#04122e", layers: [{ x: 0.5, y: 0.44, rx: 0.7, ry: 0.5, stops: [[0, "#3d8bff"], [0.7, "#0b2f80"], [1, "#04122e"]] }] },
  // .oh-hype::after: the dark rim round a countdown
  vignette: { base: null, layers: [{ x: 0.5, y: 0.45, rx: 0.9, ry: 0.7, stops: [[0.5, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.7)"]] }] },
  // .r10launch
  launch: {
    base: "#05070a",
    layers: [
      { x: 0.5, y: 0.42, rx: 0.7, ry: 0.45, stops: [[0, "rgba(42,106,240,0.3)"], [0.7, T]] },
      { x: 0.5, y: 1.2, rx: 1.2, ry: 0.8, stops: [[0, "rgba(42,106,240,0.18)"], [0.6, T]] },
    ],
  },
  // .r11drop / .r11blr: a reveal, light in the middle
  drop: { base: "#03050a", layers: [{ x: 0.5, y: 0.38, rx: 0.6, ry: 0.4, stops: [[0, "#0f2a5c"], [0.75, "#03050a"]] }] },
  // .r11lob / .r11wst: lobby and watch stages
  lobby: { base: "#03050a", layers: [{ x: 0.5, y: 0.28, rx: 0.7, ry: 0.45, stops: [[0, "#0d2148"], [0.72, "#03050a"]] }] },
  // .r11race: light from the top edge
  race: { base: "#03050a", layers: [{ x: 0.5, y: 0, rx: 0.8, ry: 0.4, stops: [[0, "#0d2148"], [0.7, "#03050a"]] }] },
  // .r11fg: the fighting game select
  fighter: { base: "#020308", layers: [{ x: 0.5, y: 0.3, rx: 0.9, ry: 0.5, stops: [[0, "#0d1f45"], [0.7, "#020308"]] }] },
  // .bal: the wallet balance card
  wallet: { base: "#0c0f15", layers: [{ x: 1, y: 0.3, rx: 1.2, ry: 1.2, stops: [[0, "#0e2350"], [0.45, "#0b1220"], [1, "#0c0f15"]] }] },
  // .wchart: the week chart hero
  chart: { base: "#04060b", layers: [{ x: 0.7, y: 0, rx: 0.9, ry: 0.7, stops: [[0, "#0e2756"], [0.6, "#060b16"], [1, "#04060b"]] }] },
  // .tierimg: behind a membership card
  tier: { base: "#000000", layers: [{ x: 0.5, y: 0.4, rx: 0.9, ry: 0.9, stops: [[0, "#0b1a38"], [0.7, "#000000"]] }] },
  // .r11story: behind a share card
  story: { base: "#05070b", layers: [{ x: 0.5, y: 0.3, rx: 0.8, ry: 0.5, stops: [[0, "rgba(42,106,240,0.18)"], [0.7, T]] }] },
  // .watchbg
  watch: { base: "#000000", layers: [{ x: 0.5, y: 0.3, rx: 0.7, ry: 0.45, stops: [[0, "#0b1a33"], [0.7, "#000000"]] }] },
  // .oh-slab .glow / .float-glow: a single soft orb, used behind objects and buttons
  orb: { base: null, layers: [{ x: 0.5, y: 0.5, rx: 0.5, ry: 0.5, stops: [[0, "rgba(61,139,255,0.35)"], [0.65, "rgba(61,139,255,0)"]] }] },
  // .oh-tabbar .light: the bloom over the active tab
  tab: { base: null, layers: [{ x: 0.5, y: 0.36, rx: 0.46, ry: 0.44, stops: [[0, "rgba(61,139,255,0.26)"], [0.55, "rgba(61,139,255,0.08)"], [0.75, "rgba(61,139,255,0)"]] }] },
};

/** The CSS for a layer, handy when checking a preset against the prototype. */
export const cssOf = (layer) =>
  `radial-gradient(${Math.round(layer.rx * 100)}% ${Math.round(layer.ry * 100)}% at ${Math.round(layer.x * 100)}% ${Math.round(layer.y * 100)}%, ${layer.stops
    .map(([p, c]) => `${c} ${Math.round(p * 100)}%`)
    .join(", ")})`;

// Masks for BlendImage, from the prototype's mask:radial-gradient(circle, #000 a, transparent b).
// A bare "circle" sizes to the farthest corner, so the stops are fractions of
// half the box's diagonal, not of its width.
export const MASKS = {
  soft: [0.5, 0.71], // .slab .obj, .orb img, .gpscard img
  wide: [0.55, 0.72], // .bal .c3d
  tight: [0.48, 0.7], // .bcf
  burst: [0.52, 0.7], // .oh-burst img
  none: null,
};
