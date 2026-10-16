// Step 2 of 4: the live face scan. The front camera fills the screen behind a
// dark mask with an oval cut out; the ring round the oval fills as each angle
// is captured (looking ahead, then left, then right), on its own with no
// button. Turning the head is the liveness check, so a held up photo can't
// pass. A shot that fails to save just asks for that angle again and spends
// nothing. Live camera only, never the camera roll.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Ellipse, Path } from "react-native-svg";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, ScanFace } from "lucide-react-native";
import { engine } from "@/data/hooks";
import { F, toast } from "@/components/ui";
import { SCAN_ANGLES } from "@/constants/pack";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { Checks, INK, LINE, LockLine, OUT, PackButton, PackScreen, PackTitle, Spacer, Sub } from "@/components/pack/PackKit";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const HOLD_MS = 2400; // how long each angle is held before it's taken
const TURN_ICON = { straight: ScanFace, left: ChevronLeft, right: ChevronRight };

// Ramanujan's ellipse perimeter, for the ring's dash.
const perimeter = (a, b) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

export default function PackScan() {
  const [perm, request] = useCameraPermissions();
  if (!perm) return <PackScreen step={2} stepLabel="Scanning" />;
  if (!perm.granted) return <NeedCamera canAsk={perm.canAskAgain} onAsk={request} />;
  return <Scanner />;
}

function NeedCamera({ canAsk, onAsk }) {
  return (
    <PackScreen step={2} stepLabel="Face scan">
      <Spacer />
      <PackTitle top="Camera" em="needed" size={34} />
      <Sub>The scan uses your front camera, live. Nothing is saved to your phone and the selfies are deleted within 24 hours.</Sub>
      <PackButton title={canAsk ? "Allow camera" : "Open Settings"} onPress={canAsk ? onAsk : () => Linking.openSettings()} />
      <LockLine>Live camera only, never the camera roll</LockLine>
    </PackScreen>
  );
}

function Scanner() {
  const router = useRouter();
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReducedMotion();
  const camera = useRef(null);
  const keys = useRef([]);
  const firstShot = useRef(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // .scanring: 74% of the width, centred 36% down; the oval cut out matches it.
  const rx = W * 0.352;
  const ry = rx * 1.3;
  const cx = W / 2;
  const cy = H * 0.36;
  const len = perimeter(rx, ry);
  const progress = useSharedValue(0);
  const ring = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - progress.value) }));

  // .scanline: sweeps down and back over the face.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [reduce, sweep]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: (sweep.value - 0.5) * ry * 1.3 }] }));

  const capture = useCallback(
    async (i) => {
      const angle = SCAN_ANGLES[i];
      try {
        const shot = await camera.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
        if (!shot?.uri) throw new Error("no photo");
        // The data layer shrinks it before it leaves the phone.
        const { key } = await engine.uploadScanShot({ angle: angle.key, uri: shot.uri });
        keys.current[i] = key;
        if (i === 0) firstShot.current = shot.uri;
        hapticSelection();
        setIndex(i + 1);
      } catch {
        // A bad angle just asks again and spends nothing.
        toast("Let's try that again", angle.prompt);
        progress.value = withTiming(i / SCAN_ANGLES.length, { duration: 300 });
        setAttempt((n) => n + 1);
      }
    },
    [progress],
  );

  // Hold each angle while the ring fills its third, then take it.
  useEffect(() => {
    if (!ready || index >= SCAN_ANGLES.length) return;
    const t = setTimeout(() => {
      progress.value = withTiming((index + 1) / SCAN_ANGLES.length, { duration: HOLD_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
        if (done) runOnJS(capture)(index);
      });
    }, 500);
    return () => clearTimeout(t);
  }, [ready, index, attempt, capture, progress]);

  // All three in: check them, then on to Verified.
  useEffect(() => {
    if (index < SCAN_ANGLES.length || verifying) return;
    setVerifying(true);
    engine
      .verifyScan({ keys: keys.current })
      .then(() => {
        hapticSuccess();
        router.replace({ pathname: "/pack/verified", params: firstShot.current ? { shot: firstShot.current } : {} });
      })
      .catch((e) => {
        toast("Scan didn't pass", e?.message || "Let's run it again.");
        keys.current = [];
        progress.value = withTiming(0, { duration: 400 });
        setVerifying(false);
        setIndex(0);
      });
  }, [index, verifying, router, progress]);

  const current = SCAN_ANGLES[Math.min(index, SCAN_ANGLES.length - 1)];
  const Turn = TURN_ICON[current.key] || ScanFace;
  const ringPath = `M${cx} ${cy - ry} A${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`;
  const mask = `M0 0H${W}V${H}H0Z ${ringPath}Z`;

  return (
    <PackScreen
      step={2}
      stepLabel={verifying ? "Checking" : "Scanning"}
      gap={10}
      behind={
        <>
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" mirror onCameraReady={() => setReady(true)} />
          <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* .scan::after: everything outside the oval goes dark */}
            <Path d={mask} fill="rgba(2,4,9,0.86)" fillRule="evenodd" />
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} />
            <AnimatedPath d={ringPath} fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" strokeDasharray={[len, len]} animatedProps={ring} />
          </Svg>
          <Animated.View pointerEvents="none" style={[styles.scanline, { left: W * 0.22, right: W * 0.22, top: cy }, line]} />
          <View pointerEvents="none" style={[styles.turnRow, { top: H * 0.63 }]}>
            <View style={styles.turn}>
              <Turn size={14} color={OUT} strokeWidth={2.2} />
              <Text style={styles.turnText}>{verifying ? "Checking it's you" : current.prompt}</Text>
            </View>
          </View>
        </>
      }
    >
      <Spacer />
      <Checks
        items={SCAN_ANGLES.map((a, i) => ({
          label: i === 0 ? (index > 0 ? "Face found, looking ahead" : "Look straight ahead") : a.label,
          state: i < index ? "ok" : i === index ? "now" : null,
        }))}
      />
      <LockLine>Captures on its own. No button to press.</LockLine>
    </PackScreen>
  );
}

const styles = StyleSheet.create({
  // .scanline: a thin light across the face
  scanline: { position: "absolute", height: 2, backgroundColor: "rgba(156,200,255,0.9)", boxShadow: "0 0 12px #4f9bff", borderRadius: 2 },
  // .turn: the prompt pill under the oval
  turnRow: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  turn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: "rgba(6,11,22,0.75)", boxShadow: `inset 0 0 0 1px ${LINE}` },
  turnText: { color: INK, fontFamily: F.bodySemi, fontSize: 12.5 },
});
