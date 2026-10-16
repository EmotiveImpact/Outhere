// Foil for badges and emotes: a cool iridescence (cyan, blue, violet) that
// rides only the highlights of an object shot on black and slides with the
// phone's tilt (a slow loop where there is no accelerometer), a soft glint
// that crosses it every few seconds, and a blue bloom behind the object that
// spills past its edges. Takes BlendImage's props, so it drops in for one.
//
//   <Foil source={badgeArt(id)} size={72} mask="tight" />
//   <Foil source={emote.art} size={200} mask="burst" strength={0.8} />
//
// strength: how strong the foil (0 turns it off and leaves a BlendImage).
// Locked or grey objects get no foil. Until Skia is ready it is a BlendImage.

import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { BlendImage } from "../BlendImage";
import { MASKS } from "../glows";
import { useLayoutSize } from "../layout";
import { useSkiaReady } from "../skia";
import { useLiveCanvas } from "./clock";

const shaderParts = () => require("./parts");

// One accelerometer subscription shared by every foil on screen, smoothed.
const sensor = { subs: new Set(), sub: null, value: [0, 0], tried: false, available: false };

function startSensor() {
  if (sensor.sub || sensor.tried) return;
  sensor.tried = true;
  if (Platform.OS === "web") return;
  let Accelerometer = null;
  try {
    Accelerometer = require("expo-sensors").Accelerometer;
  } catch {
    return;
  }
  if (!Accelerometer) return;
  Accelerometer.isAvailableAsync()
    .then((ok) => {
      if (!ok || !sensor.subs.size) return;
      sensor.available = true;
      Accelerometer.setUpdateInterval(66);
      sensor.sub = Accelerometer.addListener(({ x, y }) => {
        // low pass, so the bands glide rather than jitter
        const v = sensor.value;
        v[0] += (Math.max(-1, Math.min(1, x)) - v[0]) * 0.18;
        v[1] += (Math.max(-1, Math.min(1, y)) - v[1]) * 0.18;
        sensor.subs.forEach((fn) => fn(v[0], v[1]));
      });
    })
    .catch(() => {});
}

function stopSensorIfIdle() {
  if (sensor.subs.size || !sensor.sub) return;
  sensor.sub.remove();
  sensor.sub = null;
  sensor.tried = false;
}

/** The phone's tilt as a shared value [x, y] in g, zero where there is no sensor. */
function useTilt(active) {
  const tilt = useSharedValue([0, 0]);
  useEffect(() => {
    if (!active) return undefined;
    const fn = (x, y) => {
      tilt.value = [x, y];
    };
    sensor.subs.add(fn);
    startSensor();
    return () => {
      sensor.subs.delete(fn);
      stopSensorIfIdle();
    };
  }, [active, tilt]);
  return tilt;
}

export function Foil({ source, size, width, height, strength = 1, mask = "soft", fit = "cover", zoom = 1, rotate = 0, focus, grey = 0, dim = 1, paused = false, style }) {
  const ready = useSkiaReady();
  const fixed = width || size ? { width: width || size, height: height || size } : null;
  const [measured, onLayout] = useLayoutSize();
  const box = fixed || measured;
  const off = strength <= 0 || grey >= 1;
  const { ref, onLayout: onLive, clock, running } = useLiveCanvas({ paused: paused || off });
  const tilt = useTilt(running);
  const stops = Array.isArray(mask) ? mask : MASKS[mask] ?? null;

  if (off || !ready) {
    return <BlendImage source={source} size={size} width={width} height={height} mask={mask} fit={fit} zoom={zoom} rotate={rotate} focus={focus} grey={grey} dim={dim} style={style} />;
  }
  let picture = null;
  if (box) {
    const { FoilCanvas } = shaderParts();
    const bleed = Math.round(Math.max(12, Math.min(box.width, box.height) * 0.22));
    picture = (
      <View style={{ position: "absolute", left: -bleed, top: -bleed }}>
        <FoilCanvas source={source} width={box.width} height={box.height} bleed={bleed} clock={clock} tilt={tilt} strength={strength} mask={stops} fit={fit} zoom={zoom} rotate={rotate} focus={focus} grey={grey} dim={dim} />
      </View>
    );
  }
  return (
    <View
      ref={ref}
      pointerEvents="none"
      onLayout={(e) => {
        onLive(e);
        if (!fixed) onLayout(e);
      }}
      style={[fixed, styles.centre, style]}
    >
      {picture}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center", justifyContent: "center" },
});
