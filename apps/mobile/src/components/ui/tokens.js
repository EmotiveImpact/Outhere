// Design tokens for the midnight finish. See index.jsx for the rules.

export const C = {
  bg: "#07090c",
  surface: "#12151a",
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
// the top edge and a long soft shadow underneath.
export const LIT = ["#161a21", "#101318"];
