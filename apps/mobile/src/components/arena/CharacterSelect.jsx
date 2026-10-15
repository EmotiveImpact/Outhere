// Character select, the fighting game way: you as 1P in blue on the left, your
// pick as 2P in red on the right, stat bars from real numbers, your record
// together, and a roster grid of the people you battle most. A mystery tile
// picks someone at random. The three dots make the roster jiggle so you can
// cross people off; they are never told.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { MoreHorizontal, Search, X } from "lucide-react-native";
import { Button, C, F, PressableScale, R, Row, S, Sheet, imageSource } from "@/components/ui";
import { ME, RIVAL } from "./shared";
import { formatNumber } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";

const COLS = 4;

export function CharacterSelect({ roster, picked, onPick, onRandom, onSearch, onHide, onShow, randomBusy = false }) {
  const { width } = useWindowDimensions();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(null);
  const tile = Math.floor((Math.min(width, 520) - S.gutter * 2 - S.sm * (COLS - 1)) / COLS);
  const me = roster?.me;
  const them = roster?.roster.find((r) => r.player.id === picked) || null;

  return (
    <View>
      <Stage me={me} them={them} />

      <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
        <HeadToHead them={them} />
        <PressableScale onPress={() => setEditing((e) => !e)} accessibilityLabel={editing ? "Done editing" : "Edit your regulars"} style={[styles.dots, editing && styles.dotsOn]}>
          {editing ? <Text style={styles.done}>Done</Text> : <MoreHorizontal size={18} color={C.text} />}
        </PressableScale>
      </Row>

      <View style={styles.grid}>
        <MeTile size={tile} player={me?.player} />
        {(roster?.roster || []).map((r) => (
          <RosterTile
            key={r.player.id}
            size={tile}
            entry={r}
            on={r.player.id === picked}
            editing={editing}
            onPress={() => (editing ? setRemoving(r.player) : onPick(r.player.id))}
          />
        ))}
        {!editing ? (
          <>
            <PressableScale onPress={onRandom} disabled={randomBusy} accessibilityLabel="Random rival" style={[styles.tile, styles.mystery, { width: tile, height: tile * 1.18 }]}>
              <Image source={PHOTOS.clubrun} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={["rgba(7,9,12,0.35)", "rgba(7,9,12,0.85)"]} style={StyleSheet.absoluteFill} />
              <Text style={styles.qm}>?</Text>
              <Text style={styles.tileName}>Random</Text>
            </PressableScale>
            <PressableScale onPress={onSearch} accessibilityLabel="Find someone else" style={[styles.tile, styles.search, { width: tile, height: tile * 1.18 }]}>
              <Search size={22} color={C.textSoft} />
              <Text style={[styles.tileName, { position: "relative", marginTop: 8, color: C.textSoft }]}>Find</Text>
            </PressableScale>
          </>
        ) : null}
      </View>

      {editing && roster?.hidden?.length ? (
        <View style={{ marginTop: S.lg }}>
          <Text style={styles.hiddenTitle}>Off your list</Text>
          {roster.hidden.map((p) => (
            <Row key={p.id} style={styles.hiddenRow}>
              <Image source={imageSource(p.avatar)} style={styles.hiddenFace} contentFit="cover" />
              <Text style={styles.hiddenName}>{p.name}</Text>
              <Button title="Put back" size="sm" variant="secondary" onPress={() => onShow(p.id)} />
            </Row>
          ))}
        </View>
      ) : null}

      <Sheet visible={!!removing} onClose={() => setRemoving(null)}>
        {removing ? (
          <View style={{ gap: S.md }}>
            <Text style={styles.sheetTitle}>Take {removing.name} off your regulars?</Text>
            <Text style={styles.sheetBody}>{removing.name} isn't told. Your record together is kept, and you can put them back any time.</Text>
            <Row style={{ marginTop: S.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="secondary" full onPress={() => setRemoving(null)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button
                  title="Take off"
                  variant="danger"
                  full
                  onPress={() => {
                    onHide(removing.id);
                    setRemoving(null);
                  }}
                />
              </View>
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function Stage({ me, them }) {
  return (
    <View style={styles.stage}>
      <Row gap={0} style={{ height: 230 }}>
        <Portrait player={me?.player} side="a" />
        <Portrait player={them?.player} side="b" />
      </Row>
      <View style={styles.vsWrap} pointerEvents="none">
        <Text style={styles.vs}>VS</Text>
      </View>
      <Row gap={S.md} style={{ alignItems: "flex-start", paddingHorizontal: S.md, paddingBottom: S.md, marginTop: -64 }}>
        <Plate tag="1P" colour={ME} player={me?.player} bars={me?.bars} />
        <Plate tag="2P" colour={RIVAL} player={them?.player} bars={them?.bars} right />
      </Row>
    </View>
  );
}

function Portrait({ player, side }) {
  const colour = side === "a" ? ME : RIVAL;
  return (
    <View style={[styles.portrait, side === "a" ? { borderRightWidth: 1 } : { borderLeftWidth: 1 }]}>
      {player?.avatar ? (
        <Image source={imageSource(player.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "#0b0e13" }]}>
          <Text style={[styles.qm, { position: "relative", fontSize: 70, color: player ? `${colour}aa` : "rgba(255,77,85,0.5)" }]}>{player ? (player.name || "You").trim()[0].toUpperCase() : "?"}</Text>
        </View>
      )}
      <LinearGradient colors={[`${colour}00`, `${colour}22`, "rgba(7,9,12,0.96)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.edge, side === "a" ? { left: 0 } : { right: 0 }, { backgroundColor: colour }]} />
    </View>
  );
}

function Plate({ tag, colour, player, bars, right = false }) {
  return (
    <View style={{ flex: 1, alignItems: right ? "flex-end" : "flex-start" }}>
      <Text style={[styles.tag, { backgroundColor: colour }]}>{tag}</Text>
      <Text style={styles.plateName} numberOfLines={1}>
        {player ? (player.isMe ? player.name || "You" : player.name) : "Pick a rival"}
      </Text>
      <Text style={styles.plateSub} numberOfLines={1}>
        {player ? [player.level ? `Lv ${player.level}` : null, player.tier ? player.tier[0].toUpperCase() + player.tier.slice(1) : null, player.area].filter(Boolean).join(" · ") : "From your regulars"}
      </Text>
      <View style={{ marginTop: S.sm, gap: 5, alignSelf: "stretch" }}>
        {(bars || PLACEHOLDER_BARS).map((b) => (
          <Row key={b.key} gap={6} style={right ? { flexDirection: "row-reverse" } : null}>
            <Text style={[styles.barLabel, right && { textAlign: "right" }]}>{b.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round((bars ? b.value : 0) * 100)}%`, backgroundColor: colour }, right && { alignSelf: "flex-end" }]} />
            </View>
          </Row>
        ))}
      </View>
    </View>
  );
}

const PLACEHOLDER_BARS = [
  { key: "speed", label: "Speed" },
  { key: "stamina", label: "Stamina" },
  { key: "streak", label: "Streak" },
  { key: "peak", label: "Peak" },
];

function HeadToHead({ them }) {
  if (!them) return <Text style={styles.h2hLabel}>Tap someone to put them in 2P</Text>;
  const r = them.record;
  return (
    <Row gap={10}>
      <Text style={styles.h2hLabel}>Head to head</Text>
      <Text style={[styles.h2hScore, { color: ME }]}>{r.wins}</Text>
      <View style={styles.h2hBar} />
      <Text style={[styles.h2hScore, { color: RIVAL }]}>{r.losses}</Text>
      <Text style={styles.h2hLabel}>{r.played ? `Best day ${formatNumber(them.bestDay)}` : "First meeting"}</Text>
    </Row>
  );
}

function MeTile({ size, player }) {
  return (
    <View style={[styles.tile, { width: size, height: size * 1.18, borderColor: ME }]}>
      {player?.avatar ? (
        <Image source={imageSource(player.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.meFallback]}>
          <Text style={styles.meInitial}>{(player?.name || "You").trim()[0].toUpperCase()}</Text>
        </View>
      )}
      <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.85)"]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      <Text style={[styles.cur, { backgroundColor: ME }]}>1P</Text>
      <Text style={styles.tileName}>You</Text>
    </View>
  );
}

function RosterTile({ size, entry, on, editing, onPress }) {
  const wiggle = useSharedValue(0);
  useEffect(() => {
    if (editing) {
      const d = 120 + Math.round(Math.random() * 40);
      wiggle.value = withRepeat(withSequence(withTiming(-1, { duration: d, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: d, easing: Easing.inOut(Easing.quad) })), -1, true);
    } else {
      cancelAnimation(wiggle);
      wiggle.value = withTiming(0, { duration: 120 });
    }
  }, [editing, wiggle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 2.2}deg` }] }));
  const p = entry.player;
  return (
    <Animated.View style={style}>
      <PressableScale onPress={onPress} accessibilityLabel={editing ? `Take ${p.name} off` : `Pick ${p.name}`} style={[styles.tile, { width: size, height: size * 1.18 }, on && { borderColor: RIVAL }]}>
        <Image source={imageSource(p.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.85)"]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        {on ? <Text style={[styles.cur, { backgroundColor: RIVAL }]}>2P</Text> : null}
        {entry.regular && !on ? <Text style={styles.rec}>{`${entry.record.wins}-${entry.record.losses}`}</Text> : null}
        <Text style={styles.tileName} numberOfLines={1}>
          {p.name}
        </Text>
        {editing ? (
          <View style={styles.x}>
            <X size={12} color="#fff" strokeWidth={3} />
          </View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { borderRadius: R.lg, overflow: "hidden", backgroundColor: "#0b0e13", borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  portrait: { flex: 1, alignSelf: "stretch", overflow: "hidden", borderColor: "rgba(255,255,255,0.08)" },
  meFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,123,255,0.18)" },
  meInitial: { color: "#fff", fontFamily: F.display, fontSize: 34 },
  edge: { position: "absolute", top: 0, bottom: 0, width: 3, opacity: 0.9 },
  vsWrap: { position: "absolute", left: 0, right: 0, top: 78, alignItems: "center" },
  vs: { color: "#fff", fontFamily: F.display, fontSize: 64, letterSpacing: 1, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 18, fontStyle: "italic" },
  tag: { color: "#fff", fontFamily: F.display, fontSize: 12, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, overflow: "hidden" },
  plateName: { color: C.text, fontFamily: F.display, fontSize: 26, textTransform: "uppercase", marginTop: 4, maxWidth: "100%" },
  plateSub: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  barLabel: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", width: 50 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  dots: { height: 34, minWidth: 34, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  dotsOn: { backgroundColor: C.accent },
  done: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  h2hLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  h2hScore: { fontFamily: F.display, fontSize: 22 },
  h2hBar: { width: 1, height: 16, backgroundColor: C.borderStrong },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.md },
  tile: { borderRadius: R.md, overflow: "hidden", backgroundColor: C.surface, borderWidth: 2, borderColor: "transparent", justifyContent: "flex-end" },
  mystery: { alignItems: "center", justifyContent: "center" },
  search: { alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderColor: C.borderStrong },
  qm: { position: "absolute", top: "18%", alignSelf: "center", color: "#fff", fontFamily: F.display, fontSize: 44 },
  tileName: { position: "absolute", left: 7, right: 7, bottom: 6, color: "#fff", fontFamily: F.bodySemi, fontSize: 11.5 },
  cur: { position: "absolute", top: 6, left: 6, color: "#fff", fontFamily: F.display, fontSize: 11, letterSpacing: 0.8, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: "hidden" },
  rec: { position: "absolute", top: 6, right: 6, color: "#fff", fontFamily: F.display, fontSize: 12, backgroundColor: "rgba(7,9,12,0.6)", paddingHorizontal: 5, borderRadius: 4, overflow: "hidden" },
  x: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: RIVAL, alignItems: "center", justifyContent: "center" },
  hiddenTitle: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: S.sm },
  hiddenRow: { paddingVertical: S.sm },
  hiddenFace: { width: 36, height: 36, borderRadius: 18 },
  hiddenName: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase" },
  sheetBody: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
});
