// The weekly club run: where to meet, when you set off, the route length,
// pace groups and who's going. Check in at the start with the run leader's
// code; your check-in lifts the club's turnout for this week's fixture.

import React, { useMemo, useState } from "react";
import { Linking, Platform, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MapPin, Navigation, QrCode, Share2 } from "lucide-react-native";
import { Body, Button, C, EmptyState, F, R, Row, S, Screen, Segment, Sheet, Skeleton, Surface, Title, useScreenTop } from "@/components/ui";
import { engine, useClubRun, useEngineMutation } from "@/data/hooks";
import { Chip, Faces, GlassRound, clock, kmLabel, whenLabel } from "@/components/clubs/parts";
import RunMap from "@/components/move/RunMap";
import { loopAround } from "@/data/runMath";

export default function ClubRun() {
  const { runId } = useLocalSearchParams();
  const id = String(runId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: run, isPending, isError } = useClubRun(id);
  const [codeOpen, setCodeOpen] = useState(false);
  const [sheetH, setSheetH] = useState(380);
  const top = useScreenTop();
  const [code, setCode] = useState("");
  // The run's line from the meet spot, drawn over the photo like the map in the demo.
  const line = useMemo(() => (run?.lat != null && run?.lng != null && run?.km ? loopAround({ latitude: run.lat, longitude: run.lng }, run.km, run.id || id) : []), [run?.lat, run?.lng, run?.km, run?.id, id]);

  const rsvp = useEngineMutation(engine.rsvpClubRun, { success: (r) => (r.isGoing ? "You're on the list" : "Taken off the list") });
  const checkIn = useEngineMutation(engine.checkInClubRun, {
    onSuccess: () => {
      setCodeOpen(false);
      router.replace(`/clubs/checkin/${id}`);
    },
  });

  if (isPending) {
    return (
      <Screen>
        <Skeleton height={320} radius={26} style={{ marginTop: S.lg }} />
        <Skeleton height={200} radius={20} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }
  if (isError || !run) {
    return (
      <Screen>
        <EmptyState title="That club run has gone" body="It may have been called off." action="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const directions = () => {
    const q = run.lat != null ? `${run.lat},${run.lng}` : encodeURIComponent(run.place || "");
    Linking.openURL(Platform.OS === "ios" ? `http://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`).catch(() => {});
  };
  const pickPace = (pace) => rsvp.mutate([id, true, pace]);
  const share = () => Share.share({ message: `${run.club?.name}: ${run.title}, ${whenLabel(run.startAt)}. Meet at ${run.place}. Come and run with us on Outhere.` }).catch(() => {});
  const startCheckIn = () => (run.needsCode ? setCodeOpen(true) : checkIn.mutate(id));
  const today = new Date(run.startAt).toDateString() === new Date().toDateString();
  const fixtureLine = run.fixture ? `Every check-in lifts ${run.club.short}'s run turnout for this week's ${run.fixture.isDerby ? "derby" : "fixture"} against ${run.fixture.opponent?.name}.` : null;

  // Club mates waiting at the meet spot, as faces on the map.
  const start = line[0] || (run.lat != null ? { latitude: run.lat, longitude: run.lng } : null);
  const people = start
    ? (run.faces || []).slice(0, 3).map((p, i) => ({ id: p.id || `f${i}`, avatar: p.avatar, crew: true, latitude: start.latitude + [0.00042, 0.00018, -0.0003][i], longitude: start.longitude + [0.0005, -0.00058, 0.00008][i] }))
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* clubRun: the route on the map, the meet spot and who's there */}
      <View style={[StyleSheet.absoluteFill, { bottom: sheetH - 30 }]}>
        <RunMap style={StyleSheet.absoluteFill} fitTo={line.length > 1 ? line : undefined} plannedPath={line} plannedStyle="solid" waypoints={start ? [start] : []} people={people} showsUser={false} interactive={false} padding={{ top: top + 70, right: 40, bottom: 70, left: 40 }} />
        <LinearGradient colors={["rgba(7,9,12,0.55)", "rgba(7,9,12,0)"]} style={[styles.topShade, { height: top + 80 }]} pointerEvents="none" />
        <LinearGradient colors={["rgba(7,9,12,0)", C.bg]} style={styles.bottomShade} pointerEvents="none" />
      </View>
      <Row style={[styles.top, { top }]}>
        <GlassRound icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} />
        <View style={styles.meet}>
          <View>
            <MapPin size={14} color="#fff" />
          </View>
          <Text style={styles.meetText} numberOfLines={1}>
            Meet at {run.place?.split(",")[0]}
          </Text>
        </View>
        <GlassRound icon={Share2} label="Share the run" onPress={share} />
      </Row>

      {/* .sheet: pinned to the floor, lit along its top edge */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}>
        <LinearGradient colors={["#14171d", "#0c0e12"]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 30, borderTopRightRadius: 30 }]} />
        <View style={styles.handle} />
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kick}>
              {run.club?.name} · {today ? (new Date(run.startAt).getHours() >= 17 ? "tonight" : "today") : whenLabel(run.startAt).split(" · ")[0].toLowerCase()}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {run.title}
            </Text>
          </View>
          <Chip label={`${run.going} going`} tone="blue" />
        </Row>

        {/* .trio */}
        <Surface tone="sunk" radius={18} padding={null} style={{ marginTop: 14 }} contentStyle={styles.trio}>
          <View style={styles.trioCell}>
            <Text style={styles.trioBig}>{clock(run.meetAt)}</Text>
            <Text style={styles.trioSmall}>Meet</Text>
          </View>
          <View style={[styles.trioCell, styles.trioMid]}>
            <Text style={styles.trioBig}>{kmLabel(run.km)}</Text>
            <Text style={styles.trioSmall}>Route</Text>
          </View>
          <View style={styles.trioCell}>
            <Text style={styles.trioBig}>{clock(run.startAt)}</Text>
            <Text style={styles.trioSmall}>Set off</Text>
          </View>
        </Surface>

        {run.paceGroups?.length > 1 ? <Segment options={run.paceGroups} value={run.pace || run.paceGroups[Math.min(1, run.paceGroups.length - 1)]} onChange={pickPace} style={{ marginTop: 12 }} /> : null}

        <Faces people={run.faces} size={32} ring="#11141a" label={run.checkedIn ? `You and ${run.here - 1} others are here` : run.status === "live" ? `${run.here} here now` : `${run.going} going · ${run.lastTurnout} last week`} />
        {fixtureLine ? <Text style={styles.fixture}>{fixtureLine}</Text> : null}

        <Row gap={10} style={{ marginTop: 16 }}>
          <Button title="" icon={Navigation} variant="secondary" size="md" onPress={directions} accessibilityLabel="Directions" style={{ width: 54, paddingHorizontal: 0 }} />
          <View style={{ flex: 1 }}>
            {run.checkedIn ? (
              <Button title="You're checked in" variant="outline" size="md" full onPress={() => router.push(`/clubs/checkin/${id}`)} />
            ) : run.checkInOpen ? (
              <Button title="Check in at the start" icon={run.needsCode ? QrCode : null} size="md" full onPress={startCheckIn} loading={checkIn.isPending} />
            ) : (
              <Button title={run.isGoing ? "You're going" : "I'm going"} variant={run.isGoing ? "outline" : "primary"} size="md" full onPress={() => rsvp.mutate([id, !run.isGoing])} loading={rsvp.isPending} />
            )}
          </View>
        </Row>
        {!run.checkInOpen && !run.checkedIn ? <Text style={[styles.trioSmall, { textAlign: "center", marginTop: 8 }]}>Check-in opens 30 minutes before the start.</Text> : null}
      </View>

      <Sheet visible={codeOpen} onClose={() => setCodeOpen(false)}>
        <Title size={24}>Tonight's code</Title>
        <Body dim style={{ marginTop: 4 }}>
          The run leader has it at the meet spot.
        </Body>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\s/g, "").toLowerCase())}
          placeholder="------"
          placeholderTextColor={C.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={8}
          autoFocus
          style={styles.code}
          accessibilityLabel="Check-in code"
        />
        <Button title="Check in" size="lg" full disabled={code.length < 4} loading={checkIn.isPending} onPress={() => checkIn.mutate([id, code])} style={{ marginTop: S.lg }} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 18, right: 18, gap: 8, justifyContent: "space-between" },
  topShade: { position: "absolute", top: 0, left: 0, right: 0 },
  bottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90 },
  // .rec: a glass pill with the meet spot
  meet: { flexDirection: "row", alignItems: "center", gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 99, backgroundColor: "rgba(10,14,20,0.55)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)", flexShrink: 1 },
  meetText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12.5, flexShrink: 1 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 -20px 40px -10px rgba(0,0,0,0.7)" },
  handle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase" },
  title: { color: C.text, fontFamily: F.display, fontSize: 32, textTransform: "uppercase", marginTop: 6 },
  trio: { flexDirection: "row", paddingVertical: 12 },
  trioCell: { flex: 1, alignItems: "center", gap: 2 },
  trioMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  trioBig: { color: C.text, fontFamily: F.display, fontSize: 21 },
  trioSmall: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  fixture: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 10 },
  code: { marginTop: S.lg, height: 64, borderRadius: R.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, color: C.text, fontFamily: F.display, fontSize: 34, letterSpacing: 10, textAlign: "center" },
});
