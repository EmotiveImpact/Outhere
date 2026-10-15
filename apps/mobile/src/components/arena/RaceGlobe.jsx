// The race lobby globe: a dotted Earth that swings round, settles on the two
// runners, drops a pin on each and draws a glowing arc between them with
// light running along it. Drawn with Skia (arena/skia/BattleSkia.jsx), which
// is only required once it has loaded.

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "react-native-reanimated";
import { C, F, useLayoutSize, useSkiaReady } from "@/components/ui";
import { UK_CITIES } from "@/data/places";
import { WORLD_CITIES, toVec } from "./globeLand";
import { PortraitMini } from "./BattleKit";

const battleSkia = () => require("./skia/BattleSkia");

const LONDON = [51.5072, -0.1276, "Europe/London"];

/** Where a city is: [lat, lng, time zone]. Unknown places fall back to London. */
export function cityPoint(name) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return LONDON;
  if (WORLD_CITIES[key]) return WORLD_CITIES[key];
  const uk = UK_CITIES.find((c) => c.name.toLowerCase() === key || c.id === key);
  if (uk) return [uk.lat, uk.lng, "Europe/London"];
  return LONDON;
}

const R_EARTH = 6371;
/** Kilometres between two [lat, lng] points. */
export function kmApart(p, q) {
  const r = Math.PI / 180;
  const dLat = (q[0] - p[0]) * r;
  const dLng = (q[1] - p[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * r) * Math.cos(q[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Local time somewhere, as 10:12am. */
export function localTime(tz, at = Date.now()) {
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(at).replace(/\s/g, "").toLowerCase();
  } catch {
    return "";
  }
}

// The clock the globe runs on: seconds since it appeared, ticking at about
// 30 frames a second. Reduced motion skips straight to the settled picture.
function useGlobeClock(run) {
  const reduce = useReducedMotion();
  const [t, setT] = useState(reduce ? 6 : 0);
  useEffect(() => {
    if (!run || reduce) return undefined;
    let raf = 0;
    let last = 0;
    const start = Date.now();
    const tick = () => {
      const now = Date.now();
      if (now - last > 30) {
        last = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, reduce]);
  return t;
}

/**
 * me and them: { name, city, avatar }. height: the globe's box. The two
 * portrait cards sit beside the settled pins with the city and local time.
 */
export function RaceGlobe({ me, them, height = 380, style }) {
  const ready = useSkiaReady();
  const [size, onLayout] = useLayoutSize();
  const t = useGlobeClock(ready && !!size);
  const pm = cityPoint(me?.city);
  const pt = cityPoint(them?.city);
  const same = kmApart(pm, pt) < 60;
  // Two people in one city still get an arc: pull the pins a little apart.
  const a = useMemo(() => toVec(pm[0], pm[1] - (same ? 2.2 : 0)), [pm, same]);
  const b = useMemo(() => toVec(pt[0], pt[1] + (same ? 2.2 : 0)), [pt, same]);

  const width = size?.width || 0;
  const r = Math.min(width * 0.4, height * 0.42);
  const cx = width / 2;
  const cy = height * 0.5;

  // Where the pins settle, for the cards.
  let pins = null;
  if (ready && width) {
    const { project, globeCamera } = battleSkia();
    const cam = globeCamera(a, b);
    pins = [project(a, cam.lon, cam.lat, cx, cy, r), project(b, cam.lon, cam.lat, cx, cy, r)];
  }
  const show = t > 3.2;
  const cards = pins ? placeCards(pins, width, height) : null;

  let globe = null;
  if (ready && width) {
    const { GlobeCanvas } = battleSkia();
    globe = <GlobeCanvas width={width} height={height} a={a} b={b} t={t} cx={cx} cy={cy} r={r} />;
  } else if (width) {
    globe = (
      <View style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r, overflow: "hidden", boxShadow: "0 0 60px rgba(61,139,255,0.35)" }}>
        <LinearGradient colors={["#1d4a92", "#050d1f"]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View style={[{ height }, style]} onLayout={onLayout} pointerEvents="box-none">
      {globe}
      {cards && show ? (
        <>
          <PinCard at={cards[0]} side="left" person={me} tz={pm[2]} label="You" />
          <PinCard at={cards[1]} side="right" person={them} tz={pt[2]} label={them?.name} />
        </>
      ) : null}
    </View>
  );
}

const CARD_W = 74;
const CARD_H = 92;

// Each card sits beside its pin, pushed outwards so the arc stays clear.
function placeCards([pa, pb], width, height) {
  const left = pa[0] <= pb[0];
  const place = (p, outward) => {
    const x = outward < 0 ? p[0] - CARD_W - 26 : p[0] + 26;
    const y = p[1] - CARD_H * 0.4;
    return { x: Math.max(8, Math.min(width - CARD_W - 8, x)), y: Math.max(8, Math.min(height - CARD_H - 40, y)) };
  };
  return [place(pa, left ? -1 : 1), place(pb, left ? 1 : -1)];
}

function PinCard({ at, side, person, tz, label }) {
  const blue = side === "left";
  return (
    <View style={[styles.pin, { left: at.x, top: at.y }]}>
      <PortraitMini source={person?.avatar} side={side} name={person?.name} width={CARD_W} height={CARD_H} />
      <Text style={styles.pinName} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.pinMeta, { color: blue ? "#9fc4ff" : "#ffb3b7" }]} numberOfLines={1}>
        {person?.city || "London"} · {localTime(tz)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { position: "absolute", width: CARD_W + 60, marginLeft: -30, alignItems: "center" },
  pinName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: 6 },
  pinMeta: { fontFamily: F.body, fontSize: 11, marginTop: 1, textAlign: "center" },
});
