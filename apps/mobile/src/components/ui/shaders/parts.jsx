// The shader kit's Skia drawings. Like components/ui/skia/parts.jsx this
// module is only required once useSkiaReady() says Skia is loaded (see
// ../skia.js), never imported at the top of a screen or a wrapper.
//
// Every canvas here takes a plain width and height (the wrappers measure)
// and a `clock`: a Reanimated shared value in seconds from useLiveCanvas.
// Uniforms are derived from it, so the canvas redraws only while the clock
// runs and keeps its last frame when it stops.

import React, { useMemo } from "react";
import { Canvas, Circle, Fill, Group, ImageShader, Path, RadialGradient, RoundedRect, Shader, Skia, useImage, vec } from "@shopify/react-native-skia";
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
  col += hi * sheen * 0.9;
  col += (hash(xy) - 0.5) * 0.028;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`);

export const SHEEN_TONES = {
  silver: { base: [0.56, 0.6, 0.66], hi: [1, 1, 1], cool: [0.34, 0.4, 0.52], fallback: ["#9aa3ae", "#5e6670"] },
  black: { base: [0.105, 0.12, 0.145], hi: [0.68, 0.74, 0.82], cool: [0.06, 0.08, 0.12], fallback: ["#232830", "#0f1217"] },
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
  float g = exp(-d * d);
  // curtains: the ribbon brightens and dims along its length
  g *= 0.7 + 0.3 * sin(uv.x * 9.0 - tt * s * 4.0 + ph * 3.0);
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
  col = 1.0 - exp(-col * 1.3);
  float g = (hash(xy) - 0.5) * 0.05;
  if (field > 0.5) {
    float3 fld = float3(0.008, 0.014, 0.03);
    return half4(half3(clamp(fld + col + g, 0.0, 1.0)), 1.0);
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

// ── Shimmer: the live tug of war ──────────────────────────────────────────────

const TUG = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float split;
uniform float bleed;
half4 main(float2 xy) {
  float h = res.y - 2.0 * bleed;
  float r = h * 0.5;
  float2 p = float2(xy.x, xy.y - bleed);
  float dy = p.y - r;
  // the pill
  float ex = max(0.0, max(r - p.x, p.x - (res.x - r)));
  float m = 1.0 - smoothstep(r - 0.7, r + 0.5, length(float2(ex, dy)));
  // heat: the fill is sampled through a travelling ripple
  float v = clamp(abs(dy) / r, 0.0, 1.0);
  float wave = sin(p.x * 0.16 - t * 5.5) * 0.6 + sin(p.x * 0.06 + t * 2.7 + dy * 0.3) * 0.4;
  float xs = p.x + wave * 2.4 * (1.0 - v * v);
  float mine = smoothstep(split + 1.2, split - 1.2, xs);
  float3 blue = mix(float3(0.12, 0.33, 0.82), float3(0.24, 0.55, 1.0), clamp(xs / max(split, 1.0), 0.0, 1.0));
  float3 red = mix(float3(1.0, 0.30, 0.33), float3(0.66, 0.11, 0.15), clamp((xs - split) / max(res.x - split, 1.0), 0.0, 1.0));
  float3 col = mix(red, blue, mine);
  // a tube: lit along the top, shaded at the bottom
  col *= 0.78 + 0.5 * exp(-pow((dy + r * 0.45) / (r * 0.5), 2.0)) - 0.18 * smoothstep(0.0, r, dy);
  // light flowing along each side towards the meeting point
  float f1 = exp(-pow((p.x - mod(t * 90.0, split + 80.0) + 40.0) / 18.0, 2.0)) * step(p.x, split);
  float f2 = exp(-pow(((res.x - p.x) - mod(t * 70.0 + 30.0, res.x - split + 80.0) + 40.0) / 18.0, 2.0)) * step(split, p.x);
  col += f1 * 0.4 + f2 * 0.3;
  // the hot white core where they meet, flickering
  float dc = abs(p.x - split);
  float core = exp(-pow(dc / 2.4, 2.0));
  float halo = exp(-(dc * dc / 160.0 + dy * dy / 90.0)) * (0.5 + 0.12 * sin(t * 11.0) + 0.08 * sin(t * 17.3));
  float heat = 0.06 * sin(dy * 1.4 + t * 15.0) * exp(-dc / 28.0);
  float3 inside = col + core * 1.1 + heat;
  float3 glow = float3(0.8, 0.88, 1.0) * halo * 0.75 + exp(-(dc * dc / 12.0 + dy * dy / 40.0)) * 0.5;
  float3 o = inside * m + glow;
  float a = clamp(m + max(max(glow.r, glow.g), glow.b), 0.0, 1.0);
  return half4(half3(min(o, float3(a))), half(a));
}`);

/** The live tug bar: `share` is a shared value, your fraction 0 to 1. bleed: room above and below for the glow. */
export function TugCanvas({ width, height, bleed = 12, clock, share }) {
  const uniforms = useDerivedValue(() => ({ res: [width, height + bleed * 2], t: clock.value, split: share.value * width, bleed }), [width, height, bleed]);
  if (!width || !height || !TUG) return null;
  return (
    <Canvas style={{ width, height: height + bleed * 2 }} pointerEvents="none">
      <Fill>
        <Shader source={TUG} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

// ── Liquid: a bar and a ring filled with something that moves ────────────────

const LIQUID_BAR = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float fill;
uniform float3 c0;
uniform float3 c1;
uniform float3 hi;
${NOISE}
half4 main(float2 xy) {
  float r = res.y * 0.5;
  float dy = xy.y - r;
  // the leading edge trembles a touch, like a meniscus
  float edge = fill + 0.9 * sin(xy.y * 0.8 + t * 3.0) + 0.5 * sin(t * 1.3);
  float lx = max(0.0, r - xy.x);
  float pillL = 1.0 - smoothstep(r - 0.7, r + 0.5, length(float2(lx, dy)));
  float cx = edge - r;
  float roundR = 1.0 - smoothstep(r - 0.7, r + 0.5, length(float2(max(0.0, xy.x - cx), dy)));
  float m = pillL * roundR * step(0.5, fill);
  float u = clamp(xy.x / max(edge, 1.0), 0.0, 1.0);
  float3 col = mix(c0, c1, u);
  // a liquid: a bright line near the top, shade towards the bottom
  float spec = exp(-pow((dy + r * 0.42) / (r * 0.26), 2.0));
  col *= 0.72 + 0.26 * (1.0 - smoothstep(-r, r, dy));
  col += hi * spec * 0.5;
  // a slow surface wave, and caustics drifting through
  col += 0.07 * sin(xy.x * 0.045 - t * 1.6) + 0.06 * (vnoise(float2(xy.x * 0.06 + t * 0.4, xy.y * 0.2)) - 0.5);
  // the bright rim of the meniscus, and its glow into the empty track
  float de = edge - xy.x;
  float rim = exp(-pow((de - 1.2) / 2.2, 2.0)) * (1.0 - 0.6 * smoothstep(0.0, r, abs(dy)));
  col += hi * rim * 0.9;
  float ahead = exp(-pow(max(0.0, -de) / 9.0, 2.0)) * (1.0 - m) * 0.35 * (1.0 - smoothstep(r * 0.4, r, abs(dy))) * step(0.5, fill);
  float3 o = col * m + hi * ahead;
  float a = clamp(m + ahead, 0.0, 1.0);
  return half4(half3(min(o, float3(a))), half(a));
}`);

export const LIQUID_TONES = {
  blue: { c0: [0.12, 0.33, 0.82], c1: [0.51, 0.71, 1.0], hi: [0.9, 0.95, 1.0] },
  red: { c0: [0.66, 0.11, 0.15], c1: [1.0, 0.55, 0.57], hi: [1.0, 0.9, 0.9] },
  gold: { c0: [0.73, 0.53, 0.12], c1: [1.0, 0.89, 0.6], hi: [1.0, 0.97, 0.85] },
  grey: { c0: [0.23, 0.25, 0.3], c1: [0.54, 0.58, 0.64], hi: [0.85, 0.87, 0.9] },
};

/** The liquid fill of a Meter. `progress` is a shared value 0 to 1; the canvas is the whole track. */
export function LiquidBarCanvas({ width, height, clock, progress, tone = "blue" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const uniforms = useDerivedValue(() => {
    const p = progress.value;
    const fill = p > 0.004 ? Math.max(height * 0.6, p * width) : 0;
    return { res: [width, height], t: clock.value, fill, c0: tn.c0, c1: tn.c1, hi: tn.hi };
  }, [width, height, tn]);
  if (!width || !height || !LIQUID_BAR) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Fill>
        <Shader source={LIQUID_BAR} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

const LIQUID_RING = Skia.RuntimeEffect.Make(`
uniform float2 c;
uniform float R;
uniform float w;
uniform float t;
uniform float p;
uniform float3 c0;
uniform float3 c1;
uniform float3 hi;
uniform float4 track;
half4 main(float2 xy) {
  float2 d = xy - c;
  float r = length(d);
  float a = atan(d.x, -d.y);
  float turn = fract(a / 6.2831853);
  float s = (r - R) / w;
  float ring = 1.0 - smoothstep(w * 0.5 - 0.7, w * 0.5 + 0.5, abs(r - R));
  float full = step(0.999, p);
  float some = step(0.002, p);
  // the leading edge, with a wave running across the band
  float edge = p + (0.35 * sin(s * 7.0 + t * 2.6) + 0.25 * sin(t * 1.1 - s * 3.0)) * 0.012;
  float px = 6.2831853 * R;
  float behind = smoothstep(edge + 0.6 / px, edge - 0.6 / px, turn);
  float2 e = c + R * float2(sin(edge * 6.2831853), -cos(edge * 6.2831853));
  float capE = 1.0 - smoothstep(w * 0.5 - 0.7, w * 0.5 + 0.5, length(xy - e));
  float cap0 = 1.0 - smoothstep(w * 0.5 - 0.7, w * 0.5 + 0.5, length(xy - (c + float2(0.0, -R))));
  float fillm = max(behind * ring, max(capE, cap0)) * some;
  fillm = mix(fillm, ring, full);
  float3 col = mix(c0, c1, clamp(turn / max(p, 0.05), 0.0, 1.0));
  // a liquid band: lit along the outer side, a bright line, shade inside
  float spec = exp(-pow((s - 0.18) / 0.17, 2.0));
  col *= 0.74 + 0.28 * (s + 0.5);
  col += hi * spec * 0.42;
  col += 0.07 * sin(turn * 38.0 - t * 2.2) + 0.05 * sin(turn * 11.0 + t * 0.9);
  // the meniscus: a bright rim just behind the edge, a glow just ahead of it
  float da = (edge - turn) * px;
  float rim = exp(-pow((da - 1.5) / 2.6, 2.0)) * (1.0 - 0.5 * smoothstep(0.0, 0.5, abs(s)));
  col += hi * rim * 0.9 * some * (1.0 - full);
  float ahead = exp(-pow(max(0.0, -da) / 12.0, 2.0)) * ring * (1.0 - fillm) * 0.4 * some * (1.0 - full);
  float tr = track.a * ring * (1.0 - fillm);
  float3 o = col * fillm + hi * ahead + track.rgb * tr;
  float al = clamp(fillm + ahead + tr, 0.0, 1.0);
  return half4(half3(min(o, float3(al))), half(al));
}`);

/** A ring filled like a liquid arc. `progress` is a shared value 0 to 1; stroke in px. */
export function LiquidRingCanvas({ size, stroke, clock, progress, tone = "blue", track = "#1b1f26" }) {
  const tn = LIQUID_TONES[tone] || LIQUID_TONES.blue;
  const trk = useMemo(() => {
    if (!track) return [0, 0, 0, 0];
    const col = Skia.Color(track);
    return [col[0], col[1], col[2], col[3]];
  }, [track]);
  const R = (size - stroke) / 2;
  const uniforms = useDerivedValue(
    () => ({ c: [size / 2, size / 2], R, w: stroke, t: clock.value, p: Math.max(0, Math.min(1, progress.value)), c0: tn.c0, c1: tn.c1, hi: tn.hi, track: trk }),
    [size, R, stroke, tn, trk]
  );
  if (!size || !LIQUID_RING) return null;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Fill>
        <Shader source={LIQUID_RING} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

// ── Foil: holographic bands over an image, inside its own shape ──────────────

const FOIL = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 res;
uniform float t;
uniform float2 tilt;
uniform float strength;
uniform float2 center;
uniform float inner;
uniform float outer;
uniform float grey;
uniform float dim;
${NOISE}
half4 main(float2 xy) {
  float4 c = float4(image.eval(xy));
  float3 rgb = c.rgb;
  float lum = dot(rgb, float3(0.299, 0.587, 0.114));
  rgb = clamp(mix(rgb, float3(lum), grey) * dim, 0.0, 1.0);
  // the black falls away, as in BlendImage
  float a = max(max(rgb.r, rgb.g), rgb.b);
  float m = 1.0;
  if (outer > inner) {
    m = clamp((outer - distance(xy, center)) / (outer - inner), 0.0, 1.0);
  }
  m = m * c.a;
  // interference bands: diagonal, slid by the tilt and a slow loop, a little warped
  float2 uv = xy / res;
  float ph = dot(uv, float2(0.78, 0.62)) * 2.4 + tilt.x * 1.8 + tilt.y * 1.3 + t * 0.09;
  ph += (vnoise(uv * 3.0 + tilt * 0.6 + float2(t * 0.02, 0.0)) - 0.5) * 0.5;
  float3 rainbow = 0.5 + 0.5 * cos(6.2831853 * (ph + float3(0.0, 0.33, 0.67)));
  float band = 0.55 + 0.45 * sin(ph * 6.2831853 * 1.6 + 1.0);
  band = pow(band, 2.2);
  float3 foil = rainbow * band;
  // only on the object, strongest where it is already lit
  float k = 0.72 * strength * (0.3 + 0.7 * smoothstep(0.05, 0.6, lum)) * smoothstep(0.03, 0.25, a) * (1.0 - grey);
  float3 o = 1.0 - (1.0 - rgb) * (1.0 - foil * k);
  o += foil * k * 0.25 * smoothstep(0.75, 1.0, band);
  o = clamp(o, 0.0, 1.0);
  float a2 = max(a, max(max(o.r, o.g), o.b)) * m;
  return half4(half3(o * m), half(a2));
}`);

/**
 * An image with its black dropped out (like KeyedImage) and holographic foil
 * laid over its lit parts. `tilt` is a shared value [x, y] in g.
 */
export function FoilCanvas({ source, width, height, clock, tilt, strength = 1, mask, fit = "cover", zoom = 1, rotate = 0, focus, grey = 0, dim = 1 }) {
  const image = useImage(skiaSource(source));
  const rect = useMemo(() => (image ? placeImage(image.width(), image.height(), width, height, { fit, zoom, focus }) : null), [image, width, height, fit, zoom, focus]);
  const corner = Math.hypot(width, height) / 2;
  const inner = mask ? mask[0] * corner : 0;
  const outer = mask ? mask[1] * corner : 0;
  const uniforms = useDerivedValue(
    () => ({ res: [width, height], t: clock.value, tilt: [tilt.value[0], tilt.value[1]], strength, center: [width / 2, height / 2], inner, outer, grey, dim }),
    [width, height, strength, inner, outer, grey, dim]
  );
  if (!width || !height || !image || !rect || !FOIL) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Fill>
        <Shader source={FOIL} uniforms={uniforms}>
          <ImageShader image={image} fit="fill" rect={rect} tx="decal" ty="decal" origin={vec(width / 2, height / 2)} transform={rotate ? [{ rotate: (rotate * Math.PI) / 180 }] : []} />
        </Shader>
      </Fill>
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
