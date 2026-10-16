// The OUT coin: a thick coin with a reeded, brushed steel edge and raised
// rim, a dark brushed face with the Outhere mark embossed in bright steel
// (the open O, gap at the bottom right, the blue dot lit in the gap), lit by
// a soft blue studio: a white key, a blue rim light from behind and an
// environment painted at runtime (no HDR file) that the metal reflects. It
// turns slowly at rest and flips twice round on a spring when asked. Loaded
// only through components/three.

import React, { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "react-native-reanimated";
import { logoGeometry } from "@/components/ui/Logo";
import { Stage, discDistance, glowMaterial, useDispose } from "./Stage";

const FOV = 28;
const H = 0.09; // half the coin's thickness
const BLUE = "#4f9bff";

// A cheap deterministic noise for the brushing.
const hash = (n) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const noise1 = (x) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

// Textures carry the bump in red and the roughness in green, so one texture
// serves both maps (three reads bump from .x and roughness from .g).
function texture(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// The face: fine concentric brushing.
function faceTexture(n = 256) {
  const d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n - 0.5;
      const v = (y + 0.5) / n - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2;
      const ang = Math.atan2(v, u);
      const fine = noise1(r * 160 + ang * 0.6) * 0.6 + noise1(r * 420 + 7.3) * 0.4;
      const bump = 0.5 + (fine - 0.5) * 0.9;
      const rough = 0.62 + (noise1(r * 90 + 3.1) - 0.5) * 0.5 + (fine - 0.5) * 0.25;
      const k = (y * n + x) * 4;
      d[k] = Math.round(Math.max(0, Math.min(1, bump)) * 255);
      d[k + 1] = Math.round(Math.max(0, Math.min(1, rough)) * 255);
      d[k + 2] = 0;
      d[k + 3] = 255;
    }
  }
  return texture(d, n, n);
}

// The edge: reeding round the band (v between 4/9 and 5/9 of the lathe
// profile), brushed streaks everywhere.
function edgeTexture(w = 512, h = 256) {
  const d = new Uint8Array(w * h * 4);
  const bandLo = 4 / 9 + 0.004;
  const bandHi = 5 / 9 - 0.004;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    const inBand = v > bandLo && v < bandHi;
    const streak = noise1(v * 300) * 0.6 + noise1(v * 900 + 2.2) * 0.4;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      let bump = 0.5 + (streak - 0.5) * 0.35;
      if (inBand) {
        const reed = Math.sin(u * Math.PI * 2 * 128);
        bump = 0.5 + Math.sign(reed) * Math.pow(Math.abs(reed), 0.5) * 0.45;
      }
      const rough = 0.68 + (streak - 0.5) * 0.45;
      const k = (y * w + x) * 4;
      d[k] = Math.round(Math.max(0, Math.min(1, bump)) * 255);
      d[k + 1] = Math.round(Math.max(0, Math.min(1, rough)) * 255);
      d[k + 2] = 0;
      d[k + 3] = 255;
    }
  }
  return texture(d, w, h);
}

// The studio the coin reflects: a dark blue room, a big soft white key high
// on the left, a blue panel behind on the right, a cool strip below.
// Linear light, half float so the lamps can be brighter than white, which
// is what gives metal its bright, soft highlights.
const LIGHTS = [
  // azimuth, elevation (degrees), radius, softness, r, g, b, strength
  [-50, 40, 44, 0.75, 1.0, 1.0, 1.0, 2.6], // the key: a big white softbox high on the left
  [-15, 75, 16, 0.6, 1.0, 1.0, 1.0, 2.0], // a small hot top light
  [130, 20, 50, 0.8, 0.3, 0.58, 1.0, 1.9], // the blue panel behind on the right
  [55, -30, 36, 0.85, 0.3, 0.52, 0.95, 0.8], // a cool strip below
  [-150, -8, 48, 0.9, 0.14, 0.3, 0.65, 0.6], // a soft blue wall behind left
];
function studioEnvironment(w = 256, h = 128) {
  const d = new Uint16Array(w * h * 4);
  const R = Math.PI / 180;
  const half = THREE.DataUtils.toHalfFloat;
  const dirs = LIGHTS.map(([az, el]) => [Math.cos(el * R) * Math.cos(az * R), Math.sin(el * R), Math.cos(el * R) * Math.sin(az * R)]);
  for (let y = 0; y < h; y++) {
    const el = ((y + 0.5) / h - 0.5) * Math.PI;
    const up = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const az = ((x + 0.5) / w - 0.5) * Math.PI * 2;
      const v = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
      // the room: a navy floor, a blue ceiling
      let r = 0.025 + up * up * 0.1;
      let g = 0.04 + up * up * 0.2;
      let b = 0.08 + up * up * 0.42;
      for (let i = 0; i < LIGHTS.length; i++) {
        const [, , rad, soft, lr, lg, lb, s] = LIGHTS[i];
        const dd = dirs[i];
        const cosang = v[0] * dd[0] + v[1] * dd[1] + v[2] * dd[2];
        const ang = Math.acos(Math.max(-1, Math.min(1, cosang))) / R;
        const t = Math.max(0, Math.min(1, 1 - (ang - rad * (1 - soft)) / (rad * soft)));
        const f = t * t * (3 - 2 * t) * s;
        r += lr * f;
        g += lg * f;
        b += lb * f;
      }
      const k = (y * w + x) * 4;
      d[k] = half(r);
      d[k + 1] = half(g);
      d[k + 2] = half(b);
      d[k + 3] = half(1);
    }
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function Studio() {
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => studioEnvironment(), []);
  useEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = 1.0;
    return () => {
      if (scene.environment === env) scene.environment = null;
      env.dispose();
    };
  }, [scene, env]);
  return (
    <>
      <ambientLight intensity={0.12} color="#9fb8ff" />
      <pointLight position={[-2.4, 2.8, 3.2]} intensity={60} color="#dbe7ff" />
      <pointLight position={[2.8, 1.3, -2.0]} intensity={110} color="#3d8bff" />
      <pointLight position={[2.4, -1.6, 2.6]} intensity={16} color={BLUE} />
    </>
  );
}

// The Outhere mark raised off a face, the same maths as the Logo component.
function Mark({ z, mirror, mat, dotMat, glowMat }) {
  const geo = useMemo(() => {
    const g = logoGeometry();
    const s = 0.0148; // the 100 box on the coin face
    const r = g.r * s;
    const tube = (12 * s) / 2;
    const dot = 9 * s;
    const gap = Math.asin(Math.min(0.95, (9 + 5 + 6) / g.r));
    const a = -Math.PI / 4;
    const a1 = a + gap;
    const arc = Math.PI * 2 - gap * 2;
    const a2 = a1 + arc;
    return { r, tube, dot, a, a1, a2, arc };
  }, []);
  return (
    <group position={[0, 0, z]} rotation={[0, mirror ? Math.PI : 0, 0]}>
      <mesh material={mat} rotation={[0, 0, geo.a1]}>
        <torusGeometry args={[geo.r, geo.tube, 14, 84, geo.arc]} />
      </mesh>
      <mesh material={mat} position={[geo.r * Math.cos(geo.a1), geo.r * Math.sin(geo.a1), 0]}>
        <sphereGeometry args={[geo.tube, 18, 12]} />
      </mesh>
      <mesh material={mat} position={[geo.r * Math.cos(geo.a2), geo.r * Math.sin(geo.a2), 0]}>
        <sphereGeometry args={[geo.tube, 18, 12]} />
      </mesh>
      <mesh material={dotMat} position={[geo.r * Math.cos(geo.a), geo.r * Math.sin(geo.a), 0]} scale={[1, 1, 0.5]}>
        <sphereGeometry args={[geo.dot, 24, 16]} />
      </mesh>
      <mesh material={glowMat} position={[geo.r * Math.cos(geo.a), geo.r * Math.sin(geo.a), 0.1]}>
        <planeGeometry args={[0.72, 0.72]} />
      </mesh>
    </group>
  );
}

function Coin({ coinRef, dotMat, glowMat }) {
  const faceTex = useMemo(() => faceTexture(), []);
  const edgeTex = useMemo(() => edgeTexture(), []);
  const edgeMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#b9c3d4", metalness: 1, roughness: 0.4, roughnessMap: edgeTex, bumpMap: edgeTex, bumpScale: 0.014, envMapIntensity: 1.7 }),
    [edgeTex],
  );
  const faceMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#262c38",
        metalness: 0.95,
        roughness: 0.36,
        roughnessMap: faceTex,
        bumpMap: faceTex,
        bumpScale: 0.0028,
        envMapIntensity: 1.3,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
      }),
    [faceTex],
  );
  const markMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#e8edf5", metalness: 1, roughness: 0.22, envMapIntensity: 1.3 }), []);
  const lathe = useMemo(() => {
    const pts = [
      [0.8, H],
      [0.85, H + 0.024],
      [0.945, H + 0.034],
      [0.985, H + 0.02],
      [1, H - 0.012],
      [1, -H + 0.012],
      [0.985, -H - 0.02],
      [0.945, -H - 0.034],
      [0.85, -H - 0.024],
      [0.8, -H],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 160);
  }, []);
  useDispose(faceTex, edgeTex, edgeMat, faceMat, markMat, lathe);
  return (
    <group ref={coinRef}>
      <mesh geometry={lathe} material={edgeMat} rotation={[Math.PI / 2, 0, 0]} />
      <mesh material={faceMat} position={[0, 0, H]}>
        <circleGeometry args={[0.802, 96]} />
      </mesh>
      <mesh material={faceMat} position={[0, 0, -H]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.802, 96]} />
      </mesh>
      <Mark z={H} mat={markMat} dotMat={dotMat} glowMat={glowMat} />
      <Mark z={-H} mirror mat={markMat} dotMat={dotMat} glowMat={glowMat} />
    </group>
  );
}

// The idle turn and the flip spring.
function Driver({ coin, target, idle, reduce, dotMat, glowMat }) {
  const spring = useRef({ x: 0, v: 0 });
  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, Math.max(0.0001, rawDt || 0.016));
    const t = state.clock.elapsedTime;
    const s = spring.current;
    // a spring with a little bounce: 720 degrees, overshoots, settles
    const k = 34;
    const c = 6.6;
    const acc = -k * (s.x - target.current) - c * s.v;
    s.v += acc * dt;
    s.x += s.v * dt;
    const turning = idle && !reduce;
    const ry = turning ? Math.sin(t * 0.45) * 0.46 : 0;
    const rx = 0.24 + (turning ? Math.sin(t * 0.31) * 0.08 : 0);
    if (coin.current) coin.current.rotation.set(rx, ry + s.x, 0);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    dotMat.emissiveIntensity = 0.95 + pulse * 0.4;
    glowMat.uniforms.uAlpha.value = 0.6 + pulse * 0.2;
  });
  return null;
}

export function CoinScene({ size = 84, flip = 0, pressToFlip = true, idle = true, active = true, ref }) {
  const box = Math.round(size * 1.25);
  const reduce = useReducedMotion();
  const coin = useRef();
  const target = useRef(0);
  const distance = useMemo(() => discDistance(size, box, FOV), [size, box]);
  const dotMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b2a7a", emissive: "#2f7dff", emissiveIntensity: 1.1, metalness: 0.1, roughness: 0.4 }), []);
  const glowMat = useMemo(() => glowMaterial(BLUE, 0.7, 0, 2.2), []);
  useDispose(dotMat, glowMat);

  const doFlip = () => {
    target.current += Math.PI * 4;
  };
  useImperativeHandle(ref, () => ({ flip: doFlip }), []);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (flip) doFlip();
  }, [flip]);

  const stage = (
    <Stage name="coin" width={box} height={box} active={active} fov={FOV} distance={distance}>
      <Studio />
      <Driver coin={coin} target={target} idle={idle} reduce={reduce} dotMat={dotMat} glowMat={glowMat} />
      <Coin coinRef={coin} dotMat={dotMat} glowMat={glowMat} />
    </Stage>
  );
  if (pressToFlip) {
    return (
      <Pressable onPress={doFlip} style={{ width: box, height: box }} accessibilityRole="button" accessibilityLabel="The OUT coin. Tap to flip it">
        {stage}
      </Pressable>
    );
  }
  return (
    <View style={{ width: box, height: box }} accessible accessibilityRole="image" accessibilityLabel="The OUT coin">
      {stage}
    </View>
  );
}
