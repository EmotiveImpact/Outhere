// Design tokens for the midnight finish. See index.jsx for the rules.

export const C = {
  bg: "#07090c",
  surface: "#12151a",
  surfaceHi: "#191d24",
  surfaceHigh: "#1b1f26",
  border: "#222731",
  borderStrong: "#323846",
  hairlineTop: "rgba(255,255,255,0.07)",
  text: "#f3f5f8",
  textSoft: "#c4cad4",
  textDim: "#8a93a3",
  textMute: "#5d6574",
  // blue acts
  accent: "#3d8bff",
  accentHi: "#82b4ff",
  accentDeep: "#2a6af0",
  accentDim: "rgba(61,139,255,0.14)",
  accentText: "#ffffff",
  glow: "rgba(61,139,255,0.38)",
  out: "#4f9bff",
  // red is stop
  danger: "#ff4d55",
  dangerDim: "rgba(255,77,85,0.14)",
  alert: "#ff4d55",
  warn: "#ffb547",
  fire: "#ff7a3d",
  gold: "#f5c451",
  // membership rings
  free: "#4a5160",
  pro: "#3d8bff",
  black: "#9aa3ae",
};

export const F = {
  display: "BarlowCondensed_700Bold",
  displayMedium: "BarlowCondensed_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 20 };
export const R = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };

// Surfaces are lit from above: a slightly brighter top, a bright hairline on
// the top edge and a long soft shadow underneath. These are the prototype's
// own values (demo-v29.html, "round ten: the new finish").
export const LIT = ["#191d24", "#12151a"]; // --lit

export const FINISH = {
  // --lit-edge: a bright line along the top, a faint one all round
  litEdge: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.045)",
  // --shadow-card: long and soft, falling well below the surface
  shadowCard: "0 22px 40px -26px rgba(0,0,0,0.95), 0 2px 6px -2px rgba(0,0,0,0.5)",
  // --act-grad and --act-shadow: the blue that acts
  act: ["#4a86ff", "#2a6af0", "#1f55d0"],
  actStops: [0, 0.52, 1],
  actShadow: "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.28), 0 0 0 1px rgba(42,106,240,0.55), 0 12px 26px -12px rgba(42,106,240,0.85)",
  // .oh-btn.stop: the red that stops
  stop: ["#ec4650", "#d42a33", "#a91c25"],
  stopShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 0 1px rgba(212,42,51,0.6), 0 14px 30px -12px rgba(212,42,51,0.75)",
  // .oh-btn.glass and .oh-chip.glass, over photos
  glass: "rgba(255,255,255,0.1)",
  glassEdge: "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.12), 0 12px 28px -14px rgba(0,0,0,0.7)",
  // .oh-lead.me and .oh-chip.blue: a surface tinted blue, lit along its edge
  blue: ["rgba(42,106,240,0.2)", "rgba(42,106,240,0.06)"],
  blueEdge: "inset 0 1px 0 rgba(130,180,255,0.55), inset 0 0 0 1px rgba(61,139,255,0.3), 0 14px 34px -16px rgba(42,106,240,0.65)",
  // .oh-tile: the small blue icon square
  tile: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(61,139,255,0.28), 0 8px 18px -10px rgba(42,106,240,0.7)",
  // .oh-slab: the hero slab and its lit lower edge
  slab: { hi: "#0e2756", lo: "#060b16", base: "#030407" },
  slabEdge: "inset 0 -1px 0 rgba(130,180,255,0.22), 0 30px 60px -30px rgba(0,0,0,0.9)",
  // .oh-tabbar
  tabBar: ["rgba(28,32,40,0.8)", "rgba(14,17,22,0.88)"],
  tabBarEdge: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.06), 0 24px 50px -18px rgba(0,0,0,0.95), 0 6px 16px -8px rgba(0,0,0,0.6)",
  // .oh-bar: the progress fill
  bar: ["#1f55d0", "#3d8bff", "#82b4ff"],
  barStops: [0, 0.7, 1],
};

// --ease-thumb and friends, as reanimated spring and timing settings.
export const EASE = {
  thumb: { damping: 11, stiffness: 260, mass: 0.7 }, // cubic-bezier(.34,1.56,.64,1): a little overshoot
  press: { damping: 20, stiffness: 520, mass: 0.6 },
  expo: [0.16, 1, 0.3, 1], // --ease-out-expo
  glide: [0.22, 1, 0.36, 1], // --ease-glide
};

/**
 * Splits a CSS box-shadow list into its inset and outer parts. React Native
 * paints a view's inset shadow under its children, so the kit draws the inset
 * part on an overlay above the body and the outer part on the frame.
 */
export function splitShadow(shadow) {
  if (!shadow) return { inset: null, outer: null };
  const parts = shadow.split(/,(?![^(]*\))/).map((p) => p.trim());
  const inset = parts.filter((p) => p.startsWith("inset"));
  const outer = parts.filter((p) => !p.startsWith("inset"));
  return { inset: inset.length ? inset.join(", ") : null, outer: outer.length ? outer.join(", ") : null };
}
