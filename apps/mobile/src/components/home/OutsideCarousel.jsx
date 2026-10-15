// Home's "outside now" carousel, under the three quick buttons. It slides on
// its own: who's out, the next event, a challenge to chase and the next drop.

import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { Avatar, C, F, Kicker, LiveDot, PressableScale, R, Row, S } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";

function Slide({ slide, width, height }) {
  return (
    <PressableScale onPress={slide.onPress} scaleTo={0.98} style={[styles.slide, { width, height }]}>
      {slide.image ? <Image source={imageSource(slide.image)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient colors={["rgba(7,9,12,0.15)", "rgba(7,9,12,0.55)", "rgba(7,9,12,0.95)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Row gap={6}>
          {slide.live ? <LiveDot size={7} /> : null}
          <Kicker colour={slide.live ? C.accentHi : C.accent}>{slide.kicker}</Kicker>
        </Row>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }} gap={S.md}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{slide.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{slide.body}</Text>
          </View>
          {slide.faces?.length ? (
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

export default function OutsideCarousel({ slides, height = 150, interval = 4500 }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - S.gutter * 2;
  const list = useRef(null);
  const [index, setIndex] = useState(0);
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
  content: { flex: 1, padding: S.lg, justifyContent: "space-between" },
  title: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 32, textTransform: "uppercase" },
  body: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  go: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.borderStrong },
  pipOn: { width: 18, backgroundColor: C.accent },
});
