// Pieces the battle, swipe and city screens share, built on the finish kit
// (components/ui, see FINISH.md): the prototype's emote tile (.oh-emote), the
// round deck buttons (.oh-cbtn), chat bubbles (.oh-bubble), chips (.oh-chip),
// the top row of a round ten screen (.r10nav), the two tone headline, fact
// strips and the photo cards of the round eleven battle screens.

import React, { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Lock, X } from "@/components/ui/icons";
import { BlendImage, C, F, FINISH, Foil, GlowBackdrop, LIT, PressableScale, R, Row, S, imageSource, splitShadow, useScreenTop, useSkiaReady } from "@/components/ui";

import { GlassButton } from "@/components/arena/OutsideKit";
import { EMOTE_BY_ID } from "@/constants/emotes";
import { hapticSelection } from "@/services/haptics";

const battleSkia = () => require("./skia/BattleSkia");

const EDGE = ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.05)"];
const EDGE_STOPS = [0, 0.42, 0.78, 1];

// Emote art by battle code or emote id, and how rare each one is.
const EMOTE_TIER = { flame: "rare", fire: "rare", wings: "rare", crown: "black", inferno: "black" };

// ── Emote tile (.oh-emote) ────────────────────────────────────────────────────

const TILE_GLOW = [{ x: 0.5, y: 0.3, rx: 0.8, ry: 0.8, stops: [[0, "rgba(61,139,255,0.2)"], [0.7, "rgba(255,255,255,0.02)"], [1, "rgba(255,255,255,0)"]] }];
const RARE_GLOW = [{ x: 0.5, y: 0.34, rx: 0.85, ry: 0.85, stops: [[0, "rgba(61,139,255,0.34)"], [0.7, "rgba(61,139,255,0.04)"], [1, "rgba(61,139,255,0)"]] }];

/**
 * A collectable emote on its lit tile, its black dropped out with BlendImage.
 * id: an emote id (flame, wings...) or pass `source`. tier: rare (lit blue
 * ring) | black (gunmetal) | plain, defaulting from the emote. locked: grey,
 * dimmed, with a lock. size and radius in px. onPress makes it a button.
 */
export function EmoteTile({ id, source, size = 62, radius, tier, locked = false, onPress, accessibilityLabel, glow = false, style }) {
  const e = id ? EMOTE_BY_ID[id] : null;
  const art = source || e?.art;
  const t = tier ?? (e?.style === "black" ? "black" : EMOTE_TIER[id] || "");
  const r = radius ?? Math.round(size * 0.31);
  const black = t === "black";
  const rare = t === "rare" && !locked;
  const ring = rare || glow;
  const frame = [
    { width: size, height: size, borderRadius: r },
    { boxShadow: ring ? `0 0 ${Math.round(size * 0.36)}px -${Math.round(size * 0.1)}px rgba(61,139,255,0.8), 0 14px 26px -16px #000` : "0 14px 26px -16px #000" },
    style,
  ];
  const body = (
    <>
      <View style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: "hidden" }]}>
        {black ? (
          <LinearGradient colors={["#343a43", "#121519"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <LinearGradient colors={LIT} style={StyleSheet.absoluteFill} />
            <GlowBackdrop layers={rare ? RARE_GLOW : TILE_GLOW} base={null} />
          </>
        )}
        {art ? (
          <View style={StyleSheet.absoluteFill}>
            <Foil source={art} width={size} height={size} zoom={1.2} mask={black ? [0.55, 0.95] : "none"} grey={locked ? 1 : 0} dim={locked ? 0.25 : black ? 0.9 : 1} strength={locked ? 0 : size >= 100 ? 1 : 0.8} />
          </View>
        ) : null}
        {locked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,9,12,0.35)" }]} /> : null}
      </View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            boxShadow: black
              ? "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(255,255,255,0.18)"
              : ring
                ? "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 0 0 1.5px rgba(61,139,255,0.6)"
                : "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.07)",
          },
        ]}
      />
      {locked ? (
        <View style={[styles.lock, { right: Math.max(4, size * 0.09), bottom: Math.max(4, size * 0.09) }]}>
          <Lock size={11} color={C.textSoft} />
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={frame}>{body}</View>;
  return (
    <PressableScale onPress={onPress} scaleTo={0.88} accessibilityLabel={accessibilityLabel || e?.label} style={frame}>
      {body}
    </PressableScale>
  );
}

/** Battle emote codes (fire, respect...) to their emote ids. */
export const EMOTE_FOR_CODE = { fire: "flame", respect: "fist", too_slow: "snail", speed: "bolt", champion: "crown", crown: "crown", flying: "wings", clock: "watch" };

// ── Chips, bubbles, round buttons ─────────────────────────────────────────────

const CHIP_BLUE = splitShadow("inset 0 1px 0 rgba(130,180,255,0.6), inset 0 0 0 1px rgba(61,139,255,0.3), 0 10px 22px -14px #000");
const CHIP_GLASS = splitShadow("inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.1), 0 10px 22px -14px #000");

/**
 * The prototype's .oh-chip: tone lit (a lit surface), blue (tinted, lit
 * edge), glass (over photos) or alert. icon, label, dot (a live dot colour).
 */
export function Chip({ icon: Icon, label, tone = "lit", dot, onPress, accessibilityLabel, children, style, textStyle }) {
  const body =
    tone === "blue"
      ? { colors: ["rgba(61,139,255,0.22)", "rgba(61,139,255,0.08)"], shadow: CHIP_BLUE }
      : tone === "glass"
        ? { colors: ["rgba(255,255,255,0.11)", "rgba(255,255,255,0.08)"], shadow: CHIP_GLASS }
        : tone === "alert"
          ? { colors: ["rgba(255,77,85,0.2)", "rgba(255,77,85,0.08)"], shadow: splitShadow("inset 0 1px 0 rgba(255,139,146,0.55), inset 0 0 0 1px rgba(255,77,85,0.2)") }
          : null;
  const inner = (
    <>
      {body ? (
        <>
          <LinearGradient colors={body.colors} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: body.shadow.inset }]} />
        </>
      ) : (
        <>
          <LinearGradient colors={EDGE} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
          <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: R.full }]} />
        </>
      )}
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot, boxShadow: `0 0 8px ${dot}` }]} /> : null}
      {Icon ? (
        <View>
          <Icon size={14} color={tone === "alert" ? "#ff8b92" : C.accentHi} />
        </View>
      ) : null}
      {label != null ? <Text style={[styles.chipText, tone === "alert" && { color: "#ffb3b7" }, textStyle]}>{label}</Text> : null}
      {children}
    </>
  );
  const frame = [styles.chip, { boxShadow: (body?.shadow.outer || "0 10px 22px -14px #000") }, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.94} accessibilityLabel={accessibilityLabel || label} style={frame}>
        {inner}
      </PressableScale>
    );
  }
  return <View style={frame}>{inner}</View>;
}

const BUBBLE_ME = splitShadow("inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 24px -12px rgba(42,106,240,0.9)");

/** A set line or emote someone fired (.oh-bubble): yours blue on the left, theirs lit on the right. */
export function Bubble({ mine = false, emote, label }) {
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, { boxShadow: mine ? BUBBLE_ME.outer : FINISH.shadowCard }]}>
      {mine ? (
        <LinearGradient colors={["#4a86ff", "#1f55d0"]} style={[StyleSheet.absoluteFill, { borderRadius: 16, borderBottomLeftRadius: 5 }]} />
      ) : (
        <>
          <LinearGradient colors={EDGE} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: 16, borderBottomRightRadius: 5 }]} />
          <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: 15, borderBottomRightRadius: 4 }]} />
        </>
      )}
      {mine ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, borderBottomLeftRadius: 5, boxShadow: BUBBLE_ME.inset }]} /> : null}
      {emote ? (
        <View style={{ marginVertical: -6, marginLeft: -6, marginRight: -2 }}>
          <BlendImage source={emote} size={30} mask="tight" />
        </View>
      ) : null}
      <Text style={styles.bubbleText}>{label}</Text>
    </View>
  );
}

const GO_SHADOW = splitShadow("inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(42,106,240,0.6), 0 16px 36px -10px rgba(42,106,240,0.9)");

/** The round deck buttons (.oh-cbtn): lit, or `go` in the blue that acts. */
export function RoundAction({ icon: Icon, size = 58, go = false, onPress, accessibilityLabel, iconColour, disabled }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.9} accessibilityLabel={accessibilityLabel} style={{ width: size, height: size, borderRadius: size / 2, boxShadow: go ? GO_SHADOW.outer : FINISH.shadowCard }}>
      {go ? (
        <LinearGradient colors={["#4a86ff", "#1f55d0"]} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      ) : (
        <>
          <LinearGradient colors={EDGE} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
          <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: size / 2 }]} />
        </>
      )}
      {go ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, boxShadow: GO_SHADOW.inset }]} /> : null}
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Icon size={Math.round(size * (go ? 0.42 : size < 50 ? 0.4 : 0.41))} color={iconColour || (go ? "#fff" : size < 50 ? C.textSoft : C.text)} />
      </View>
    </PressableScale>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

/**
 * The top row of a round ten screen (.r10nav): a round back (or close) button
 * on the left and anything on the right, at the screen's top line. In flow
 * by default; `float` lays it over a hero.
 */
export function NavRow({ back = true, close = false, onBack, right, float = false, glass = false, style }) {
  const router = useRouter();
  const top = useScreenTop();
  const goBack = () => {
    hapticSelection();
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/outside/arena");
  };
  return (
    <View style={[styles.nav, float ? { position: "absolute", left: S.gutter, right: S.gutter, top, zIndex: 10 } : { marginTop: top }, style]} pointerEvents="box-none">
      {back || close ? glass ? <GlassButton icon={close ? X : ChevronLeft} onPress={goBack} label={close ? "Close" : "Back"} /> : <LitRound icon={close ? X : ChevronLeft} onPress={goBack} label={close ? "Close" : "Back"} /> : <View />}
      <Row gap={S.sm}>{right}</Row>
    </View>
  );
}

/** The plain round button (.round): a lit circle. */
export function LitRound({ icon: Icon, onPress, label, size = 44 }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={8} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, boxShadow: "0 10px 22px -14px #000" }}>
      <LinearGradient colors={EDGE} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: size / 2 }]} />
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Icon size={20} color={C.text} />
      </View>
    </PressableScale>
  );
}

/** Kicker over a two tone display headline: white line, blue line. */
export function Headline({ kick, top, bottom, size = 42, center = false, kickColour = C.accent, style }) {
  return (
    <View style={[center && { alignItems: "center" }, style]}>
      {kick ? <Text style={[styles.kick, { color: kickColour }, center && { textAlign: "center" }]}>{kick}</Text> : null}
      {top ? (
        <Text style={[styles.display, { fontSize: size, lineHeight: size * 0.94 }, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
          {top}
        </Text>
      ) : null}
      {bottom ? (
        <Text style={[styles.display, styles.blue, { fontSize: size, lineHeight: size * 0.94 }, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
          {bottom}
        </Text>
      ) : null}
    </View>
  );
}

/** A strip of facts split by hairlines: big number over a small label. */
export function Facts({ items, size = 21, style, labelStyle }) {
  return (
    <Row gap={0} style={style}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.fact, i > 0 && styles.factLine]}>
          <Text style={[styles.factValue, { fontSize: size }, it.colour && { color: it.colour }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={[styles.factLabel, labelStyle]} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </Row>
  );
}

/** Frosted glass card over a photo (.card.gl): the bottom sheets of the challenger screens. */
export function GlassCard({ children, style, padding = S.lg }) {
  return (
    <View style={[styles.glassCard, { boxShadow: "0 30px 60px -24px #000" }, style]}>
      <LinearGradient colors={["rgba(30,35,44,0.86)", "rgba(14,17,22,0.94)"]} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 26, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.07)" }]} />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

/**
 * A portrait card (.r11blr .c, .r11seal .env): the photo, shaded to the
 * floor, lit from its outer side in the player's colour, with a coloured
 * edge. side: left (blue, you) | right (red, them). glow: the lit ring
 * round a winner. blur: soften the photo (sealed). Children sit at the bottom.
 */
export function PortraitCard({ source, side = "left", name, glow = false, blur = 0, dim = 1, height = 220, radius = 22, children, style, edge = true, focus }) {
  const [failed, setFailed] = React.useState(false);
  const blue = side === "left";
  const tint = blue ? "rgba(42,106,240,0.45)" : "rgba(255,77,85,0.36)";
  const ring = glow
    ? blue
      ? "0 0 0 2px #4f9bff, 0 0 30px rgba(79,155,255,0.6)"
      : "0 0 0 2px #ff6a70, 0 0 30px rgba(255,77,85,0.5)"
    : "0 18px 36px -20px #000";
  return (
    <View style={[{ height, borderRadius: radius, boxShadow: ring }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden", backgroundColor: "#05080e" }]}>
        {source && !failed ? <Image source={imageSource(source)} contentFit="cover" contentPosition={focus || { top: "20%", left: "50%" }} blurRadius={blur} transition={200} onError={() => setFailed(true)} style={[StyleSheet.absoluteFill, { opacity: dim }]} /> : <NoPhoto side={side} name={name} />}
        {/* the side light: their colour from the outer edge */}
        <LinearGradient colors={[tint, "rgba(0,0,0,0)"]} start={{ x: blue ? 0 : 1, y: 0.5 }} end={{ x: blue ? 0.7 : 0.3, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(3,5,10,0.15)", "rgba(3,5,10,0)", "rgba(3,5,10,0.95)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      </View>
      {edge && !glow ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: `inset 0 0 0 1.5px ${blue ? "rgba(79,155,255,0.5)" : "rgba(255,77,85,0.38)"}` }]} /> : null}
      <View style={[StyleSheet.absoluteFill, { padding: 12, justifyContent: "flex-end" }]}>{children}</View>
    </View>
  );
}

/** A small portrait card in a player's colour: a lit edge and glow, no ring. */
export function PortraitMini({ source, side = "left", name, width = 64, height = 80, radius = 16, style }) {
  const [failed, setFailed] = React.useState(false);
  const blue = side === "left";
  const colour = blue ? "79,155,255" : "255,90,98";
  return (
    <View style={[{ width, height, borderRadius: radius, boxShadow: `0 0 26px -4px rgba(${colour},0.65), 0 16px 30px -14px #000` }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden", backgroundColor: "#05080e" }]}>
        {source && !failed ? <Image source={imageSource(source)} contentFit="cover" contentPosition={{ top: "18%", left: "50%" }} transition={200} onError={() => setFailed(true)} style={StyleSheet.absoluteFill} /> : <NoPhoto side={side} name={name} size={Math.round(height * 0.5)} />}
        <LinearGradient colors={[`rgba(${colour},0.4)`, "rgba(0,0,0,0)"]} start={{ x: blue ? 0 : 1, y: 0.5 }} end={{ x: blue ? 0.75 : 0.25, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(3,5,10,0)", "rgba(3,5,10,0.55)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: `inset 0 0 0 1.5px rgba(${colour},0.85), inset 0 1px 0 rgba(255,255,255,0.35)` }]} />
    </View>
  );
}

/** When someone has no photo: a dark plate lit in their colour. */
export function NoPhoto({ side = "left", name, size = 64 }) {
  const blue = side === "left";
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
      <LinearGradient colors={blue ? ["#0e2756", "#05080e"] : ["#3a0d14", "#05080e"]} style={StyleSheet.absoluteFill} />
      {name ? <Text style={[styles.initial, { fontSize: size, color: blue ? "rgba(130,180,255,0.55)" : "rgba(255,139,146,0.5)" }]}>{name.trim()[0]?.toUpperCase()}</Text> : null}
    </View>
  );
}

/** A slanted tag (.p2 .tag, .w): 1P, 2P, WINNER. */
export function SlantTag({ label, colour = "#2a6af0", size = 11, style }) {
  return (
    <View style={[styles.slant, { backgroundColor: colour, boxShadow: `0 6px 18px -6px ${colour}` }, style]}>
      <Text style={[styles.slantText, { fontSize: size }]}>{label}</Text>
    </View>
  );
}

/** Wide spokes of light turning slowly behind the middle of the screen. */
export function TurningRays({ size = 760, colour = "rgba(79,155,255,0.2)", count = 20, duty = 0.34, period = 60000, style }) {
  const ready = useSkiaReady();
  const reduce = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    turn.value = withRepeat(withTiming(360, { duration: period, easing: Easing.linear }), -1, false);
  }, [reduce, turn, period]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  if (!ready) return null;
  const { SpokesCanvas } = battleSkia();
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, spin, style]}>
      <SpokesCanvas size={size} colour={colour} count={count} duty={duty} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lock: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, height: 34, paddingHorizontal: 14, borderRadius: R.full, alignSelf: "flex-start" },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  bubble: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: "80%" },
  bubbleMine: { alignSelf: "flex-start", borderBottomLeftRadius: 5 },
  bubbleTheirs: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  bubbleText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kick: { fontFamily: F.bodySemi, fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  display: { color: C.text, fontFamily: F.display, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.4)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  fact: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  factLine: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.1)" },
  factValue: { color: "#fff", fontFamily: F.display, lineHeight: 24 },
  factLabel: { color: "#a3adbd", fontFamily: F.body, fontSize: 11, marginTop: 3 },
  glassCard: { borderRadius: 26 },
  initial: { fontFamily: F.display, fontSize: 64 },
  slant: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, transform: [{ skewX: "-10deg" }] },
  slantText: { color: "#fff", fontFamily: F.display, letterSpacing: 1, textTransform: "uppercase" },
});
