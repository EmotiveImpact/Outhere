// City League pieces: the ranked rows with a lit bar, the hex map of areas
// coloured by steps this week, and the photo we have for each city.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, G, Polygon, RadialGradient, Stop } from "react-native-svg";
import { C, F, Meter, PressableScale, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { compactNumber } from "@/utils/format";

// The city photos we have. Other places fall back to the generic night city.
const CITY_PHOTOS = { london: PHOTOS.city, manchester: PHOTOS.manchester, birmingham: PHOTOS.birmingham };

/** The photo for a city, by id or name ("london", "London"). Falls back to the night city. */
export function cityPhoto(place, fallback = PHOTOS.navCity) {
  const key = String(place || "").toLowerCase().trim();
  return CITY_PHOTOS[key] || fallback;
}

/** True when we have a photo of this place itself, not the fallback. */
export const hasCityPhoto = (place) => !!CITY_PHOTOS[String(place || "").toLowerCase().trim()];

/** Ranked rows: number, name (with "Your area" under yours), a bar and the total. */
export function RankRows({ rows, mineLabel = "Your area", onPress, limit }) {
  const list = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(1, ...list.map((r) => r.value));
  return (
    <View>
      {list.map((r, i) => {
        const body = (
          <Row gap={S.md} style={styles.row}>
            <Text style={[styles.rank, r.mine && { color: C.accent }]}>{r.rank ?? i + 1}</Text>
            <View style={{ width: 128 }}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              {r.mine ? <Text style={styles.mine}>{mineLabel}</Text> : null}
            </View>
            <Meter value={r.value / max} size={8} flow={i === 0 || !!r.mine} glow={i === 0 || !!r.mine} cap={!!r.mine} style={[{ flex: 1 }, !(i === 0 || r.mine) && { opacity: 0.55 }]} />
            <Text style={styles.value}>{compactNumber(r.value)}</Text>
          </Row>
        );
        return onPress ? (
          <PressableScale key={r.id} onPress={() => onPress(r)} scaleTo={0.98}>
            {body}
          </PressableScale>
        ) : (
          <View key={r.id}>{body}</View>
        );
      })}
    </View>
  );
}

/**
 * The hex map. tiles: [{ id, name, col, row, value, mine }]. Columns are
 * offset every other row. Brighter blue means more steps.
 */
export function HexMap({ tiles, height = 300, selected, onSelect }) {
  const [w, setW] = useState(0);
  const geo = useMemo(() => {
    if (!tiles?.length || !w) return null;
    const cols = Math.max(...tiles.map((t) => t.col)) + 1.5;
    const rows = Math.max(...tiles.map((t) => t.row)) + 1;
    const r = Math.min(w / (cols * Math.sqrt(3)), height / (rows * 1.5 + 0.5)) * 0.98;
    const hw = Math.sqrt(3) * r;
    const offX = (w - cols * hw) / 2 + hw / 2;
    const offY = (height - (rows * 1.5 + 0.5) * r) / 2 + r;
    const max = Math.max(1, ...tiles.map((t) => t.value));
    return tiles.map((t) => {
      const cx = offX + t.col * hw + (t.row % 2 ? hw / 2 : 0);
      const cy = offY + t.row * 1.5 * r;
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 180) * (60 * k - 90);
        return `${(cx + (r - 1.5) * Math.cos(a)).toFixed(1)},${(cy + (r - 1.5) * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return { ...t, cx, cy, r, pts, heat: t.value / max };
    });
  }, [tiles, w, height]);
  const top3 = useMemo(() => [...(tiles || [])].sort((a, b) => b.value - a.value).slice(0, 3).map((t) => t.id), [tiles]);
  const pick = geo?.find((t) => t.id === selected);
  // Glass name labels on the leaders and yours, skipping any that would sit on another.
  const labels = useMemo(() => {
    if (!geo) return [];
    const out = [];
    const want = geo.filter((t) => (top3.includes(t.id) || t.mine) && t.id !== selected).sort((a, b) => Number(!!b.mine) - Number(!!a.mine));
    for (const t of want) {
      if (out.some((o) => Math.abs(o.cx - t.cx) < 96 && Math.abs(o.cy - t.cy) < 24)) continue;
      if (pick && Math.abs(pick.cx - t.cx) < 110 && t.cy > pick.cy && t.cy - pick.cy < 70) continue;
      out.push(t);
    }
    return out;
  }, [geo, top3, selected, pick]);

  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {geo ? (
        <Svg width={w} height={height}>
          <Defs>
            <RadialGradient id="hexLit" cx="50%" cy="30%" r="75%">
              <Stop offset="0" stopColor="#82b4ff" />
              <Stop offset="0.6" stopColor="#3d8bff" />
              <Stop offset="1" stopColor="#2a6af0" />
            </RadialGradient>
          </Defs>
          {geo.map((t) => (
            <G key={t.id} onPress={() => onSelect?.(t.id)}>
              <Polygon
                points={t.pts}
                fill={t.id === selected ? "url(#hexLit)" : `rgba(61,139,255,${(0.1 + t.heat * 0.5).toFixed(2)})`}
                stroke={t.id === selected ? "#ffffff" : t.mine ? C.accentHi : `rgba(130,180,255,${(0.18 + t.heat * 0.3).toFixed(2)})`}
                strokeWidth={t.id === selected ? 2.5 : 1}
              />
            </G>
          ))}
        </Svg>
      ) : null}
      {labels.map((t) => (
        <View key={`l${t.id}`} pointerEvents="none" style={[styles.label, { left: t.cx - 50, top: t.cy - 11 }]}>
          <Text style={styles.labelText} numberOfLines={1}>
            {t.name}
          </Text>
        </View>
      ))}
      {pick ? (
        <View pointerEvents="none" style={[styles.tip, { left: Math.max(4, Math.min(w - 124, pick.cx - 60)), top: Math.min(height - 54, pick.cy + pick.r * 0.8) }]}>
          <Text style={styles.tipName} numberOfLines={1}>
            {pick.name}
          </Text>
          <Text style={styles.tipValue}>{compactNumber(pick.value).toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10 },
  rank: { width: 22, color: C.textDim, fontFamily: F.display, fontSize: 20 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  mine: { color: C.accentHi, fontFamily: F.bodyMedium, fontSize: 11 },
  value: { width: 48, textAlign: "right", color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  // .hexmap .tip: frosted glass, lit along the top
  tip: { position: "absolute", width: 120, alignItems: "center", paddingVertical: 7, borderRadius: 12, backgroundColor: "rgba(16,20,28,0.82)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 28px -10px rgba(0,0,0,0.9)" },
  tipName: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  tipValue: { color: C.accentHi, fontFamily: F.display, fontSize: 22, textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  label: { position: "absolute", width: 100, alignItems: "center" },
  labelText: { maxWidth: 100, overflow: "hidden", color: C.text, fontFamily: F.bodySemi, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: "rgba(16,20,28,0.78)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" },
});
