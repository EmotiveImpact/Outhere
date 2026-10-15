// Building blocks for getting started and the Settings screens: the glowing
// slab hero, a top bar with step dashes, grouped cards of rows, the blue
// toggle and a small segmented control, all in the demo's style.

import React from "react";
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ChevronLeft, ChevronsRight } from "lucide-react-native";
import { BlendImage, C, F, FINISH, GlowBackdrop, Grain, LIT, PressableScale, R, S, TOP_GAP, splitShadow } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { StackTabBar } from "@/components/AppTabBar";

/**
 * Asks before something that can't be undone. Resolves true when the member
 * says yes. The web has no native alert buttons, so it uses the browser's.
 */
export const confirmAsk = ({ title, body = "", ok = "OK", danger = false }) =>
  new Promise((resolve) => {
    if (Platform.OS === "web") {
      resolve(typeof window !== "undefined" && window.confirm(body ? `${title}\n\n${body}` : title));
      return;
    }
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: danger ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });

/** Round back button used across these screens. */
export function BackButton({ onPress, style }) {
  const router = useRouter();
  const go = () => {
    hapticSelection();
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <PressableScale onPress={go} hitSlop={10} scaleTo={0.9} accessibilityLabel="Back" style={[styles.round, style]}>
      <View>
        <ChevronLeft size={19} color="#fff" />
      </View>
    </PressableScale>
  );
}

/** Round icon button for the top corners. */
export function RoundButton({ icon: Icon, onPress, label, style }) {
  return (
    <PressableScale onPress={onPress} hitSlop={10} scaleTo={0.9} accessibilityLabel={label} style={[styles.round, style]}>
      <View>
        <Icon size={18} color="#fff" />
      </View>
    </PressableScale>
  );
}

/** Back on the left, a centred title, an optional round button on the right. */
export function TopBar({ title, right, onBack, style }) {
  return (
    <View style={[styles.topBar, style]}>
      <BackButton onPress={onBack} />
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {right || <View style={{ width: 40 }} />}
    </View>
  );
}

/** Four short dashes, the current one long and blue. */
export function StepDashes({ count = 4, index = 0 }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => (
        <MotiView
          key={i}
          animate={{ width: i === index ? 30 : 16, backgroundColor: i === index ? C.accent : i < index ? "#2c3a52" : "#262b35" }}
          transition={{ type: "timing", duration: 260 }}
          style={{ height: 4, borderRadius: 2 }}
        />
      ))}
    </View>
  );
}

/** Back, dashes and Skip, floating over a hero. */
export function OnboardingBar({ index, onBack, onSkip, top = 0 }) {
  return (
    <View style={[styles.bar, { top }]}>
      <BackButton onPress={onBack} />
      <StepDashes index={index} />
      {onSkip ? (
        <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      ) : (
        <View style={{ width: 42 }} />
      )}
    </View>
  );
}

const SLAB_EDGE = splitShadow(FINISH.slabEdge);

/**
 * The slab (.slab, .oh-slab): smooth blue light from the upper right, film
 * grain, rounded at the bottom and lit along its lower edge, with a kicker
 * and a two-tone headline. `object` floats a 3D object on the right with its
 * black dropped out and a breathing glow behind it. `background` replaces
 * the light with your own picture (a photo and its shade).
 */
export function GlowHero({ kicker, kickerColor, top, bottom, height = 300, size = 44, background, object, objectSize, objectTop, objectStyle, objectProps, children, style }) {
  const insets = useSafeAreaInsets();
  const obj = objectSize || Math.round(height * 0.9);
  return (
    <View style={[styles.slabWrap, { boxShadow: SLAB_EDGE.outer }, style]}>
      <View style={[styles.slab, { height: height + insets.top }]}>
        {background || <GlowBackdrop preset="slab" />}
        {object ? (
          <BlendImage source={object} size={obj} float glow={Math.round(obj * 1.2)} {...objectProps} style={[{ position: "absolute", right: -30, top: objectTop != null ? insets.top + objectTop - 14 : insets.top + (height - obj) / 2 - 6 }, objectStyle]} />
        ) : null}
        <Grain amount={0.06} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.slabRound, { boxShadow: SLAB_EDGE.inset }]} />
        <View style={styles.heroText}>
          {kicker ? <Text style={[styles.kicker, kickerColor ? { color: kickerColor } : null]}>{kicker}</Text> : null}
          {top ? (
            <Text style={[styles.headline, { fontSize: size, lineHeight: size * 0.96 }]} numberOfLines={2} adjustsFontSizeToFit>
              {top}
            </Text>
          ) : null}
          {bottom ? (
            <Text style={[styles.headline, styles.blue, { fontSize: size, lineHeight: size * 0.96 }]} numberOfLines={2} adjustsFontSizeToFit>
              {bottom}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </View>
  );
}

/**
 * A settings page whose top is the glowing slab: back on the left, an
 * optional round button on the right, then the body under it.
 */
export function HeroPage({ kicker, kickerColor, top, bottom, height = 210, size, right, background, object, objectSize, objectTop, objectStyle, objectProps, children, bodyStyle, footer, tab, onRefresh, refreshing = false }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + (tab ? 120 : 40) }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} progressViewOffset={insets.top} /> : undefined}
      >
        <GlowHero kicker={kicker} kickerColor={kickerColor} objectProps={objectProps} top={top} bottom={bottom} height={height} size={size} background={background} object={object} objectSize={objectSize} objectTop={objectTop} objectStyle={objectStyle} />
        <View style={[{ paddingHorizontal: 18, paddingTop: 16, gap: 12 }, bodyStyle]}>{children}</View>
      </ScrollView>
      <View style={[styles.heroBar, { top: insets.top + TOP_GAP }]}>
        <BackButton />
        {right || null}
      </View>
      {footer}
      {tab ? <StackTabBar current={tab} /> : null}
    </View>
  );
}

/** A soft blue light in the top right of a slab. */
export function Glow({ size = 420, right = -120, top = -60, opacity = 0.42 }) {
  return (
    <Svg pointerEvents="none" width={size} height={size} style={{ position: "absolute", right, top }}>
      <Defs>
        <RadialGradient id="slabGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#3d8bff" stopOpacity={opacity} />
          <Stop offset="0.45" stopColor="#2a5fc0" stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor="#0d1524" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#slabGlow)" />
    </Svg>
  );
}

/** Headline without a slab, for screens whose top is plain. */
export function PlainHeadline({ kicker, top, bottom, size = 46, style }) {
  return (
    <View style={style}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={[styles.headline, { fontSize: size, lineHeight: size }]}>{top}</Text>
      {bottom ? <Text style={[styles.headline, styles.blue, { fontSize: size, lineHeight: size }]}>{bottom}</Text> : null}
    </View>
  );
}

/** A rounded card holding rows separated by hairlines. */
export function Group({ children, highlight = false, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { boxShadow: highlight ? "0 14px 34px -16px rgba(42,106,240,0.65)" : FINISH.shadowCard }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.groupClip]}>
        <LinearGradient colors={highlight ? ["#13213d", "#0f1626"] : LIT} style={StyleSheet.absoluteFill} />
      </View>
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={styles.sep} /> : null}
          {child}
        </React.Fragment>
      ))}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.groupClip, { boxShadow: highlight ? "inset 0 1px 0 rgba(130,180,255,0.45), inset 0 0 0 1px rgba(61,139,255,0.35)" : FINISH.litEdge }]} />
    </View>
  );
}

/** One row: icon, title, a line under it, then whatever sits on the right. */
export function Row({ icon: Icon, title, hint, value, right, onPress, danger = false, chevron, iconColour, disabled, children }) {
  const showChevron = chevron ?? (!!onPress && !right);
  const body = (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      {Icon ? <Icon size={19} color={danger ? C.danger : iconColour || C.textDim} strokeWidth={1.8} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: C.danger }]}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {children}
      </View>
      {value != null ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {showChevron ? <ChevronsRight size={16} color={C.textDim} /> : null}
    </View>
  );
  if (!onPress || disabled) return body;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985}>
      {body}
    </PressableScale>
  );
}

/** The blue pill toggle from the demo. */
export function Toggle({ value, onChange, disabled = false, label }) {
  const on = !!value;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapticSelection();
        onChange?.(!on);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View style={[styles.track, on && styles.trackOn]}>
        <MotiView animate={{ opacity: on ? 1 : 0 }} transition={{ type: "timing", duration: 200 }} style={[StyleSheet.absoluteFill, { borderRadius: 14, overflow: "hidden" }]}>
          <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={StyleSheet.absoluteFill} />
        </MotiView>
        <MotiView animate={{ translateX: on ? 18 : 0 }} transition={{ type: "spring", damping: 16, stiffness: 240 }} style={styles.thumb}>
          <LinearGradient colors={["#ffffff", "#dfe5ee"]} style={[StyleSheet.absoluteFill, { borderRadius: 11 }]} />
        </MotiView>
      </View>
    </Pressable>
  );
}

/** Small segmented control: km / miles, Hype / Calm / Off. */
export function MiniSegment({ options, value, onChange, style }) {
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (active) return;
              hapticSelection();
              onChange(opt.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segItem, active && styles.segItemOn]}
          >
            {active ? <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
            <Text style={[styles.segText, active && { color: "#fff" }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small line of help text with an optional icon, under a card. */
export function Note({ icon: Icon, children, style }) {
  return (
    <View style={[{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 4 }, style]}>
      {Icon ? <Icon size={14} color={C.accent} style={{ marginTop: 2 }} /> : null}
      <Text style={styles.note}>{children}</Text>
    </View>
  );
}

export const accountStyles = StyleSheet.create({
  field: { borderRadius: 18, backgroundColor: "#15181e", paddingLeft: 14, paddingRight: 14, paddingTop: 11, paddingBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderTopColor: "rgba(255,255,255,0.1)", boxShadow: FINISH.shadowCard },
  fieldOn: { borderColor: C.accent, borderTopColor: C.accent, backgroundColor: "#121a2a", boxShadow: "0 0 0 1px rgba(61,139,255,0.35), 0 12px 30px -16px rgba(42,106,240,0.8)" },
  fieldLabel: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 10.5 },
  input: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, paddingVertical: 3, marginTop: 4, outlineStyle: "none" },
});

const styles = StyleSheet.create({
  // .round.glass: 38px, frosted, a faint ring
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", ...(Platform.OS === "web" ? { backdropFilter: "blur(12px)" } : null) },
  heroBar: { position: "absolute", left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, paddingHorizontal: S.gutter },
  topTitle: { flex: 1, textAlign: "center", color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  bar: { position: "absolute", left: S.gutter, right: S.gutter, zIndex: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 44 },
  skip: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 14 },
  slabWrap: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  slab: { backgroundColor: FINISH.slab.base, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden", justifyContent: "flex-end" },
  slabRound: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -30, top: 20, backgroundColor: "rgba(40,90,190,0.20)" },
  // .slab .hl: 18 in, 22 up
  heroText: { paddingHorizontal: 18, paddingBottom: 22 },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 48, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  blue: { color: "#4b93ff", textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  // .setlist / .card with the lit finish
  group: { borderRadius: 20 },
  groupClip: { borderRadius: 20, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 14, marginRight: 14 },
  // .setlist .sr: 12 down, 14 in, 13px text
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, paddingVertical: 12, paddingHorizontal: 14 },
  rowTitle: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13.5 },
  rowHint: { color: C.textDim, fontFamily: F.body, fontSize: 11, lineHeight: 15, marginTop: 2 },
  rowValue: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  // .switch: 46 by 28, the act gradient and a glow when on
  track: { width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: "#1d222b", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" },
  trackOn: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 0 16px -4px rgba(42,106,240,0.9)" },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" },
  seg: { flexDirection: "row", padding: 3, borderRadius: R.full, backgroundColor: "#0b0d11", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  segItem: { minWidth: 46, height: 30, paddingHorizontal: 12, borderRadius: R.full, alignItems: "center", justifyContent: "center" },
  segItemOn: { overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px -8px rgba(42,106,240,0.9)" },
  segText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  note: { flex: 1, color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
});
