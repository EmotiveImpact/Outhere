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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect, useRouter } from "expo-router";
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
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import ConfettiCannon from "react-native-confetti-cannon";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

// Mock "who's moving now" — will be replaced with real club data
const MOVING_NOW = [
  { id: "1", name: "Sarah", avatar: "https://i.pravatar.cc/150?img=1" },
  { id: "2", name: "Mike", avatar: "https://i.pravatar.cc/150?img=2" },
  { id: "3", name: "Jazz", avatar: "https://i.pravatar.cc/150?img=3" },
];

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

import { useMoveStore, formatDuration, formatPace } from "@/store/useMoveStore";
import { useUserStore } from "@/store/userStore";
import { useClubStore, DEFAULT_CLUB_AVATAR } from "@/store/useClubStore";
import { hapticHeavy, hapticSuccess, hapticSelection } from "@/services/haptics";

const { width, height } = Dimensions.get("window");

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

  // Move Store
  const {
    isActive,
    isPlanning,
    plannedRouteLocs,
    plannedRoutePath,
    plannedDistanceMeter,
    plannedRouteSteps,
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
    dismissSummary,
    saveRoute,
    savedRoutes,
    loadHistory,
    rerouteToDestination,
    isPaused,
    pauseSession,
    resumeSession
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
  const lastRerouteAtRef = useRef(0);
  const lastSpokenStepKeyRef = useRef("");
  const lastSpokenAtRef = useRef(0);

  // Load History on Mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── LOCATION EFFECTS ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
      }
    })();
  }, []);

  // Track location during active session
  useEffect(() => {
    const startTracking = async () => {
      locationSubscription.current = await Location.watchPositionAsync(
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
          
          // Optionally pan map to follow user
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              },
              pitch: 45,
              heading: loc.coords.heading || 0,
            });
          }
        }
      );
    };

    if (isActive && hasPermission) {
      startTracking();
    } else if (!isActive && locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [isActive, hasPermission]);

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
    };
  }, []);

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

  const handleStartRun = () => {
    if (isCountingDown || isActive) return;

    hapticHeavy();
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

  const handleStopRun = async () => {
    hapticSuccess();
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
    router.push("/(tabs)/club?tab=Feed");
  };

  const handleMapPress = (e) => {
    if (isPlanning) {
      hapticSelection();
      addPlannedLocation(e.nativeEvent.coordinate);
    }
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

  const nextDirection = useMemo(() => {
    if (routeSteps.length === 0) return null;

    const fallbackStep = routeSteps[0];
    if (!currentLocation) {
      return {
        ...fallbackStep,
        distanceToStep: null,
      };
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    routeSteps.forEach((step, index) => {
      const stepLocation = step?.location;
      if (!stepLocation) return;
      const distance = getDistanceMeters(currentLocation, stepLocation);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const currentStepIndex =
      nearestDistance < 18 && nearestIndex < routeSteps.length - 1
        ? nearestIndex + 1
        : nearestIndex;
    const step = routeSteps[currentStepIndex] || fallbackStep;
    const distanceToStep = step?.location
      ? getDistanceMeters(currentLocation, step.location)
      : null;

    return {
      ...step,
      distanceToStep,
    };
  }, [routeSteps, currentLocation]);

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
      const reroute = await rerouteToDestination({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
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

  const renderDirectionCard = (bottomOffset) => {
    if (!nextDirection) return null;
    const distanceLabel = formatDistanceLabel(nextDirection.distanceToStep);

    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: bottomOffset,
          zIndex: 40,
        }}
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
            <Navigation size={16} color="#00ff7f" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Next Direction
              </Text>
              {isRerouting ? (
                <Text style={{ color: "#00ff7f", fontSize: 10, fontWeight: "800", marginLeft: 8, textTransform: "uppercase" }}>
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



  // Render Map Component (Now constrained inside its relative wrapper, not absoluteFill)
  const renderMap = () => (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_GOOGLE}  // Required to apply customMapStyle on iOS
      customMapStyle={mapCustomStyle}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      pitchEnabled={isActive ? false : true}
      onPress={handleMapPress}
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

  // ── UI STATES (FULL SCREEN ARCHITECTURE) ───────────────────────────────────

  if (lastSession) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <StatusBar style="light" />
        
        {/* BACKGROUND MAP */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none" opacity={0.22}>
          {renderMap()}
        </View>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.55)" }]} pointerEvents="none" />

        {/* FULL SCREEN SUMMARY OVERLAY */}
        <View style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: 24, justifyContent: "center" }}>
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Session Complete</Text>
            <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginTop: 4 }}>GREAT MOVE</Text>
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

          <View style={{ marginTop: 24, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity 
                onPress={handleSaveRoute}
                style={{ flex: 1, backgroundColor: "rgba(0,255,127,0.1)", borderRadius: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,255,127,0.3)" }}
              >
                <BookmarkPlus color="#00ff7f" size={18} />
                <Text style={{ color: "#00ff7f", fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Save Route</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ flex: 1, backgroundColor: "#151515", borderRadius: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} onPress={handleShareToClubFeed}>
                <Share2 color="#fff" size={18} />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Share to Club</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { hapticSelection(); dismissSummary(); }} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Back to Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {lastSession.xpEarned > 0 && <ConfettiCannon count={60} origin={{ x: width / 2, y: -20 }} fadeOut={true} fallSpeed={3000} autoStart={true} />}
      </View>
    );
  }

  if (isActive) {
    const pace = formatPace(sessionSteps, sessionDurationSecs);
    // Rough mocks based on steps for premium data visualization
    const calories = Math.floor(sessionSteps * 0.045); 
    const elevation = Math.floor(sessionSteps * 0.002);

    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <StatusBar style="light" />

        {/* FULL SCREEN MAP */}
        <View style={StyleSheet.absoluteFillObject}>
          {renderMap()}
        </View>
        
        {/* ── TOP STATS GRID (FLOATING) ── */}
        <LinearGradient 
          colors={['rgba(0,0,0,1)', 'rgba(10,10,10,0.88)', 'transparent']} 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }} 
          pointerEvents="none" 
        />
        <View style={{ position: "absolute", top: insets.top, left: 16, right: 16 }}>
          {/* Top Row: Layout Bar */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            {/* Live Dash Indicator */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isPaused ? "rgba(255,165,0,0.15)" : "rgba(0,255,127,0.15)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: isPaused ? "rgba(255,165,0,0.3)" : "rgba(0,255,127,0.3)" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPaused ? "#ffa500" : "#00ff7f", marginRight: 8, shadowColor: isPaused ? "#ffa500" : "#00ff7f", shadowOpacity: 0.8, shadowRadius: 5 }} />
              <Text style={{ color: isPaused ? "#ffa500" : "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }}>
                {isPaused ? "PAUSED" : "LIVE DASH"}
              </Text>
            </View>

            {/* Broadcast Icon */}
            <TouchableOpacity onPress={() => hapticSelection()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Radio color="#00ff7f" size={18} />
            </TouchableOpacity>
          </View>

          {/* 3x2 Floating Transparent Grid */}
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
        </View>

        {/* ── BOTTOM ACTION BAR (FLOATING) ── */}
        <LinearGradient 
          colors={['transparent', 'rgba(10,10,10,0.82)', 'rgba(0,0,0,1)']} 
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }} 
          pointerEvents="none" 
        />
        <View style={{ position: "absolute", bottom: insets.bottom + 20, left: 24, right: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 }}>
            <TouchableOpacity 
              onPress={() => { hapticHeavy(); stopSession(); dismissSummary(); }}
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
        </View>

        {renderDirectionCard(insets.bottom + 130)}
        {isCountingDown && <CountdownOverlay value={countdownValue} />}
      </View>
    );
  }

  // ── IDLE / PLANNING STATE (FULL SCREEN MAP WITH OVERLAYS) ─────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      
      {/* ── FULL SCREEN MAP ── */}
      <View style={StyleSheet.absoluteFillObject}>
        {renderMap()}
      </View>

      {/* ── TOP OVERLAYS ── */}
      <LinearGradient 
        colors={['rgba(0,0,0,1)', 'rgba(10,10,10,0.82)', 'transparent']} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} 
        pointerEvents="none" 
      />

      {isPlanning && (
        <View style={{ position: "absolute", top: insets.top, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Route color="#00ff7f" size={16} style={{marginRight: 8}} />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>PLANNING</Text>
          </View>
          <TouchableOpacity onPress={() => { hapticSelection(); clearPlannedRoute(); }} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <X color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      )}

      {/* Idle Top Live Pill & Social */}
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
                   {MOVING_NOW.map((p, i) => (
                      <Image key={p.id} source={{ uri: p.avatar }} style={{ width: 26, height: 26, borderRadius: 13, marginLeft: i === 0 ? 0 : -10, borderWidth: 2, borderColor: "#151515" }} />
                   ))}
                </View>
                <View style={{ marginLeft: 8 }}>
                   <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>240K <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 10 }}>OUTSIDE</Text></Text>
                   <Text style={{ color: "#00ff7f", fontSize: 9, fontWeight: "700" }}>{MOVING_NOW.length} FRIENDS</Text>
                </View>
             </View>
          </BlurView>
        </View>
      )}


      {/* ── BOTTOM ACTIONS (FLOATING) ── */}
      <LinearGradient 
        colors={['transparent', 'rgba(10,10,10,0.72)', 'rgba(10,10,10,0.94)', 'rgba(0,0,0,1)']} 
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }} 
        pointerEvents="none" 
      />

      <View style={{ position: "absolute", bottom: insets.bottom + 10, left: 20, right: 20 }}>
        {isPlanning ? (
          <View>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>PLANNED DISTANCE</Text>
              <Text style={{ color: "#fff", fontSize: 56, fontWeight: "900", letterSpacing: -2, fontStyle: "italic", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{(plannedDistanceMeter / 1000).toFixed(2)}<Text style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontStyle: "normal" }}> km</Text></Text>
            </View>

            <TouchableOpacity
              onPress={handleOpenDirections}
              activeOpacity={0.9}
              disabled={plannedRoutePath.length === 0}
              style={{
                marginBottom: 12,
                flexDirection: "row",
                backgroundColor: plannedRoutePath.length > 0 ? "#151515" : "#1d1d1d",
                paddingVertical: 14,
                borderRadius: 100,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: plannedRoutePath.length > 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)",
              }}
            >
              <Navigation size={18} color={plannedRoutePath.length > 0 ? "#fff" : "#666"} style={{ marginRight: 8 }} />
              <Text style={{ color: plannedRoutePath.length > 0 ? "#fff" : "#666", fontSize: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
                Open in Maps
              </Text>
            </TouchableOpacity>

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

      {isPlanning ? renderDirectionCard(insets.bottom + 210) : null}

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
                        <Text style={{ color: "#00ff7f", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>RUN</Text>
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
