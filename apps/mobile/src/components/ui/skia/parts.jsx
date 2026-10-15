// Every Skia drawing in the finish kit. Only required once useSkiaReady() says
// Skia is loaded (see ../skia.js), never imported at the top of a module.
//
// Each part takes a plain width and height; the kit wrappers measure.

import React, { useMemo } from "react";
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  FractalNoise,
  Group,
  ImageShader,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import { STILL, skiaSource } from "../skia";

// ── Shaders ───────────────────────────────────────────────────────────────────

// Black falls away. Alpha becomes the brightest channel (lighten) or the
// screen of all three, so composited over a dark screen the result matches
// CSS mix-blend-mode: lighten / screen. A radial mask fades the edge exactly
// like the prototype's mask:radial-gradient(circle, #000 a, transparent b).
const KEY = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float inner;
uniform float outer;
uniform float grey;
uniform float dim;
uniform float screen;
half4 main(float2 xy) {
  float4 c = float4(image.eval(xy));
  float3 rgb = c.rgb;
  float g = dot(rgb, float3(0.299, 0.587, 0.114));
  rgb = clamp(mix(rgb, float3(g), grey) * dim, 0.0, 1.0);
  float a = max(max(rgb.r, rgb.g), rgb.b);
  float s = 1.0 - (1.0 - rgb.r) * (1.0 - rgb.g) * (1.0 - rgb.b);
  a = mix(a, s, screen);
  float m = 1.0;
  if (outer > inner) {
    m = clamp((outer - distance(xy, center)) / (outer - inner), 0.0, 1.0);
  }
  m = m * c.a;
  return half4(half3(rgb * m), half(a * m));
}`);

// Film grain: fractal noise (the same filter as the prototype's feTurbulence)
// turned into specks that lighten or darken, like an overlay blend.
const GRAIN = Skia.RuntimeEffect.Make(`
uniform shader noise;
uniform float amount;
half4 main(float2 xy) {
  float4 n = float4(noise.eval(xy));
  float l = n.a > 0.001 ? (n.r + n.g + n.b) / (3.0 * n.a) : 0.5;
  float v = clamp((l - 0.5) * 3.0, -1.0, 1.0);
  float a = abs(v) * amount;
  float w = v > 0.0 ? a : 0.0;
  return half4(half(w), half(w), half(w), half(a));
}`);

// The countdown warp: thin rays every 3.7 degrees, shown in a ring.
// repeating-conic-gradient(transparent 0 3.2deg, colour 3.2deg 3.7deg)
// masked by radial-gradient(circle, transparent 12%, #000 26%, transparent 46%).
const RAYS = Skia.RuntimeEffect.Make(`
uniform float2 center;
uniform float r0;
uniform float r1;
uniform float r2;
uniform float4 colour;
half4 main(float2 xy) {
  float2 p = xy - center;
  float ang = atan(p.y, p.x) + 3.14159265;
  float f = fract(ang / 0.0645772);
  float ray = smoothstep(0.83, 0.865, f) * (1.0 - smoothstep(0.965, 1.0, f));
  float d = length(p);
  float m = d < r1 ? clamp((d - r0) / (r1 - r0), 0.0, 1.0) : clamp((r2 - d) / (r2 - r1), 0.0, 1.0);
  return half4(colour * ray * m);
}`);

const premul = (c) => {
  const col = Skia.Color(c);
  return [col[0] * col[3], col[1] * col[3], col[2] * col[3], col[3]];
};

// ── Glow ──────────────────────────────────────────────────────────────────────

/** Elliptical radial gradients, as in CSS radial-gradient(rx ry at x y, ...). */
export function GlowCanvas({ width, height, layers = [], base, opacity = 1 }) {
  if (!width || !height) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none" {...STILL}>
      <Group opacity={opacity}>
        {base ? <Fill color={base} /> : null}
        {layers.map((l, i) => {
          const cx = l.x * width;
          const cy = l.y * height;
          const rx = Math.max(1, l.rx * width);
          const ry = Math.max(1, l.ry * height);
          return (
            <Rect key={i} x={0} y={0} width={width} height={height} dither>
              <RadialGradient
                c={vec(cx, cy)}
                r={rx}
                colors={l.stops.map((s) => s[1])}
                positions={l.stops.map((s) => s[0])}
                origin={vec(cx, cy)}
                transform={[{ scaleY: ry / rx }]}
              />
            </Rect>
          );
        })}
      </Group>
    </Canvas>
  );
}

// ── Images that lose their black ──────────────────────────────────────────────

/** Where an image lands in a box, like CSS object-fit with object-position. */
export function placeImage(iw, ih, width, height, { fit = "cover", zoom = 1, focus = { x: 0.5, y: 0.5 } } = {}) {
  const scale = (fit === "contain" ? Math.min(width / iw, height / ih) : Math.max(width / iw, height / ih)) * zoom;
  const w = iw * scale;
  const h = ih * scale;
  return { x: (width - w) * focus.x, y: (height - h) * focus.y, width: w, height: h };
}

export function KeyedImage({ source, width, height, mask, mode = "lighten", fit = "cover", zoom = 1, rotate = 0, focus, grey = 0, dim = 1 }) {
  const image = useImage(skiaSource(source));
  const rect = useMemo(
    () => (image ? placeImage(image.width(), image.height(), width, height, { fit, zoom, focus }) : null),
    [image, width, height, fit, zoom, focus]
  );
  if (!width || !height || !image || !rect || !KEY) return null;
  // Mask stops are fractions of half the diagonal (CSS "circle" = farthest corner).
  const corner = Math.hypot(width, height) / 2;
  const uniforms = {
    center: vec(width / 2, height / 2),
    inner: mask ? mask[0] * corner : 0,
    outer: mask ? mask[1] * corner : 0,
    grey,
    dim,
    screen: mode === "screen" ? 1 : 0,
  };
  return (
    <Canvas style={{ width, height }} pointerEvents="none" {...STILL}>
      <Fill>
        <Shader source={KEY} uniforms={uniforms}>
          <ImageShader
            image={image}
            fit="fill"
            rect={rect}
            tx="decal"
            ty="decal"
            origin={vec(width / 2, height / 2)}
            transform={rotate ? [{ rotate: (rotate * Math.PI) / 180 }] : []}
          />
        </Shader>
      </Fill>
    </Canvas>
  );
}

// ── Grain ─────────────────────────────────────────────────────────────────────

export function GrainCanvas({ width, height, amount = 0.05 }) {
  if (!width || !height || !GRAIN) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none" {...STILL}>
      <Fill>
        <Shader source={GRAIN} uniforms={{ amount }}>
          <FractalNoise freqX={0.9} freqY={0.9} octaves={2} />
        </Shader>
      </Fill>
    </Canvas>
  );
}

// ── Countdown light ───────────────────────────────────────────────────────────

/** The warp rays, drawn at their final size; the wrapper scales them in. */
export function RaysCanvas({ size, colour = "rgba(130,180,255,0.22)" }) {
  if (!size || !RAYS) return null;
  const corner = (size * Math.SQRT2) / 2;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none" {...STILL}>
      <Fill>
        <Shader source={RAYS} uniforms={{ center: vec(size / 2, size / 2), r0: corner * 0.12, r1: corner * 0.26, r2: corner * 0.46, colour: premul(colour) }} />
      </Fill>
    </Canvas>
  );
}

/** A shock ring: a crisp line with a bloom outside and in (.shock box-shadows). */
export function ShockCanvas({ size, radius, colour = "#82b4ff", line = 3 }) {
  if (!size) return null;
  const c = vec(size / 2, size / 2);
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none" {...STILL}>
      <Circle c={c} r={radius + line / 2} style="stroke" strokeWidth={line * 6} color={colour} opacity={0.55}>
        <BlurMask blur={radius * 0.24} style="normal" />
      </Circle>
      <Circle c={c} r={radius - line * 2} style="stroke" strokeWidth={line * 5} color={colour} opacity={0.4}>
        <BlurMask blur={radius * 0.18} style="normal" />
      </Circle>
      <Circle c={c} r={radius + line / 2} style="stroke" strokeWidth={line} color={colour} />
    </Canvas>
  );
}

// ── Touch light ───────────────────────────────────────────────────────────────

/**
 * Where the finger lands: a soft blue pool inside the surface and a bright
 * arc along its edge (.oh-spot::before and ::after).
 */
export function TouchCanvas({ width, height, radius, x, y, colour = "61,139,255", edge = "130,180,255" }) {
  if (!width || !height) return null;
  const c = vec(x, y);
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <RoundedRect x={0} y={0} width={width} height={height} r={radius}>
        <RadialGradient c={c} r={240} colors={[`rgba(${colour},0.16)`, `rgba(${colour},0)`]} positions={[0, 0.62]} />
      </RoundedRect>
      <RoundedRect x={0.5} y={0.5} width={width - 1} height={height - 1} r={Math.max(0, radius - 0.5)} style="stroke" strokeWidth={1}>
        <RadialGradient c={c} r={160} colors={[`rgba(${edge},0.8)`, `rgba(${edge},0)`]} positions={[0, 0.7]} />
      </RoundedRect>
    </Canvas>
  );
}

// ── Versus ────────────────────────────────────────────────────────────────────

/**
 * One fighter's half: the photo clipped to a slanted edge, a side light in
 * their colour and a fade to the floor (.r11fg .pl, .r10vsh, .r11rv .half).
 */
export function VersusHalf({ width, height, side, polygon, source, focus, tint, fade = "rgba(2,3,8,0.95)", fadeFrom = 0.45, zoom = 1 }) {
  const image = useImage(skiaSource(source));
  const clip = useMemo(() => {
    const p = Skia.Path.Make();
    polygon.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py)));
    p.close();
    return p;
  }, [polygon]);
  // Wait for the photo so a still canvas draws once, complete.
  if (!width || !height || (source && !image)) return null;
  const xs = polygon.map((p) => p[0]);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const box = right - left;
  const rect = image ? placeImage(image.width(), image.height(), box, height, { fit: "cover", zoom, focus }) : null;
  const fromX = side === "left" ? left : right;
  const toX = side === "left" ? left + box * 0.7 : right - box * 0.7;
  return (
    <Canvas style={{ width, height }} pointerEvents="none" {...STILL}>
      <Group clip={clip}>
        <Fill color="#05080e" />
        {rect ? (
          <Rect x={left} y={0} width={box} height={height}>
            <ImageShader image={image} fit="fill" rect={{ x: left + rect.x, y: rect.y, width: rect.width, height: rect.height }} />
          </Rect>
        ) : null}
        {tint ? (
          <Rect x={left} y={0} width={box} height={height}>
            <LinearGradient start={vec(fromX, 0)} end={vec(toX, 0)} colors={[tint, "rgba(0,0,0,0)"]} />
          </Rect>
        ) : null}
        {fade ? (
          <Rect x={left} y={0} width={box} height={height}>
            <LinearGradient start={vec(0, height * fadeFrom)} end={vec(0, height)} colors={["rgba(0,0,0,0)", fade]} />
          </Rect>
        ) : null}
      </Group>
    </Canvas>
  );
}

/** The glowing white line between two fighters (.vs9 .vseam). */
export function SeamCanvas({ width, height, from, to, colour = "#ffffff", glow = "#82b4ff" }) {
  if (!width || !height) return null;
  const a = vec(from[0], from[1]);
  const b = vec(to[0], to[1]);
  // linear-gradient(transparent, #fff 30%, #fff 70%, transparent) along the line
  const along = (c) => [clear(c), c, c, clear(c)];
  const stops = [0, 0.3, 0.7, 1];
  return (
    <Canvas style={{ width, height }} pointerEvents="none" {...STILL}>
      {/* box-shadow: 0 0 40px #82b4ff */}
      <Line p1={a} p2={b} strokeWidth={26} opacity={0.6} strokeCap="round">
        <BlurMask blur={20} style="normal" />
        <LinearGradient start={a} end={b} colors={along(glow)} positions={stops} />
      </Line>
      {/* box-shadow: 0 0 18px #fff */}
      <Line p1={a} p2={b} strokeWidth={9} opacity={0.85} strokeCap="round">
        <BlurMask blur={9} style="normal" />
        <LinearGradient start={a} end={b} colors={along(colour)} positions={stops} />
      </Line>
      <Line p1={a} p2={b} strokeWidth={3} strokeCap="round">
        <LinearGradient start={a} end={b} colors={along(colour)} positions={stops} />
      </Line>
    </Canvas>
  );
}

const clear = (c) => {
  const col = Skia.Color(c);
  return `rgba(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)},0)`;
};
