// Move tab: live GPS tracking for walks, runs and rides. The map fills the
// screen; panels float over it. Finished sessions are saved to the engine.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { AnimatePresence } from "moti";
import { History, LocateFixed } from "lucide-react-native";
import { Body, C, IconButton, Label, LiveDot, R, Row, S, TAB_BAR_SPACE, Title } from "@/components/ui";
import { useProfile } from "@/data/hooks";
import { hapticHeavy } from "@/services/haptics";
import { MOVE_SESSION_PHASE as PHASE, useMoveStore } from "@/store/useMoveStore";
import { activityFor } from "@/components/move/geo";
import RunMap from "@/components/move/RunMap";
import StartPanel from "@/components/move/StartPanel";
import PlanPanel from "@/components/move/PlanPanel";
import LiveSessionPanel from "@/components/move/LiveSessionPanel";
import SummarySheet from "@/components/move/SummarySheet";
import HistorySheet from "@/components/move/HistorySheet";
import LocationDenied from "@/components/move/LocationDenied";
import Countdown from "@/components/move/Countdown";

// expo-location's web build throws from remove() after it has already stopped
// the watch, so swallow that rather than crash the tab.
const safeRemove = (sub) => {
  try {
    sub?.remove();
  } catch {
    // already stopped
  }
};

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
        if (cancelled) safeRemove(s);
        else sub = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      safeRemove(sub);
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
        hapticHeavy();
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.md }}>
          <LiveDot size={12} />
          <Label>Finding you</Label>
        </View>
      </View>
    );
  }

  if (!granted && !recording) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top, paddingBottom: TAB_BAR_SPACE }]}>
        <Row style={styles.topBar}>
          <Title size={30} style={{ flex: 1 }}>
            Move
          </Title>
          <IconButton icon={History} label="History" onPress={() => setHistoryOpen(true)} />
        </Row>
        <LocationDenied canAskAgain={permission.canAskAgain} onRetry={() => checkPermission(true)} onHistory={() => setHistoryOpen(true)} />
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
              <Title size={28}>Move</Title>
              <Row gap={6} style={{ marginTop: 2 }}>
                {location ? <LiveDot size={6} /> : null}
                <Body dim size={13}>{weekKm > 0 ? `${weekKm.toFixed(1)} km this week` : location ? "Ready when you are" : "Finding your location"}</Body>
              </Row>
            </View>
            <View style={{ flex: 1 }} />
            <IconButton icon={LocateFixed} label="Recentre" onPress={recenter} style={follow ? styles.onButton : null} />
          </Row>
        )}
      </View>

      {/* Bottom panels */}
      <View style={styles.bottom} pointerEvents="box-none">
        {phase === PHASE.ACTIVE || phase === PHASE.PAUSED ? (
          <LiveSessionPanel bottomInset={insets.bottom} accuracy={location?.accuracy} onFinish={() => store().finish()} />
        ) : phase === PHASE.IDLE && isPlanning ? (
          <PlanPanel bottom={panelBottom} onDone={() => store().setPlanning(false)} />
        ) : phase === PHASE.IDLE ? (
          <StartPanel bottom={panelBottom} onPlan={startPlanning} onHistory={() => setHistoryOpen(true)} onStart={() => store().beginCountdown()} />
        ) : null}
      </View>

      {/* Countdown */}
      <AnimatePresence>
        {phase === PHASE.COUNTDOWN ? (
          <Countdown key="countdown" count={count} label={`${activityFor(activityType).label} starting`} onCancel={() => store().cancelCountdown()} />
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
  onButton: { borderColor: C.accent },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
