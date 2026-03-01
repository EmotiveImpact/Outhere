import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect, useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { 
  MapPin, 
  Share2, 
  Play, 
  Navigation, 
  X, 
  CornerUpLeft,
  Route,
  Radio,
  BookmarkPlus,
  Bookmark,
  Pause,
  Square,
  RotateCcw,
  Check,
  Eye,
  Map as MapIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import ConfettiCannon from "react-native-confetti-cannon";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import Slider from "@react-native-community/slider";

const FREE_RUN_CTAS = [
  "BEGIN",
  "LET'S GO",
  "LET'S GET IT",
  "RUN IT UP",
  "STEP OUT",
  "GET MOVING",
  "TOUCH GRASS",
  "GET OUT HERE",
];

const SESSION_COMPLETE_HEADLINES = [
  "WELL DONE",
  "YOU SMASHED IT",
  "THAT'S HOW WE DO",
  "STRONG WORK",
  "NICE ONE",
];

const LIGHT_SESSION_HEADLINES = [
  "WHAT HAPPENED?",
  "OK, NEXT TIME",
  "KEEP GOING",
  "SHAKE IT OFF",
  "JUST A WARMUP",
  "BACK AT IT TOMORROW",
];

const BIG_SESSION_HEADLINES = [
  "BEAST MODE",
  "THAT WAS SERIOUS",
  "UNSTOPPABLE",
  "ELITE SHIFT",
  "MONSTER SESSION",
];

const FEELING_COPY = {
  1: { label: "Rough", note: "Tough day" },
  2: { label: "Okay", note: "Got through it" },
  3: { label: "Good", note: "Solid effort" },
  4: { label: "Great", note: "Strong session" },
  5: { label: "Amazing", note: "Top form" },
};

import {
  useMoveStore,
  formatDuration,
  formatPace,
  MOVE_SESSION_PHASE,
} from "@/store/useMoveStore";
import { useUserStore } from "@/store/userStore";
import { useClubStore, DEFAULT_CLUB_AVATAR } from "@/store/useClubStore";
import { hapticHeavy, hapticSuccess, hapticSelection } from "@/services/haptics";

const { width, height } = Dimensions.get("window");
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const formatCompactCount = (value) => {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value < 1000) return `${value}`;
  if (value < 10000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.round(value / 1000)}K`;
};

// Color interpolation utility for gradient polylines
const lerpColor = (a, b, t) => {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
};

const buildGradientColors = (count) => {
  if (count < 2) return ['#00ff7f'];
  return Array.from({ length: count }, (_, i) =>
    lerpColor('#00ff7f', '#ffffff', i / (count - 1))
  );
};

const getDistanceMeters = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const lat1 = toRad(a.latitude);
  const lon1 = toRad(a.longitude);
  const lat2 = toRad(b.latitude);
  const lon2 = toRad(b.longitude);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadius * y;
};

const normalizeHeading = (heading) => {
  if (!Number.isFinite(heading)) return null;
  if (heading < 0) return null;
  const normalized = heading % 360;
  return normalized >= 0 ? normalized : normalized + 360;
};

const getBearingDegrees = (from, to) => {
  if (!from || !to) return null;
  const fromLat = (from.latitude * Math.PI) / 180;
  const fromLng = (from.longitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const toLng = (to.longitude * Math.PI) / 180;
  const y = Math.sin(toLng - fromLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLng - fromLng);
  const radians = Math.atan2(y, x);
  const degrees = (radians * 180) / Math.PI;
  return (degrees + 360) % 360;
};

const getOffsetCoordinate = (origin, headingDeg, distanceMeters) => {
  if (!origin || !Number.isFinite(distanceMeters) || distanceMeters <= 0) return origin;
  const headingRad = (headingDeg * Math.PI) / 180;
  const earthRadius = 6378137;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lon1 = (origin.longitude * Math.PI) / 180;
  const angularDistance = distanceMeters / earthRadius;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(headingRad),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
};

const formatDistanceLabel = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters)) return "";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const getDistanceToPath = (location, path) => {
  if (!location || !Array.isArray(path) || path.length === 0) return Number.POSITIVE_INFINITY;
  let minDistance = Number.POSITIVE_INFINITY;
  path.forEach((point) => {
    if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
    const distance = getDistanceMeters(location, point);
    if (distance < minDistance) minDistance = distance;
  });
  return minDistance;
};

// ── MAP STYLES (Pitch Dark Custom Theme) ───────────────
const mapCustomStyle = [
  { elementType: "geometry", stylers: [{ color: "#161616" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#161616" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#222222" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#454545" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111111", weight: 0.5 }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a3a3c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#48484a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#222222" }] },
];

// ── COUNTDOWN OVERLAY ─────────────────────────────────────────────────────
const CountdownOverlay = ({ value }) => {
  const scale = useRef(new Animated.Value(0.55)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.55);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(620),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [value]);

  const isGo = value === 0;
  const text = value === 0 ? "GO!" : value.toString();
  const glowSize = text.length > 2 ? 210 : 180;
  const glowRadius = glowSize / 2;
  
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isGo ? "transparent" : "rgba(0,0,0,0.78)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        },
      ]}
    >
      {!isGo ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          transform: [{ scale }],
          opacity,
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${glowSize} ${glowSize}`}
        >
          <Defs>
            <RadialGradient id="countdownGlow" cx="50%" cy="50%" r="50%">
              <Stop
                offset="0%"
                stopColor={isGo ? "#ffffff" : "#00ff7f"}
                stopOpacity={isGo ? 0.13 : 0.15}
              />
              <Stop
                offset="34%"
                stopColor={isGo ? "#ffffff" : "#00ff7f"}
                stopOpacity={isGo ? 0.07 : 0.08}
              />
              <Stop
                offset="66%"
                stopColor={isGo ? "#ffffff" : "#00ff7f"}
                stopOpacity={0.025}
              />
              <Stop
                offset="100%"
                stopColor={isGo ? "#ffffff" : "#00ff7f"}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Circle
            cx={glowRadius}
            cy={glowRadius}
            r={glowRadius}
            fill="url(#countdownGlow)"
          />
        </Svg>
      </Animated.View>

      <Animated.Text
        style={{
          color: isGo ? "#ffffff" : "#00ff7f",
          fontSize: text.length > 2 ? 98 : 122,
          fontWeight: "900",
          letterSpacing: -2,
          textShadowColor: isGo
            ? "rgba(255,255,255,0.22)"
            : "rgba(0, 255, 127, 0.18)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 6,
          transform: [{ scale }],
          opacity,
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

export default function MoveScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const mapRef = useRef(null);

  // User Stats
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const user = useUserStore((s) => s.user);
  const earnXP = useUserStore((s) => s.earnXP);
  const updateStreak = useUserStore((s) => s.updateStreak);
  const todayStats = useUserStore((s) => s.todayStats);
  const allDaySteps = todayStats?.steps ?? 0;
  const allDayDistanceKm = todayStats?.distance ?? 0;
  const addRunPost = useClubStore((s) => s.addRunPost);
  const clubFeed = useClubStore((s) => s.feed);

  const socialPresence = useMemo(() => {
    const byName = new Map();
    const selfName = (user?.name || "You").trim().toLowerCase();

    (Array.isArray(clubFeed) ? clubFeed : []).forEach((item) => {
      const name = (item?.user || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (byName.has(key)) return;
      byName.set(key, {
        name,
        avatar: item?.avatar || DEFAULT_CLUB_AVATAR,
        isSelf: key === selfName || key === "you",
      });
    });

    const people = Array.from(byName.values());
    if (people.length === 0) {
      people.push({
        name: user?.name?.trim() || "You",
        avatar: user?.avatar_url || DEFAULT_CLUB_AVATAR,
        isSelf: true,
      });
    }

    const outsideCount = people.length;
    const friendsCount = Math.max(0, people.filter((person) => !person.isSelf).length);

    return {
      people,
      outsideCount,
      friendsCount,
      outsideLabel: formatCompactCount(outsideCount),
    };
  }, [clubFeed, user?.name, user?.avatar_url]);

  // Move Store
  const {
    sessionPhase,
    isActive,
    isPlanning,
    plannedRouteLocs,
    plannedRoutePath,
    plannedDistanceMeter,
    plannedRouteSteps,
    isPlanningRoute,
    isRerouting,
    sessionSteps,
    sessionDistance,
    sessionDurationSecs,
    sessionPath,
    lastSession,
    
    setPlanning,
    addPlannedLocation,
    removeLastPlannedLocation,
    clearPlannedRoute,
    loadRouteToPlan,
    startSession,
    updateSessionSteps,
    updateSessionPath,
    stopSession,
    resetMoveState,
    saveRoute,
    savedRoutes,
    loadHistory,
    updateLastSessionFeeling,
    rerouteToDestination,
    isPaused,
    pauseSession,
    resumeSession,
    beginSessionPriming,
  } = useMoveStore();

  // Local State
  const [hasPermission, setHasPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showStepsInIdle, setShowStepsInIdle] = useState(false);
  const [showSavedInventory, setShowSavedInventory] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [routeNameInput, setRouteNameInput] = useState("");
  const [freeRunCta, setFreeRunCta] = useState(FREE_RUN_CTAS[0]);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const [navMode, setNavMode] = useState("overview"); // "overview", "navigation", "street"
  const navModeRef = useRef("overview");
  const lastHeadingRef = useRef(0);
  const lastCoordinateRef = useRef(null);
  const [isLocationBooting, setIsLocationBooting] = useState(true);
  const [sessionFeeling, setSessionFeeling] = useState(3);
  const [sessionFeelingVisual, setSessionFeelingVisual] = useState(3);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);

  // Re-roll the CTA and snap map to current location every time tab gains focus
  useFocusEffect(
    useCallback(() => {
      setFreeRunCta(FREE_RUN_CTAS[Math.floor(Math.random() * FREE_RUN_CTAS.length)]);
      
      // Snap map to current location on every tab focus
      (async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            setCurrentLocation(loc.coords);
            if (mapRef.current && !isActive) {
              mapRef.current.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }, 800);
            }
          }
        } catch (e) {
          // Silently fail — permission may not be granted yet
        }
      })();
    }, [isActive])
  );
  const locationSubscription = useRef(null);
  const countdownIntervalRef = useRef(null);
  const countdownHideTimeoutRef = useRef(null);
  const followResumeTimeoutRef = useRef(null);
  const interactionLockTimeoutRef = useRef(null);
  const interactionLockRef = useRef(false);
  const autoFollowEnabledRef = useRef(true);
  const lastRerouteAtRef = useRef(0);
  const lastSpokenStepKeyRef = useRef("");
  const lastSpokenAtRef = useRef(0);
  const isSummaryVisible =
    sessionPhase === MOVE_SESSION_PHASE.SUMMARY && Boolean(lastSession);
  const isSessionTransitioning =
    sessionPhase === MOVE_SESSION_PHASE.PRIMING || isActive || isCountingDown || isSummaryVisible;
  const idleBottomOffset = Math.max(tabBarHeight + 16, insets.bottom + 56, 92);
  const activeBottomOffset = insets.bottom + 86;

  const sessionAnim = useRef(new Animated.Value(isSessionTransitioning ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(sessionAnim, {
      toValue: isSessionTransitioning ? 1 : 0,
      duration: isSessionTransitioning ? 360 : 300,
      easing: isSessionTransitioning
        ? Easing.out(Easing.cubic)
        : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isSessionTransitioning]);

  const idleOpacity = sessionAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0, 0],
  });
  const idleTopY = sessionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -150] });
  const idleBottomY = sessionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 150] });

  const activeOpacity = sessionAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });
  const activeTopY = sessionAnim.interpolate({ inputRange: [0, 1], outputRange: [-150, 0] });
  const activeBottomY = sessionAnim.interpolate({ inputRange: [0, 1], outputRange: [150, 0] });

  const pace = formatPace(sessionSteps, sessionDurationSecs);
  const calories = Math.floor(sessionSteps * 0.045); 
  const elevation = Math.floor(sessionSteps * 0.002);

  // Load History on Mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!lastSession) {
      setSessionFeeling(3);
      setSessionFeelingVisual(3);
      return;
    }
    const savedFeeling = Number(lastSession.feeling);
    if (Number.isFinite(savedFeeling) && savedFeeling >= 1 && savedFeeling <= 5) {
      const normalized = Math.round(savedFeeling);
      setSessionFeeling(normalized);
      setSessionFeelingVisual(normalized);
    } else {
      setSessionFeeling(3);
      setSessionFeelingVisual(3);
    }
  }, [lastSession?.id, lastSession?.feeling]);

  // ── LOCATION EFFECTS ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setHasPermission(true);
          const loc = await Location.getCurrentPositionAsync({});
          if (!cancelled) {
            setCurrentLocation(loc.coords);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLocationBooting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getCameraSpec = useCallback((mode) => {
    if (mode === "street") {
      return { pitch: 82, altitude: 45, zoom: 19.8, forwardMeters: 34, heading: "live" };
    }
    if (mode === "navigation") {
      return { pitch: 67, altitude: 110, zoom: 18.5, forwardMeters: 18, heading: "live" };
    }
    return { pitch: 45, altitude: 800, zoom: 15.5, forwardMeters: 0, heading: "north" };
  }, []);

  const applyFollowCamera = useCallback(
    (coords, modeOverride = null) => {
      if (!mapRef.current || !coords) return;

      const currentCoord = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      const previousCoord = lastCoordinateRef.current;
      const sensorHeading = normalizeHeading(coords.heading);
      let resolvedHeading = sensorHeading;
      if (resolvedHeading === null && previousCoord) {
        const movedMeters = getDistanceMeters(previousCoord, currentCoord);
        if (Number.isFinite(movedMeters) && movedMeters > 1.5) {
          resolvedHeading = getBearingDegrees(previousCoord, currentCoord);
        }
      }
      if (resolvedHeading === null) {
        resolvedHeading = lastHeadingRef.current;
      }
      if (!Number.isFinite(resolvedHeading)) {
        resolvedHeading = 0;
      }

      const mode = modeOverride || navModeRef.current;
      const spec = getCameraSpec(mode);
      const center =
        spec.forwardMeters > 0
          ? getOffsetCoordinate(currentCoord, resolvedHeading, spec.forwardMeters)
          : currentCoord;

      const heading = spec.heading === "north" ? 0 : resolvedHeading;

      mapRef.current.animateCamera(
        {
          center,
          pitch: spec.pitch,
          heading,
          altitude: spec.altitude,
          zoom: spec.zoom,
        },
        { duration: 650 },
      );

      lastCoordinateRef.current = currentCoord;
      lastHeadingRef.current = resolvedHeading;
    },
    [getCameraSpec],
  );

  // Track location during active session
  useEffect(() => {
    let cancelled = false;
    const startTracking = async () => {
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 5, // update every 5 meters
          },
          (loc) => {
            updateSessionPath({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            setCurrentLocation(loc.coords);

            // Follow mode recenters camera until the user manually pans.
            if (mapRef.current && autoFollowEnabledRef.current) {
              applyFollowCamera(loc.coords);
            }
          },
        );

        if (cancelled || !useMoveStore.getState().isActive) {
          subscription.remove();
          return;
        }

        locationSubscription.current = subscription;
      } catch {
        // ignore location tracking startup failures
      }
    };

    if (isActive && hasPermission) {
      startTracking();
    } else if (!isActive && locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    return () => {
      cancelled = true;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [isActive, hasPermission, applyFollowCamera]);

  // Feed live steps to session delta
  useEffect(() => {
    if (isActive && allDaySteps > 0) {
      updateSessionSteps(allDaySteps);
    }
  }, [allDaySteps, isActive]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (countdownHideTimeoutRef.current) clearTimeout(countdownHideTimeoutRef.current);
      if (followResumeTimeoutRef.current) clearTimeout(followResumeTimeoutRef.current);
      if (interactionLockTimeoutRef.current) clearTimeout(interactionLockTimeoutRef.current);
      interactionLockRef.current = false;
      // If the screen unmounts before the run starts, restore non-focus mode.
      if (!useMoveStore.getState().isActive) {
        useMoveStore.getState().endSessionPriming();
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setIsAutoFollowEnabled(true);
      setNavMode("overview");
      navModeRef.current = "overview";
      lastCoordinateRef.current = null;
      lastHeadingRef.current = 0;
    }
  }, [isActive]);

  useEffect(() => {
    autoFollowEnabledRef.current = isAutoFollowEnabled;
  }, [isAutoFollowEnabled]);

  const lockInteractions = useCallback((durationMs = 420) => {
    interactionLockRef.current = true;
    setIsInteractionLocked(true);
    if (interactionLockTimeoutRef.current) {
      clearTimeout(interactionLockTimeoutRef.current);
    }
    if (!Number.isFinite(durationMs)) {
      interactionLockTimeoutRef.current = null;
      return;
    }
    interactionLockTimeoutRef.current = setTimeout(() => {
      interactionLockRef.current = false;
      setIsInteractionLocked(false);
      interactionLockTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const unlockInteractions = useCallback(() => {
    interactionLockRef.current = false;
    if (interactionLockTimeoutRef.current) {
      clearTimeout(interactionLockTimeoutRef.current);
      interactionLockTimeoutRef.current = null;
    }
    setIsInteractionLocked(false);
  }, []);

  const handleMapPanDrag = useCallback(() => {
    if (!isActive) return;
    if (followResumeTimeoutRef.current) clearTimeout(followResumeTimeoutRef.current);
    setIsAutoFollowEnabled(false);
    followResumeTimeoutRef.current = setTimeout(() => {
      setIsAutoFollowEnabled(true);
    }, 8000);
  }, [isActive]);

  useEffect(() => {
    if (isActive) return;
    lastSpokenStepKeyRef.current = "";
    lastSpokenAtRef.current = 0;
    try {
      Speech.stop();
    } catch {
      // ignore
    }
  }, [isActive]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────

  const resetCountdownState = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownHideTimeoutRef.current) {
      clearTimeout(countdownHideTimeoutRef.current);
      countdownHideTimeoutRef.current = null;
    }
    setIsCountingDown(false);
    setCountdownValue(3);
  }, []);

  const resetLocalOverlays = useCallback(() => {
    setShowSavedInventory(false);
    setShowNameModal(false);
    setRouteNameInput("");
    setActiveStepIndex(0);
  }, []);

  const handleStartRun = () => {
    const currentMoveState = useMoveStore.getState();
    if (
      interactionLockRef.current ||
      isInteractionLocked ||
      isCountingDown ||
      currentMoveState.isActive
    ) {
      return;
    }

    // Free run from idle should not inherit a previously planned route.
    if (!isPlanning) {
      clearPlannedRoute();
      setActiveStepIndex(0);
    }

    hapticHeavy();
    beginSessionPriming();
    setNavMode("street");
    navModeRef.current = "street";
    setIsAutoFollowEnabled(true);
    setIsCountingDown(true);
    setCountdownValue(3);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (countdownHideTimeoutRef.current) clearTimeout(countdownHideTimeoutRef.current);

    let currentCount = 3;
    countdownIntervalRef.current = setInterval(() => {
      currentCount -= 1;

      if (currentCount > 0) {
        setCountdownValue(currentCount);
        hapticSelection();
      } else if (currentCount === 0) {
        // Show GO and start session immediately so GO overlaps with camera shift.
        setCountdownValue(0);
        hapticSuccess();
        startSession(allDaySteps);
        if (currentLocation) {
          applyFollowCamera(currentLocation, "street");
        }
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        countdownHideTimeoutRef.current = setTimeout(() => {
          setIsCountingDown(false);
        }, 1000);
      } else {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);
  };

  const handleFreshRoute = () => {
    if (interactionLockRef.current || isInteractionLocked) return;
    hapticSelection();
    clearPlannedRoute();
    setPlanning(true);
    setActiveStepIndex(0);
  };

  const handleStopRun = async () => {
    if (interactionLockRef.current || isInteractionLocked) return;
    lockInteractions(1200);
    resetCountdownState();
    resetLocalOverlays();
    hapticSuccess();
    try {
      const session = await stopSession();
      if (session && session.xpEarned > 0) {
        await earnXP(session.xpEarned);
        await updateStreak();
      }
      // Zoom map out slightly to show full path if possible
      if (mapRef.current && session?.path?.length > 0) {
        mapRef.current.fitToCoordinates(session.path, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } finally {
      unlockInteractions();
      lockInteractions(260);
    }
  };

  const handleSaveRoute = () => {
    if (!lastSession || !lastSession.path || lastSession.path.length === 0) {
      Alert.alert("No Route", "This session has no GPS path to save.");
      return;
    }
    setRouteNameInput("");
    setShowNameModal(true);
  };

  const confirmSaveRoute = () => {
    const name = routeNameInput.trim() || `Route ${new Date().toLocaleDateString()}`;
    saveRoute(lastSession, name);
    setShowNameModal(false);
    hapticSuccess();
  };

  const handleShareToClubFeed = () => {
    if (!lastSession) return;

    // Force drop all interaction locks so the user can freely interact with the map again
    if (interactionLockTimeoutRef.current) {
       clearTimeout(interactionLockTimeoutRef.current);
       interactionLockTimeoutRef.current = null;
    }
    interactionLockRef.current = false;
    setIsInteractionLocked(false);

    const userName = user?.name?.trim() || "You";
    const userAvatar = user?.avatar_url || DEFAULT_CLUB_AVATAR;
    const pace = formatPace(lastSession.steps, lastSession.durationSecs);

    addRunPost({
      user: userName,
      avatar: userAvatar,
      distance: lastSession.distance,
      pace,
      caption: `Finished ${lastSession.distance.toFixed(2)} km in ${formatDuration(lastSession.durationSecs)}.`,
    });

    hapticSuccess();
    resetCountdownState();
    resetLocalOverlays();
    resetMoveState();
    
    router.push("/(tabs)/club?tab=Feed");
  };

  const handleBackToMapFromSummary = () => {
    // Force drop all interaction locks so the user can freely interact with the map again
    if (interactionLockTimeoutRef.current) {
       clearTimeout(interactionLockTimeoutRef.current);
       interactionLockTimeoutRef.current = null;
    }
    interactionLockRef.current = false;
    setIsInteractionLocked(false);
    
    hapticSelection();
    resetCountdownState();
    resetLocalOverlays();
    resetMoveState();
  };

  const handleDiscardRunToMap = () => {
    // Force drop all interaction locks
    if (interactionLockTimeoutRef.current) {
       clearTimeout(interactionLockTimeoutRef.current);
       interactionLockTimeoutRef.current = null;
    }
    interactionLockRef.current = false;
    setIsInteractionLocked(false);
    
    hapticHeavy();
    resetCountdownState();
    resetLocalOverlays();
    resetMoveState();
  };

  const handleMapPress = (e) => {
    if (interactionLockRef.current || isInteractionLocked) return;
    if (isPlanning) {
      hapticSelection();
      addPlannedLocation(e.nativeEvent.coordinate);
    }
  };

  const handleFeelingComplete = (value) => {
    const normalized = Math.max(1, Math.min(5, Math.round(Number(value) || 3)));
    setSessionFeeling(normalized);
    setSessionFeelingVisual(normalized);
    updateLastSessionFeeling(normalized);
    hapticSelection();
  };

  const handleOpenDirections = async () => {
    const routeForDirections = plannedRouteLocs.length >= 2 ? plannedRouteLocs : plannedRoutePath;
    if (!routeForDirections || routeForDirections.length < 2) {
      Alert.alert("No Route", "Plan a route first to get directions.");
      return;
    }

    const destination = routeForDirections[routeForDirections.length - 1];
    const start = currentLocation || routeForDirections[0];
    const intermediate = routeForDirections.slice(1, -1);

    // Limit waypoints to avoid oversized URL strings.
    const maxWaypoints = 6;
    const waypoints =
      intermediate.length <= maxWaypoints
        ? intermediate
        : Array.from({ length: maxWaypoints }, (_, i) => {
            const index = Math.floor(((i + 1) * intermediate.length) / (maxWaypoints + 1));
            return intermediate[index];
          });

    let url = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${start.latitude},${start.longitude}&destination=${destination.latitude},${destination.longitude}`;
    if (waypoints.length > 0) {
      const waypointString = waypoints.map((point) => `${point.latitude},${point.longitude}`).join("|");
      url += `&waypoints=${encodeURIComponent(waypointString)}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Directions Unavailable", "Unable to open map directions right now.");
        return;
      }
      hapticSuccess();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Directions Unavailable", "Unable to open map directions right now.");
    }
  };

  const speakPrompt = useCallback((message) => {
    if (!message) return;
    try {
      Speech.speak(message, {
        language: "en-US",
        rate: 0.95,
        pitch: 1,
      });
    } catch {
      // Ignore speech failures to avoid blocking the run UI.
    }
  }, []);

  const routeSteps = useMemo(
    () => (Array.isArray(plannedRouteSteps) ? plannedRouteSteps : []),
    [plannedRouteSteps],
  );

  useEffect(() => {
    if (routeSteps.length === 0) {
      setActiveStepIndex(0);
      return;
    }
    setActiveStepIndex((prev) => Math.min(prev, routeSteps.length - 1));
  }, [routeSteps]);

  useEffect(() => {
    if ((!isActive && !isPlanning) || !currentLocation || routeSteps.length === 0) return;

    const stepArrivalThresholdMeters = 18;
    const maxLookAhead = Math.min(routeSteps.length - 1, activeStepIndex + 4);
    let nextIndex = activeStepIndex;

    for (let i = activeStepIndex; i <= maxLookAhead; i += 1) {
      const stepLocation = routeSteps[i]?.location;
      if (!stepLocation) continue;
      const distance = getDistanceMeters(currentLocation, stepLocation);
      if (distance <= stepArrivalThresholdMeters) {
        nextIndex = Math.min(i + 1, routeSteps.length - 1);
      }
    }

    if (nextIndex !== activeStepIndex) {
      setActiveStepIndex(nextIndex);
    }
  }, [isActive, isPlanning, currentLocation, routeSteps, activeStepIndex]);

  const nextDirection = useMemo(() => {
    if (routeSteps.length === 0) return null;
    const safeIndex = Math.min(activeStepIndex, routeSteps.length - 1);
    const step = routeSteps[safeIndex] || routeSteps[0];
    const distanceToStep = step?.location
      ? getDistanceMeters(currentLocation, step.location)
      : null;

    return {
      ...step,
      distanceToStep,
    };
  }, [routeSteps, activeStepIndex, currentLocation]);

  useEffect(() => {
    if (!isActive || isPaused || isRerouting) return;
    if (!currentLocation || !Array.isArray(plannedRoutePath) || plannedRoutePath.length < 2) return;

    const now = Date.now();
    const rerouteCooldownMs = 20000;
    if (now - lastRerouteAtRef.current < rerouteCooldownMs) return;

    const offRouteThresholdMeters = 45;
    const nearestRouteDistance = getDistanceToPath(currentLocation, plannedRoutePath);
    if (!Number.isFinite(nearestRouteDistance) || nearestRouteDistance <= offRouteThresholdMeters) return;

    let cancelled = false;
    lastRerouteAtRef.current = now;

    (async () => {
      const reroute = await rerouteToDestination(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        plannedRouteLocs,
      );
      if (cancelled) return;
      if (reroute?.coordinates?.length) {
        hapticSelection();
        speakPrompt("Off route. Rerouting.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    isPaused,
    isRerouting,
    currentLocation,
    plannedRouteLocs,
    plannedRoutePath,
    rerouteToDestination,
    speakPrompt,
  ]);

  useEffect(() => {
    if (!isActive || isPaused || !nextDirection?.instruction) return;
    if (!Number.isFinite(nextDirection.distanceToStep) || nextDirection.distanceToStep > 45) return;

    const stepKey = `${nextDirection.maneuverType || ""}-${nextDirection.maneuverModifier || ""}-${nextDirection.name || ""}`;
    const now = Date.now();
    const speakCooldownMs = 12000;
    if (lastSpokenStepKeyRef.current === stepKey && now - lastSpokenAtRef.current < speakCooldownMs) return;

    lastSpokenStepKeyRef.current = stepKey;
    lastSpokenAtRef.current = now;
    speakPrompt(nextDirection.instruction);
  }, [isActive, isPaused, nextDirection, speakPrompt]);

  const renderDirectionCard = ({ bottomOffset = 0, inline = false } = {}) => {
    if (!nextDirection) return null;
    const distanceLabel = formatDistanceLabel(nextDirection.distanceToStep);

    return (
      <View
        pointerEvents={inline ? "auto" : "none"}
        style={
          inline
            ? { marginBottom: 12 }
            : {
                position: "absolute",
                left: 20,
                right: 20,
                bottom: bottomOffset,
                zIndex: 40,
              }
        }
      >
        <View
          style={{
            backgroundColor: "rgba(8,8,8,0.92)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "rgba(0,255,127,0.14)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Navigation size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Next Direction
              </Text>
              {isRerouting ? (
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", marginLeft: 8, textTransform: "uppercase" }}>
                  Rerouting...
                </Text>
              ) : null}
            </View>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 14, fontWeight: "800", marginTop: 2 }}>
              {nextDirection.instruction || "Follow the planned route"}
            </Text>
          </View>
          {distanceLabel ? (
            <View
              style={{
                marginLeft: 10,
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{distanceLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // ── HELPER RENDERS ────────────────────────────────────────────────────────

  // Start/End Dot Markers for any coordinate path
  const renderPathMarkers = (path, options = {}) => {
    if (!path || path.length < 2) return null;
    const startColor = options.startColor || "#00ff7f";
    const endColor = options.endColor || "#ffffff";
    const size = options.size || 14;
    return (
      <>
        <Marker coordinate={path[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: startColor, borderWidth: 3, borderColor: "#0a0a0a", shadowColor: startColor, shadowOpacity: 0.6, shadowRadius: 6 }} />
        </Marker>
        <Marker coordinate={path[path.length - 1]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: endColor, borderWidth: 3, borderColor: "#0a0a0a", shadowColor: endColor, shadowOpacity: 0.6, shadowRadius: 6 }} />
        </Marker>
      </>
    );
  };

  const renderLoadingControls = () => (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <ShimmerPlaceholder
          shimmerColors={["#111111", "#1e1e1e", "#111111"]}
          style={{ flex: 1, height: 56, borderRadius: 100 }}
        />
        <ShimmerPlaceholder
          shimmerColors={["#111111", "#1e1e1e", "#111111"]}
          style={{ flex: 1, height: 56, borderRadius: 100 }}
        />
      </View>
      <ShimmerPlaceholder
        shimmerColors={["#111111", "#1f1f1f", "#111111"]}
        style={{ height: 60, borderRadius: 100 }}
      />
    </View>
  );



  // Render Map Component (Now constrained inside its relative wrapper, not absoluteFill)
  const renderMap = () => (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_GOOGLE}  // Required to apply customMapStyle on iOS
      customMapStyle={mapCustomStyle}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={isActive && navMode !== "overview"}
      showsScale={false}
      showsBuildings={true}
      showsIndoors={false}
      pitchEnabled={isActive ? false : true}
      onPress={handleMapPress}
      onPanDrag={handleMapPanDrag}
      initialRegion={{
        latitude: currentLocation ? currentLocation.latitude : 40.7128,
        longitude: currentLocation ? currentLocation.longitude : -74.006,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
    >
      {/* ── PLANNED ROUTE RENDER ── */}
      {isPlanning && plannedRoutePath.length > 0 && (
        <>
          <Polyline
            coordinates={plannedRoutePath}
            strokeColor="#00ff7f"
            strokeColors={buildGradientColors(plannedRoutePath.length)}
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
          />
          {renderPathMarkers(plannedRoutePath)}
        </>
      )}
      {isPlanning && plannedRouteLocs.map((loc, i) => (
        <Marker key={i} coordinate={loc}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i === 0 ? "#00ff7f" : "#fff", borderWidth: 3, borderColor: "#000" }} />
        </Marker>
      ))}

      {/* ── ACTIVE SESSION RENDER ── */}
      {isActive && plannedRoutePath.length > 0 && (
        <>
          <Polyline
            coordinates={plannedRoutePath}
            strokeColor="rgba(0,255,127,0.4)"
            strokeColors={buildGradientColors(plannedRoutePath.length).map(c => c + '66')}
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
            lineDashPattern={[8, 6]}
          />
          {renderPathMarkers(plannedRoutePath)}
        </>
      )}
      {isActive && sessionPath.length > 0 && (
        <>
          <Polyline
            coordinates={sessionPath}
            strokeColor="#00ff7f"
            strokeColors={buildGradientColors(sessionPath.length)}
            strokeWidth={8}
            lineJoin="round"
            lineCap="round"
          />
          {renderPathMarkers(sessionPath)}
        </>
      )}

      {/* ── SUMMARY RENDER ── */}
      {lastSession && lastSession.path && lastSession.path.length > 0 && (
        <>
          <Polyline
            coordinates={lastSession.path}
            strokeColor="#00ff7f"
            strokeColors={buildGradientColors(lastSession.path.length)}
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
          />
          {renderPathMarkers(lastSession.path)}
        </>
      )}
    </MapView>
  );

  const sessionCompleteHeadline = useMemo(() => {
    if (!lastSession) return SESSION_COMPLETE_HEADLINES[0];
    const steps = Number(lastSession.steps || 0);
    const distanceKm = Number(lastSession.distance || 0);
    const durationSecs = Number(lastSession.durationSecs || 0);

    const isQuickStop = durationSecs > 0 && durationSecs <= 180;
    const isLowMovement = distanceKm < 0.2 || steps < 250;
    const isBigSession = durationSecs >= 1800 || distanceKm >= 5 || steps >= 6000;

    let headlinePool = SESSION_COMPLETE_HEADLINES;
    if (isQuickStop && isLowMovement) {
      headlinePool = LIGHT_SESSION_HEADLINES;
    } else if (isBigSession) {
      headlinePool = BIG_SESSION_HEADLINES;
    }

    const seed = `${lastSession.date || ""}:${steps}:${distanceKm}:${durationSecs}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % headlinePool.length;
    return headlinePool[index];
  }, [lastSession]);

  const sessionCelebration = useMemo(() => {
    if (!lastSession) return { level: "none", confettiCount: 0 };
    const steps = Number(lastSession.steps || 0);
    const distanceKm = Number(lastSession.distance || 0);
    const durationSecs = Number(lastSession.durationSecs || 0);

    const isHigh = durationSecs >= 1800 || distanceKm >= 5 || steps >= 6000;
    const isMid = durationSecs >= 900 || distanceKm >= 2 || steps >= 2500;
    if (isHigh) return { level: "high", confettiCount: 140 };
    if (isMid) return { level: "mid", confettiCount: 80 };
    return { level: "low", confettiCount: 55 };
  }, [lastSession]);

  const sessionFeelingPreview = Math.max(1, Math.min(5, Math.round(sessionFeelingVisual || sessionFeeling)));
  const sessionFeelingMeta = FEELING_COPY[sessionFeelingPreview] || FEELING_COPY[3];

  // ── UI STATES (FULL SCREEN ARCHITECTURE) ───────────────────────────────────


  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      
      {/* ── FULL SCREEN MAP ── */}
      <View style={StyleSheet.absoluteFillObject}>
        {renderMap()}
      </View>

      {/* ── IDLE / PLANNING STATE OVERLAYS ── */}
      <Animated.View 
        style={StyleSheet.absoluteFillObject}
        pointerEvents={isSummaryVisible || isSessionTransitioning || isInteractionLocked ? "none" : "box-none"}
      >
        {/* Top Overlays */}
        <Animated.View pointerEvents="box-none" style={{ opacity: idleOpacity, transform: [{ translateY: idleTopY }] }}>
          <LinearGradient 
            colors={['rgba(0,0,0,1)', 'rgba(10,10,10,0.82)', 'transparent']} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} 
            pointerEvents="none" 
          />

          {isPlanning && (
            <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <Route color="#00ff7f" size={16} style={{marginRight: 8}} />
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>PLANNING</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={handleOpenDirections}
                  activeOpacity={0.9}
                  disabled={plannedRoutePath.length === 0}
                  style={{
                    height: 46,
                    paddingHorizontal: 12,
                    borderRadius: 23,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "row",
                    borderWidth: 1,
                    borderColor: plannedRoutePath.length > 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)",
                  }}
                >
                  <Navigation size={16} color={plannedRoutePath.length > 0 ? "#fff" : "#666"} />
                  <Text style={{ color: plannedRoutePath.length > 0 ? "#fff" : "#666", marginLeft: 6, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                    MAPS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { hapticSelection(); clearPlannedRoute(); }} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <X color="#fff" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isPlanning && (
            <View style={{ position: "absolute", top: insets.top + 16, left: 20, right: 20, pointerEvents: "box-none", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => { hapticSelection(); setShowStepsInIdle(!showStepsInIdle); }}>
                <BlurView intensity={80} tint="dark" style={{ height: 48, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", justifyContent: "center" }}>
                  <View style={{ flexDirection: "row", paddingHorizontal: 16, alignItems: "center" }}>
                    <View style={{ alignItems: "center", marginRight: 16 }}>
                      {showStepsInIdle ? (
                        <>
                          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>{allDaySteps.toLocaleString()}</Text>
                          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>STEPS</Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>{allDayDistanceKm > 0 ? allDayDistanceKm.toFixed(1) : "0.0"}</Text>
                          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>TODAY KM</Text>
                        </>
                      )}
                    </View>
                    <View style={{ width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.1)", marginRight: 16 }} />
                    <View style={{ alignItems: "center" }}>
                       <Text style={{ color: "#00ff7f", fontSize: 15, fontWeight: "900" }}>{streak}</Text>
                       <Text style={{ color: "#00ff7f", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>STREAK</Text>
                    </View>
                  </View>
                </BlurView>
              </TouchableOpacity>

              <BlurView intensity={80} tint="dark" style={{ height: 48, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", justifyContent: "center" }}>
                 <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: "row" }}>
                       {socialPresence.people.slice(0, 3).map((p, i) => (
                          <Image key={`${p.name}-${i}`} source={{ uri: p.avatar }} style={{ width: 26, height: 26, borderRadius: 13, marginLeft: i === 0 ? 0 : -10, borderWidth: 2, borderColor: "#151515" }} />
                       ))}
                    </View>
                    <View style={{ marginLeft: 8 }}>
                       <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{socialPresence.outsideLabel} <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 10 }}>OUTSIDE</Text></Text>
                       <Text style={{ color: "#00ff7f", fontSize: 9, fontWeight: "700" }}>{socialPresence.friendsCount} FRIENDS</Text>
                    </View>
                 </View>
              </BlurView>
            </View>
          )}
        </Animated.View>

        {/* Bottom Actions */}
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: idleOpacity, transform: [{ translateY: idleBottomY }] }}>
          <LinearGradient 
            colors={['transparent', 'rgba(10,10,10,0.72)', 'rgba(10,10,10,0.94)', 'rgba(0,0,0,1)']} 
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }} 
            pointerEvents="none" 
          />
          <View pointerEvents="box-none" style={{ position: "absolute", bottom: idleBottomOffset, left: 20, right: 20 }}>
            {isLocationBooting ? (
              renderLoadingControls()
            ) : isPlanning ? (
              <View>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>PLANNED DISTANCE</Text>
                  <Text style={{ color: "#fff", fontSize: 56, fontWeight: "900", letterSpacing: -2, fontStyle: "italic", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{(plannedDistanceMeter / 1000).toFixed(2)}<Text style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontStyle: "normal" }}> km</Text></Text>
                  {isPlanningRoute ? (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                      <ActivityIndicator size="small" color="#00ff7f" />
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", marginLeft: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>
                        Drawing route...
                      </Text>
                    </View>
                  ) : null}
                </View>

                {renderDirectionCard({ inline: true })}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                     onPress={removeLastPlannedLocation}
                     style={{ backgroundColor: "#151515", paddingHorizontal: 20, borderRadius: 100, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}
                  >
                     <CornerUpLeft color="rgba(255,255,255,0.8)" size={20} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleStartRun}
                    activeOpacity={0.9}
                    disabled={plannedRoutePath.length === 0}
                    style={{ flex: 1, flexDirection: "row", backgroundColor: plannedRoutePath.length > 0 ? "#00ff7f" : "#222", paddingVertical: 20, borderRadius: 100, alignItems: "center", justifyContent: "center" }}
                  >
                    <Navigation size={22} color={plannedRoutePath.length > 0 ? "#0a0a0a" : "#666"} fill={plannedRoutePath.length > 0 ? "#0a0a0a" : "#666"} style={{ transform: [{rotate: '45deg'}], marginRight: 10 }} />
                    <Text style={{ color: plannedRoutePath.length > 0 ? "#0a0a0a" : "#666", fontSize: 18, fontWeight: "900", fontStyle: "italic", letterSpacing: 1 }}>{freeRunCta}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                     onPress={handleFreshRoute}
                     style={{ backgroundColor: "#151515", paddingHorizontal: 20, borderRadius: 100, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}
                  >
                     <RotateCcw color="#00ff7f" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                 <View style={{ flexDirection: "row", gap: 12 }}>
                   <TouchableOpacity
                     onPress={() => { hapticSelection(); setPlanning(true); }}
                     style={{ flex: 1, backgroundColor: "#151515", borderRadius: 100, paddingVertical: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row" }}
                   >
                     <Route color="#fff" size={18} style={{marginRight: 8}} />
                     <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Plan Route</Text>
                   </TouchableOpacity>

                   <TouchableOpacity
                     onPress={() => { hapticSelection(); setShowSavedInventory(true); }}
                     style={{ flex: 1, backgroundColor: "#151515", borderRadius: 100, paddingVertical: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row" }}
                   >
                     <Bookmark color="#fff" size={18} style={{marginRight: 8}} />
                     <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Saved</Text>
                   </TouchableOpacity>
                 </View>

                 <TouchableOpacity
                   onPress={handleStartRun}
                   activeOpacity={0.9}
                   style={{ flexDirection: "row", backgroundColor: "#00ff7f", paddingVertical: 20, borderRadius: 100, alignItems: "center", justifyContent: "center", shadowColor: "#00ff7f", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}
                 >
                   <Play size={24} color="#0a0a0a" fill="#0a0a0a" style={{ marginRight: 8, marginLeft: 4 }} />
                   <Text style={{ color: "#0a0a0a", fontSize: 20, fontWeight: "900", fontStyle: "italic", letterSpacing: 1.5 }}>{freeRunCta}</Text>
                 </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>


      {/* ── ACTIVE SESSION OVERLAYS ── */}
      <Animated.View 
        style={StyleSheet.absoluteFillObject}
        pointerEvents={isSummaryVisible ? "none" : (isActive && !isInteractionLocked ? "box-none" : "none")}
      >
        {/* Top Active Stats / Navigation Direction */}
        <Animated.View pointerEvents="box-none" style={{ opacity: activeOpacity, transform: [{ translateY: activeTopY }] }}>
          <LinearGradient 
            colors={navMode === "navigation" ? ['rgba(0,0,0,0.95)', 'rgba(10,10,10,0.6)', 'transparent'] : ['rgba(0,0,0,1)', 'rgba(10,10,10,0.88)', 'transparent']} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: navMode === "navigation" ? 200 : 320 }} 
            pointerEvents="none" 
          />
          <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top, left: 16, right: 16 }}>

            {/* Navigation / Street Mode: Big Direction Banner */}
            {navMode !== "overview" && nextDirection && (
              <View style={{
                backgroundColor: "rgba(10,10,10,0.88)",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(0,255,127,0.2)",
                padding: 18,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>NEXT DIRECTION</Text>
                    <Text numberOfLines={2} style={{ color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.5 }}>
                      {nextDirection.instruction || "Follow the route"}
                    </Text>
                  </View>
                  {nextDirection.distanceToStep > 0 && (
                    <View style={{
                      marginLeft: 14,
                      backgroundColor: "rgba(0,255,127,0.15)",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(0,255,127,0.3)",
                    }}>
                      <Text style={{ color: "#00ff7f", fontSize: 18, fontWeight: "900" }}>
                        {formatDistanceLabel(nextDirection.distanceToStep)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Navigation / Street Mode: Compact Stats Row */}
            {navMode !== "overview" && (
              <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(10,10,10,0.7)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
                {[
                  { value: formatDuration(sessionDurationSecs), unit: "" },
                  { value: sessionDistance.toFixed(2), unit: "km" },
                  { value: sessionSteps.toLocaleString(), unit: "steps" },
                ].map((s, i) => (
                  <View key={i} style={{ alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", fontStyle: "italic", letterSpacing: -0.5 }}>{s.value}</Text>
                    {s.unit ? <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{s.unit}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {/* Overview Mode: Full Stats Grid */}
            {navMode === "overview" && (
              <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isPaused ? "rgba(255,165,0,0.15)" : "rgba(0,255,127,0.15)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: isPaused ? "rgba(255,165,0,0.3)" : "rgba(0,255,127,0.3)" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPaused ? "#ffa500" : "#00ff7f", marginRight: 8, shadowColor: isPaused ? "#ffa500" : "#00ff7f", shadowOpacity: 0.8, shadowRadius: 5 }} />
                <Text style={{ color: isPaused ? "#ffa500" : "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }}>
                  {isPaused ? "PAUSED" : "LIVE DASH"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <BlurView intensity={80} tint="dark" style={{ height: 40, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", justifyContent: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10 }}>
                    <View style={{ flexDirection: "row" }}>
                      {socialPresence.people.slice(0, 3).map((p, i) => (
                        <Image key={`${p.name}-${i}`} source={{ uri: p.avatar }} style={{ width: 20, height: 20, borderRadius: 10, marginLeft: i === 0 ? 0 : -8, borderWidth: 1.5, borderColor: "#151515" }} />
                      ))}
                    </View>
                    <View style={{ marginLeft: 7 }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{socialPresence.outsideLabel} <Text style={{ color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 9 }}>OUTSIDE</Text></Text>
                      <Text style={{ color: "#00ff7f", fontSize: 8, fontWeight: "800", letterSpacing: 0.4 }}>{socialPresence.friendsCount} FRIENDS</Text>
                    </View>
                  </View>
                </BlurView>
                <TouchableOpacity onPress={() => hapticSelection()} style={{ width: 40, height: 40, borderRadius: 20, marginLeft: 8, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <Radio color="#00ff7f" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {[
                { label: "Time", value: formatDuration(sessionDurationSecs), unit: "" },
                { label: "Distance", value: sessionDistance.toFixed(2), unit: "km" },
                { label: "Steps", value: sessionSteps.toLocaleString(), unit: "" },
                { label: "AVG Pace", value: pace, unit: "/km" },
                { label: "Calories", value: calories, unit: "kcal" },
                { label: "Elevation", value: elevation, unit: "m" },
              ].map((stat, i) => (
                <View key={i} style={{ width: "33%", alignItems: "center", marginBottom: 28 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{stat.label}</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900", fontStyle: "italic", letterSpacing: -1, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{stat.value}</Text>
                    {stat.unit ? <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "800", marginHorizontal: 4, textTransform: "uppercase", letterSpacing: 1 }}>{stat.unit}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
              </>
            )}

          </View>
        </Animated.View>

        {/* Bottom Active Actions */}
        <Animated.View
          pointerEvents={isActive && !isInteractionLocked ? "box-none" : "none"}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: activeOpacity, transform: [{ translateY: activeBottomY }] }}
        >
          <LinearGradient 
            colors={['transparent', 'rgba(10,10,10,0.82)', 'rgba(0,0,0,1)']} 
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }} 
            pointerEvents="none" 
          />
          <View pointerEvents="box-none" style={{ position: "absolute", bottom: activeBottomOffset, left: 24, right: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 }}>
              <TouchableOpacity 
                onPress={handleDiscardRunToMap}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#151515", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.05)" }}
              >
                <RotateCcw color="rgba(255,255,255,0.8)" size={24} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => { hapticSelection(); if(isPaused) resumeSession(); else pauseSession(); }}
                activeOpacity={0.8}
                style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#00ff7f", justifyContent: "center", alignItems: "center", shadowColor: "#00ff7f", shadowOffset: { width: 0, height: 0 }, shadowOpacity: isPaused ? 0.3 : 0.6, shadowRadius: isPaused ? 10 : 20, elevation: 10 }}
              >
                 {isPaused ? (
                   <Play color="#0a0a0a" fill="#0a0a0a" size={40} style={{ marginLeft: 4 }} />
                 ) : (
                   <Pause color="#0a0a0a" fill="#0a0a0a" size={40} />
                 )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleStopRun}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#151515", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.05)" }}
              >
                <Square color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" size={22} />
              </TouchableOpacity>
            </View>

            {/* View Mode Toggle: Overview -> Navigation -> Street View */}
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                let next = "overview";
                if (navMode === "overview") next = "navigation";
                else if (navMode === "navigation") next = "street";
                else next = "overview";

                setNavMode(next);
                navModeRef.current = next;
                setIsAutoFollowEnabled(true);
                if (currentLocation) applyFollowCamera(currentLocation, next);
              }}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "center",
                marginTop: 16,
                backgroundColor: navMode !== "overview" ? "rgba(0,255,127,0.15)" : "rgba(255,255,255,0.08)",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: navMode !== "overview" ? "rgba(0,255,127,0.3)" : "rgba(255,255,255,0.1)",
              }}
            >
              {navMode === "street" ? (
                <Navigation color="#00ff7f" size={16} style={{ marginRight: 8 }} />
              ) : navMode === "navigation" ? (
                <MapIcon color="#00ff7f" size={16} style={{ marginRight: 8 }} />
              ) : (
                <Eye color="#fff" size={16} style={{ marginRight: 8 }} />
              )}
              <Text style={{ color: navMode !== "overview" ? "#00ff7f" : "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>
                {navMode === "street" ? "STREET LEVEL" : navMode === "navigation" ? "PILOT VIEW" : "OVERVIEW"}
              </Text>
            </TouchableOpacity>
          </View>
          {navMode === "overview" && renderDirectionCard({ bottomOffset: insets.bottom + 10 })}
        </Animated.View>
      </Animated.View>

      {isInteractionLocked ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto" />
      ) : null}


      {/* ── SUMMARY SCREEN OVERLAY ── */}
      {isSummaryVisible && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#0a0a0a", zIndex: 100 }]}>
          <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 24 }}>
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: "center", marginBottom: 32 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Session Complete</Text>
              <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginTop: 4, textAlign: "center" }}>{sessionCompleteHeadline}</Text>
            </View>

            <View style={{ backgroundColor: "#151515", borderRadius: 32, padding: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>DISTANCE</Text>
                <Text style={{ color: "#fff", fontSize: 64, fontWeight: "900", letterSpacing: -2, fontStyle: "italic" }}>{lastSession.distance.toFixed(2)}<Text style={{fontSize: 24, color: "rgba(255,255,255,0.4)", fontStyle: "normal"}}> km</Text></Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>TIME</Text>
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, fontStyle: "italic" }}>{formatDuration(lastSession.durationSecs)}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>PACE</Text>
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, fontStyle: "italic" }}>{formatPace(lastSession.steps, lastSession.durationSecs)}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>EARNED</Text>
                  <Text style={{ color: "#00ff7f", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, fontStyle: "italic" }}>+{lastSession.xpEarned} <Text style={{fontSize: 14, color: "#00ff7f", fontStyle: "normal"}}>XP</Text></Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 14, backgroundColor: "#121212", borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
                  How Was That?
                </Text>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 6 }}>
                  {sessionFeelingMeta.label}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                  {sessionFeelingMeta.note}
                </Text>
              </View>

              <View style={{ marginTop: 20, position: "relative", justifyContent: "center" }}>
                <View
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "rgba(0,0,0,0.6)",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    height: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={["#00ff7f", "#ffd700", "#ff4500"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      position: "absolute",
                      left: 0,
                      width: `${((sessionFeelingVisual - 1) / 4) * 100}%`,
                      top: 0,
                      bottom: 0,
                    }}
                  />
                </View>
                <Slider
                  minimumValue={1}
                  maximumValue={5}
                  step={0.01}
                  value={sessionFeelingVisual}
                  onValueChange={(value) => setSessionFeelingVisual(value)}
                  onSlidingComplete={handleFeelingComplete}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="rgba(0,0,0,0.6)"
                  thumbTintColor="#ffffff"
                  style={{ height: 40 }}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -6, paddingHorizontal: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Low</Text>
                <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>High</Text>
              </View>
            </View>

            <View style={{ marginTop: 24, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity 
                  onPress={handleSaveRoute}
                  style={{ flex: 1, backgroundColor: "rgba(0,255,127,0.1)", borderRadius: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,255,127,0.3)" }}
                >
                  <BookmarkPlus color="#fff" size={18} />
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Save Route</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ flex: 1, backgroundColor: "#151515", borderRadius: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} onPress={handleShareToClubFeed}>
                  <Share2 color="#fff" size={18} />
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Share to Club</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleBackToMapFromSummary} style={{ alignItems: "center", paddingVertical: 14 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Back to Map</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          {sessionCelebration.level !== "none" ? (
            <ConfettiCannon
              count={sessionCelebration.confettiCount}
              origin={{ x: width / 2, y: height }}
              autoStart={true}
              fadeOut={true}
              explosionSpeed={350}
              fallSpeed={3000}
              colors={["#00ff7f", "#ffffff", "#0d2818"]}
            />
          ) : null}
          </View>
        </View>
      )}

      {/* ── SAVED INVENTORY DARK FULL SCREEN OVERLAY ── */}
      {showSavedInventory && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, justifyContent: "center" }}>
          
          <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 20 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase" }}>Saved Routes</Text>
              <TouchableOpacity onPress={() => { hapticSelection(); setShowSavedInventory(false); }} style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: 8, borderRadius: 20 }}>
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {savedRoutes.length === 0 ? (
              <View style={{ marginHorizontal: 30, backgroundColor: "#151515", borderRadius: 28, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Bookmark color="rgba(255,255,255,0.3)" size={32} />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24 }}>No routes saved yet. Plan a mission or finish a free run to save it.</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                snapToInterval={280 + 16} // card width + gap
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: "center" }}
              >
                {savedRoutes.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    onPress={() => {
                       hapticSuccess();
                       setShowSavedInventory(false);
                       loadRouteToPlan(route);
                    }}
                    style={{ width: 280, backgroundColor: "#151515", borderRadius: 32, padding: 24, marginRight: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    {/* Mini Map View bounded inside the card */}
                    <View style={{ height: 160, borderRadius: 20, overflow: "hidden", marginBottom: 20, backgroundColor: "#222" }}>
                       {route.path && route.path.length > 0 ? (
                         <MapView
                           style={{ flex: 1 }}
                           customMapStyle={mapCustomStyle}
                           liteMode={true}
                           scrollEnabled={false}
                           zoomEnabled={false}
                           pitchEnabled={false}
                           rotateEnabled={false}
                           initialRegion={{
                              latitude: route.path[0].latitude,
                              longitude: route.path[0].longitude,
                              latitudeDelta: 0.02,
                              longitudeDelta: 0.02,
                           }}
                         >
                           <Polyline
                             coordinates={route.path}
                             strokeColor="#00ff7f"
                             strokeColors={buildGradientColors(route.path.length)}
                             strokeWidth={7}
                             lineCap="round"
                             lineJoin="round"
                           />
                           <Marker coordinate={route.path[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                             <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#00ff7f', borderWidth: 2, borderColor: '#0a0a0a' }} />
                           </Marker>
                           <Marker coordinate={route.path[route.path.length - 1]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                             <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#0a0a0a' }} />
                           </Marker>
                         </MapView>
                       ) : (
                         <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                           <MapPin color="rgba(255,255,255,0.2)" size={28} />
                         </View>
                       )}
                    </View>

                    <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 8 }} numberOfLines={2}>
                      {route.name}
                    </Text>
                    
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MapPin size={16} color="rgba(255,255,255,0.4)" />
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "700" }}>
                          {route.distance.toFixed(2)} km
                        </Text>
                      </View>
                      
                      <View style={{ backgroundColor: "rgba(0,255,127,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>RUN</Text>
                      </View>
                    </View>

                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <View /> {/* Balance spacer for flex-between */}
          </SafeAreaView>
        </View>
      )}

      {showNameModal && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 200, justifyContent: 'center', alignItems: 'center' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', paddingHorizontal: 30 }}>
            <View style={{ backgroundColor: '#151515', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>NAME YOUR ROUTE</Text>
              
              <TextInput
                value={routeNameInput}
                onChangeText={setRouteNameInput}
                placeholder="e.g. Morning Loop, Hyde Park Run..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoFocus
                maxLength={40}
                style={{
                  backgroundColor: '#0a0a0a',
                  borderRadius: 20,
                  paddingHorizontal: 24,
                  paddingVertical: 18,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: '700',
                  borderWidth: 1,
                  borderColor: 'rgba(0,255,127,0.2)',
                  marginBottom: 24,
                  textAlign: 'center',
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => { hapticSelection(); setShowNameModal(false); }}
                  style={{ flex: 1, paddingVertical: 16, borderRadius: 100, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '800' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmSaveRoute}
                  style={{ flex: 1, flexDirection: 'row', paddingVertical: 16, borderRadius: 100, backgroundColor: '#00ff7f', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check color="#0a0a0a" size={18} />
                  <Text style={{ color: '#0a0a0a', fontSize: 15, fontWeight: '900', marginLeft: 6 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {isCountingDown && <CountdownOverlay value={countdownValue} />}

    </View>
  );
}
