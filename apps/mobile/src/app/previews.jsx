// Watch, widgets and lock screen: previews of the parts of Outhere that live
// outside the app, drawn from the prototype and filled with your own numbers
// (steps, streak, the battle, your club, the run going on Move). Each one is
// a whole page, full screen like the prototype: swipe between them, use the
// arrow keys on a keyboard, or open the list to jump. The real watch app,
// widgets and Live Activity need the iPhone build; see NATIVE_TARGETS.md.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Info } from "@/components/ui/icons";
import { C, F, PressableScale, Sheet, Skeleton, TOP_GAP } from "@/components/ui";
import { RoundGlass } from "@/components/profile/parts";
import { usePreviewData } from "@/components/previews/data";
import { WATCH_SCREENS, WatchPage, WatchRunPage } from "@/components/previews/Watch";
import { HomeWidgets } from "@/components/previews/Widgets";
import { LockBattle, LockLive, LockRun } from "@/components/previews/Lock";

// Every preview, in the order you'd meet them: the lock screen, the run as a
// Live Activity, widgets, then the watch from the face to run saved.
const PAGES = [
  { key: "lock", group: "Lock screen", label: "Battle and steps", render: (d) => <LockBattle d={d} /> },
  { key: "lockRun", group: "Lock screen", label: "Live Activity", render: (d) => <LockRun d={d} /> },
  { key: "lockLive", group: "Lock screen", label: "Mid run", render: (d) => <LockLive d={d} /> },
  { key: "widgets", group: "Home screen", label: "Widgets", render: (d) => <HomeWidgets d={d} /> },
  { key: "watchRun", group: "Apple Watch", label: "On the watch", render: (d) => <WatchRunPage d={d} /> },
  ...WATCH_SCREENS.map((s, i) => ({ key: `w-${s.key}`, group: "Apple Watch", label: s.label, watch: i })),
];
const FIRST_WATCH = PAGES.findIndex((p) => p.watch === 0);

// Previous and next arrows on the web, where a mouse can't swipe.
const EDGES = Platform.OS === "web";

// Frosted glass for the counter pill over the pictures.
const BLUR = Platform.OS === "web" ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : null;

export default function PreviewsScreen() {
  const d = usePreviewData();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const start = Math.max(0, Math.min(PAGES.length - 1, Number(params.page) || 0));
  const [at, setAt] = useState(start);
  const [list, setList] = useState(false);
  const [note, setNote] = useState(true);
  const scroller = useRef(null);
  const atRef = useRef(start);
  atRef.current = at;

  const go = useCallback(
    (i, animated = true) => {
      const n = Math.max(0, Math.min(PAGES.length - 1, i));
      setAt(n);
      scroller.current?.scrollTo({ x: n * width, y: 0, animated });
    },
    [width],
  );

  // Open on ?page=, and keep the page in place when the window resizes.
  useEffect(() => {
    if (!d.ready) return;
    const t = setTimeout(() => go(atRef.current, false), 0);
    return () => clearTimeout(t);
  }, [d.ready, width, go]);

  // Arrow keys on a keyboard (the web build).
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const key = (e) => {
      if (e.key === "ArrowRight") go(atRef.current + 1);
      if (e.key === "ArrowLeft") go(atRef.current - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go]);

  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== atRef.current && i >= 0 && i < PAGES.length) setAt(i);
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace("/settings"));
  const page = PAGES[at];

  return (
    <View style={styles.screen}>
      {!d.ready ? (
        <View style={{ flex: 1, padding: 18, paddingTop: insets.top + 70 }}>
          <Skeleton height={height * 0.7} radius={28} />
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentOffset={{ x: start * width, y: 0 }}
          style={{ flex: 1 }}
        >
          {PAGES.map((p, i) => (
            <View key={p.key} style={{ width, height }}>
              {/* Only the pages beside the one you're on are drawn. */}
              {Math.abs(i - at) <= 1 ? p.watch != null ? <WatchPage d={d} index={p.watch} onGo={(w) => go(FIRST_WATCH + w)} /> : p.render(d) : null}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Back on the left; where you are and the list of every preview on the right */}
      <View style={[styles.bar, { top: insets.top + TOP_GAP }]} pointerEvents="box-none">
        <RoundGlass icon={ChevronLeft} label="Back" onPress={close} />
        <PressableScale onPress={() => setList(true)} scaleTo={0.94} accessibilityLabel={`${page.label}, ${at + 1} of ${PAGES.length}. Show every preview`} style={[styles.count, BLUR]}>
          <Text style={styles.countText}>
            {at + 1}
            <Text style={styles.countOf}> / {PAGES.length}</Text>
          </Text>
        </PressableScale>
      </View>

      {/* Previous and next, low on each edge, for when there's no swipe */}
      {EDGES && at > 0 ? (
        <Pressable onPress={() => go(at - 1)} accessibilityRole="button" accessibilityLabel="Previous preview" hitSlop={8} style={[styles.edge, styles.edgeLeft, { top: height * 0.5 - 22 }, BLUR]}>
          <View>
            <ChevronLeft size={18} color="#fff" />
          </View>
        </Pressable>
      ) : null}
      {EDGES && at < PAGES.length - 1 ? (
        <Pressable onPress={() => go(at + 1)} accessibilityRole="button" accessibilityLabel="Next preview" hitSlop={8} style={[styles.edge, styles.edgeRight, { top: height * 0.5 - 22 }, BLUR]}>
          <View>
            <ChevronRight size={18} color="#fff" />
          </View>
        </Pressable>
      ) : null}

      <Sheet visible={list} onClose={() => setList(false)} scroll>
        <Text style={styles.sheetTitle}>Watch, widgets and lock screen</Text>
        {note ? (
          <Pressable onPress={() => setNote(false)} style={styles.note} accessibilityLabel="These are previews">
            <View>
              <Info size={16} color={C.accentHi} />
            </View>
            <Text style={styles.noteText}>These are previews. The real watch app, widgets and Live Activity come with the iPhone build.</Text>
          </Pressable>
        ) : null}
        {PAGES.map((p, i) => (
          <React.Fragment key={p.key}>
            {i === 0 || PAGES[i - 1].group !== p.group ? <Text style={styles.group}>{p.group}</Text> : null}
            <PressableScale
              onPress={() => {
                setList(false);
                go(i, false);
              }}
              scaleTo={0.98}
              accessibilityLabel={p.label}
              style={[styles.row, i === at && styles.rowOn]}
            >
              <Text style={[styles.rowNum, i === at && { color: C.accentHi }]}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={styles.rowText}>{p.label}</Text>
            </PressableScale>
          </React.Fragment>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#03050a" },
  bar: { position: "absolute", left: 18, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { height: 38, paddingHorizontal: 13, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  countText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  countOf: { color: "rgba(255,255,255,0.6)", fontFamily: F.body },
  edge: { position: "absolute", width: 32, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,20,0.35)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" },
  edgeLeft: { left: 6 },
  edgeRight: { right: 6 },
  sheetTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, marginBottom: 10 },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 16, backgroundColor: "rgba(61,139,255,0.1)", boxShadow: "inset 0 0 0 1px rgba(61,139,255,0.3)", marginBottom: 6 },
  noteText: { flex: 1, color: C.textSoft, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  group: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 14 },
  rowOn: { backgroundColor: "rgba(61,139,255,0.12)", boxShadow: "inset 0 0 0 1px rgba(61,139,255,0.45)" },
  rowNum: { color: C.textMute, fontFamily: F.display, fontSize: 15, width: 22 },
  rowText: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13.5 },
});
