// The top of your profile (profile9 in the prototype): a full strength photo
// slab rounded at the bottom and lit along its lower edge, your photo in its
// membership ring overlapping it, your name, level and club, and the
// membership line. Then the level card with XP to the next level.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNumber } from "@/utils/format";
import { AnimatedNumber, Avatar, C, F, FadeIn, FINISH, PhotoBackground, PressableScale, ProgressBar, Row, Surface, TOP_GAP, imageSource, splitShadow } from "@/components/ui";
import { MemberLine } from "./parts";
import { MakePackPill } from "@/components/pack/MakePackPill";
import { hasPack } from "@/utils/fighter";

// The prototype's own photo for the profile slab (.slab.photo, teal.jpg).
export const PROFILE_PHOTO = require("../../../assets/images/oh/teal.jpg");

// The prototype draws the slab 210 high from the top of the phone, which
// includes its 14px status bar.
const SLAB = 196;
const EDGE = splitShadow(FINISH.slabEdge);
export const GUTTER = 18;

export function ProfileHero({ profile: p, clubName, right, onTryPro, onAvatar, mine = true }) {
  const insets = useSafeAreaInsets();
  const bg = p.fighter?.background;
  const place = clubName || p.area || p.city;
  return (
    <View>
      <View style={[styles.slabWrap, { boxShadow: EDGE.outer }]}>
        <View style={[styles.slab, { height: SLAB + insets.top }]}>
          {/* With a Fighter Pack, the slab is your pack background and the ring your pack portrait. */}
          <PhotoBackground source={bg ? imageSource(bg) : PROFILE_PHOTO} focus={{ x: 0.5, y: bg ? 0.75 : 0.22 }} fade="slab" to="2,5,12" kenBurns grain={0.06} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.round, { boxShadow: EDGE.inset }]} />
          {mine && !hasPack(p) ? <MakePackPill style={{ position: "absolute", top: insets.top + TOP_GAP + 4, left: GUTTER }} /> : null}
          <Row style={{ position: "absolute", top: insets.top + TOP_GAP, right: GUTTER }}>{right}</Row>
        </View>
      </View>
      <Row gap={14} style={styles.identity}>
        <PressableScale onPress={onAvatar} scaleTo={0.96} accessibilityLabel="Edit your photo">
          <View style={styles.avatarWell}>
            <Avatar uri={p.fighter?.profile || p.avatar} name={p.name || p.username} tier={p.tier} dot={p.isOutside ? "out" : null} size={86} />
          </View>
        </PressableScale>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {p.name || p.username}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Level {p.level.level}
            {place ? ` · ${place}` : ""}
          </Text>
          <MemberLine tier={p.tier} foundingNumber={p.tier === "black" ? p.foundingNumber : null} onTryPro={onTryPro} style={styles.tline} />
        </View>
      </Row>
    </View>
  );
}

/** The level card (.card .kv and .pbar), with the level number lit on the left (profile, round one). */
export function LevelCard({ level, onPress }) {
  return (
    <FadeIn>
      <Surface radius={20} padding={null} onPress={onPress} contentStyle={styles.levelBody}>
        <View style={styles.levelTile}>
          <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
          <View>
            <Text style={styles.levelNum}>{level.level}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.level}>Level {level.level}</Text>
            <Row gap={4} style={{ alignItems: "baseline" }}>
              <AnimatedNumber value={level.xpIntoLevel + (level.nextLevelAt - level.xpForNext)} format={formatNumber} style={styles.xp} />
              <Text style={styles.xp}>/ {formatNumber(level.nextLevelAt)} XP</Text>
            </Row>
          </Row>
          <ProgressBar value={level.progress} height={6} cap style={{ marginTop: 9 }} />
        </View>
      </Surface>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  slabWrap: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  slab: { overflow: "hidden", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, backgroundColor: "#060b16" },
  round: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  identity: { paddingHorizontal: GUTTER, marginTop: -24, alignItems: "flex-end", zIndex: 3 },
  avatarWell: { borderRadius: 50, backgroundColor: C.bg },
  // .pn7: the display face at 27px
  name: { color: C.text, fontFamily: F.display, fontSize: 27, lineHeight: 28, textTransform: "uppercase" },
  // .xs.muted
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  // .tline: 600 10px, letter spacing .9
  tline: { fontSize: 10, letterSpacing: 0.9, marginTop: 7 },
  levelBody: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 11, paddingBottom: 11, paddingLeft: 12, paddingRight: 14 },
  levelTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FINISH.act[1],
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 18px -8px rgba(42,106,240,0.95)",
  },
  levelNum: { color: "#fff", fontFamily: F.display, fontSize: 18, lineHeight: 20 },
  // .kv: 12.5px, the label in the foreground colour
  level: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
  xp: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
});
