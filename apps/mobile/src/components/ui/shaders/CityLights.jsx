// A planet on its own, turning slowly, with the night side the race globe
// now has: a soft terminator, a thin atmosphere along the rim and the big
// cities twinkling where it is dark. The race lobby's globe draws the same
// night side over its own picture (arena/skia/BattleSkia.jsx, NightSide).
//
//   <CityLights size={260} />
//
// size: px. spin: radians a second. Until Skia is ready it is a dark disc.

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { landDots } from "@/components/arena/globeLand";
import { useSkiaReady } from "../skia";
import { useLiveCanvas } from "./clock";

const shaderParts = () => require("./parts");

// The land is a path rebuilt each frame on the JS side (like the race
// globe), so this one runs on a modest React clock rather than the shared
// value the pure shaders use.
function useJsClock(running) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    let last = 0;
    let acc = t;
    let prev = Date.now();
    const tick = () => {
      const now = Date.now();
      acc += (now - prev) / 1000;
      prev = now;
      if (now - last > 40) {
        last = now;
        setT(acc);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return t;
}

export function CityLights({ size = 240, spin = 0.1, paused = false, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, running } = useLiveCanvas({ paused });
  const t = useJsClock(running && ready);
  let planet = null;
  if (ready) {
    const { PlanetCanvas } = shaderParts();
    planet = <PlanetCanvas size={size} t={t} dots={landDots(2.6)} spin={spin} />;
  } else {
    const r = size * 0.4;
    planet = (
      <View style={{ position: "absolute", left: size / 2 - r, top: size / 2 - r, width: r * 2, height: r * 2, borderRadius: r, overflow: "hidden", boxShadow: "0 0 60px rgba(61,139,255,0.35)" }}>
        <LinearGradient colors={["#1d4a92", "#050d1f"]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }} />
      </View>
    );
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents="none" style={[{ width: size, height: size }, style]}>
      {planet}
    </View>
  );
}
