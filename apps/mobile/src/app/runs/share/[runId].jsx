// Share your run: a story card from your photo, the route and your pace,
// ready for Stories, your club chat, or anywhere else.

import React, { useMemo, useState } from "react";
import { Platform, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path } from "react-native-svg";
import { Bookmark, Camera, ImagePlus, Link2, MessageCircle, X } from "@/components/ui/icons";
import { C, EmptyState, F, PressableScale, S, Skeleton, TOP_GAP, Wordmark, toast } from "@/components/ui";
import { engine, useEngineMutation, useMyCrews, useProfile, useRunDetail } from "@/data/hooks";
import { formatNumber, formatPace } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";
import { hapticSuccess } from "@/services/haptics";

// Frosted glass for the round buttons over the blurred photo.
const GLASS = Platform.OS === "web" ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : null;

// Until you pick your own photo: your city where we have one, else your people.
const CITY_PHOTOS = { london: PHOTOS.clubrun, manchester: PHOTOS.manchester, birmingham: PHOTOS.birmingham };

// The route as a glowing line, scaled into the bottom right of the card.
function RouteLine({ route, width, height }) {
  const geo = useMemo(() => {
    const pts = (route || []).filter((p) => Number.isFinite(p?.latitude));
    if (pts.length < 2) return null;
    const pad = 10;
    const mid = (Math.max(...pts.map((p) => p.latitude)) + Math.min(...pts.map((p) => p.latitude))) / 2;
    const kx = Math.cos((mid * Math.PI) / 180);
    const xs = pts.map((p) => p.longitude * kx);
    const ys = pts.map((p) => -p.latitude);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const sx = Math.max(...xs) - minX || 1e-6;
    const sy = Math.max(...ys) - minY || 1e-6;
    const k = Math.min((width - pad * 2) / sx, (height - pad * 2) / sy);
    const ox = width - pad - sx * k;
    const oy = (height - sy * k) / 2;
    const xy = xs.map((x, i) => [ox + (x - minX) * k, oy + (ys[i] - minY) * k]);
    return { d: xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "), a: xy[0], b: xy[xy.length - 1] };
  }, [route, width, height]);
  if (!geo) return null;
  return (
    <Svg width={width} height={height}>
      <Path d={geo.d} stroke={C.accent} strokeOpacity={0.35} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={geo.d} stroke={C.accentHi} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={geo.a[0]} cy={geo.a[1]} r={4} fill="#fff" />
      <Circle cx={geo.b[0]} cy={geo.b[1]} r={5} fill={C.accentHi} stroke="#fff" strokeWidth={2} />
    </Svg>
  );
}

function Action({ icon: Icon, label, onPress, busy }) {
  return (
    <PressableScale onPress={onPress} disabled={busy} accessibilityLabel={label} style={styles.action}>
      <View style={[styles.actionIcon, GLASS]}>
        <Icon size={18} color={busy ? C.textDim : "#fff"} />
      </View>
      <Text style={styles.actionText}>{label}</Text>
    </PressableScale>
  );
}

export default function ShareRun() {
  const { runId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screen, height: tall } = useWindowDimensions();
  const { data: run, isPending } = useRunDetail(runId);
  const { data: profile } = useProfile();
  const { data: crews } = useMyCrews();
  const [photo, setPhoto] = useState(null);
  const [posted, setPosted] = useState(false);

  const club = (crews || [])[0];
  const post = useEngineMutation(engine.shareRunToCrew, {
    onSuccess: () => {
      hapticSuccess();
      setPosted(true);
      toast.success(`Posted to ${club?.name || "your club"}`);
    },
  });
  const keep = useEngineMutation(engine.saveRoute, { success: (r) => `${r.name} saved to your routes` });

  const close = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/move"));

  // .sharecard: 9:16, 254 wide on a 390 screen, smaller when the screen is short
  const cardH = Math.min(Math.round(Math.min(screen * 0.65, 300) * (16 / 9)), tall - insets.top - insets.bottom - 220);
  const cardW = Math.round(cardH * (9 / 16));

  if (isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 70, alignItems: "center" }]}>
        <Skeleton width={cardW} height={cardH} radius={26} />
      </View>
    );
  }
  if (!run) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 80 }]}>
        <EmptyState title="Run not found" body="It may have been deleted." action="Close" onAction={close} />
      </View>
    );
  }

  const pace = run.paceSecPerKm || (run.distanceKm ? run.durationSec / run.distanceKm : null);
  const km = run.distanceKm >= 10 ? run.distanceKm.toFixed(1) : run.distanceKm.toFixed(2).replace(/0$/, "");
  const fallback = CITY_PHOTOS[String(profile?.city || "").toLowerCase()] || PHOTOS.friends;
  const streak = profile?.streak || 0;
  const line = `${run.title}: ${km} km at ${formatPace(pace)}/km on Outhere.`;
  const picture = photo ? { uri: photo.uri } : fallback;

  const pick = async () => {
    try {
      if (Platform.OS !== "web") {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) return toast("No access", "Allow photos for Outhere in Settings.");
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [2, 3] });
      if (!res.canceled && res.assets?.[0]) setPhoto({ uri: res.assets[0].uri });
    } catch (e) {
      toast.error(e?.message || "Couldn't open your photos.");
    }
  };

  const toChat = () => {
    if (!club) {
      toast("Join a club first", "Your club chat is where runs get shared.");
      return router.push("/(tabs)/club");
    }
    if (posted) return router.push(`/crew/${club.id}`);
    post.mutate([club.id, { runId: run.id, caption: "" }]);
  };

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(`${line} https://weouthere.app`);
      toast.success("Copied", "Paste it anywhere.");
    } catch {
      Share.share({ message: `${line} https://weouthere.app` }).catch(() => {});
    }
  };

  const save = () => {
    if (run.routeId) return router.push(`/routes/${run.routeId}`);
    if ((run.route || []).length < 2) return toast("Nothing to save", "This one has no route.");
    keep.mutate({ name: (run.title || "My route").slice(0, 30), path: run.route, distanceKm: run.distanceKm, climbM: run.climbM, hideEnds: true });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* The card's own photo, blurred and dimmed, fills the screen behind it. */}
      <Image source={picture} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
      <LinearGradient colors={["rgba(7,9,12,0.62)", "rgba(7,9,12,0.5)", "rgba(7,9,12,0.86)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[styles.head, { paddingTop: TOP_GAP }]}>
        <PressableScale onPress={close} accessibilityLabel="Close" style={[styles.close, GLASS]}>
          <View>
            <X size={18} color="#fff" />
          </View>
        </PressableScale>
        <Text style={styles.headTitle}>Share your run</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ flex: 1, alignItems: "center", paddingTop: 14 }}>
        <View style={[styles.card, { width: cardW, height: cardH }]}>
          <Image source={picture} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(7,9,12,0.55)", "rgba(7,9,12,0.05)", "rgba(7,9,12,0.88)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.cardTop}>
            <Wordmark height={17} />
            <PressableScale onPress={pick} accessibilityLabel="Change photo" style={[styles.photoBtn, GLASS]}>
              <View>
                <ImagePlus size={15} color="#fff" />
              </View>
            </PressableScale>
          </View>
          <View style={styles.cardFoot}>
            <View style={styles.routeArt} pointerEvents="none">
              <RouteLine route={run.route} width={cardW * 0.5} height={cardH * 0.26} />
            </View>
            <Text style={styles.kicker} numberOfLines={1}>
              {run.title}
            </Text>
            <Text style={styles.big}>{`${km} km`}</Text>
            <Text style={[styles.big, { color: C.accent }]}>{`${formatPace(pace)} /km`}</Text>
            <View style={styles.meta}>
              {run.earned?.out ? <Text style={styles.metaText}>{`+${formatNumber(run.earned.out)} OUT`}</Text> : null}
              {streak > 1 ? <Text style={styles.metaText}>{`${streak} day streak`}</Text> : null}
              {run.isPb ? <Text style={[styles.metaText, { color: C.accentHi }]}>PB</Text> : null}
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + S.lg }]}>
        <Action icon={Camera} label="Stories" onPress={() => router.push("/stories/new")} />
        <Action icon={MessageCircle} label={posted ? "Posted" : "Chat"} onPress={toChat} busy={post.isPending} />
        <Action icon={Bookmark} label="Save" onPress={save} busy={keep.isPending} />
        <Action icon={Link2} label="Copy link" onPress={copy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(10,14,20,0.45)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  headTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  // .sharecard: 22 radius, a hairline of light and a deep drop shadow
  card: { borderRadius: 22, overflow: "hidden", backgroundColor: "#0b0e13", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.12)" },
  cardTop: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(10,14,20,0.45)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" },
  cardFoot: { position: "absolute", left: 16, right: 16, bottom: 16 },
  routeArt: { position: "absolute", right: -8, bottom: 30 },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, maxWidth: "60%" },
  big: { color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 35, textTransform: "uppercase" },
  meta: { flexDirection: "row", gap: 12, marginTop: 8 },
  metaText: { color: C.text, fontFamily: F.bodySemi, fontSize: 11.5 },
  actions: { flexDirection: "row", justifyContent: "center", gap: 4, paddingTop: 12 },
  action: { alignItems: "center", gap: 7, width: 66 },
  // .shacts i: 50 round frosted glass
  actionIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.06)" },
  actionText: { color: C.text, fontFamily: F.bodySemi, fontSize: 11 },
});
