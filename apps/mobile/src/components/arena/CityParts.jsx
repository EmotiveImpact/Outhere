// City League pieces: the ranked rows with a bar, and the hex map of areas
// coloured by steps this week.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Polygon, Text as SvgText } from "react-native-svg";
import { C, F, PressableScale, Row, S } from "@/components/ui";
import { compactNumber } from "@/utils/format";

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
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(r.value / max) * 100}%`, backgroundColor: i === 0 || r.mine ? C.accent : "#2f5ea8" }]} />
            </View>
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

  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {geo ? (
        <Svg width={w} height={height}>
          {geo.map((t) => (
            <G key={t.id} onPress={() => onSelect?.(t.id)}>
              <Polygon
                points={t.pts}
                fill={`rgba(61,139,255,${(0.12 + t.heat * 0.6).toFixed(2)})`}
                stroke={t.id === selected ? "#ffffff" : t.mine ? C.accentHi : "rgba(130,180,255,0.35)"}
                strokeWidth={t.id === selected ? 2.5 : 1}
              />
            </G>
          ))}
          {geo
            .filter((t) => (top3.includes(t.id) || t.mine) && t.id !== selected)
            .map((t) => (
              <SvgText key={`l${t.id}`} x={t.cx} y={t.cy + 4} fontSize={10} fontWeight="600" fill="#ffffff" textAnchor="middle">
                {t.name.length > 11 ? `${t.name.slice(0, 10)}.` : t.name}
              </SvgText>
            ))}
        </Svg>
      ) : null}
      {pick ? (
        <View pointerEvents="none" style={[styles.tip, { left: Math.max(4, Math.min(w - 124, pick.cx - 60)), top: pick.cy + pick.r * 0.8 }]}>
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
  rank: { width: 18, color: C.textDim, fontFamily: F.display, fontSize: 18 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  mine: { color: C.accent, fontFamily: F.bodyMedium, fontSize: 11 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  value: { width: 48, textAlign: "right", color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  tip: { position: "absolute", width: 120, alignItems: "center", paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(12,15,20,0.92)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.2)" },
  tipName: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  tipValue: { color: C.accentHi, fontFamily: F.display, fontSize: 20 },
});
