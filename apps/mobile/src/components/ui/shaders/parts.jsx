// The shader kit's Skia drawings. Like components/ui/skia/parts.jsx this
// module is only required once useSkiaReady() says Skia is loaded (see
// ../skia.js), never imported at the top of a screen or a wrapper.
//
// Every canvas here takes a plain width and height (the wrappers measure)
// and a `clock`: a Reanimated shared value in seconds from useLiveCanvas.
// Uniforms are derived from it, so the canvas redraws only while the clock
// runs and keeps its last frame when it stops.

import React, { useMemo } from "react";
import { Blur, BlurMask, Canvas, Circle, Fill, Group, ImageShader, Paint, Path, RadialGradient, Rect, RoundedRect, Shader, Skia, useImage, vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { skiaSource } from "../skia";
import { placeImage } from "../skia/parts";
import { LIT_CITIES } from "./cities";

// Shared helpers, pasted into each effect (SkSL has no includes).
const NOISE = `
float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), f.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), f.x), f.y);
}`;

// ── Sheen: brushed metal with a light that sweeps across ──────────────────────

const SHEEN = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float angle;
uniform float intensity;
uniform float3 base;
uniform float3 hi;
uniform float3 cool;
${NOISE}
float ease(float p) { return p * p * p * (p * (p * 6.0 - 15.0) + 10.0); }
half4 main(float2 xy) {
  float2 uv = xy / res;
  // Brushing: value noise stretched along x, three octaves of fine lines.
  float b = vnoise(float2(xy.x * 0.045, xy.y * 1.7)) * 0.5
          + vnoise(float2(xy.x * 0.12 + 31.0, xy.y * 3.4)) * 0.3
          + vnoise(float2(xy.x * 0.012, xy.y * 0.9 + 7.0)) * 0.2;
  b -= 0.5;
  // Lit from the top, falling off towards the lower right.
  float light = 1.0 + (0.5 - uv.y) * 0.18 - (uv.x - 0.5) * 0.05;
  // The sweep: one long eased pass every six seconds, then a rest.
  float2 dir = float2(cos(angle), sin(angle));
  float d = dot(xy, dir) / dot(res, abs(dir));
  float ph = fract(t / 6.0);
  float pos = -0.45 + 1.9 * ease(clamp(ph * 1.3, 0.0, 1.0));
  float band = exp(-pow((d - pos) / 0.13, 2.0));
  float band2 = exp(-pow((d - pos + 0.24) / 0.07, 2.0)) * 0.35;
  // Anisotropic: the brushing catches the light where its grain is bright.
  float aniso = 0.7 + 1.2 * max(b, -0.2);
  float sheen = (band + band2) * aniso * intensity;
  float3 col = base * light * (1.0 + b * 0.55);
  col = mix(col, cool, 0.1 * clamp(1.0 - light, 0.0, 1.0));
  col += hi * 0.05 * intensity * aniso;
  col += hi * sheen * 0.62;
  col += (hash(xy) - 0.5) * 0.028;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`);

export const SHEEN_TONES = {
  silver: { base: [0.56, 0.6, 0.66], hi: [1, 1, 1], cool: [0.34, 0.4, 0.52], fallback: ["#9aa3ae", "#5e6670"] },
  black: { base: [0.105, 0.12, 0.145], hi: [0.56, 0.66, 0.82], cool: [0.06, 0.08, 0.12], fallback: ["#232830", "#0f1217"] },
  blue: { base: [0.11, 0.25, 0.58], hi: [0.74, 0.85, 1], cool: [0.05, 0.1, 0.3], fallback: ["#2a6af0", "#12306e"] },
};

export function SheenCanvas({ width, height, clock, tone = "silver", speed = 1, angle = 35, intensity = 1, radius = 0 }) {
  const tn = SHEEN_TONES[tone] || SHEEN_TONES.silver;
  const rad = (angle * Math.PI) / 180;
  const uniforms = useDerivedValue(
    () => ({ res: [width, height], t: clock.value * speed, angle: rad, intensity, base: tn.base, hi: tn.hi, cool: tn.cool }),
    [width, height, speed, rad, intensity, tn]
  );
  if (!width || !height || !SHEEN) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <RoundedRect x={0} y={0} width={width} height={height} r={radius}>
        <Shader source={SHEEN} uniforms={uniforms} />
      </RoundedRect>
    </Canvas>
  );
}

// ── Aurora: soft ribbons of light moving against each other ──────────────────

const AURORA = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float3 c1;
uniform float3 c2;
uniform float3 c3;
uniform float intensity;
uniform float field;
${NOISE}
float ribbon(float2 uv, float tt, float y0, float amp, float k, float s, float w, float ph, float warp) {
  float yc = y0 + amp * sin(uv.x * k + tt * s + ph) + warp;
  float d = (uv.y - yc) / w;
  // a curtain: a bright lower hem that fades slowly upwards and quickly below
  float g = d < 0.0 ? exp(d * 0.9) : exp(-d * d * 4.0);
  // fine vertical rays drifting along the curtain
  float rays = vnoise(float2(uv.x * 46.0 + ph * 11.0 + tt * s * 3.0, uv.y * 1.2));
  rays = 0.55 + 0.45 * smoothstep(0.25, 0.85, rays);
  // and the curtain brightens and dims along its length
  g *= rays * (0.65 + 0.35 * sin(uv.x * 7.0 - tt * s * 4.0 + ph * 3.0));
  return g;
}
half4 main(float2 xy) {
  float2 uv = xy / res;
  float n1 = vnoise(float2(uv.x * 2.0 + t * 0.06, uv.y * 1.3 - t * 0.025));
  float n2 = vnoise(float2(uv.x * 3.6 - t * 0.045 + 17.0, uv.y * 2.2 + t * 0.03));
  float warp = (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.22;
  float3 col = c1 * ribbon(uv, t, 0.34, 0.09, 2.6, 0.11, 0.13, 0.0, warp)
             + c2 * ribbon(uv, t, 0.55, 0.07, 3.4, -0.08, 0.085, 2.1, warp * 0.8) * 0.8
             + c3 * ribbon(uv, t, 0.70, 0.06, 2.1, 0.07, 0.11, 4.2, -warp * 0.7) * 0.6
             + c1 * ribbon(uv, t, 0.22, 0.05, 1.7, -0.05, 0.07, 1.3, warp * 0.5) * 0.3;
  col *= intensity;
  // roll the light off without bleaching it: overlaps get brighter, never white
  float pk = max(max(col.r, col.g), col.b);
  col *= (1.0 - exp(-pk * 1.3)) / max(pk, 0.001);
  float g = (hash(xy) - 0.5) * 0.05;
  if (field > 0.5) {
    // the sky feathers away at its edges, so it melts into whatever holds it
    float fe = smoothstep(0.0, 0.34, uv.y) * smoothstep(1.0, 0.82, uv.y) * smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);
    float3 fld = float3(0.008, 0.014, 0.03);
    float3 o = clamp(fld + col + g, 0.0, 1.0);
    return half4(half3(o * fe), half(fe));
  }
  float a = clamp(max(max(col.r, col.g), col.b) * 1.15, 0.0, 1.0);
  return half4(half3(clamp(col + g * a, 0.0, 1.0)), half(a));
}`);

const rgb01 = (c) => {
  const col = Skia.Color(c);
  return [col[0], col[1], col[2]];
};

/** colours: three CSS colours (two blues and a violet by default). field: draw the near-black sky under the light. */
export function AuroraCanvas({ width, height, clock, colours, speed = 1, intensity = 1, field = true }) {
  const cs = useMemo(() => {
    const c = colours && colours.length ? colours : ["#1f5ef5", "#7fb8ff", "#8a5cff"];
    return [rgb01(c[0]), rgb01(c[1] || c[0]), rgb01(c[2] || c[1] || c[0])];
  }, [colours]);
  const uniforms = useDerivedValue(
    () => ({ res: [width, height], t: clock.value * speed, c1: cs[0], c2: cs[1], c3: cs[2], intensity, field: field ? 1 : 0 }),
    [width, height, speed, cs, intensity, field]
  );
  if (!width || !height || !AURORA) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Fill>
        <Shader source={AURORA} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

// ── Glowing bars and rings ────────────────────────────────────────────────────
//
// The shape of every bar and ring is a Skia path, so its edge is drawn by the
// rasteriser with proper antialiasing, and its light comes from a shader
// painted into that path. Each one is drawn three times: two blurred copies
// underneath (a tight bloom and a wide one) that feather out past the shape,
// and the crisp body on top. The canvases are bigger than the shape they
// draw by `bleed` on every side so the bloom never meets a hard edge.

// Tones: c0 the deep end of the fill, c1 the lit end, glow the bloom, hi the
// light that runs through it. No pure white anywhere: the brightest light is
// tinted with the tone.
export const LIQUID_TONES = {
  blue: { c0: [0.09, 0.27, 0.8], c1: [0.36, 0.63, 1.0], glow: [0.2, 0.48, 1.0], hi: [0.74, 0.86, 1.0] },
  red: { c0: [0.6, 0.07, 0.13], c1: [1.0, 0.36, 0.42], glow: [1.0, 0.24, 0.32], hi: [1.0, 0.78, 0.8] },
  gold: { c0: [0.66, 0.46, 0.1], c1: [1.0, 0.82, 0.42], glow: [1.0, 0.72, 0.28], hi: [1.0, 0.94, 0.78] },
  grey: { c0: [0.22, 0.24, 0.29], c1: [0.48, 0.52, 0.59], glow: [0.4, 0.44, 0.52], hi: [0.8, 0.83, 0.88] },
};

const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

// The light inside a bar: deep to lit along its length, a soft lit core
// through the middle of its thickness, a slow wash of light travelling
// towards the head and a faint drift of caustics.
const BAR = Skia.RuntimeEffect.Make(`
uniform float x0;
uniform float len;
uniform float cy;
uniform float h;
uniform float t;
uniform float3 c0;
uniform float3 c1;
uniform float3 hi;
${NOISE}
half4 main(float2 xy) {
  float u = clamp((xy.x - x0) / max(len, 1.0), 0.0, 1.0);
  float s = (xy.y - cy) / h;
  float3 col = mix(c0, c1, smoothstep(0.0, 1.0, u));
  // lit along the upper middle of the tube, a little shade underneath
  col *= 0.82 + 0.34 * exp(-pow((s + 0.12) / 0.32, 2.0));
  col = mix(col, hi, 0.22 * exp(-pow((s + 0.3) / 0.12, 2.0)));
  // a wash of light that rolls towards the head every few seconds
  float ph = fract(t / 3.4);
  float pos = -0.3 + 1.6 * ph * ph * (3.0 - 2.0 * ph);
  float wash = exp(-pow((u - pos) / 0.12, 2.0)) * 0.26;
  col = mix(col, hi, wash * (0.6 + 0.4 * u));
  col += 0.04 * (vnoise(float2(xy.x * 0.05 - t * 0.6, xy.y * 0.25)) - 0.5);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`);

function pill(x, y, w, h) {
  "worklet";
  const p = Skia.Path.Make();
  if (w <= 0.5) return p;
  const r = Math.min(h / 2, w / 2);
  p.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r));
  return p;
}

/** The glow layers of a shape: a wide soft bloom and a tight one, in its tone. */
function Bloom({ path, glow, size, strength = 1, opacity }) {
  return (
    <Group opacity={opacity}>
      <Path path={path} color={css(glow, 0.14 * strength)}>
        <BlurMask blur={size * 0.6} style="normal" />
      </Path>
      <Path path={path} color={css(glow, 0.28 * strength)}>
        <BlurMask blur={size * 0.12} style="normal" />
      </Path>
    </Group>
  );
}

/**
 * The fill of a Meter. `progress` is a shared value 0 to 1. width and height
 * are the track's; the canvas is `bleed` bigger on every side, so lay it at
 * -bleed over the track.
 */
export function LiquidBarCanvas({ width, height, bleed = 14, clock, progress, tone = "blue" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const len = useDerivedValue(() => {
    const p = progress.value;
    return p > 0.004 ? Math.max(height, p * width) : 0;
  }, [width, height]);
  const path = useDerivedValue(() => pill(bleed, bleed, len.value, height), [bleed, height]);
  const uniforms = useDerivedValue(() => ({ x0: bleed, len: len.value, cy: bleed + height / 2, h: height, t: clock.value, c0: tn.c0, c1: tn.c1, hi: tn.hi }), [bleed, height, tn]);
  const head = useDerivedValue(() => vec(bleed + Math.max(height / 2, len.value - height / 2), bleed + height / 2), [bleed, height]);
  const headOn = useDerivedValue(() => (len.value > 0 ? 0.75 + 0.25 * Math.sin(clock.value * 2.2) : 0));
  if (!width || !height || !BAR) return null;
  const W = width + bleed * 2;
  const H = height + bleed * 2;
  return (
    <Canvas style={{ width: W, height: H }} pointerEvents="none">
      <Bloom path={path} glow={tn.glow} size={height} />
      <Path path={path}>
        <Shader source={BAR} uniforms={uniforms} />
      </Path>
      <Group opacity={headOn}>
        <Circle c={head} r={height * 0.9}>
          <RadialGradient c={head} r={height * 0.9} colors={[css(tn.hi, 0.3), css(tn.glow, 0.1), css(tn.glow, 0)]} positions={[0, 0.35, 1]} />
        </Circle>
      </Group>
    </Canvas>
  );
}

// The live tug of war: one pill, blue from the left and red from the right,
// light streaming in from both ends towards the point where they meet, and a
// soft pale spark there.
const TUG = Skia.RuntimeEffect.Make(`
uniform float x0;
uniform float len;
uniform float split;
uniform float cy;
uniform float h;
uniform float t;
${NOISE}
half4 main(float2 xy) {
  float x = xy.x - x0;
  float s = (xy.y - cy) / h;
  float d = x - split;
  float3 blue = mix(float3(0.08, 0.25, 0.78), float3(0.34, 0.62, 1.0), clamp(x / max(split, 1.0), 0.0, 1.0));
  float3 red = mix(float3(1.0, 0.34, 0.4), float3(0.58, 0.07, 0.13), clamp(d / max(len - split, 1.0), 0.0, 1.0));
  float mine = smoothstep(3.0, -3.0, d);
  float3 col = mix(red, blue, mine);
  col *= 0.82 + 0.34 * exp(-pow((s + 0.12) / 0.32, 2.0));
  // light streaming towards the meeting point from both ends
  float sb = 0.5 + 0.5 * sin((x / 80.0 - t * 0.9) * 6.2831853);
  float sr = 0.5 + 0.5 * sin(((len - x) / 80.0 - t * 0.75) * 6.2831853);
  float streak = mine * pow(sb, 16.0) * 0.22 + (1.0 - mine) * pow(sr, 16.0) * 0.18;
  float3 tint = mix(float3(1.0, 0.8, 0.82), float3(0.75, 0.86, 1.0), mine);
  col = mix(col, tint, streak * exp(-pow(s / 0.4, 2.0)));
  // heat close to the meeting point
  float near = exp(-abs(d) / 26.0);
  col += near * 0.16 * (vnoise(float2(x * 0.18 - t * 2.0, s * 3.0 + t)) - 0.3);
  col = mix(col, float3(0.8, 0.82, 1.0), exp(-pow(d / 3.5, 2.0)) * 0.45);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`);

/** The live tug bar: `share` is a shared value, your fraction 0 to 1. The canvas is `bleed` bigger on every side. */
export function TugCanvas({ width, height, bleed = 16, clock, share }) {
  const split = useDerivedValue(() => Math.max(height * 0.6, Math.min(width - height * 0.6, share.value * width)), [width, height]);
  const whole = useMemo(() => pill(bleed, bleed, width, height), [bleed, width, height]);
  const left = useDerivedValue(() => pill(bleed, bleed, split.value, height), [bleed, height]);
  const right = useDerivedValue(() => pill(bleed + split.value, bleed, width - split.value, height), [bleed, width, height]);
  const uniforms = useDerivedValue(() => ({ x0: bleed, len: width, split: split.value, cy: bleed + height / 2, h: height, t: clock.value }), [bleed, width, height]);
  const at = useDerivedValue(() => vec(bleed + split.value, bleed + height / 2), [bleed, height]);
  const flicker = useDerivedValue(() => 0.82 + 0.1 * Math.sin(clock.value * 9.0) + 0.08 * Math.sin(clock.value * 15.7));
  const core = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const w = Math.max(2, height * 0.22);
    const hh = height * 1.7;
    p.addRRect(Skia.RRectXY(Skia.XYWHRect(bleed + split.value - w / 2, bleed + height / 2 - hh / 2, w, hh), w / 2, w / 2));
    return p;
  }, [bleed, height]);
  if (!width || !height || !TUG) return null;
  const blue = LIQUID_TONES.blue.glow;
  const red = LIQUID_TONES.red.glow;
  return (
    <Canvas style={{ width: width + bleed * 2, height: height + bleed * 2 }} pointerEvents="none">
      <Bloom path={left} glow={blue} size={height} />
      <Bloom path={right} glow={red} size={height} strength={0.85} />
      <Path path={whole}>
        <Shader source={TUG} uniforms={uniforms} />
      </Path>
      <Group opacity={flicker}>
        <Circle c={at} r={height * 1.6}>
          <RadialGradient c={at} r={height * 1.6} colors={["rgba(196,200,255,0.38)", "rgba(150,140,255,0.12)", "rgba(150,140,255,0)"]} positions={[0, 0.32, 1]} />
        </Circle>
        <Path path={core} color="rgba(214,222,255,0.7)">
          <BlurMask blur={1.2} style="normal" />
        </Path>
      </Group>
    </Canvas>
  );
}

// The light inside a ring: deep to lit round the arc, a soft lit core in the
// middle of the stroke and a wash of light that runs round to the head.
const RING = Skia.RuntimeEffect.Make(`
uniform float2 c;
uniform float R;
uniform float w;
uniform float t;
uniform float p;
uniform float cap;
uniform float3 c0;
uniform float3 c1;
uniform float3 hi;
half4 main(float2 xy) {
  float2 d = xy - c;
  float turn = fract(atan(d.x, -d.y) / 6.2831853);
  // the round cap at the start sits just before the top: count it as the start
  float u = (p < 0.999 && turn > 1.0 - cap) ? 0.0 : clamp(turn / max(p, 0.001), 0.0, 1.0);
  float s = (length(d) - R) / w;
  float3 col = mix(c0, c1, smoothstep(0.0, 1.0, u));
  col *= 0.84 + 0.3 * exp(-pow((s + 0.08) / 0.3, 2.0));
  col = mix(col, hi, 0.18 * exp(-pow((s + 0.28) / 0.12, 2.0)));
  float ph = fract(t / 4.0);
  float pos = -0.25 + 1.5 * ph * ph * (3.0 - 2.0 * ph);
  col = mix(col, hi, exp(-pow((u - pos) / 0.12, 2.0)) * 0.3 * (0.5 + 0.5 * u));
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`);

/**
 * A ring that fills like a lit arc. `progress` is a shared value 0 to 1;
 * stroke in px. The canvas is `bleed` bigger than `size` on every side.
 */
export function LiquidRingCanvas({ size, stroke, bleed = 20, clock, progress, tone = "blue", track = "#1b1f26" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const R = (size - stroke) / 2;
  const C0 = size / 2 + bleed;
  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(C0, C0, R);
    return p;
  }, [C0, R]);
  const arc = useDerivedValue(() => {
    const v = Math.max(0, Math.min(1, progress.value));
    const p = Skia.Path.Make();
    if (v <= 0.002) return p;
    if (v >= 0.999) {
      p.addCircle(C0, C0, R);
      return p;
    }
    p.addArc(Skia.XYWHRect(C0 - R, C0 - R, R * 2, R * 2), -90, v * 360);
    return p;
  }, [C0, R]);
  const cap = stroke / 2 / (2 * Math.PI * R);
  const uniforms = useDerivedValue(() => ({ c: [C0, C0], R, w: stroke, t: clock.value, p: Math.max(0, Math.min(1, progress.value)), cap, c0: tn.c0, c1: tn.c1, hi: tn.hi }), [C0, R, stroke, cap, tn]);
  const head = useDerivedValue(() => {
    const a = Math.max(0, Math.min(1, progress.value)) * Math.PI * 2;
    return vec(C0 + R * Math.sin(a), C0 - R * Math.cos(a));
  }, [C0, R]);
  const headOn = useDerivedValue(() => {
    const v = progress.value;
    return v > 0.01 && v < 0.999 ? 0.7 + 0.3 * Math.sin(clock.value * 2.0) : 0;
  });
  if (!size || !RING) return null;
  const S = size + bleed * 2;
  return (
    <Canvas style={{ width: S, height: S }} pointerEvents="none">
      {track ? <Path path={ring} style="stroke" strokeWidth={stroke} color={track} /> : null}
      <Group>
        <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round" color={css(tn.glow, 0.3)}>
          <BlurMask blur={stroke * 1.4} style="normal" />
        </Path>
        <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round" color={css(tn.glow, 0.5)}>
          <BlurMask blur={stroke * 0.45} style="normal" />
        </Path>
      </Group>
      <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round">
        <Shader source={RING} uniforms={uniforms} />
      </Path>
      <Group opacity={headOn}>
        <Circle c={head} r={stroke * 1.3}>
          <RadialGradient c={head} r={stroke * 1.3} colors={[css(tn.hi, 0.5), css(tn.glow, 0.18), css(tn.glow, 0)]} positions={[0, 0.4, 1]} />
        </Circle>
      </Group>
    </Canvas>
  );
}

// ── Foil: a cool iridescence over an object's highlights, and its bloom ──────

const FOIL = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 res;
uniform float2 off;
uniform float t;
uniform float2 tilt;
uniform float strength;
uniform float2 center;
uniform float inner;
uniform float outer;
uniform float grey;
uniform float dim;
uniform float bloom;
${NOISE}
// a thin film seen at an angle: cyan, blue and violet, with a breath of rose at the peaks
float3 film(float x) {
  float3 a = float3(0.42, 0.86, 1.0);
  float3 b = float3(0.36, 0.5, 1.0);
  float3 v = float3(0.66, 0.48, 1.0);
  float3 r = float3(1.0, 0.62, 0.86);
  float f = fract(x) * 4.0;
  if (f < 1.0) return mix(a, b, f);
  if (f < 2.0) return mix(b, v, f - 1.0);
  if (f < 3.0) return mix(v, r, (f - 2.0) * 0.5);
  return mix(mix(v, r, 0.5), a, f - 3.0);
}
half4 main(float2 xy) {
  float4 c = float4(image.eval(xy));
  float3 rgb = c.rgb;
  float lum = dot(rgb, float3(0.299, 0.587, 0.114));
  rgb = clamp(mix(rgb, float3(lum), grey) * dim, 0.0, 1.0);
  // the black falls away, as in BlendImage
  float a = max(max(rgb.r, rgb.g), rgb.b);
  float m = 1.0;
  float2 q = xy - off;
  if (outer > inner) {
    m = clamp((outer - distance(q, center)) / (outer - inner), 0.0, 1.0);
  }
  m *= c.a;
  if (bloom > 0.5) {
    // the bloom: the object's light, cooled to the brand blue
    float g = smoothstep(0.2, 0.85, a);
    float3 b = mix(float3(0.16, 0.42, 1.0), float3(0.5, 0.72, 1.0), lum) * g;
    return half4(half3(b * m), half(g * m));
  }
  float2 uv = q / res;
  float k = strength * (1.0 - grey);
  // iridescence rides the highlights only, sliding with the tilt
  float ph = dot(uv, float2(0.7, 0.55)) * 1.4 + tilt.x * 0.9 + tilt.y * 0.7 + t * 0.05;
  ph += (vnoise(uv * 2.4 + tilt * 0.5) - 0.5) * 0.35;
  float hl = smoothstep(0.32, 0.95, lum);
  float3 foil = film(ph);
  float3 o = mix(rgb, rgb * foil * 1.45, 0.7 * k * hl);
  // a glint: a soft diagonal sweep that crosses the object every five seconds
  float gp = fract(t / 5.0);
  float g = dot(uv, float2(0.6, 0.8)) - (-0.4 + 1.9 * gp) - tilt.x * 0.25;
  float glint = exp(-pow(g / 0.07, 2.0)) * smoothstep(0.18, 0.7, lum) * k;
  o += float3(0.66, 0.8, 1.0) * glint * 0.55;
  o = clamp(o, 0.0, 1.0);
  float a2 = max(a, max(max(o.r, o.g), o.b));
  return half4(half3(o * m), half(a2 * m));
}`);

/**
 * An image with its black dropped out (like KeyedImage), a cool iridescence
 * over its lit parts and a soft blue bloom behind it that spills past its
 * edges. `tilt` is a shared value [x, y] in g. The canvas is `bleed` bigger
 * than width by height on every side.
 */
export function FoilCanvas({ source, width, height, bleed = 18, clock, tilt, strength = 1, mask, fit = "cover", zoom = 1, rotate = 0, focus, grey = 0, dim = 1 }) {
  const image = useImage(skiaSource(source));
  const rect = useMemo(() => {
    if (!image) return null;
    const r = placeImage(image.width(), image.height(), width, height, { fit, zoom, focus });
    return { x: r.x + bleed, y: r.y + bleed, width: r.width, height: r.height };
  }, [image, width, height, fit, zoom, focus, bleed]);
  const corner = Math.hypot(width, height) / 2;
  const inner = mask ? mask[0] * corner : 0;
  const outer = mask ? mask[1] * corner : 0;
  const base = { res: [width, height], off: [bleed, bleed], strength, center: [width / 2, height / 2], inner, outer, grey, dim };
  const uniforms = useDerivedValue(() => ({ ...base, t: clock.value, tilt: [tilt.value[0], tilt.value[1]], bloom: 0 }), [width, height, strength, inner, outer, grey, dim, bleed]);
  const glowUniforms = useMemo(() => ({ ...base, t: 0, tilt: [0, 0], bloom: 1 }), [width, height, strength, inner, outer, grey, dim, bleed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!width || !height || !image || !rect || !FOIL) return null;
  const W = width + bleed * 2;
  const H = height + bleed * 2;
  const pic = <ImageShader image={image} fit="fill" rect={rect} tx="decal" ty="decal" origin={vec(W / 2, H / 2)} transform={rotate ? [{ rotate: (rotate * Math.PI) / 180 }] : []} />;
  const lit = grey < 1 && strength > 0;
  return (
    <Canvas style={{ width: W, height: H }} pointerEvents="none">
      {lit ? (
        <Group
          opacity={0.42}
          layer={
            <Paint>
              <Blur blur={Math.max(4, Math.min(width, height) * 0.07)} mode="decal" />
            </Paint>
          }
        >
          <Rect x={0} y={0} width={W} height={H}>
            <Shader source={FOIL} uniforms={glowUniforms}>{pic}</Shader>
          </Rect>
        </Group>
      ) : null}
      <Rect x={0} y={0} width={W} height={H}>
        <Shader source={FOIL} uniforms={uniforms}>{pic}</Shader>
      </Rect>
    </Canvas>
  );
}

// ── City lights: the night side of a globe ────────────────────────────────────

export const MAX_LIGHTS = 40;

const NIGHT = Skia.RuntimeEffect.Make(`
uniform float2 c;
uniform float r;
uniform float3 sun;
uniform float t;
uniform float n;
uniform float strength;
uniform float2 pts[${MAX_LIGHTS}];
half4 main(float2 xy) {
  float2 d = (xy - c) / r;
  d.y = -d.y;
  float rr = dot(d, d);
  float3 o = float3(0.0);
  float a = 0.0;
  if (rr < 1.0) {
    float z = sqrt(1.0 - rr);
    float3 N = float3(d, z);
    float day = dot(N, sun);
    float night = smoothstep(0.22, -0.3, day);
    // the night side falls into shadow
    float shade = night * 0.6;
    o += float3(0.004, 0.008, 0.02) * shade;
    a += shade;
    // a cold dusk band along the terminator
    float dusk = exp(-pow(day / 0.16, 2.0)) * 0.26;
    o += float3(0.3, 0.5, 1.0) * dusk;
    a += dusk;
    // more air at the limb
    float fres = pow(1.0 - z, 3.2) * 0.7;
    o += float3(0.38, 0.62, 1.0) * fres;
    a += fres;
    // the cities, brightest where it is dark, each on its own twinkle
    float3 L = float3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      float fi = float(i);
      float on = step(fi + 0.5, n);
      float2 q = xy - pts[i];
      float dd = dot(q, q);
      float tw = 0.62 + 0.38 * sin(t * (1.3 + fract(fi * 0.37) * 2.2) + fi * 1.7);
      L += on * tw * (float3(1.0, 0.88, 0.64) * exp(-dd / 6.5) * 1.5 + float3(1.0, 0.74, 0.45) * exp(-dd / 90.0) * 0.22);
    }
    L *= (0.3 + 0.7 * night) * strength;
    o += L;
    a += max(max(L.r, L.g), L.b);
  } else {
    // a thin rim of air just past the limb
    float e = (sqrt(rr) - 1.0) * r;
    float rim = exp(-e / 6.0) * 0.55 + exp(-e / 22.0) * 0.18;
    o += float3(0.45, 0.68, 1.0) * rim;
    a += rim;
  }
  a = clamp(a, 0.0, 1.0);
  return half4(half3(min(o, float3(a))), half(a));
}`);

const RAD = Math.PI / 180;
const CITY_VECS = LIT_CITIES.map(([lat, lng]) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)]);

/**
 * Screen positions of the lit cities facing the camera, as a flat list
 * padded to MAX_LIGHTS, and how many are real. `project(v)` is the globe's
 * own projection returning [x, y, depth].
 */
export function cityLights(project) {
  const pts = [];
  for (const v of CITY_VECS) {
    const [x, y, depth] = project(v);
    if (depth > 0.08) pts.push([x, y, depth]);
  }
  pts.sort((p, q) => q[2] - p[2]);
  const flat = [];
  const n = Math.min(MAX_LIGHTS, pts.length);
  for (let i = 0; i < MAX_LIGHTS; i++) flat.push(i < n ? pts[i][0] : -9999, i < n ? pts[i][1] : -9999);
  return { pts: flat, n };
}

// Light from the upper left, matching the sea's own highlight.
const SUN = (() => {
  const v = [-0.5, 0.55, 0.67];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

/**
 * The night side of a globe drawn at (cx, cy, r), as a Skia element for
 * another canvas: a soft terminator, a thin atmosphere at the rim and the
 * cities twinkling. lights: from cityLights(). t in seconds.
 */
export function NightSide({ cx, cy, r, t, lights, strength = 1, sun = SUN }) {
  if (!NIGHT || !r) return null;
  const pad = 30;
  return (
    <Group>
      <RoundedRect x={cx - r - pad} y={cy - r - pad} width={(r + pad) * 2} height={(r + pad) * 2} r={r + pad}>
        <Shader source={NIGHT} uniforms={{ c: [cx, cy], r, sun, t, n: lights.n, strength, pts: lights.pts }} />
      </RoundedRect>
    </Group>
  );
}

// A small projection for the stand-alone planet: the camera looks at (lon0, lat0).
function look(v, lon0, lat0, cx, cy, r) {
  const cl = Math.cos(lon0);
  const sl = Math.sin(lon0);
  const x1 = v[0] * cl + v[1] * sl;
  const y1 = -v[0] * sl + v[1] * cl;
  const z1 = v[2];
  const ct = Math.cos(lat0);
  const st = Math.sin(lat0);
  const d = x1 * ct + z1 * st;
  const u = -x1 * st + z1 * ct;
  return [cx + r * y1, cy - r * u, d];
}

/**
 * A planet on its own, turning slowly: the sea lit from the top left, land as
 * dots, the night side with its cities. `dots` is a flat [x, y, z, ...] list
 * of land points, `t` seconds.
 */
export function PlanetCanvas({ size, t, dots, lat = 0.42, spin = 0.1 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const lon0 = t * spin;
  const land = useMemo(() => {
    const back = Skia.Path.Make();
    const front = Skia.Path.Make();
    for (let i = 0; i < dots.length; i += 3) {
      const [x, y, d] = look([dots[i], dots[i + 1], dots[i + 2]], lon0, lat, cx, cy, r);
      if (d <= 0.02) continue;
      if (d < 0.5) back.addCircle(x, y, r * 0.0075);
      else front.addCircle(x, y, r * 0.0105);
    }
    return { back, front };
  }, [dots, lon0, lat, cx, cy, r]);
  const lights = useMemo(() => cityLights((v) => look(v, lon0, lat, cx, cy, r)), [lon0, lat, cx, cy, r]);
  if (!size) return null;
  const light = vec(cx - r * 0.45, cy - r * 0.55);
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle c={vec(cx, cy)} r={r * 1.3}>
        <RadialGradient c={vec(cx, cy)} r={r * 1.3} colors={["rgba(61,139,255,0.3)", "rgba(61,139,255,0.12)", "rgba(61,139,255,0)"]} positions={[0.72, 0.82, 1]} />
      </Circle>
      <Circle c={vec(cx, cy)} r={r}>
        <RadialGradient c={light} r={r * 1.7} colors={["#1d4a92", "#0c2350", "#050d1f", "#02050c"]} positions={[0, 0.35, 0.7, 1]} />
      </Circle>
      <Path path={land.back} color="rgba(110,160,255,0.3)" />
      <Path path={land.front} color="rgba(150,195,255,0.85)" />
      <NightSide cx={cx} cy={cy} r={r} t={t} lights={lights} />
    </Canvas>
  );
}
