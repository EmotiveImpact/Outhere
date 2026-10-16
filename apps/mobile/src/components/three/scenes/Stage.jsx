// The canvas every scene draws on: a fiber Canvas with the settings all
// Outhere scenes share. Transparent, antialiased, device pixel ratio capped
// at 2 on the web (expo-gl always draws at the phone's own ratio), ACES tone
// mapping, and a frame loop that stops when `active` is false. It reports
// what a frame costs to the loader so the lush demo can show it.
//
// On the phone fiber's Canvas lays a touch catcher over the GL view that
// claims every gesture, which would stop the page scrolling. We turn that
// off (pointerEvents none) and let the scene's own host view take touches.

import React, { useEffect, useMemo, useRef } from "react";
import { PixelRatio, Platform } from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clearFrameCost, reportFrameCost } from "../loader";

export const BACKEND = Platform.OS === "web" ? "WebGL" : "expo-gl";
export const DPR = Math.min(2, PixelRatio.get());
export const IS_WEB = Platform.OS === "web";

// Which GPU (or software renderer) is drawing, so a figure can say where it
// came from. Headless browsers and CI machines often draw in software
// (SwiftShader, llvmpipe), which says nothing about a phone.
function rendererName(gl) {
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    const name = String((ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)) || "");
    return { renderer: name, software: /swiftshader|llvmpipe|softpipe|software|mesa offscreen|basic render driver/i.test(name) };
  } catch {
    return { renderer: "", software: false };
  }
}

function FrameCost({ name }) {
  const gl = useThree((s) => s.gl);
  const who = useMemo(() => rendererName(gl), [gl]);
  const acc = useRef({ last: 0, ema: 0, n: 0, work: 0 });
  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    if (a.last) {
      const dt = now - a.last;
      if (dt < 500) a.ema = a.ema ? a.ema * 0.9 + dt * 0.1 : dt;
    }
    a.last = now;
    if (++a.n % 15 === 0) {
      const r = gl.info.render;
      const webgl2 = gl.capabilities && gl.capabilities.isWebGL2;
      reportFrameCost(name, {
        ms: a.ema,
        fps: a.ema ? 1000 / a.ema : 0,
        triangles: r.triangles,
        calls: r.calls,
        backend: IS_WEB ? (webgl2 ? "WebGL 2" : "WebGL 1") : "expo-gl",
        dpr: gl.getPixelRatio(),
        renderer: who.renderer,
        software: who.software,
      });
    }
  });
  useEffect(() => () => clearFrameCost(name), [name]);
  return null;
}

/**
 * width, height: the box in px. distance: camera distance for a 1 unit
 * subject (see cameraDistance). active: run the loop. name: for frame cost.
 */
export function Stage({ name, width, height, active = true, fov = 30, distance = 6, children, onCreated }) {
  const glProps = useMemo(() => ({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", stencil: false, depth: true }), []);
  const style = useMemo(() => (IS_WEB ? { width, height, pointerEvents: "none" } : { width, height }), [width, height]);
  const created = (state) => {
    state.gl.setClearColor(0x000000, 0);
    state.gl.toneMapping = THREE.ACESFilmicToneMapping;
    state.gl.outputColorSpace = THREE.SRGBColorSpace;
    if (onCreated) onCreated(state);
  };
  return (
    <Canvas
      style={style}
      dpr={DPR}
      gl={glProps}
      frameloop={active ? "always" : "never"}
      camera={{ fov, near: 0.1, far: 60, position: [0, 0, distance] }}
      pointerEvents={IS_WEB ? undefined : "none"}
      onCreated={created}
    >
      <FrameCost name={name} />
      {children}
    </Canvas>
  );
}

/**
 * How far the camera sits so a sphere of radius 1 shows `px` pixels across
 * in a box `height` px tall (perspective silhouette).
 */
export function sphereDistance(px, height, fov) {
  const half = Math.tan((fov * Math.PI) / 360);
  const theta = Math.atan((px / height) * half);
  return 1 / Math.sin(theta);
}

/** The camera distance that shows a flat disc of radius 1 at `px` pixels across. */
export function discDistance(px, height, fov) {
  const half = Math.tan((fov * Math.PI) / 360);
  return height / (px * half);
}

/** Pixels per world unit at distance 1 for a box `height` px tall (for point sizes). */
export const pxScale = (height, fov) => height / 2 / Math.tan((fov * Math.PI) / 360);

/** A camera facing additive glow: soft radial light on a quad. */
export const GLOW_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const GLOW_FRAG = `
uniform vec3 uColour;
uniform float uAlpha;
uniform float uInner;
uniform float uPower;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - (r - uInner) / (1.0 - uInner), 0.0, 1.0), uPower) * uAlpha;
  gl_FragColor = vec4(uColour * a, a);
}`;

/** Material for GLOW_FRAG: additive, no depth write. */
export function glowMaterial(colour, alpha = 1, inner = 0, power = 2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColour: { value: new THREE.Color(colour) },
      uAlpha: { value: alpha },
      uInner: { value: inner },
      uPower: { value: power },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    toneMapped: false,
  });
}

/** Disposes whatever three.js things are handed over, on unmount. */
export function useDispose(...things) {
  useEffect(
    () => () => {
      for (const t of things) if (t && typeof t.dispose === "function") t.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    things,
  );
}
