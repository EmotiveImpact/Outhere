// Move tab: live GPS tracking for walks, runs and rides. The map fills the
// screen; panels float over it. Finished sessions are saved to the engine.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { AnimatePresence, MotiText, MotiView } from "moti";
import { History, LocateFixed, Satellite } from "lucide-react-native";
import { Body, C, F, IconButton, Label, Loading, R, Row, S, TAB_BAR_SPACE, Title } from "@/components/ui";
import { useProfile } from "@/data/hooks";
import { hapticHeavy, hapticSelection } from "@/services/haptics";
import { MOVE_SESSION_PHASE as PHASE, useMoveStore } from "@/store/useMoveStore";
import { activityFor } from "@/components/move/geo";
import RunMap from "@/components/move/RunMap";
import StartPanel from "@/components/move/StartPanel";
import PlanPanel from "@/components/move/PlanPanel";
import LiveSessionPanel from "@/components/move/LiveSessionPanel";
import SummarySheet from "@/components/move/SummarySheet";
import HistorySheet from "@/components/move/HistorySheet";
import LocationDenied from "@/components/move/LocationDenied";

const RECORDING = [PHASE.COUNTDOWN, PHASE.ACTIVE, PHASE.PAUSED];

export default function MoveScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const mapRef = useRef(null);
  const { data: profile } = useProfile();

  const phase = useMoveStore((s) => s.sessionPhase);
  const activityType = useMoveStore((s) => s.activityType);
  const isPlanning = useMoveStore((s) => s.isPlanning);
  const segments = useMoveStore((s) => s.segments);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const waypoints = useMoveStore((s) => s.waypoints);
  const store = useMoveStore.getState;

  const [permission, setPermission] = useState({ status: "checking", canAskAgain: true });
  const [location, setLocation] = useState(null);
  const [follow, setFollow] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [count, setCount] = useState(null);

  const recording = RECORDING.includes(phase);
  const granted = permission.status === "granted";

  // ── Permission ───────────────────────────────────────────────────────────
  const checkPermission = useCallback(async (ask) => {
    try {
      let res = await Location.getForegroundPermissionsAsync();
      if (res.status !== "granted" && ask && res.canAskAgain !== false) res = await Location.requestForegroundPermissionsAsync();
      setPermission({ status: res.status === "granted" ? "granted" : "denied", canAskAgain: res.canAskAgain !== false });
      if (res.status === "granted") {
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last?.coords) setLocation((cur) => cur || last.coords);
      }
    } catch {
      setPermission({ status: "denied", canAskAgain: false });
    }
  }, []);

  useEffect(() => {
    store().loadSavedRoutes();
    checkPermission(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermission(false);
    });
    return () => sub.remove();
  }, [checkPermission]);

  // ── Location watch: battery friendly when idle, precise while recording ──
  useEffect(() => {
    if (!granted || (!focused && !recording)) return undefined;
    let sub = null;
    let cancelled = false;
    Location.watchPositionAsync(
      recording
        ? { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 }
        : { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
      (loc) => {
        setLocation(loc.coords);
        store().addPoint(loc.coords, loc.timestamp);
      },
    )
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [granted, focused, recording]);

  // ── Countdown then start ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.COUNTDOWN) {
      setCount(null);
      return undefined;
    }
    setCount(3);
    hapticHeavy();
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        hapticHeavy();
        setFollow(true);
        store().start();
      } else {
        hapticSelection();
        setCount(n);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const recenter = () => {
    setFollow(true);
    if (location) mapRef.current?.recenter(location);
  };

  const startPlanning = () => {
    setFollow(false);
    store().setPlanning(true);
  };

  if (permission.status === "checking") {
    return (
      <View style={styles.fill}>
        <Loading style={{ flex: 1, justifyContent: "center" }} />
      </View>
    );
  }

  if (!granted && !recording) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top, paddingBottom: TAB_BAR_SPACE }]}>
        <Row style={styles.topBar}>
          <Title size={26} style={{ flex: 1 }}>
            Move
          </Title>
          <IconButton icon={History} label="History" onPress={() => setHistoryOpen(true)} />
        </Row>
        <LocationDenied canAskAgain={permission.canAskAgain} onRetry={() => checkPermission(true)} />
        <HistorySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} />
        <SummarySheet />
      </View>
    );
  }

  const weekKm = profile?.week?.runsKm || 0;
  const panelBottom = TAB_BAR_SPACE - 26 + insets.bottom;

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <RunMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        userLocation={location}
        follow={follow && !isPlanning}
        segments={segments}
        plannedPath={plannedPath}
        waypoints={isPlanning ? waypoints : []}
        onPress={isPlanning ? store().addWaypoint : undefined}
        onUserPan={() => follow && setFollow(false)}
      />

      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + S.sm }]} pointerEvents="box-none">
        {recording ? (
          <Row style={styles.topBar} pointerEvents="box-none">
            <View style={styles.badge}>
              <Satellite size={14} color={location?.accuracy && location.accuracy < 25 ? C.accent : C.warn} />
              <Text style={styles.badgeText}>{location?.accuracy ? `GPS ±${Math.round(location.accuracy)} m` : "Finding GPS"}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <IconButton icon={LocateFixed} label="Recentre" onPress={recenter} style={follow ? styles.onButton : null} />
          </Row>
        ) : isPlanning ? (
          <Row style={styles.topBar} pointerEvents="box-none">
            <View style={styles.headerCard}>
              <Title size={20}>Plan a route</Title>
              <Body dim size={13}>Tap the map to add points.</Body>
            </View>
            <View style={{ flex: 1 }} />
            <IconButton icon={LocateFixed} label="Recentre" onPress={recenter} />
          </Row>
        ) : (
          <Row style={styles.topBar} pointerEvents="box-none">
            <View style={styles.headerCard}>
              <Title size={26}>Move</Title>
              <Body dim size={13}>{weekKm > 0 ? `${weekKm.toFixed(1)} km logged this week` : "Get your first session in this week"}</Body>
            </View>
            <View style={{ flex: 1 }} />
            <Row gap={S.sm}>
              <IconButton icon={LocateFixed} label="Recentre" onPress={recenter} style={follow ? styles.onButton : null} />
              <IconButton icon={History} label="History" onPress={() => setHistoryOpen(true)} />
            </Row>
          </Row>
        )}
      </View>

      {/* Bottom panels */}
      <View style={styles.bottom} pointerEvents="box-none">
        {phase === PHASE.ACTIVE || phase === PHASE.PAUSED ? (
          <LiveSessionPanel bottomInset={insets.bottom} onFinish={() => store().finish()} />
        ) : phase === PHASE.IDLE && isPlanning ? (
          <PlanPanel bottom={panelBottom} onDone={() => store().setPlanning(false)} />
        ) : phase === PHASE.IDLE ? (
          <StartPanel bottom={panelBottom} onPlan={startPlanning} onStart={() => store().beginCountdown()} />
        ) : null}
        {phase === PHASE.IDLE && !location ? (
          <Text style={[styles.hint, { bottom: panelBottom - 22 }]}>Finding your location...</Text>
        ) : null}
      </View>

      {/* Countdown */}
      <AnimatePresence>
        {phase === PHASE.COUNTDOWN ? (
          <MotiView key="countdown" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.countdown}>
            <Label style={{ color: C.accent }}>{activityFor(activityType).label} starting</Label>
            <MotiText
              key={count}
              from={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              style={styles.countText}
            >
              {count}
            </MotiText>
            <Pressable onPress={() => store().cancelCountdown()} hitSlop={12} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </MotiView>
        ) : null}
      </AnimatePresence>

      <SummarySheet />
      <HistorySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  top: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: { paddingHorizontal: S.gutter, paddingVertical: S.sm, alignItems: "flex-start" },
  headerCard: { backgroundColor: "rgba(10,10,10,0.88)", borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg, paddingVertical: S.md },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: S.md, borderRadius: R.full, backgroundColor: "rgba(10,10,10,0.9)", borderWidth: 1, borderColor: C.border },
  badgeText: { color: C.text, fontSize: 12, fontWeight: "600" },
  onButton: { borderColor: C.accent },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  hint: { position: "absolute", alignSelf: "center", color: C.textDim, fontSize: 12 },
  countdown: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.92)", alignItems: "center", justifyContent: "center" },
  countText: { color: C.accent, fontFamily: F.display, fontSize: 160, lineHeight: 170 },
  cancel: { marginTop: S.xxl, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.full, borderWidth: 1, borderColor: C.borderStrong },
  cancelText: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
});
