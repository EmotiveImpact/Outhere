// The gate every 3D scene renders through. Shows `fallback` (the Skia or
// image version) until three.js has loaded, or for good when WebGL is not
// there. Tells the scene to stop its render loop when the app is in the
// background, when the screen it sits on has lost focus, when it has
// scrolled off screen (web) or when the parent says `paused`.

import React, { useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { NavigationContext } from "expo-router/react-navigation";
import { threeScenes, useThreeReady } from "./loader";

function useActive(paused, hostRef) {
  const nav = useContext(NavigationContext);
  const [appActive, setAppActive] = useState(() => AppState.currentState !== "background");
  const [focused, setFocused] = useState(() => (nav ? nav.isFocused() : true));
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s !== "background"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!nav) return undefined;
    const a = nav.addListener("focus", () => setFocused(true));
    const b = nav.addListener("blur", () => setFocused(false));
    return () => {
      a();
      b();
    };
  }, [nav]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined") return undefined;
    const node = hostRef.current;
    if (!node || typeof node.getBoundingClientRect !== "function") return undefined;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.01 });
    io.observe(node);
    return () => io.disconnect();
  }, [hostRef]);

  return !paused && appActive && focused && onScreen;
}

/**
 * scene: "Globe" (a named export of ./scenes). sceneProps go to
 * the scene with `active` added. fallback shows until the scene can draw.
 */
export function ThreeView({ scene, sceneProps, fallback = null, paused = false, style, ...rest }) {
  const ready = useThreeReady();
  const hostRef = useRef(null);
  const active = useActive(paused, hostRef);
  const Scene = ready ? threeScenes()[scene] : null;
  return (
    <View ref={hostRef} style={style} {...rest}>
      {Scene ? <Scene {...sceneProps} active={active} /> : fallback}
    </View>
  );
}
