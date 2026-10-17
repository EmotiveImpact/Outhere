// Character select, the fighting game way (the prototype's .r11fg): you as 1P
// in blue on the left, your pick as 2P in red on the right, split by a lit
// slanted seam (the kit's VersusSplit), stat bars from real numbers under
// each name, your record together, and a roster of slanted tiles of the
// people you battle most, each lit from its edges. A mystery tile picks
// someone at random. The three dots make the roster jiggle so you can cross
// people off; they are never told.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { MoreHorizontal, Search, X } from "@/components/ui/icons";
import { C, F, GlowButton, PressableScale, Row, S, Sheet, VersusSplit, imageSource } from "@/components/ui";
import { Chip, NoPhoto, SlantTag } from "./BattleKit";
import { ME, RIVAL } from "./shared";
import { formatNumber } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";
import { fighterPhoto } from "@/utils/fighter";

const COLS = 5;
const GAP = 8;
const SKEW = "-8deg";

export function CharacterSelect({ roster, picked, onPick, onRandom, onSearch, onHide, onShow, randomBusy = false, stageTop = 0 }) {
  const { width } = useWindowDimensions();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(null);
  const w = Math.min(width, 520);
  const tile = Math.floor((w - S.gutter * 2 - 12 - GAP * (COLS - 1)) / COLS);
  const me = roster?.me;
  const them = roster?.roster.find((r) => r.player.id === picked) || null;

  return (
    <View>
      <Stage me={me} them={them} top={stageTop} />

      <View style={{ paddingHorizontal: S.gutter }}>
        <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
          <HeadToHead them={them} />
          <Chip
            tone={editing ? "blue" : "lit"}
            onPress={() => setEditing((e) => !e)}
            accessibilityLabel={editing ? "Done editing" : "Edit your regulars"}
            style={{ height: 34, paddingHorizontal: editing ? 14 : 10 }}
            label={editing ? "Done" : null}
          >
            {editing ? null : (
              <View>
                <MoreHorizontal size={18} color={C.text} />
              </View>
            )}
          </Chip>
        </Row>

        <View style={styles.grid}>
          <MeTile size={tile} player={me?.player} />
          {(roster?.roster || []).map((r) => (
            <RosterTile key={r.player.id} size={tile} entry={r} on={r.player.id === picked} editing={editing} onPress={() => (editing ? setRemoving(r.player) : onPick(r.player.id))} />
          ))}
          {!editing ? (
            <>
              <Tile size={tile} name="Random" onPress={onRandom} disabled={randomBusy} label="Random rival" tint="blue">
                <Image source={PHOTOS.clubrun} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["rgba(14,39,86,0.7)", "rgba(5,8,14,0.9)"]} style={StyleSheet.absoluteFill} />
                <Text style={styles.qm}>?</Text>
              </Tile>
              <Tile size={tile} name="Find" onPress={onSearch} label="Find someone else" dashed>
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                  <Search size={20} color={C.textSoft} />
                </View>
              </Tile>
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
                <GlowButton title="Put back" size="sm" variant="quiet" onPress={() => onShow(p.id)} />
              </Row>
            ))}
          </View>
        ) : null}
      </View>

      <Sheet visible={!!removing} onClose={() => setRemoving(null)}>
        {removing ? (
          <View style={{ gap: S.md }}>
            <Text style={styles.sheetTitle}>Take {removing.name} off your regulars?</Text>
            <Text style={styles.sheetBody}>{removing.name} isn't told. Your record together is kept, and you can put them back any time.</Text>
            <Row gap={S.sm} style={{ marginTop: S.sm }}>
              <GlowButton title="Cancel" variant="quiet" onPress={() => setRemoving(null)} style={{ flex: 1 }} />
              <GlowButton
                title="Take off"
                variant="stop"
                onPress={() => {
                  onHide(removing.id);
                  setRemoving(null);
                }}
                style={{ flex: 1.4 }}
              />
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ── The stage ─────────────────────────────────────────────────────────────────

function Stage({ me, them, top }) {
  const mine = me?.player;
  const theirs = them?.player;
  return (
    <VersusSplit
      key={theirs?.id || "none"}
      height={top + 300}
      slant={0.16}
      vsSize={58}
      left={{ source: fighterPhoto(mine, "vs").source, focus: { x: 0.5, y: 0.2 } }}
      right={{ source: theirs ? fighterPhoto(theirs, "vsMirror").source : null, focus: { x: 0.5, y: 0.2 } }}
      fade="rgba(7,9,12,1)"
      fadeFrom={0.5}
    >
      {!theirs ? (
        <View pointerEvents="none" style={[styles.empty, { top: top + 50 }]}>
          <Text style={styles.emptyQ}>?</Text>
        </View>
      ) : null}
      <Row gap={S.md} style={styles.plates}>
        <Plate tag="1P" colour={ME} player={mine} bars={me?.bars} />
        <Plate tag="2P" colour={RIVAL} player={theirs} bars={them?.bars} right />
      </Row>
    </VersusSplit>
  );
}

const tierWord = (t) => (t ? t[0].toUpperCase() + t.slice(1) : null);

function Plate({ tag, colour, player, bars, right = false }) {
  return (
    <View style={{ flex: 1, alignItems: right ? "flex-end" : "flex-start" }}>
      <SlantTag label={tag} colour={colour} />
      <Text style={[styles.plateName, right && { textAlign: "right" }]} numberOfLines={1} adjustsFontSizeToFit>
        {player ? (player.isMe ? player.name || "You" : player.name) : "Pick a rival"}
      </Text>
      <Text style={[styles.plateSub, right && { textAlign: "right" }]} numberOfLines={1}>
        {player ? [player.level ? `Lv ${player.level}` : null, tierWord(player.tier), player.area].filter(Boolean).join(" · ") : "From your regulars"}
      </Text>
      <View style={{ marginTop: 8, gap: 5, alignSelf: "stretch" }}>
        {(bars || PLACEHOLDER_BARS).map((b) => (
          <Row key={b.key} gap={6} style={right ? { flexDirection: "row-reverse" } : null}>
            <Text style={[styles.barLabel, right && { textAlign: "right" }]}>{b.label}</Text>
            <StatBar value={bars ? b.value : 0} colour={colour} right={right} />
          </Row>
        ))}
      </View>
    </View>
  );
}

/** A slanted stat bar (.r11fg .bar): a lit fill in the player's colour on a dark track. */
function StatBar({ value, colour, right }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={styles.barTrack}>
      {v > 0 ? (
        <View style={[styles.barFill, { width: `${Math.round(v * 100)}%`, boxShadow: `0 0 10px ${colour}` }, right && { alignSelf: "flex-end" }]}>
          <LinearGradient colors={right ? ["#ff8b92", colour] : [colour, "#82b4ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
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
      <Text style={[styles.h2hScore, { color: "#82b4ff" }]}>{r.wins}</Text>
      <View style={styles.h2hBar} />
      <Text style={[styles.h2hScore, { color: "#ff8b92" }]}>{r.losses}</Text>
      <Text style={styles.h2hLabel}>{r.played ? `Best day ${formatNumber(them.bestDay)}` : "First meeting"}</Text>
    </Row>
  );
}

// ── The roster ────────────────────────────────────────────────────────────────

/**
 * One slanted roster box: the photo lit from both sides (blue from the left,
 * a cooler light from the right) and shaded to the floor, the name under it.
 * colour: the edge when it's in a slot (1P blue, 2P red).
 */
function Tile({ size, name, colour, tag, rec, onPress, disabled, label, dashed, tint, children, after }) {
  const h = Math.round(size * 1.08);
  const lit = !!colour;
  const box = (
    <View
      style={[
        styles.tile,
        { width: size, height: h, transform: [{ skewX: SKEW }] },
        lit ? { boxShadow: `0 0 0 2px ${colour}, 0 0 18px ${colour}` } : { boxShadow: "0 10px 20px -12px #000" },
        dashed && styles.dashed,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { transform: [{ skewX: "8deg" }, { scale: 1.18 }] }]}>{children}</View>
      {!dashed ? (
        <>
          <LinearGradient colors={[tint === "blue" ? "rgba(61,139,255,0.4)" : "rgba(61,139,255,0.28)", "rgba(61,139,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 0.45, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(130,180,255,0)", "rgba(130,180,255,0.18)"]} start={{ x: 0.6, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(5,7,12,0)", "rgba(5,7,12,0.75)"]} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08)", borderRadius: 8 }]} />
        </>
      ) : null}
      {tag ? <SlantTag label={tag} colour={colour} size={9.5} style={styles.tag} /> : null}
      {rec ? <Text style={styles.rec}>{rec}</Text> : null}
      {after}
    </View>
  );
  const body = (
    <View style={{ width: size, alignItems: "center" }}>
      {box}
      <Text style={[styles.tileName, colour && { color: colour === ME ? "#82b4ff" : "#ff8b92" }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} scaleTo={0.92}>
      {body}
    </PressableScale>
  );
}

function TilePhoto({ source, name, side = "left" }) {
  const [failed, setFailed] = useState(false);
  if (!source || failed) return <NoPhoto side={side} name={name} size={28} />;
  return <Image source={imageSource(source)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "15%", left: "50%" }} transition={150} onError={() => setFailed(true)} />;
}

function MeTile({ size, player }) {
  return (
    <Tile size={size} name="You" colour={ME} tag="1P">
      <TilePhoto source={fighterPhoto(player, "profile").source} name="You" />
    </Tile>
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
    <Animated.View style={style} entering={FadeIn.duration(300)}>
      <Tile
        size={size}
        name={p.name}
        colour={on ? RIVAL : null}
        tag={on ? "2P" : null}
        rec={entry.regular && !on && !editing ? `${entry.record.wins}-${entry.record.losses}` : null}
        onPress={onPress}
        label={editing ? `Take ${p.name} off` : `Pick ${p.name}`}
        after={
          editing ? (
            <View style={styles.x}>
              <X size={11} color="#fff" strokeWidth={3} />
            </View>
          ) : null
        }
      >
        <TilePhoto source={p.avatar} name={p.name} side="right" />
      </Tile>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plates: { position: "absolute", left: S.gutter, right: S.gutter, bottom: 14, alignItems: "flex-end" },
  empty: { position: "absolute", right: 0, width: "48%", alignItems: "center" },
  emptyQ: { color: "rgba(255,139,146,0.45)", fontFamily: F.display, fontSize: 110, lineHeight: 120 },
  plateName: { color: "#fff", fontFamily: F.display, fontSize: 34, lineHeight: 36, fontStyle: "italic", textTransform: "uppercase", marginTop: 6, maxWidth: "100%", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 14 },
  plateSub: { color: C.textSoft, fontFamily: F.body, fontSize: 11.5 },
  barLabel: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", width: 52 },
  barTrack: { flex: 1, height: 6, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", transform: [{ skewX: "-20deg" }] },
  barFill: { height: 6, borderRadius: 2, overflow: "hidden" },
  h2hLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
  h2hScore: { fontFamily: F.display, fontSize: 24 },
  h2hBar: { width: 1, height: 16, backgroundColor: C.borderStrong },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: S.sm, marginTop: S.md, paddingLeft: 6 },
  tile: { borderRadius: 8, overflow: "hidden", backgroundColor: "#0b0e13" },
  dashed: { borderWidth: 1, borderStyle: "dashed", borderColor: C.borderStrong, backgroundColor: "transparent" },
  tag: { position: "absolute", top: 4, left: 4 },
  qm: { position: "absolute", top: "22%", alignSelf: "center", color: "#82b4ff", fontFamily: F.display, fontSize: 36, textShadowColor: "rgba(61,139,255,0.8)", textShadowRadius: 14 },
  tileName: { color: C.textSoft, fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 5 },
  rec: { position: "absolute", top: 4, right: 4, color: "#fff", fontFamily: F.display, fontSize: 11, backgroundColor: "rgba(7,9,12,0.6)", paddingHorizontal: 4, borderRadius: 4, overflow: "hidden" },
  x: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: RIVAL, alignItems: "center", justifyContent: "center" },
  hiddenTitle: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: S.sm },
  hiddenRow: { paddingVertical: S.sm },
  hiddenFace: { width: 36, height: 36, borderRadius: 12 },
  hiddenName: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase" },
  sheetBody: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
});
