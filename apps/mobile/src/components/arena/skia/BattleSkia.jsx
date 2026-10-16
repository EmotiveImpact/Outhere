// The battle screens' own Skia drawings: the race lobby globe and the wide
// light rays behind a reveal or an emote drop. Like the finish kit's parts,
// this module is only required once useSkiaReady() says Skia is loaded,
// never imported at the top of a screen (see components/ui/skia.js).

import React, { useMemo } from "react";
import { BlurMask, Canvas, Circle, Fill, Group, LinearGradient, Path, RadialGradient, Shader, Skia, vec } from "@shopify/react-native-skia";
import { STILL } from "@/components/ui/skia";
import { NightSide, cityLights } from "@/components/ui/shaders/parts";
import { landDots } from "../globeLand";

// ── Globe ─────────────────────────────────────────────────────────────────────

const BLUE = "#4f9bff";
const RED = "#ff5a62";

/**
 * Where a unit vector lands on screen for a camera looking at (lat0, lon0),
 * in radians: [x, y, depth]. Depth above 0 faces us.
 */
export function project(v, lon0, lat0, cx, cy, r) {
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

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// A point on the great circle from a to b, lifted off the surface.
function arcPoint(a, b, omega, t, lift) {
  let p;
  if (omega < 1e-4) p = a;
  else {
    const s = Math.sin(omega);
    const ka = Math.sin((1 - t) * omega) / s;
    const kb = Math.sin(t * omega) / s;
    p = [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  }
  const h = 1 + lift * Math.sin(Math.PI * t);
  return [p[0] * h, p[1] * h, p[2] * h];
}

/** The camera that frames both people: looking at the middle of the arc. */
export function globeCamera(a, b) {
  const m = norm([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  const lon = Math.atan2(m[1], m[0]);
  const lat = Math.asin(Math.max(-1, Math.min(1, m[2])));
  // tip the globe a little so the arc rides over the top of it
  return { lon, lat: Math.max(-0.5, Math.min(0.9, lat - 0.12)) };
}

const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const GRID = (() => {
  const lines = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const l = [];
    for (let lat = -90; lat <= 90; lat += 6) l.push([lat, lon]);
    lines.push(l);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const l = [];
    for (let lon = -180; lon <= 180; lon += 6) l.push([lat, lon]);
    lines.push(l);
  }
  const R = Math.PI / 180;
  return lines.map((l) => l.map(([la, lo]) => [Math.cos(la * R) * Math.cos(lo * R), Math.cos(la * R) * Math.sin(lo * R), Math.sin(la * R)]));
})();

/**
 * The globe at time `t` seconds since it appeared. a and b are unit vectors
 * (you and them). The camera swings in from the far side and settles, the
 * pins land, the arc draws from you to them, then light runs along it.
 */
export function GlobeCanvas({ width, height, a, b, t, cx, cy, r }) {
  const dots = landDots(2.4);
  const omega = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const lift = 0.05 + 0.24 * (omega / Math.PI);
  const cam = useMemo(() => globeCamera(a, b), [a, b]);

  // The swing in: 230 degrees of spin easing to a stop, then a slow sway.
  const spin = ease(t / 3.4);
  const sway = t > 3.4 ? Math.sin((t - 3.4) * 0.35) * 0.06 : 0;
  const lon0 = cam.lon - (1 - spin) * 4 + sway;
  const lat0 = cam.lat + (1 - spin) * 0.25;

  const pins = clamp01((t - 2.9) / 0.5);
  const draw = ease((t - 3.3) / 1.4);
  const flow = t > 4.7 ? (t - 4.7) * 0.32 : null;

  const paths = useMemo(() => {
    const back = Skia.Path.Make();
    const mid = Skia.Path.Make();
    const front = Skia.Path.Make();
    for (let i = 0; i < dots.length; i += 3) {
      const [x, y, d] = project([dots[i], dots[i + 1], dots[i + 2]], lon0, lat0, cx, cy, r);
      if (d <= 0.02) continue;
      if (d < 0.35) back.addCircle(x, y, 0.95);
      else if (d < 0.7) mid.addCircle(x, y, 1.25);
      else front.addCircle(x, y, 1.45);
    }
    const grid = Skia.Path.Make();
    for (const line of GRID) {
      let pen = false;
      for (const v of line) {
        const [x, y, d] = project(v, lon0, lat0, cx, cy, r);
        if (d > 0) {
          if (pen) grid.lineTo(x, y);
          else grid.moveTo(x, y);
          pen = true;
        } else pen = false;
      }
    }
    return { back, mid, front, grid };
  }, [dots, lon0, lat0, cx, cy, r]);

  const arc = useMemo(() => {
    const p = Skia.Path.Make();
    const n = 64;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * draw;
      pts.push(project(arcPoint(a, b, omega, s, lift), lon0, lat0, cx, cy, r));
    }
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    return { path: p, head: pts[pts.length - 1] };
  }, [a, b, omega, lift, draw, lon0, lat0, cx, cy, r]);

  const pa = project(a, lon0, lat0, cx, cy, r);
  const pb = project(b, lon0, lat0, cx, cy, r);
  // The cities facing us, for the night side (the shader kit's NightSide).
  const lights = useMemo(() => cityLights((v) => project(v, lon0, lat0, cx, cy, r)), [lon0, lat0, cx, cy, r]);
  const runners = flow == null ? [] : [0, 1 / 3, 2 / 3].map((k) => project(arcPoint(a, b, omega, (flow + k) % 1, lift), lon0, lat0, cx, cy, r));
  const pulse = (t * 0.6) % 1;
  const light = vec(cx - r * 0.45, cy - r * 0.55);

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {/* atmosphere */}
      <Circle c={vec(cx, cy)} r={r * 1.32}>
        <RadialGradient c={vec(cx, cy)} r={r * 1.32} colors={["rgba(61,139,255,0.34)", "rgba(61,139,255,0.16)", "rgba(61,139,255,0)"]} positions={[0.7, 0.8, 1]} />
      </Circle>
      {/* the sea, lit from the top left */}
      <Circle c={vec(cx, cy)} r={r}>
        <RadialGradient c={light} r={r * 1.7} colors={["#1d4a92", "#0c2350", "#050d1f", "#02050c"]} positions={[0, 0.35, 0.7, 1]} />
      </Circle>
      <Path path={paths.grid} style="stroke" strokeWidth={0.8} color="rgba(130,180,255,0.13)" />
      <Path path={paths.back} color="rgba(110,160,255,0.28)" />
      <Path path={paths.mid} color="rgba(120,172,255,0.55)" />
      <Path path={paths.front} color="rgba(150,195,255,0.85)" />
      {/* night side: a soft terminator, the cities twinkling where it is dark, a thin atmosphere at the rim */}
      <NightSide cx={cx} cy={cy} r={r} t={t} lights={lights} />
      <Circle c={vec(cx, cy)} r={r - 0.5} style="stroke" strokeWidth={1.4}>
        <LinearGradient start={vec(cx - r, cy - r)} end={vec(cx + r, cy + r)} colors={["rgba(160,205,255,0.75)", "rgba(79,155,255,0.2)", "rgba(79,155,255,0.05)"]} />
      </Circle>
      <Circle c={vec(cx, cy)} r={r + 3} style="stroke" strokeWidth={6} color="rgba(79,155,255,0.35)">
        <BlurMask blur={8} style="normal" />
      </Circle>

      {/* the arc: a wide glow, then the core running blue (you) to red (them) */}
      {draw > 0 ? (
        <Group>
          <Path path={arc.path} style="stroke" strokeWidth={9} strokeCap="round" color="rgba(79,155,255,0.45)">
            <BlurMask blur={7} style="normal" />
          </Path>
          <Path path={arc.path} style="stroke" strokeWidth={2.4} strokeCap="round">
            <LinearGradient start={vec(pa[0], pa[1])} end={vec(pb[0], pb[1])} colors={["#8cc0ff", "#ffffff", "#ff8b92"]} />
          </Path>
          {draw < 1 ? (
            <Circle c={vec(arc.head[0], arc.head[1])} r={4} color="#fff">
              <BlurMask blur={3} style="solid" />
            </Circle>
          ) : null}
        </Group>
      ) : null}
      {runners.map(([x, y], i) => (
        <Group key={i}>
          <Circle c={vec(x, y)} r={7} color="rgba(130,180,255,0.55)">
            <BlurMask blur={6} style="normal" />
          </Circle>
          <Circle c={vec(x, y)} r={2.6} color="#fff" />
        </Group>
      ))}

      {/* the two pins, each with a ring that keeps pulsing out */}
      {pins > 0
        ? [
            [pa, BLUE],
            [pb, RED],
          ].map(([p, colour], i) =>
            p[2] > -0.05 ? (
              <Group key={i} opacity={pins}>
                <Circle c={vec(p[0], p[1])} r={5 + pulse * 16} style="stroke" strokeWidth={1.5} color={colour} opacity={(1 - pulse) * 0.8} />
                <Circle c={vec(p[0], p[1])} r={10} color={colour} opacity={0.45}>
                  <BlurMask blur={8} style="normal" />
                </Circle>
                <Circle c={vec(p[0], p[1])} r={5.5} color={colour} />
                <Circle c={vec(p[0], p[1])} r={2.2} color="#fff" />
              </Group>
            ) : null,
          )
        : null}
    </Canvas>
  );
}

// ── Light rays ────────────────────────────────────────────────────────────────

// Wide spokes from the centre: repeating-conic-gradient(colour 0 on, clear on
// to on+off) masked by a radial fade, as behind .r11blr and .r11drop.
const SPOKES = Skia.RuntimeEffect.Make(`
uniform float2 center;
uniform float period;
uniform float duty;
uniform float r0;
uniform float r1;
uniform float r2;
uniform float4 colour;
half4 main(float2 xy) {
  float2 p = xy - center;
  float ang = atan(p.y, p.x) + 3.14159265;
  float f = fract(ang / period);
  float w = 0.04;
  float ray = smoothstep(0.0, w, f) * (1.0 - smoothstep(duty - w, duty, f));
  float d = length(p);
  float m = d < r1 ? clamp((d - r0) / max(1.0, r1 - r0), 0.0, 1.0) : clamp((r2 - d) / max(1.0, r2 - r1), 0.0, 1.0);
  return half4(colour * ray * m);
}`);

const premul = (c) => {
  const col = Skia.Color(c);
  return [col[0] * col[3], col[1] * col[3], col[2] * col[3], col[3]];
};

/** Spokes of light round the centre of a square: `count` rays, each `duty` of its slot. */
export function SpokesCanvas({ size, colour = "rgba(79,155,255,0.22)", count = 20, duty = 0.33, inner = 0.04, peak = 0.22, outer = 0.5 }) {
  if (!size || !SPOKES) return null;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none" {...STILL}>
      <Fill>
        <Shader source={SPOKES} uniforms={{ center: vec(size / 2, size / 2), period: (Math.PI * 2) / count, duty, r0: size * inner, r1: size * peak, r2: size * outer, colour: premul(colour) }} />
      </Fill>
    </Canvas>
  );
}
