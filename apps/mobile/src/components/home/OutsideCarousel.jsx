// Home's carousel, just above the tab bar. It slides on its own: who's out,
// today's challenge (with Go and the flame), the next event, a challenge to chase and the
// next drop (with a countdown and Remind me).

import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "@/components/ui/icons";
import { Avatar, BlendImage, C, F, Kicker, LiveDot, PressableScale, R, Row, S } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";

const pad = (n) => String(n).padStart(2, "0");
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

function Countdown({ to, label }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={styles.body}>
      {label} <Text style={styles.clock}>{clock(to - now)}</Text>
    </Text>
  );
}

function Slide({ slide, width, height }) {
  const Icon = slide.icon;
  return (
    <PressableScale onPress={slide.onPress} scaleTo={0.98} style={[styles.slide, { width, height }]}>
      {slide.image ? <Image source={imageSource(slide.image)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient
        colors={slide.image ? ["rgba(7,9,12,0.15)", "rgba(7,9,12,0.6)", "rgba(7,9,12,0.95)"] : ["#141a24", "#0b0e13"]}
        locations={slide.image ? [0, 0.45, 1] : [0, 1]}
        style={StyleSheet.absoluteFill}
      />
      {slide.art ? (
        // The picture's black drops out and its edges fade, so it melts into the card (Edem, 2026-10-17).
        <BlendImage source={slide.art} width={height * 1.15} height={height} mask="wide" style={styles.art} />
      ) : null}
      <View style={styles.content}>
        <View>
          <Row gap={6}>
            {slide.live ? <LiveDot size={7} /> : Icon ? <Icon size={13} color={C.accentHi} /> : null}
            <Kicker colour={slide.live ? C.accentHi : C.accent}>{slide.kicker}</Kicker>
          </Row>
          <Text style={styles.title} numberOfLines={1}>
            {slide.title}
          </Text>
        </View>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }} gap={S.md}>
          <View style={{ flex: 1 }}>
            {slide.countdownTo ? <Countdown to={slide.countdownTo} label={slide.countdownLabel || "Starts in"} /> : <Text style={styles.body} numberOfLines={2}>{slide.body}</Text>}
          </View>
          {slide.action ? (
            <PressableScale onPress={slide.action.onPress} scaleTo={0.94} hitSlop={6} style={[styles.action, slide.action.primary && styles.actionPrimary]} accessibilityLabel={slide.action.label}>
              <Text style={styles.actionText}>{slide.action.label}</Text>
            </PressableScale>
          ) : slide.faces?.length ? (
            <Row gap={0}>
              {slide.faces.slice(0, 4).map((p, i) => (
                <Avatar key={p.id} uri={p.avatar} name={p.name} tier={p.tier} dot={p.isOutside ? "out" : null} size={30} style={{ marginLeft: i ? -8 : 0 }} />
              ))}
            </Row>
          ) : (
            <View style={styles.go}>
              <ArrowRight size={18} color={C.text} />
            </View>
          )}
        </Row>
      </View>
    </PressableScale>
  );
}

export default function OutsideCarousel({ slides, height = 150, interval = 4500, start = 0 }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - S.gutter * 2;
  const list = useRef(null);
  const [index, setIndex] = useState(start);
  const touching = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => {
      if (touching.current) return;
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        list.current?.scrollToOffset({ offset: next * (width + S.md), animated: true });
        return next;
      });
    }, interval);
    return () => clearInterval(t);
  }, [slides.length, width, interval]);

  return (
    <View>
      <FlatList
        ref={list}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled={false}
        snapToInterval={width + S.md}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: S.md }} />}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (width + S.md)));
        }}
        renderItem={({ item }) => <Slide slide={item} width={width} height={height} />}
      />
      <Row gap={6} style={{ justifyContent: "center", marginTop: 10 }}>
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.pip, i === index && styles.pipOn]} />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface },
  // A rendered object on the right of a plain card, like the flame on Today's challenge.
  art: { position: "absolute", right: 0, top: 0, bottom: 0 },
  content: { flex: 1, padding: S.lg, justifyContent: "space-between" },
  title: { color: C.text, fontFamily: F.display, fontSize: 28, lineHeight: 30, textTransform: "uppercase", marginTop: 8 },
  body: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  clock: { color: C.text, fontFamily: F.bodySemi },
  go: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  action: { height: 36, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: "rgba(60,64,72,0.9)", alignItems: "center", justifyContent: "center" },
  actionPrimary: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  actionText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.borderStrong },
  pipOn: { width: 18, backgroundColor: C.accent },
});
