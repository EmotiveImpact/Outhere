// Three looks for the bars, drawn whole by one shader over a canvas that is
// bigger than the bar by `bleed`, so every edge is antialiased and the glow
// falls off smoothly into the card.
//
//   neon   a lightsaber: a steady white-hot core inside a saturated edge, a
//          smooth halo, a clean bright tip and a white point where two bars meet
//   glass  liquid in a glass tube: a glossy highlight along the top, a wavy
//          surface at the head, bubbles drifting along and a broad shine
//   pulse  light travelling down a fibre: packets of white light with soft
//          tails race to the head (or the meeting point) and flash there
//
// The geometry is a capsule distance field, so the fill, its edge and its
// glow come from one number per pixel and never meet a hard box. The step
// ring is drawn the same way in neon: an arc distance field with round ends.

import React, { useMemo } from "react";
import { Canvas, Path, Rect, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { LIQUID_TONES, NOISE } from "./parts";

export const BAR_LOOKS = ["neon", "glass", "pulse"];
const LOOK_ID = { neon: 0, glass: 1, pulse: 2 };

const COMMON = `
${NOISE}
float capsule(float2 p, float a, float b, float y, float r) {
  float x = clamp(p.x, a + r, max(a + r, b - r));
  return length(float2(p.x - x, p.y - y)) - r;
}
float maxc(float3 c) { return max(max(c.r, c.g), c.b); }
// fades the glow out before it reaches the canvas edge
float edgeFade(float2 xy, float2 res, float bleed) {
  float e = min(min(xy.x, res.x - xy.x), min(xy.y, res.y - xy.y));
  return smoothstep(0.0, bleed * 0.7, e);
}
// neon: a steady white-hot core that melts smoothly into the saturated
// colour at the edge, with a slow hum of light running along it
float3 neonFill(float s, float u, float x, float t, float3 c0, float3 c1, float3 hi) {
  float v = abs(s);
  float core = exp(-pow(v / 0.42, 2.0));
  float3 edge = mix(mix(c0, c1, 0.55), c1, u);
  float3 col = mix(edge, mix(hi, float3(1.0), 0.75), core);
  float hum = 1.0 + 0.05 * sin(x * 0.045 - t * 3.0);
  return col * (0.93 + 0.07 * u) * hum;
}
// neon halo: smooth, breathing gently
float neonHalo(float gd, float h, float t) {
  return (exp(-gd / (h * 0.7)) * 0.36 + exp(-gd / (h * 0.2)) * 0.46) * (0.96 + 0.04 * sin(t * 2.0));
}
// glass: lit liquid, shaded underneath, with bubbles and a broad shine
float3 glassFill(float2 xy, float s, float u, float along, float h, float cy, float t, float3 c0, float3 c1, float3 hi) {
  float v = abs(s);
  float3 col = mix(c0, c1, smoothstep(0.0, 1.0, u));
  col *= 0.7 + 0.42 * smoothstep(1.0, -0.7, s);
  col *= 0.86 + 0.14 * (1.0 - v * v);
  // bubbles drifting along
  float cell = h * 2.1;
  float px = along - t * h * 2.4;
  float ci = floor(px / cell);
  float fx = px - ci * cell - cell * 0.5;
  float rnd = hash(float2(ci, 7.0));
  float by = (rnd - 0.5) * h * 0.46 + sin(t * 2.3 + rnd * 6.28) * h * 0.06;
  float br = h * (0.08 + 0.06 * hash(float2(ci, 3.0)));
  float bd = length(float2(fx, xy.y - cy - by));
  float rim = smoothstep(br + 0.7, br - 0.2, bd) - smoothstep(br - 0.4, br - 1.6, bd) * 0.7;
  col = mix(col, hi, clamp(rim, 0.0, 1.0) * step(0.62, rnd) * 0.45);
  // a broad soft shine that crosses every few seconds
  float ph = fract(t / 3.6);
  float sp = -0.3 + 1.6 * ph;
  col = mix(col, float3(1.0), exp(-pow((u - sp) / 0.1, 2.0)) * 0.32 * (1.0 - v * 0.5));
  return col;
}
// the glossy band along the top of a glass tube, crisp underneath
float glassBand(float s) {
  return smoothstep(-0.95, -0.72, s) * (1.0 - smoothstep(-0.34, -0.26, s));
}
// pulse: packets of light travelling to the head at x = 0, coming from x < 0
float pulses(float dx, float h, float t, float run, float speed) {
  float p = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float period = run + h * 10.0;
    float hx = mod(t * (speed + 40.0 * fi) + fi * period * 0.37, period) - period;
    float q = dx - hx;
    p += exp(-pow(q / (h * 0.55), 2.0));
    p += q < 0.0 ? exp(q / (h * 4.5)) * 0.5 : 0.0;
  }
  return p;
}
`;

const BAR_LOOK = Skia.RuntimeEffect.Make(`
uniform float look;
uniform float2 res;
uniform float bleed;
uniform float x0;
uniform float len;
uniform float cy;
uniform float h;
uniform float t;
uniform float3 c0;
uniform float3 c1;
uniform float3 glow;
uniform float3 hi;
${COMMON}
half4 main(float2 xy) {
  if (len < 0.5) return half4(0.0);
  float r = min(h * 0.5, len * 0.5);
  float xe = x0 + len;
  float s = (xy.y - cy) / (h * 0.5);
  float u = clamp((xy.x - x0) / max(len, 1.0), 0.0, 1.0);
  float fe = edgeFade(xy, res, bleed);
  float3 col;
  float3 e;
  float d;
  if (look < 0.5) {
    d = capsule(xy, x0, xe, cy, r);
    col = neonFill(s, u, xy.x, t, c0, c1, hi);
    float gd = max(d, 0.0);
    float g = neonHalo(gd, h, t);
    // the tip: a clean round bright end
    float2 hp = float2(xe - r, cy);
    float tip = exp(-pow(length(xy - hp) / (h * 0.55), 2.0)) * (0.9 + 0.1 * sin(t * 3.0));
    col = mix(col, float3(1.0), tip * 0.6);
    e = glow * g + mix(glow, float3(1.0), 0.6) * tip * 0.55;
  } else if (look < 1.5) {
    float wave = sin(s * 2.6 + t * 4.2) * 0.5 + sin(s * 5.0 - t * 6.3) * 0.25;
    float xe2 = max(x0 + r * 2.0, xe - h * 0.16 + wave * h * 0.16);
    d = capsule(xy, x0, xe2, cy, r);
    col = glassFill(xy, s, u, xy.x - x0, h, cy, t, c0, c1, hi);
    float ends = smoothstep(x0 + r * 0.4, x0 + r * 1.5, xy.x) * smoothstep(xe2 - r * 0.2, xe2 - r * 1.3, xy.x);
    col = mix(col, float3(1.0), glassBand(s) * ends * 0.55);
    // a bright meniscus where the liquid ends
    float foam = smoothstep(1.4, 0.0, abs(d + 1.0)) * smoothstep(xe2 - r * 1.3, xe2, xy.x);
    col = mix(col, mix(hi, float3(1.0), 0.5), foam * 0.65);
    float gd = max(d, 0.0);
    e = glow * exp(-gd / (h * 0.32)) * 0.32;
  } else {
    d = capsule(xy, x0, xe, cy, r);
    col = mix(c0, c1, u) * 0.78;
    col = mix(col, mix(hi, float3(1.0), 0.3), exp(-pow(s / 0.24, 2.0)) * 0.4);
    float p = pulses(xy.x - xe, h, t, len, 150.0);
    p *= step(xy.x, xe + h);
    col = mix(col, float3(1.0), clamp(p * exp(-pow(s / 0.75, 2.0)), 0.0, 1.0) * 0.9);
    float gd = max(d, 0.0);
    float g = exp(-gd / (h * 0.55)) * 0.28;
    float pg = clamp(p, 0.0, 1.2) * exp(-gd / (h * 0.6)) * 0.55;
    e = glow * g + mix(glow, float3(1.0), 0.55) * pg;
  }
  float a = clamp(0.5 - d, 0.0, 1.0);
  e *= fe * (1.0 - a);
  float3 rgb = clamp(col, 0.0, 1.0) * a + e;
  return half4(half3(clamp(rgb, 0.0, 1.0)), half(clamp(a + maxc(e), 0.0, 1.0)));
}`);

const TUG_LOOK = Skia.RuntimeEffect.Make(`
uniform float look;
uniform float2 res;
uniform float bleed;
uniform float x0;
uniform float len;
uniform float split;
uniform float cy;
uniform float h;
uniform float t;
${COMMON}
half4 main(float2 xy) {
  float r = h * 0.5;
  float s = (xy.y - cy) / r;
  float xr = xy.x - x0;
  float fe = edgeFade(xy, res, bleed);
  float d = capsule(xy, x0, x0 + len, cy, r);
  float gd = max(d, 0.0);
  float3 bc0 = float3(0.09, 0.27, 0.8);
  float3 bc1 = float3(0.36, 0.63, 1.0);
  float3 bgl = float3(0.2, 0.48, 1.0);
  float3 bhi = float3(0.74, 0.86, 1.0);
  float3 rc0 = float3(0.6, 0.07, 0.13);
  float3 rc1 = float3(1.0, 0.36, 0.42);
  float3 rgl = float3(1.0, 0.24, 0.32);
  float3 rhi = float3(1.0, 0.78, 0.8);
  // both sides grow towards the meeting point
  float ub = clamp(xr / max(split, 1.0), 0.0, 1.0);
  float ur = clamp((len - xr) / max(len - split, 1.0), 0.0, 1.0);
  float ds = xr - split;
  float3 cb;
  float3 cr;
  float3 e;
  float mine;
  float2 sp = float2(x0 + split, cy);
  if (look < 0.5) {
    mine = smoothstep(0.8, -0.8, ds);
    cb = neonFill(s, ub, xy.x, t, bc0, bc1, bhi);
    cr = neonFill(s, ur, -xy.x, t, rc0, rc1, rhi);
    float g = neonHalo(gd, h, t);
    float side = smoothstep(6.0, -6.0, ds);
    e = mix(rgl, bgl, side) * g;
  } else if (look < 1.5) {
    float wave = sin(s * 2.8 + t * 4.6) * 0.5 + sin(s * 5.3 - t * 6.1) * 0.25;
    float dw = ds + wave * h * 0.2;
    mine = smoothstep(0.8, -0.8, dw);
    cb = glassFill(xy, s, ub, xr, h, cy, t, bc0, bc1, bhi);
    cr = glassFill(xy, s, ur, len - xr, h, cy, t * 1.07, rc0, rc1, rhi);
    float foam = smoothstep(1.6, 0.0, abs(dw));
    float3 band = float3(glassBand(s) * 0.55);
    cb = mix(cb, float3(1.0), band + foam * 0.85);
    cr = mix(cr, float3(1.0), band + foam * 0.85);
    float side = smoothstep(6.0, -6.0, ds);
    e = mix(rgl, bgl, side) * exp(-gd / (h * 0.32)) * 0.32;
  } else {
    mine = smoothstep(0.8, -0.8, ds);
    cb = mix(bc0, bc1, ub) * 0.78;
    cr = mix(rc0, rc1, ur) * 0.78;
    float line = exp(-pow(s / 0.24, 2.0)) * 0.4;
    cb = mix(cb, mix(bhi, float3(1.0), 0.3), line);
    cr = mix(cr, mix(rhi, float3(1.0), 0.3), line);
    float pb = pulses(xr - split, h, t, split, 150.0) * step(xr, split);
    float pr = pulses(split - xr, h, t * 0.93 + 1.7, len - split, 130.0) * step(split, xr);
    float wv = exp(-pow(s / 0.75, 2.0));
    cb = mix(cb, float3(1.0), clamp(pb * wv, 0.0, 1.0) * 0.9);
    cr = mix(cr, float3(1.0), clamp(pr * wv, 0.0, 1.0) * 0.9);
    float side = smoothstep(6.0, -6.0, ds);
    float pg = clamp(pb + pr, 0.0, 1.2) * exp(-gd / (h * 0.6)) * 0.55;
    e = mix(rgl, bgl, side) * exp(-gd / (h * 0.55)) * 0.28 + float3(0.92, 0.95, 1.0) * pg;
  }
  float3 col = mix(cr, cb, mine);
  // where the two meet: a white-hot point with a thin flare through it
  float neon = look < 0.5 ? 1.0 : 0.0;
  float fl = neon > 0.5 ? 0.92 + 0.08 * sin(t * 4.0) : 0.85 + 0.1 * sin(t * 11.0) + 0.05 * sin(t * 17.3);
  float hd = length((xy - sp) * float2(1.0, 0.85));
  float hot = exp(-pow(hd / (h * (look < 1.5 ? 0.62 : 0.8)), 2.0)) * fl;
  float vflare = exp(-abs(xy.x - sp.x) / (h * 0.07)) * exp(-pow((xy.y - cy) / (h * (neon > 0.5 ? 1.1 : 0.9)), 2.0)) * 0.7 * fl;
  float hflare = exp(-abs(xy.y - cy) / (h * 0.08)) * exp(-abs(xy.x - sp.x) / (h * 2.6)) * 0.45 * fl * (1.0 - neon);
  float strength = look > 0.5 && look < 1.5 ? 0.55 : 1.0;
  col = mix(col, float3(1.0), clamp(hot * strength, 0.0, 1.0));
  e += float3(0.92, 0.94, 1.0) * (hot * 0.7 + vflare + hflare) * strength;
  float a = clamp(0.5 - d, 0.0, 1.0);
  e *= fe * (1.0 - a);
  float3 rgb = clamp(col, 0.0, 1.0) * a + e;
  return half4(half3(clamp(rgb, 0.0, 1.0)), half(clamp(a + maxc(e), 0.0, 1.0)));
}`);

const RING_LOOK = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float bleed;
uniform float2 c;
uniform float R;
uniform float w;
uniform float p;
uniform float t;
uniform float3 c0;
uniform float3 c1;
uniform float3 glow;
uniform float3 hi;
${COMMON}
half4 main(float2 xy) {
  if (p < 0.002) return half4(0.0);
  float2 q = xy - c;
  float dist = length(q);
  // 0 at the top, growing clockwise
  float turn = fract(atan(q.x, -q.y) / 6.2831853);
  float hw = w * 0.5;
  float2 head = c + R * float2(sin(p * 6.2831853), -cos(p * 6.2831853));
  float d;
  float u;
  if (p >= 0.999) {
    d = abs(dist - R) - hw;
    u = turn;
  } else if (turn <= p) {
    d = abs(dist - R) - hw;
    u = turn / p;
  } else {
    // the round ends
    float ds = length(xy - (c + float2(0.0, -R)));
    float dh = length(xy - head);
    d = min(ds, dh) - hw;
    u = dh < ds ? 1.0 : 0.0;
  }
  float s = (dist - R) / hw;
  float3 col = neonFill(s, u, turn * 6.2831853 * R, t, c0, c1, hi);
  float gd = max(d, 0.0);
  float g = neonHalo(gd, w, t);
  float tip = p < 0.999 ? exp(-pow(length(xy - head) / (w * 0.55), 2.0)) * (0.9 + 0.1 * sin(t * 3.0)) : 0.0;
  col = mix(col, float3(1.0), tip * 0.6);
  float3 e = glow * g + mix(glow, float3(1.0), 0.6) * tip * 0.55;
  float a = clamp(0.5 - d, 0.0, 1.0);
  e *= edgeFade(xy, res, bleed) * (1.0 - a);
  float3 rgb = clamp(col, 0.0, 1.0) * a + e;
  return half4(half3(clamp(rgb, 0.0, 1.0)), half(clamp(a + maxc(e), 0.0, 1.0)));
}`);

/**
 * A Meter's fill in one of the looks. `progress` is a shared value 0 to 1;
 * width and height are the track's. The canvas is `bleed` bigger on every
 * side, so lay it at -bleed over the track.
 */
export function LookBarCanvas({ look = "neon", width, height, bleed = 14, clock, progress, tone = "blue" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const W = width + bleed * 2;
  const H = height + bleed * 2;
  const id = LOOK_ID[look] ?? 0;
  const uniforms = useDerivedValue(() => {
    const p = progress.value;
    const len = p > 0.004 ? Math.max(height, p * width) : 0;
    return { look: id, res: [W, H], bleed, x0: bleed, len, cy: bleed + height / 2, h: height, t: clock.value, c0: tn.c0, c1: tn.c1, glow: tn.glow, hi: tn.hi };
  }, [id, W, H, bleed, width, height, tn]);
  if (!width || !height || !BAR_LOOK) return null;
  return (
    <Canvas style={{ width: W, height: H }} pointerEvents="none">
      <Rect x={0} y={0} width={W} height={H}>
        <Shader source={BAR_LOOK} uniforms={uniforms} />
      </Rect>
    </Canvas>
  );
}

/** The live tug bar in one of the looks: `share` is a shared value, your fraction 0 to 1. The canvas is `bleed` bigger on every side. */
export function LookTugCanvas({ look = "neon", width, height, bleed = 16, clock, share }) {
  const W = width + bleed * 2;
  const H = height + bleed * 2;
  const id = LOOK_ID[look] ?? 0;
  const uniforms = useDerivedValue(() => {
    const split = Math.max(height * 0.6, Math.min(width - height * 0.6, share.value * width));
    return { look: id, res: [W, H], bleed, x0: bleed, len: width, split, cy: bleed + height / 2, h: height, t: clock.value };
  }, [id, W, H, bleed, width, height]);
  if (!width || !height || !TUG_LOOK) return null;
  return (
    <Canvas style={{ width: W, height: H }} pointerEvents="none">
      <Rect x={0} y={0} width={W} height={H}>
        <Shader source={TUG_LOOK} uniforms={uniforms} />
      </Rect>
    </Canvas>
  );
}

/**
 * The step ring in neon. `progress` is a shared value 0 to 1; stroke in px;
 * track the colour of the empty ring (null for none). The canvas is `bleed`
 * bigger than `size` on every side.
 */
export function LookRingCanvas({ size, stroke, bleed = 20, clock, progress, tone = "blue", track = "#1b1f26" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const R = (size - stroke) / 2;
  const C0 = size / 2 + bleed;
  const S = size + bleed * 2;
  const ring = useMemo(() => {
    return Skia.Path.Circle(C0, C0, R);
  }, [C0, R]);
  const uniforms = useDerivedValue(() => ({ res: [S, S], bleed, c: [C0, C0], R, w: stroke, p: Math.max(0, Math.min(1, progress.value)), t: clock.value, c0: tn.c0, c1: tn.c1, glow: tn.glow, hi: tn.hi }), [S, bleed, C0, R, stroke, tn]);
  if (!size || !RING_LOOK) return null;
  return (
    <Canvas style={{ width: S, height: S }} pointerEvents="none">
      {track ? <Path path={ring} style="stroke" strokeWidth={stroke} color={track} /> : null}
      <Rect x={0} y={0} width={S} height={S}>
        <Shader source={RING_LOOK} uniforms={uniforms} />
      </Rect>
    </Canvas>
  );
}
