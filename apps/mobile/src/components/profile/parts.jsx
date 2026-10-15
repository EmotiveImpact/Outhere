// Pieces shared by the profile, wallet, membership, friends, badges and
// emotes screens: the slab hero with a back button, the three stat cards,
// badge and emote tiles, the membership line under a name and small bits.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Lock } from "lucide-react-native";
import { AnimatedBar, C, F, Hero, IconButton, LIT, PressableScale, R, Row, S } from "@/components/ui";
import { compactNumber } from "@/utils/format";
import { badgeArt } from "@/constants/badges";
import { EMOTE_BY_ID } from "@/constants/emotes";

/** Hero slab with a back button on the left. */
export function Slab({ back = true, onBack, right, height = 236, ...rest }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };
  return (
    <View>
      <Hero height={height} right={right} {...rest} />
      {back ? (
        <View style={{ position: "absolute", left: S.gutter, top: insets.top + S.sm }}>
          <IconButton icon={ChevronLeft} onPress={goBack} label="Back" />
        </View>
      ) : null}
    </View>
  );
}

/** Three equal stat cards: big number over a small label. */
export function StatTrio({ items, style }) {
  return (
    <Row gap={S.sm} style={style}>
      {items.map((it) => (
        <View key={it.label} style={styles.stat}>
          <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.md }]} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {typeof it.value === "number" ? compactNumber(it.value) : it.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </Row>
  );
}

/** A badge: the 3D object, its name, and Earned or a progress bar. */
export function BadgeTile({ badge, onPress, bar = false }) {
  const b = badge;
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={[styles.badge, !b.earned && { opacity: 0.92 }]} accessibilityLabel={`${b.label}. ${b.earned ? "Earned" : b.toGo}`}>
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.md }]} />
      <View style={styles.badgeArt}>
        <Image source={badgeArt(b.id)} style={[StyleSheet.absoluteFill, !b.earned && { opacity: 0.35 }]} contentFit="cover" />
        {!b.earned ? (
          <View style={styles.lock}>
            <Lock size={10} color={C.textDim} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.badgeName, !b.earned && { color: C.textSoft }]} numberOfLines={1}>
        {b.label}
      </Text>
      {b.earned ? (
        <Text style={[styles.badgeSub, bar && { color: C.accent }]}>Earned</Text>
      ) : bar ? (
        <AnimatedBar value={b.progress} height={4} colour={C.accent} track={C.surfaceHigh} style={{ marginTop: 7, width: "70%" }} />
      ) : (
        <Text style={styles.badgeSub} numberOfLines={1}>
          {b.toGo}
        </Text>
      )}
    </PressableScale>
  );
}

/** An emote on its rounded tile. Locked ones go dark with a small lock. */
export function EmoteTile({ id, size = 72, locked = false, glow = false, style }) {
  const e = EMOTE_BY_ID[id];
  const black = e?.style === "black";
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.3, overflow: "hidden", backgroundColor: black ? "#22272e" : "#141a24", borderWidth: 1, borderColor: black ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)" },
        glow && !locked && { borderColor: "rgba(61,139,255,0.6)", shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    >
      {e ? <Image source={e.art} style={[StyleSheet.absoluteFill, locked && { opacity: 0.18 }, black && !locked && { opacity: 0.85 }]} contentFit="cover" /> : null}
      {black ? <LinearGradient colors={["rgba(255,255,255,0.08)", "rgba(0,0,0,0.25)"]} style={StyleSheet.absoluteFill} /> : null}
      {locked ? (
        <View style={[styles.lock, { right: 6, bottom: 6 }]}>
          <Lock size={10} color={C.textDim} />
        </View>
      ) : null}
    </View>
  );
}

const MEMBER = { free: "Free", pro: "Pro member", black: "Black member" };

/** 'FREE · TRY PRO', 'PRO MEMBER', 'BLACK MEMBER · FOUNDING #212'. */
export function MemberLine({ tier = "free", foundingNumber, onTryPro, style }) {
  return (
    <Text style={[styles.member, tier === "pro" && { color: C.accentHi }, tier === "black" && { color: "#dfe4ea" }, style]} numberOfLines={1}>
      {MEMBER[tier] || MEMBER.free}
      {foundingNumber ? (
        <Text>
          {" · founding "}
          <Text style={{ color: C.text, fontFamily: F.bodySemi }}>#{foundingNumber}</Text>
        </Text>
      ) : null}
      {tier === "free" ? (
        <Text style={{ color: C.accent }} onPress={onTryPro}>
          {" · Try Pro"}
        </Text>
      ) : null}
    </Text>
  );
}

/** Small round icon well used at the left of cards. */
export function IconWell({ icon: Icon, colour = C.accentHi, size = 44, style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: "rgba(61,139,255,0.12)", borderWidth: 1, borderColor: "rgba(61,139,255,0.28)", alignItems: "center", justifyContent: "center" }, style]}>
      <Icon size={size * 0.42} color={colour} />
    </View>
  );
}

/** Small pill button used inside cards ('Open', 'Add', 'Share'). */
export function PillButton({ title, onPress, ghost = false, disabled = false, style }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.94} accessibilityLabel={title} style={[styles.pillBtn, ghost && styles.pillGhost, disabled && { opacity: 0.5 }, style]}>
      <Text style={[styles.pillText, ghost && { color: C.textSoft }]}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 34 },
  statLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  badge: { flex: 1, alignItems: "center", backgroundColor: C.surface, borderRadius: R.md, paddingTop: S.md, paddingBottom: S.md, paddingHorizontal: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop, overflow: "hidden" },
  badgeArt: { width: "84%", aspectRatio: 1.25, borderRadius: R.sm, overflow: "hidden", backgroundColor: "#0b0e13" },
  badgeName: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: S.sm, textAlign: "center" },
  badgeSub: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2, textAlign: "center" },
  lock: { position: "absolute", right: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  member: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
  pillBtn: { height: 34, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  pillGhost: { backgroundColor: C.surfaceHigh },
  pillText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
});
