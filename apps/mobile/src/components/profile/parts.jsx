// Pieces shared by the profile, wallet, membership, friends, badges and
// emotes screens: the slab hero with a back button, the three stat cards,
// badge and emote tiles, the membership line under a name and small bits.

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Lock } from "lucide-react-native";
import { AnimatedBar, BlendImage, C, F, FINISH, GlowButton, Hero, IconTile, PressableScale, Row, S, Surface, TOP_GAP, splitShadow } from "@/components/ui";
import { compactNumber } from "@/utils/format";
import { badgeArt } from "@/constants/badges";
import { EMOTE_BY_ID } from "@/constants/emotes";

const BLUR = Platform.OS === "web" ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } : null;

/** The round glass button over a slab or photo (.round.glass, 38px). */
export function RoundGlass({ icon: Icon, onPress, label, size = 38, iconSize = 19, style }) {
  return (
    <PressableScale onPress={onPress} hitSlop={8} scaleTo={0.9} accessibilityLabel={label} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }, BLUR, style]}>
      <View>
        <Icon size={iconSize} color="#fff" />
      </View>
    </PressableScale>
  );
}

/** Hero slab with a back button on the left. */
export function Slab({ back = true, onBack, right, height = 236, style, ...rest }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };
  return (
    <View>
      {/* 3D objects blend onto the slab's own blue light (BlendImage drops their black). */}
      <Hero height={height} right={right} style={style} {...rest} />
      {back ? (
        <View style={{ position: "absolute", left: 18, top: insets.top + TOP_GAP }}>
          <RoundGlass icon={ChevronLeft} onPress={goBack} label="Back" />
        </View>
      ) : null}
    </View>
  );
}

/** Three equal stat cards (.grid3 .card): big number over a small label, on the lit surface. */
export function StatTrio({ items, style }) {
  return (
    <Row gap={S.sm} style={style}>
      {items.map((it) => (
        <Surface key={it.label} radius={20} padding={12} style={{ flex: 1 }}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {typeof it.value === "number" ? compactNumber(it.value) : it.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {it.label}
          </Text>
        </Surface>
      ))}
    </Row>
  );
}

/**
 * A badge (.bdg3): the 3D medal blended onto the lit card with its black
 * dropped out, its name, and Earned or what's left. Locked ones go grey.
 */
export function BadgeTile({ badge, onPress, bar = false }) {
  const b = badge;
  return (
    <Surface onPress={onPress} radius={18} padding={null} style={{ flex: 1 }} contentStyle={styles.badge}>
      <View accessible accessibilityLabel={`${b.label}. ${b.earned ? "Earned" : b.toGo}`} style={{ alignItems: "center", alignSelf: "stretch" }}>
        <BlendImage source={badgeArt(b.id)} size={72} mask="tight" grey={b.earned ? 0 : 1} dim={b.earned ? 1 : 0.6} />
        <Text style={[styles.badgeName, !b.earned && { color: C.textSoft }]} numberOfLines={1}>
          {b.label}
        </Text>
        {b.earned ? (
          <Text style={[styles.badgeSub, bar && { color: C.accent }]}>Earned</Text>
        ) : bar ? (
          <AnimatedBar value={b.progress} height={4} colour={C.accent} track={C.surfaceHigh} style={{ marginTop: 6, width: "70%" }} />
        ) : (
          <Text style={styles.badgeSub} numberOfLines={1}>
            {b.toGo}
          </Text>
        )}
      </View>
    </Surface>
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

/** The small lit icon square at the left of a card (.nudge .ni, .oh-tile). */
export function IconWell({ icon, colour, size = 38, style }) {
  const tone = colour === C.warn || colour === C.gold ? "gold" : colour === C.danger ? "red" : "blue";
  return <IconTile icon={icon} tone={tone} size={size} radius={Math.round(size * 0.32)} iconSize={Math.round(size * 0.47)} style={style} />;
}

const TAG_SHADOW = splitShadow(FINISH.actShadow);

/**
 * The same pill drawn without a button of its own (.pill-go), for a card
 * that is itself the button: a button can't hold another button.
 */
export function PillTag({ title, style }) {
  return (
    <View style={[styles.tag, { boxShadow: TAG_SHADOW.outer }, style]}>
      <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 999, boxShadow: TAG_SHADOW.inset }]} />
      <Text style={styles.tagText} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

/** Small pill button used inside cards ('Open', 'Add', 'Share'): the act gradient (.pill-go), or quiet. */
export function PillButton({ title, onPress, ghost = false, disabled = false, style }) {
  return <GlowButton title={title} onPress={onPress} disabled={disabled} variant={ghost ? "quiet" : "primary"} size="sm" shine={false} style={[{ height: 32, paddingHorizontal: 14 }, style]} />;
}

const styles = StyleSheet.create({
  round: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  tag: { height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 999, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tagText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12, letterSpacing: -0.15 },
  // .grid3 .card b: the display face at 24, line height .9
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 24 },
  statLabel: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 4 },
  // .bdg3 div: padding 8 6 11
  badge: { alignItems: "center", paddingTop: 8, paddingBottom: 11, paddingLeft: 6, paddingRight: 6 },
  badgeName: { color: C.text, fontFamily: F.bodySemi, fontSize: 11.5, marginTop: 4, textAlign: "center" },
  badgeSub: { color: C.textDim, fontFamily: F.body, fontSize: 10, marginTop: 2, textAlign: "center" },
  lock: { position: "absolute", right: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  member: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
});
