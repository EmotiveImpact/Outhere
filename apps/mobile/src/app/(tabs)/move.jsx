// Move tab: the map, who's outside, routes and the run itself.
//
// Before a run: finding you, location off, the resting map (who's outside),
// pick a route from where you are, draw one by tapping the map, name and save
// it, and your club live. Then the hyped 3, 2, 1, the live run (map, pilot
// and street views, your ghost, turn by turn against the planned line, off
// route, GPS lost, paused), press and hold to finish, and the run summary.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";
import { AnimatePresence, MotiView } from "moti";
import { ChevronLeft, Layers, Lock, MapPin, Pause, Plus, Search, Undo2 } from "lucide-react-native";
import { C, S, TAB_BAR_SPACE, toast } from "@/components/ui";
import { engine, isRemote, useCrewLive, useEngineMutation, useMyCrews, useOutsideMap, useProfile, useRouteSuggestions, useSafety } from "@/data/hooks";
import { ghostAt, navigate, stepsFor, wayBackLabel } from "@/data/runMath";
import { centreFor } from "@/data/seedRuns";
import { formatDuration } from "@/utils/format";
import { MOVE_SESSION_PHASE as PHASE, importLegacyRoutes, sessionSeconds, useMoveStore } from "@/store/useMoveStore";
import { activityFor, isCoord, paceFor, rewardsFor } from "@/components/move/geo";
import RunMap from "@/components/move/RunMap";
import { LocatingView, LocationOffView } from "@/components/move/MapStates";
import { IdleBottom, IdleTop } from "@/components/move/IdleOverlay";
import { CrewSheet, NameSheet, PickSheet, PlanSheet } from "@/components/move/RouteSheets";
import HypeCountdown from "@/components/move/HypeCountdown";
import {
  GhostChip,
  GpsLostCard,
  GpsLostPanel,
  HoldPanel,
  LockOverlay,
  MapPanel,
  OffRoutePanel,
  PausedPanel,
  PausedWord,
  PilotPanel,
  StreetPanel,
} from "@/components/move/LiveHud";
import RunSummary from "@/components/move/RunSummary";
import { ModeSwitch, RecChip, RoundGlass, TopBar, TurnBanner } from "@/components/move/parts";

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
const GPS_LOST_MS = 20 * 1000;
const DEFAULT_GOAL_KM = 5;
const DEFAULT_PACE = 360; // 6:00 a km until you've a run of your own
const VIEWS = ["map", "pilot", "street"];

const useTick = (on, ms = 1000) => {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
};

const isNight = (d = new Date()) => d.getHours() >= 19 || d.getHours() < 7;

const crewLine = (crew, outside) => {
  const names = (crew?.out || []).map((p) => p.player.name);
  if (names.length >= 2) return `${names[0]} and ${names[1]} are out now`;
  if (names.length === 1) return `${names[0]} is out now`;
  if (outside?.total) return `${outside.total.toLocaleString("en-GB")} out${outside.city ? ` in ${outside.city}` : ""} right now`;
  return "Your city is outside";
};

export default function MoveScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const router = useRouter();
  const mapRef = useRef(null);
  const { data: profile } = useProfile();

  const phase = useMoveStore((s) => s.sessionPhase);
  const activityType = useMoveStore((s) => s.activityType);
  const isPlanning = useMoveStore((s) => s.isPlanning);
  const segments = useMoveStore((s) => s.segments);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const plannedDistanceM = useMoveStore((s) => s.plannedDistanceM);
  const waypoints = useMoveStore((s) => s.waypoints);
  const isRouting = useMoveStore((s) => s.isRouting);
  const activeRoute = useMoveStore((s) => s.activeRoute);
  const view = useMoveStore((s) => s.view);
  const distanceM = useMoveStore((s) => s.distanceM);
  const lastFixAt = useMoveStore((s) => s.lastFixAt);
  const startedAt = useMoveStore((s) => s.startedAt);
  const heading = useMoveStore((s) => s.heading);
  const currentPace = useMoveStore((s) => s.currentPace);
  const liveSteps = useMoveStore((s) => s.steps);
  const store = useMoveStore.getState;

  const [permission, setPermission] = useState({ status: "checking", canAskAgain: true });
  const [location, setLocation] = useState(null);
  const [locTimeout, setLocTimeout] = useState(false);
  const [offDismissed, setOffDismissed] = useState(false);
  const [motionOk, setMotionOk] = useState(false);
  const [follow, setFollow] = useState(true);
  const [sheet, setSheet] = useState(null); // pick | name | crew
  const [nameDraft, setNameDraft] = useState(null);
  const [pickKm, setPickKm] = useState(5);
  const [pickIndex, setPickIndex] = useState(0);
  const [holdOpen, setHoldOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [gpsAck, setGpsAck] = useState(0);

  const recording = RECORDING.includes(phase);
  const live = phase === PHASE.ACTIVE || phase === PHASE.PAUSED;
  const paused = phase === PHASE.PAUSED;
  const granted = permission.status === "granted";
  const here = isCoord(location) ? location : null;
  const fallback = useMemo(() => centreFor(profile?.city), [profile?.city]);
  const centre = here || fallback;
  useTick(live);

  // ── Data ───────────────────────────────────────────────────────────────────
  const idle = phase === PHASE.IDLE;
  const { data: outside } = useOutsideMap(centre, focused && idle && !isPlanning);
  const { data: crew, isPending: crewLoading } = useCrewLive(centre, focused && (sheet === "crew" || phase === PHASE.COUNTDOWN));
  const { data: suggestions, isPending: pickLoading } = useRouteSuggestions(centre, pickKm, focused && sheet === "pick");
  const { data: myCrews } = useMyCrews();
  const { data: safety } = useSafety();
  const club = myCrews?.[0] || null;

  const saveRoute = useEngineMutation(engine.saveRoute);
  const wave = useEngineMutation(engine.waveAt, { success: "Waved" });

  // ── Permission and location ────────────────────────────────────────────────
  const checkPermission = useCallback(async (ask) => {
    try {
      let res = await Location.getForegroundPermissionsAsync();
      if (res.status !== "granted" && ask && res.canAskAgain !== false) res = await Location.requestForegroundPermissionsAsync();
      setPermission({ status: res.status === "granted" ? "granted" : "denied", canAskAgain: res.canAskAgain !== false });
      if (res.status === "granted") {
        setOffDismissed(false);
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last?.coords) setLocation((cur) => cur || last.coords);
      }
    } catch {
      setPermission({ status: "denied", canAskAgain: false });
    }
  }, []);

  useEffect(() => {
    checkPermission(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermission(false);
    });
    if (Platform.OS !== "web") Pedometer.isAvailableAsync().then(setMotionOk).catch(() => {});
    const t = setTimeout(() => setLocTimeout(true), 8000);
    return () => {
      sub.remove();
      clearTimeout(t);
    };
  }, [checkPermission]);

  // Routes saved on this phone before they moved into your account.
  useEffect(() => {
    if (profile) importLegacyRoutes(engine.saveRoute);
  }, [!!profile]);

  useEffect(() => {
    if (!granted || (!focused && !recording)) return undefined;
    let sub = null;
    let cancelled = false;
    Location.watchPositionAsync(
      recording ? { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 } : { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
      (loc) => {
        setLocation(loc.coords);
        // Some phones stamp fixes with a GPS clock that drifts; trust it only when close to ours.
        const now = Date.now();
        store().addPoint(loc.coords, Math.abs(now - loc.timestamp) < 30 * 1000 ? loc.timestamp : now);
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

  // The tab bar steps aside while a sheet needs the screen.
  useEffect(() => {
    store().setHideTabs(focused && idle && (!!sheet || isPlanning));
    return () => store().setHideTabs(false);
  }, [focused, idle, sheet, isPlanning]);

  // ── Steps while recording (the phone's own counter) ───────────────────────
  const stepBase = useRef(0);
  useEffect(() => {
    if (phase === PHASE.COUNTDOWN) stepBase.current = 0;
    if (phase !== PHASE.ACTIVE || Platform.OS === "web" || !motionOk) return undefined;
    const base = stepBase.current;
    let sub = null;
    try {
      sub = Pedometer.watchStepCount((r) => {
        stepBase.current = base + r.steps;
        store().setSteps(base + r.steps);
      });
    } catch {
      // No counter: steps come from distance.
    }
    return () => sub?.remove?.();
  }, [phase, motionOk]);

  // ── Session side effects: the map dot, live sharing, check-ins ────────────
  const autoShare = useRef(false);
  const movedAt = useRef({ at: 0, m: 0 });
  useEffect(() => {
    if (phase !== PHASE.ACTIVE || !startedAt) return undefined;
    movedAt.current = { at: Date.now(), m: store().distanceM };
    engine.setLivePosition({ on: true, ...(here || {}), km: 0, kind: activityType, routeId: activeRoute?.id || null }).catch(() => {});
    if (!autoShare.current && safety?.nightAuto && safety.contacts?.length && !safety.share && isNight()) {
      autoShare.current = true;
      engine
        .startLiveShare({})
        .then(() => toast("Sharing live", "Your trusted contacts can see you until you finish."))
        .catch(() => {});
    }
    return undefined;
  }, [startedAt]);

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => {
      const s = store();
      const pos = isCoord(s.lastPoint) ? s.lastPoint : null;
      if (s.distanceM - movedAt.current.m >= 15) movedAt.current = { at: Date.now(), m: s.distanceM };
      const stillSec = Math.round((Date.now() - movedAt.current.at) / 1000);
      if (isRemote && pos) engine.setLivePosition({ on: true, latitude: pos.latitude, longitude: pos.longitude, km: s.distanceM / 1000, kind: s.activityType, routeId: s.activeRoute?.id || null }).catch(() => {});
      if (safety?.share && (pos || location)) {
        engine
          .pingLiveShare({ ...(pos || location), stillSec })
          .then((r) => r?.alerted && toast("We checked on you", "You'd stopped for 10 minutes, so we texted your contacts."))
          .catch(() => {});
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [live, safety?.share?.id]);

  const endSession = () => {
    if (autoShare.current) {
      autoShare.current = false;
      engine.stopLiveShare().catch(() => {});
    }
  };

  // ── Navigation against the planned line ────────────────────────────────────
  const lastAlong = useRef(0);
  useEffect(() => {
    lastAlong.current = 0;
  }, [activeRoute?.path, startedAt]);
  const nav = useMemo(() => {
    if (!live || !activeRoute || !here) return null;
    const n = navigate(activeRoute.path, here, { turns: activeRoute.turns, cum: activeRoute.cum, lastAlongM: lastAlong.current });
    if (n) lastAlong.current = n.alongM;
    return n;
  }, [live, activeRoute, here?.latitude, here?.longitude]);

  // ── Numbers ────────────────────────────────────────────────────────────────
  const s = store();
  const seconds = live ? sessionSeconds(s) : 0;
  const km = distanceM / 1000;
  const avgPace = paceFor(km, seconds);
  const earn = rewardsFor(km, profile?.tier);
  const steps = liveSteps || stepsFor(km);
  const cadence = live && seconds > 30 && liveSteps ? Math.round(liveSteps / (seconds / 60)) : null;
  const goalKm = activeRoute?.distanceKm ? Math.round(activeRoute.distanceKm * 10) / 10 : DEFAULT_GOAL_KM;
  const ghostDiff = live && activeRoute?.ghost ? distanceM - ghostAt(activeRoute.ghost, seconds) : null;
  const sinceFix = lastFixAt || startedAt;
  const gpsLost = phase === PHASE.ACTIVE && granted && sinceFix && Date.now() - sinceFix > GPS_LOST_MS && gpsAck < sinceFix;
  const offRoute = !!nav?.offRoute && !paused;
  const myPace = profile?.bestPace || DEFAULT_PACE;
  const activity = activityFor(activityType);

  // ── Actions ────────────────────────────────────────────────────────────────
  const recenter = () => {
    setFollow(true);
    if (here) mapRef.current?.recenter(here);
  };

  const startCountdown = () => {
    if (!granted) {
      setOffDismissed(false);
      return;
    }
    setSheet(null);
    setHoldOpen(false);
    setLocked(false);
    setFollow(true);
    store().setPlanning(false);
    store().beginCountdown();
  };

  const startFree = () => {
    store().clearRoute();
    startCountdown();
  };

  const startPlan = () => {
    if (!store().followPlan(planName)) return;
    store().clearPlan();
    startCountdown();
  };

  const startPicked = (route) => {
    if (!route || !store().followRoute(route)) return;
    startCountdown();
  };

  const openPlan = () => {
    setSheet(null);
    setFollow(false);
    store().setPlanning(true);
  };

  const exitPlan = () => {
    store().setPlanning(false);
    store().clearPlan();
    setFollow(true);
  };

  const openName = (draft) => {
    setNameDraft(draft);
    setSheet("name");
  };

  const saveDraft = (values, then) =>
    saveRoute.mutate(
      { name: values.name, path: nameDraft.path, waypoints: nameDraft.waypoints || [], distanceKm: nameDraft.distanceKm, climbM: nameDraft.climbM, hideEnds: values.hideEnds, shareWithClub: values.shareWithClub },
      {
        onSuccess: (route) => {
          toast.success("Route saved", `${route.name} is in Your routes`);
          store().setPlanning(false);
          store().clearPlan();
          setSheet(null);
          then?.(route);
        },
      },
    );

  const finish = () => {
    setHoldOpen(false);
    setLocked(false);
    store().finish();
    endSession();
  };

  const togglePause = () => (paused ? store().resume() : store().pause());

  const cycleView = () => store().setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);

  const planName = `${profile?.area || (new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening")} loop`;
  const planMinutes = Math.max(1, Math.round(((plannedDistanceM / 1000) * myPace) / 60));

  // ── Before the map ─────────────────────────────────────────────────────────
  if ((permission.status === "checking" && !locTimeout) || (granted && !here && !locTimeout && !recording)) {
    return <LocatingView gps={!!here} motion={motionOk} top={insets.top} />;
  }
  if (!granted && !recording && !offDismissed) {
    return (
      <LocationOffView
        top={insets.top}
        bottom={TAB_BAR_SPACE + insets.bottom - 10}
        canAskAgain={permission.canAskAgain}
        onTurnOn={() => (permission.canAskAgain ? checkPermission(true) : Linking.openSettings().catch(() => {}))}
        onNotNow={() => setOffDismissed(true)}
      />
    );
  }

  // ── Map layers for this state ──────────────────────────────────────────────
  const pickRoutes = sheet === "pick" ? (suggestions || []).map((r, i) => ({ key: r.id || `fresh${i}`, path: r.path, active: i === pickIndex })) : [];
  const mapProps = {
    userLocation: here,
    follow: live || phase === PHASE.COUNTDOWN ? true : follow && !isPlanning && !sheet,
    camera: live ? view : "map",
    heading: heading || 0,
    segments: live || phase === PHASE.SUMMARY ? segments : [],
    trackColour: paused ? "#6f7c92" : C.accent,
    plannedPath: isPlanning || sheet === "name" ? (sheet === "name" ? nameDraft?.path || [] : plannedPath) : live && activeRoute ? activeRoute.path : [],
    plannedStyle: isPlanning && sheet !== "name" ? "dots" : sheet === "name" ? "solid" : "faint",
    waypoints: isPlanning && sheet !== "name" ? waypoints : [],
    routes: pickRoutes.sort((a, b) => Number(a.active) - Number(b.active)),
    people: idle && !isPlanning && sheet !== "pick" && sheet !== "name" ? (sheet === "crew" ? (crew?.out || []).map((p) => ({ ...p.player, latitude: p.latitude, longitude: p.longitude, crew: true })) : outside?.crew || []) : [],
    dots: idle && !sheet && !isPlanning ? [...(outside?.dots || []), ...(outside?.others || [])] : [],
    trails: sheet === "crew" ? (crew?.out || []).map((p) => p.trail || []) : [],
    rejoin: offRoute && nav?.back ? { from: here, to: nav.back.point } : null,
    userTone: offRoute ? "danger" : paused ? "grey" : null,
    fitTo: sheet === "name" ? nameDraft?.path : sheet === "crew" && crew?.out?.length && here ? [here, ...crew.out.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))] : undefined,
    onPress: isPlanning && sheet !== "name" ? store().addWaypoint : undefined,
    onUserPan: () => follow && setFollow(false),
  };

  const top = insets.top + 6;
  const liveChip = offRoute ? (
    <RecChip tone="danger">{`Off route · ${nav.offM} m`}</RecChip>
  ) : gpsLost ? (
    <RecChip tone="warn">{`NO GPS  ${formatDuration(seconds)}`}</RecChip>
  ) : paused ? (
    <RecChip icon={Pause}>PAUSED</RecChip>
  ) : (
    <RecChip>{`LIVE  ${formatDuration(seconds)}`}</RecChip>
  );

  const nextTurn = nav?.next;
  const arriveLabel = nav ? `Arrive in ${Math.max(1, Math.round((nav.remainingM / 1000) * (avgPace || myPace) / 60))} min · ${(nav.remainingM / 1000).toFixed(1)} km` : null;
  const banner = !live
    ? null
    : offRoute && nav?.back
      ? { dir: "back", metres: nav.back.metres, text: wayBackLabel(heading, nav.back.bearing) }
      : view === "pilot"
        ? nav
          ? nav.arrived
            ? { dir: "straight", metres: null, text: `You've made it round ${activeRoute.name}. Finish when you're ready.` }
            : nextTurn
              ? { dir: nextTurn.dir, metres: nextTurn.inM, text: `${nextTurn.label}${nav.after ? `, then ${Math.round((nav.after.alongM - nextTurn.alongM) / 10) * 10} m to the next turn` : ""}` }
              : { dir: "straight", metres: nav.remainingM, text: "Straight on to the finish" }
          : { dir: "straight", metres: null, text: "No route loaded. Plan one to get turns." }
        : null;

  const bottomPanel = () => {
    if (!live) return null;
    const sheetInset = insets.bottom;
    const floatBottom = insets.bottom + S.md;
    if (holdOpen) {
      return (
        <HoldPanel
          km={km}
          pace={currentPace || avgPace}
          out={earn.out}
          paused={paused}
          onPause={togglePause}
          onLock={() => {
            setHoldOpen(false);
            setLocked(true);
          }}
          onFinish={finish}
          onIdle={() => setHoldOpen(false)}
          bottom={floatBottom}
        />
      );
    }
    if (gpsLost) return <GpsLostPanel steps={steps} lastKm={km} out={earn.out} paused={paused} onPause={togglePause} onKeepGoing={() => setGpsAck(Date.now())} bottomInset={sheetInset} />;
    if (offRoute) return <OffRoutePanel km={km} seconds={seconds} out={earn.out} paused={paused} onPause={togglePause} onEndRoute={() => store().clearRoute()} bottom={floatBottom} />;
    if (paused) return <PausedPanel km={km} pace={avgPace} out={earn.out} onFinish={() => setHoldOpen(true)} onResume={() => store().resume()} bottom={floatBottom} />;
    if (view === "pilot") return <PilotPanel seconds={seconds} km={km} pace={currentPace || avgPace} paused={paused} onPause={togglePause} arriveLabel={arriveLabel} onFinish={() => setHoldOpen(true)} bottom={floatBottom} />;
    if (view === "street") return <StreetPanel pace={currentPace || avgPace} km={km} cadence={cadence} out={earn.out} onPress={() => store().setView("map")} bottom={floatBottom} />;
    return <MapPanel km={km} avgPace={avgPace} steps={steps} xp={earn.xp} out={earn.out} goalKm={goalKm} paused={paused} onPause={togglePause} onFinish={() => setHoldOpen(true)} bottomInset={sheetInset} />;
  };

  const idleBottom = TAB_BAR_SPACE - 18 + insets.bottom;

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <MotiView animate={{ scale: phase === PHASE.COUNTDOWN ? 1.12 : 1 }} transition={{ type: "timing", duration: 650 }} style={StyleSheet.absoluteFill}>
        <RunMap ref={mapRef} style={StyleSheet.absoluteFill} {...mapProps} />
      </MotiView>
      {paused ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.drain]} /> : null}
      {paused && !holdOpen ? <PausedWord seconds={seconds} km={km} top={insets.top + 190} /> : null}

      {/* Top */}
      {live ? (
        view === "pilot" && !offRoute ? (
          <View style={[styles.pilotTop, { paddingTop: top }]} pointerEvents="box-none">
            {banner ? <TurnBanner {...banner} /> : null}
            <ModeSwitch value={view} onChange={store().setView} style={styles.modes} />
          </View>
        ) : (
          <>
            <TopBar top={top} left={<RoundGlass icon={Lock} label="Lock the screen" onPress={() => setLocked(true)} />} centre={liveChip} right={<RoundGlass icon={Layers} label="Change view" onPress={cycleView} />} />
            {offRoute && banner ? <TurnBanner {...banner} style={[styles.banner, { top: top + 52 }]} /> : null}
            {view === "street" && !offRoute ? <ModeSwitch value={view} onChange={store().setView} style={[styles.modes, styles.modesAbs, { top: top + 52 }]} /> : null}
            {ghostDiff != null && view === "map" && !gpsLost && !offRoute && !paused ? <GhostChip diffM={ghostDiff} top={top + 300} /> : null}
            {gpsLost ? <GpsLostCard top={top + 60} /> : null}
          </>
        )
      ) : idle && isPlanning && sheet !== "name" ? (
        <TopBar top={top} left={<RoundGlass icon={ChevronLeft} label="Stop planning" onPress={exitPlan} />} centre={<RecChip icon={MapPin}>Tap the map to add a point</RecChip>} right={<RoundGlass icon={Undo2} label="Undo" onPress={() => store().undoWaypoint()} />} />
      ) : idle && sheet === "name" ? (
        <TopBar top={top} left={<RoundGlass icon={ChevronLeft} label="Back" onPress={() => setSheet(nameDraft?.from === "pick" ? "pick" : null)} />} centre={<RecChip icon={Plus}>New route</RecChip>} />
      ) : idle && sheet === "pick" ? (
        <TopBar top={top} left={<RoundGlass icon={ChevronLeft} label="Back" onPress={() => setSheet(null)} />} centre={<RecChip icon={Search}>Where to tonight?</RecChip>} right={<RoundGlass icon={Layers} label="Recentre" onPress={recenter} />} />
      ) : idle && sheet === "crew" ? (
        <TopBar top={top} left={<RoundGlass icon={ChevronLeft} label="Back" onPress={() => setSheet(null)} />} centre={<RecChip>CREW LIVE</RecChip>} right={<RoundGlass icon={Layers} label="Recentre" onPress={recenter} />} />
      ) : idle ? (
        <IdleTop top={top} outside={outside} sharing={!!safety?.share} onHistory={() => router.push("/runs")} onSafety={() => router.push("/runs/safety")} onCrew={() => setSheet("crew")} />
      ) : null}

      {/* Bottom */}
      <View style={styles.bottom} pointerEvents="box-none">
        {live ? bottomPanel() : null}
        {idle && isPlanning && sheet !== "name" ? (
          <PlanSheet
            name={planName}
            points={waypoints.length}
            distanceM={plannedDistanceM}
            isRouting={isRouting}
            minutes={planMinutes}
            xp={rewardsFor(plannedDistanceM / 1000, profile?.tier).xp}
            onSave={() => openName({ path: plannedPath, waypoints, distanceKm: plannedDistanceM / 1000, climbM: null, name: planName, from: "plan" })}
            onLoop={() => store().closeLoop()}
            onClear={() => store().clearPlan()}
            onStart={startPlan}
            bottomInset={insets.bottom}
          />
        ) : null}
        {idle && sheet === "name" && nameDraft ? (
          <NameSheet
            key={nameDraft.path?.length}
            initialName={nameDraft.name || ""}
            distanceKm={nameDraft.distanceKm}
            climbM={nameDraft.climbM}
            minutes={Math.max(1, Math.round((nameDraft.distanceKm * myPace) / 60))}
            clubName={club?.name}
            saving={saveRoute.isPending}
            onSave={(v) => saveDraft(v)}
            onRunNow={(v) =>
              saveDraft(v, (route) => {
                store().followRoute(route);
                startCountdown();
              })
            }
            bottomInset={insets.bottom}
          />
        ) : null}
        {idle && sheet === "pick" ? (
          <PickSheet
            km={pickKm}
            onKm={(k) => {
              setPickKm(k);
              setPickIndex(0);
            }}
            routes={suggestions}
            loading={pickLoading}
            selected={pickIndex}
            onSelect={setPickIndex}
            onSave={() => {
              const r = suggestions?.[pickIndex];
              if (r) openName({ path: r.path, distanceKm: r.distanceKm, climbM: r.climbM, name: r.id ? `${r.name} copy`.slice(0, 30) : "", from: "pick" });
            }}
            onStart={startPicked}
            onDraw={openPlan}
            bottomInset={insets.bottom}
          />
        ) : null}
        {idle && sheet === "crew" ? (
          <CrewSheet
            data={crew}
            loading={crewLoading}
            onJoin={(p) => {
              store().planTo(here || centre, p);
              setSheet(null);
              setFollow(false);
              store().setPlanning(true);
              toast(`Heading to ${p.player.name}`, "Start the route to meet them on the way.");
            }}
            onWave={(p) => wave.mutate(p.player.id)}
            onFindClub={() => router.push("/club")}
            bottomInset={insets.bottom}
          />
        ) : null}
        {idle && !isPlanning && !sheet ? (
          <IdleBottom bottom={idleBottom} activityType={activityType} onActivity={store().setActivityType} onPlan={() => setSheet("pick")} onSaved={() => router.push("/routes")} onStart={startFree} />
        ) : null}
      </View>

      {locked && live ? <LockOverlay onUnlock={() => setLocked(false)} bottom={insets.bottom + 40} /> : null}

      <AnimatePresence>
        {phase === PHASE.COUNTDOWN ? (
          <HypeCountdown
            key="hype"
            routeLabel={activeRoute ? `${activeRoute.name} · ${activeRoute.distanceKm.toFixed(1)} km` : `${activity.label} · free`}
            kickers={[
              crewLine(crew, outside),
              activeRoute?.ghost ? "Your ghost is on the line" : "Pocket it, eyes up",
              activeRoute?.bestSec ? `${activeRoute.name} · your best is ${formatDuration(activeRoute.bestSec)}` : "The clock starts on go",
              "Clock's running",
            ]}
            stakes={[
              activeRoute?.bestSec ? { value: formatDuration(activeRoute.bestSec), label: "to beat" } : { value: `${goalKm} km`, label: "goal" },
              { value: `+${rewardsFor(goalKm, profile?.tier).out}`, label: "OUT up for grabs" },
              { value: `${profile?.streak || 0}`, label: "day streak" },
            ]}
            onGo={() => store().start()}
            onCancel={() => store().cancelCountdown()}
          />
        ) : null}
      </AnimatePresence>

      <RunSummary />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  drain: { backgroundColor: "rgba(40,44,52,0.55)" },
  pilotTop: { position: "absolute", left: S.lg, right: S.lg, top: 0, gap: S.lg },
  modes: { alignSelf: "center", width: 250 },
  modesAbs: { position: "absolute" },
  banner: { position: "absolute", left: S.lg, right: S.lg },
});
