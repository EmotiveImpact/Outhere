// 3D readiness. three.js and @react-three/fiber are heavy, so nothing in the
// app imports them at the top of a screen: the scenes live in ./scenes and
// are pulled in with a dynamic import the first time a screen asks for 3D
// (useThreeReady or a ThreeView). On the web that is a separate chunk; on
// the phone the module body runs only when first required. Screens that do
// not use 3D pay nothing.
//
// On the web 3D needs WebGL (2 by preference). On iOS and Android it runs on
// expo-gl, which is in Expo Go and every build.

import { useEffect, useState } from "react";
import { Platform } from "react-native";

let webgl = null;

/** Whether this device can draw 3D at all. Checked once. */
export function webglAvailable() {
  if (webgl != null) return webgl;
  if (Platform.OS !== "web") {
    webgl = true;
    return webgl;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    webgl = !!gl;
    if (gl) {
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
  } catch {
    webgl = false;
  }
  return webgl;
}

let scenes = null;
let loading = null;
let failed = false;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

/** Starts loading three.js and the scenes. Resolves to the scenes module, or null. */
export function loadThree() {
  if (scenes) return Promise.resolve(scenes);
  if (!webglAvailable() || failed) return Promise.resolve(null);
  if (!loading) {
    loading = import("./scenes")
      .then((m) => {
        scenes = m;
        notify();
        return m;
      })
      .catch((error) => {
        failed = true;
        console.warn("3D could not load, screens keep their plain version.", error);
        notify();
        return null;
      });
  }
  return loading;
}

/** The loaded scenes module (Globe, Coin). Only after useThreeReady() is true. */
export const threeScenes = () => scenes;
export const threeReady = () => !!scenes;
export const threeFailed = () => failed || webglAvailable() === false;

/** True once 3D can draw: WebGL (or expo-gl) is there and three.js has loaded. */
export function useThreeReady() {
  const [ready, setReady] = useState(threeReady);
  useEffect(() => {
    if (ready || !webglAvailable()) return undefined;
    let on = true;
    const listen = () => on && setReady(threeReady());
    listeners.add(listen);
    loadThree();
    return () => {
      on = false;
      listeners.delete(listen);
    };
  }, [ready]);
  return ready;
}

// ── Frame cost ────────────────────────────────────────────────────────────────
// Each live scene reports what a frame costs it; the lush demo shows it.

const costs = {};
const costListeners = new Set();
let lastNotify = 0;

/** Called by a scene's Stage every few frames. */
export function reportFrameCost(name, patch) {
  costs[name] = { ...(costs[name] || {}), ...patch, at: Date.now() };
  const now = Date.now();
  if (now - lastNotify > 400) {
    lastNotify = now;
    const snapshot = { ...costs };
    costListeners.forEach((l) => l(snapshot));
  }
}

/** Removes a scene's row once it has gone. */
export function clearFrameCost(name) {
  delete costs[name];
  costListeners.forEach((l) => l({ ...costs }));
}

/** { [scene]: { ms, fps, triangles, calls, backend, dpr } } for the live scenes. */
export function useFrameCost() {
  const [snapshot, setSnapshot] = useState(() => ({ ...costs }));
  useEffect(() => {
    costListeners.add(setSnapshot);
    return () => costListeners.delete(setSnapshot);
  }, []);
  return snapshot;
}
