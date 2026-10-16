// The real globe: a night Earth of deep navy sea with the land as a matrix
// of soft dots drawn in the shader from the coastline table, a few hundred
// city lights as one Points object, a thin fresnel atmosphere, a wide soft
// halo, two pins with pulsing rings and a glowing arc between them along
// which three sparks travel. Dragging turns it; with pins it eases back to
// frame them. Loaded only through components/three (never import this from
// a screen).
//
// Axes: x towards 0°E on the equator, y north, z towards 90°W, so the
// camera on +z sees 90°W facing it before the globe is turned.

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { PanResponder, View } from "react-native";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "react-native-reanimated";
import { DPR, IS_WEB, Stage, glowMaterial, pxScale, sphereDistance, useDispose } from "./Stage";
import { cityLights, landTable, toThree } from "./land";

const BLUE = "#4f9bff";
const RED = "#ff5a62";
const FOV = 30;
const SHELL = 1.075; // atmosphere shell radius: a thin glow just off the edge
const LIGHT = new THREE.Vector3(-0.55, 0.62, 0.56).normalize(); // view space, top left front

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ── Shaders ───────────────────────────────────────────────────────────────────

const SURFACE_VERT = `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vV;
void main() {
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const EARTH_FRAG = `
uniform sampler2D uLand;
uniform sampler2D uSoft;
uniform vec2 uLandSize;
uniform float uStep;
uniform vec3 uLight;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vV;
const float DEG = 57.29578;
const float RAD = 0.01745329;

float lineAt(float x, float period, float w) {
  float f = abs(fract(x / period + 0.5) - 0.5) * period;
  return 1.0 - smoothstep(w * 0.5, w, f);
}

void main() {
  vec3 p = normalize(vPos);
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float lat = asin(clamp(p.y, -1.0, 1.0)) * DEG;
  float lng = atan(-p.z, p.x) * DEG;

  float ndl = dot(n, uLight);
  float diff = smoothstep(-0.45, 0.95, ndl);
  float ndv = max(dot(n, v), 0.0);
  float fres = pow(1.0 - ndv, 3.0);

  // the sea, lit from the top left, deep navy on the night side
  vec3 deep = vec3(0.008, 0.02, 0.05);
  vec3 mid = vec3(0.045, 0.13, 0.30);
  vec3 lit = vec3(0.12, 0.30, 0.58);
  vec3 col = mix(deep, mix(mid, lit, smoothstep(0.35, 1.0, diff)), smoothstep(0.0, 0.75, diff));
  vec3 h = normalize(uLight + v);
  col += vec3(0.35, 0.6, 1.0) * pow(max(dot(n, h), 0.0), 48.0) * 0.22;

  // a faint fill under the land
  vec2 eq = vec2(lng / 360.0 + 0.5, lat / 180.0 + 0.5);
  float soft = texture2D(uSoft, eq).r;
  col += vec3(0.10, 0.22, 0.45) * soft * (0.25 + 0.75 * diff) * 0.5;

  // the graticule, barely there
  float grid = max(lineAt(lng, 30.0, 0.4), lineAt(lat, 30.0, 0.4)) * step(abs(lat), 84.0);
  col += vec3(0.5, 0.7, 1.0) * grid * 0.055;

  // the land dots: find the cell under this pixel and draw a soft disc in it
  float dots = 0.0;
  float j = floor((lat + 84.0) / uStep);
  if (j >= 0.0 && j < uLandSize.y) {
    float latj = -84.0 + (j + 0.5) * uStep;
    float nj = max(1.0, floor(360.0 * cos(latj * RAD) / uStep + 0.5));
    float dl = 360.0 / nj;
    float off = mod(j, 2.0) * dl * 0.5;
    float u = (lng + 180.0 - off) / dl;
    float i = floor(u);
    float fx = (u - i - 0.5) * dl * cos(lat * RAD);
    float fy = lat - latj;
    float d = length(vec2(fx, fy));
    float iw = mod(i + nj, nj);
    float land = texture2D(uLand, vec2((iw + 0.5) / uLandSize.x, (j + 0.5) / uLandSize.y)).r;
    float rad = uStep * 0.27;
    float aa = max(fwidth(d), uStep * 0.05);
    dots = land * (1.0 - smoothstep(rad - aa, rad + aa, d));
  }
  vec3 dotCol = vec3(0.55, 0.74, 1.0) * (0.4 + 0.6 * diff) * (0.5 + 0.5 * smoothstep(0.0, 0.5, ndv));
  col = mix(col, dotCol, dots * 0.9);

  // the rim light and the night side vignette
  col += vec3(0.24, 0.55, 1.0) * fres * (0.35 + 0.45 * diff) * 0.9;
  col *= 0.72 + 0.28 * diff;
  gl_FragColor = vec4(col, 1.0);
}`;

const ATMOS_FRAG = `
uniform vec3 uLight;
uniform float uEdge;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float e = clamp(-dot(n, v) / uEdge, 0.0, 1.0);
  float glow = pow(e, 2.0);
  float lit = 0.45 + 0.55 * smoothstep(-0.7, 0.9, dot(n, uLight));
  float a = glow * lit * 0.95;
  gl_FragColor = vec4(vec3(0.34, 0.6, 1.0) * a, a);
}`;

const LIGHTS_VERT = `
attribute float aSize;
attribute float aPhase;
attribute float aWarm;
uniform float uTime;
uniform float uPx;
uniform float uScale;
varying float vA;
varying float vWarm;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * position);
  vec3 v = normalize(-mv.xyz);
  float face = smoothstep(0.02, 0.45, dot(n, v));
  float tw = 0.72 + 0.28 * sin(uTime * (1.1 + aWarm) + aPhase * 6.2832);
  vA = face * tw;
  vWarm = aWarm;
  gl_PointSize = aSize * uPx * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const LIGHTS_FRAG = `
varying float vA;
varying float vWarm;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = exp(-d * d * 9.0);
  float halo = exp(-d * d * 2.2) * 0.32;
  vec3 col = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.86, 0.62), vWarm);
  float a = (core + halo) * vA;
  gl_FragColor = vec4(col * a, a);
}`;

const ARC_VERT = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const ARC_FRAG = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  float u = vUv.x;
  vec3 blue = vec3(0.55, 0.75, 1.0);
  vec3 red = vec3(1.0, 0.55, 0.58);
  vec3 col = mix(mix(blue, vec3(1.0), smoothstep(0.15, 0.5, u)), red, smoothstep(0.5, 0.85, u));
  float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 0.7);
  gl_FragColor = vec4(col * (0.55 + 0.55 * f), 1.0);
}`;

const ARC_GLOW_FRAG = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  float u = vUv.x;
  float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 2.2);
  vec3 col = mix(vec3(0.31, 0.6, 1.0), vec3(1.0, 0.45, 0.5), smoothstep(0.35, 0.75, u));
  float a = f * 0.5;
  gl_FragColor = vec4(col * a, a);
}`;

const SPARK_VERT = `
attribute float aAlpha;
attribute float aSize;
uniform float uPx;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vA = aAlpha;
  gl_PointSize = aSize * uPx;
  gl_Position = projectionMatrix * mv;
}`;

const SPARK_FRAG = `
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = exp(-d * d * 14.0);
  float halo = exp(-d * d * 2.6) * 0.45;
  vec3 col = vec3(1.0) * core + vec3(0.5, 0.72, 1.0) * halo;
  gl_FragColor = vec4(col * vA, (core + halo) * vA);
}`;

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, toneMapped: false };

// ── Pieces ────────────────────────────────────────────────────────────────────

function Earth() {
  const table = useMemo(() => landTable(2), []);
  const { material, land, soft } = useMemo(() => {
    const land = new THREE.DataTexture(table.data, table.W, table.H, THREE.RedFormat, THREE.UnsignedByteType);
    land.needsUpdate = true;
    const soft = new THREE.DataTexture(table.soft.data, table.soft.w, table.soft.h, THREE.RedFormat, THREE.UnsignedByteType);
    soft.magFilter = THREE.LinearFilter;
    soft.minFilter = THREE.LinearFilter;
    soft.wrapS = THREE.RepeatWrapping;
    soft.needsUpdate = true;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uLand: { value: land },
        uSoft: { value: soft },
        uLandSize: { value: new THREE.Vector2(table.W, table.H) },
        uStep: { value: table.step },
        uLight: { value: LIGHT },
      },
      vertexShader: SURFACE_VERT,
      fragmentShader: EARTH_FRAG,
      toneMapped: false,
    });
    return { material, land, soft };
  }, [table]);
  useDispose(material, land, soft);
  return (
    <mesh material={material} renderOrder={1}>
      <sphereGeometry args={[1, 72, 48]} />
    </mesh>
  );
}

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uLight: { value: LIGHT }, uEdge: { value: Math.sqrt(1 - 1 / (SHELL * SHELL)) } },
        vertexShader: SURFACE_VERT,
        fragmentShader: ATMOS_FRAG,
        side: THREE.BackSide,
        ...additive,
      }),
    [],
  );
  useDispose(material);
  return (
    <mesh material={material} renderOrder={2}>
      <sphereGeometry args={[SHELL, 56, 36]} />
    </mesh>
  );
}

// The wide soft light behind the globe. Camera facing, never turns.
function Halo() {
  const material = useMemo(() => glowMaterial(BLUE, 0.22, 0.62, 1.9), []);
  useDispose(material);
  return (
    <mesh material={material} renderOrder={0}>
      <planeGeometry args={[3.3, 3.3]} />
    </mesh>
  );
}

function CityLights({ tl, height }) {
  const data = useMemo(() => cityLights(), []);
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(data.position.length);
    for (let i = 0; i < data.count; i++) {
      pos[i * 3] = data.position[i * 3] * 1.004;
      pos[i * 3 + 1] = data.position[i * 3 + 1] * 1.004;
      pos[i * 3 + 2] = data.position[i * 3 + 2] * 1.004;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(data.size, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(data.phase, 1));
    geometry.setAttribute("aWarm", new THREE.BufferAttribute(data.warm, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPx: { value: DPR }, uScale: { value: pxScale(height, FOV) } },
      vertexShader: LIGHTS_VERT,
      fragmentShader: LIGHTS_FRAG,
      ...additive,
    });
    return { geometry, material };
  }, [data, height]);
  useDispose(geometry, material);
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    material.uniforms.uTime.value = tl.current.t;
    material.uniforms.uPx.value = gl.getPixelRatio();
  });
  return <points geometry={geometry} material={material} renderOrder={3} />;
}

function Pin({ v, colour, index, tl }) {
  const group = useRef();
  const ring = useRef();
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: colour, opacity: 0, side: THREE.DoubleSide, ...additive }), [colour]);
  const haloMat = useMemo(() => glowMaterial(colour, 0.8, 0, 2.2), [colour]);
  useDispose(ringMat, haloMat);
  useLayoutEffect(() => {
    const p = new THREE.Vector3(v[0], v[1], v[2]);
    group.current.position.copy(p);
    group.current.lookAt(p.clone().multiplyScalar(2));
  }, [v]);
  useFrame(() => {
    const t = tl.current;
    const pop = t.pins >= 1 ? 1 : easeOutBack(t.pins);
    group.current.scale.setScalar(Math.max(0.0001, pop));
    const ph = (t.t * 0.55 + index * 0.5) % 1;
    ring.current.scale.setScalar(1 + ph * 2.6);
    ringMat.opacity = (1 - ph) * (1 - ph) * 0.75 * clamp01(t.pins);
  });
  return (
    <group ref={group} renderOrder={4}>
      <mesh position={[0, 0, 0.012]}>
        <sphereGeometry args={[0.021, 20, 14]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <sphereGeometry args={[0.0085, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.018]} material={haloMat}>
        <planeGeometry args={[0.22, 0.22]} />
      </mesh>
      <mesh ref={ring} position={[0, 0, 0.012]} material={ringMat}>
        <ringGeometry args={[0.032, 0.04, 48]} />
      </mesh>
    </group>
  );
}

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
  return new THREE.Vector3(p[0] * h, p[1] * h, p[2] * h);
}

const SEGS = 96;
const RADIAL = 6;
const GLOW_RADIAL = 8;

function Arc({ a, b, tl }) {
  const { curve, core, glow } = useMemo(() => {
    const dotp = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const omega = Math.acos(dotp);
    const lift = 0.05 + 0.24 * (omega / Math.PI);
    const pts = [];
    for (let i = 0; i <= 64; i++) pts.push(arcPoint(a, b, omega, i / 64, lift));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const core = new THREE.TubeGeometry(curve, SEGS, 0.0065, RADIAL, false);
    const glow = new THREE.TubeGeometry(curve, SEGS, 0.032, GLOW_RADIAL, false);
    return { curve, core, glow };
  }, [a, b]);
  const coreMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, toneMapped: false }), []);
  const glowMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_GLOW_FRAG, ...additive }), []);
  // the sparks: one head that leads the drawing, three runners after
  const sparks = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(4), 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array([16, 13, 13, 13]), 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uPx: { value: DPR } }, vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, ...additive });
    return { geometry: g, material: m };
  }, []);
  useDispose(core, glow, coreMat, glowMat, sparks.geometry, sparks.material);
  const gl = useThree((s) => s.gl);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const t = tl.current;
    const k = Math.floor(clamp01(t.draw) * SEGS);
    core.setDrawRange(0, k * RADIAL * 6);
    glow.setDrawRange(0, k * GLOW_RADIAL * 6);
    const pos = sparks.geometry.attributes.position;
    const alpha = sparks.geometry.attributes.aAlpha;
    const drawing = t.draw > 0 && t.draw < 1;
    if (drawing) curve.getPointAt(clamp01(t.draw), tmp);
    pos.setXYZ(0, tmp.x, tmp.y, tmp.z);
    alpha.setX(0, drawing ? 1 : 0);
    for (let i = 0; i < 3; i++) {
      const on = t.flow >= 0;
      if (on) curve.getPointAt((t.flow + i / 3) % 1, tmp);
      pos.setXYZ(i + 1, tmp.x, tmp.y, tmp.z);
      alpha.setX(i + 1, on ? 0.95 : 0);
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    sparks.material.uniforms.uPx.value = gl.getPixelRatio();
  });
  return (
    <group renderOrder={5}>
      <mesh geometry={glow} material={glowMat} />
      <mesh geometry={core} material={coreMat} />
      <points geometry={sparks.geometry} material={sparks.material} frustumCulled={false} />
    </group>
  );
}

// Runs the clock, turns the globe and reports where the pins are.
function Driver({ tl, drag, frame, sway, framing, hasPins, spinning, intro, reduce, distance, width, height, pins, onPins }) {
  const camera = useThree((s) => s.camera);
  const start = useRef(null);
  const report = useRef({ at: 0, last: null, settled: false });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const spin = useRef(0);
  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, Math.max(0.0001, rawDt || 0.016));
    if (start.current == null) start.current = state.clock.elapsedTime - (intro && !reduce ? 0 : 10);
    const t = state.clock.elapsedTime - start.current;
    const T = tl.current;
    T.t = t;
    T.spin = ease(t / 3.4);
    T.pins = hasPins ? clamp01((t - 2.9) / 0.5) : 0;
    T.draw = hasPins ? ease((t - 3.3) / 1.4) : 0;
    T.flow = hasPins && t > 4.7 ? ((t - 4.7) * 0.32) % 1 : -1;

    if (camera.position.z !== distance) {
      camera.position.z = distance;
      camera.updateProjectionMatrix();
    }

    // the drag: inertia after release, then (with pins) a slow ease back
    const d = drag.current;
    if (!d.active) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const decay = Math.exp(-dt * 3.4);
      d.vx *= decay;
      d.vy *= decay;
      if (hasPins && Date.now() - d.released > 1100) {
        const relax = Math.exp(-dt / 2.4);
        d.x *= relax;
        d.y *= relax;
      }
    }
    d.y = Math.max(-1.25, Math.min(1.25, d.y));

    let phi;
    let alpha;
    if (hasPins) {
      const swing = intro && !reduce ? 1 - T.spin : 0;
      phi = framing.phi + swing * 4 + d.x;
      alpha = framing.alpha + swing * 0.25 + d.y;
      sway.current.rotation.y = spinning && !reduce && t > 3.4 ? Math.sin((t - 3.4) * 0.35) * 0.045 : 0;
    } else {
      if (spinning && !reduce && !d.active) spin.current += dt * 0.09;
      phi = framing.phi + spin.current + d.x;
      alpha = framing.alpha + d.y;
      sway.current.rotation.y = 0;
    }
    frame.current.rotation.set(Math.max(-1.4, Math.min(1.4, alpha)), phi, 0);

    if (hasPins && onPins && T.spin >= 1) {
      const r = report.current;
      const now = Date.now();
      if (!r.settled || now - r.at > 90) {
        frame.current.updateMatrixWorld(true);
        const out = pins.map((v) => {
          tmp.set(v[0], v[1], v[2]).applyMatrix4(frame.current.matrixWorld);
          const facing = tmp.z;
          tmp.project(camera);
          return [((tmp.x + 1) / 2) * width, ((1 - tmp.y) / 2) * height, facing];
        });
        const moved = !r.last || out.some((p, i) => Math.abs(p[0] - r.last[i][0]) > 0.6 || Math.abs(p[1] - r.last[i][1]) > 0.6);
        if (!r.settled || moved) {
          r.settled = true;
          r.at = now;
          r.last = out;
          onPins(out);
        }
      }
    }
  });
  return null;
}

// ── The scene ─────────────────────────────────────────────────────────────────

/** Where the camera should look to frame two pins (or the Atlantic with none). */
function framingFor(a, b) {
  if (!a || !b) return { phi: -Math.PI / 2 + 0.35, alpha: 0.4 };
  const m = new THREE.Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
  if (m.lengthSq() < 1e-6) m.set(a[0], a[1] + 0.001, a[2]);
  m.normalize();
  const lng = Math.atan2(-m.z, m.x);
  const lat = Math.asin(Math.max(-1, Math.min(1, m.y)));
  return { phi: -Math.PI / 2 - lng, alpha: Math.max(-0.5, Math.min(0.9, lat - 0.12)) };
}

export function GlobeScene({ size = 300, width, height, from, to, spinning = true, arc = true, intro = true, active = true, onPins }) {
  const W = width || Math.round(size * 1.3);
  const H = height || W;
  const reduce = useReducedMotion();
  const hostRef = useRef(null);
  const frame = useRef();
  const sway = useRef();
  const tl = useRef({ t: 0, spin: 0, pins: 0, draw: 0, flow: -1 });
  const drag = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false, released: 0, px: 0, py: 0 });

  const a = useMemo(() => (from ? toThree(from.lat, from.lng) : null), [from]);
  const b = useMemo(() => (to ? toThree(to.lat, to.lng) : null), [to]);
  const hasPins = !!(a && b);
  const framing = useMemo(() => framingFor(a, b), [a, b]);
  const pins = useMemo(() => (hasPins ? [a, b] : []), [a, b, hasPins]);
  const distance = useMemo(() => sphereDistance(size, H, FOV), [size, H]);

  // Drag to turn: one radius of travel is one radian.
  const pan = useMemo(() => {
    const k = () => 1 / (size * 0.5);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const d = drag.current;
        d.active = true;
        d.vx = 0;
        d.vy = 0;
        d.px = 0;
        d.py = 0;
      },
      onPanResponderMove: (_, g) => {
        const d = drag.current;
        d.x += (g.dx - d.px) * k();
        d.y += (g.dy - d.py) * k();
        d.px = g.dx;
        d.py = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        const d = drag.current;
        d.active = false;
        d.released = Date.now();
        d.x = wrapPi(d.x);
        d.vx = Math.max(-6, Math.min(6, g.vx * 1000 * k()));
        d.vy = Math.max(-6, Math.min(6, g.vy * 1000 * k()));
      },
      onPanResponderTerminate: () => {
        const d = drag.current;
        d.active = false;
        d.released = Date.now();
      },
    });
  }, [size]);

  useEffect(() => {
    if (IS_WEB && hostRef.current && hostRef.current.style) hostRef.current.style.touchAction = "none";
  }, []);

  return (
    <View ref={hostRef} style={{ width: W, height: H, cursor: "grab" }} {...pan.panHandlers} accessible accessibilityRole="image" accessibilityLabel="A globe you can turn">
      <Stage name="globe" width={W} height={H} active={active} fov={FOV} distance={distance}>
        <Driver tl={tl} drag={drag} frame={frame} sway={sway} framing={framing} hasPins={hasPins} spinning={spinning} intro={intro} reduce={reduce} distance={distance} width={W} height={H} pins={pins} onPins={onPins} />
        <Halo />
        <group ref={frame}>
          <group ref={sway}>
            <Earth />
            <Atmosphere />
            <CityLights tl={tl} height={H} />
            {hasPins ? (
              <>
                <Pin v={a} colour={BLUE} index={0} tl={tl} />
                <Pin v={b} colour={RED} index={1} tl={tl} />
                {arc ? <Arc a={a} b={b} tl={tl} /> : null}
              </>
            ) : null}
          </group>
        </group>
      </Stage>
    </View>
  );
}
