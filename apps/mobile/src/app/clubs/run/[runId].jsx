// The weekly club run: where to meet, when you set off, the route length,
// pace groups and who's going. Check in at the start with the run leader's
// code; your check-in lifts the club's turnout for this week's fixture.

import React, { useState } from "react";
import { Linking, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MapPin, Navigation, QrCode } from "lucide-react-native";
import { Body, Button, C, EmptyState, F, IconButton, R, Row, S, Screen, Segment, Sheet, Skeleton, Title } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { engine, useClubRun, useEngineMutation } from "@/data/hooks";
import { Chip, Faces, clock, kmLabel, whenLabel } from "@/components/clubs/parts";

export default function ClubRun() {
  const { runId } = useLocalSearchParams();
  const id = String(runId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: run, isPending, isError } = useClubRun(id);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");

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
  const startCheckIn = () => (run.needsCode ? setCodeOpen(true) : checkIn.mutate(id));
  const today = new Date(run.startAt).toDateString() === new Date().toDateString();
  const fixtureLine = run.fixture ? `Every check-in lifts ${run.club.short}'s run turnout for this week's ${run.fixture.isDerby ? "derby" : "fixture"} against ${run.fixture.opponent?.name}.` : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padded={false} style={{ paddingTop: 0 }}>
        <View style={[styles.slab, { height: 330 + insets.top }]}>
          <Image source={imageSource(run.club?.cover) || PHOTOS.clubrun} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(7,9,12,0.5)", "rgba(7,9,12,0.1)", "rgba(7,9,12,0.95)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <Row style={[styles.top, { top: insets.top + S.sm }]}>
            <IconButton icon={ChevronLeft} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} label="Back" />
            <View style={styles.meet}>
              <MapPin size={14} color="#fff" />
              <Text style={styles.meetText} numberOfLines={1}>
                Meet at {run.place}
              </Text>
            </View>
          </Row>
          <View style={styles.pin}>
            <View style={styles.pinHalo} />
            <View style={styles.pinDot} />
          </View>
        </View>

        <View style={styles.sheet}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kick}>
                {run.club?.name} · {today ? (new Date(run.startAt).getHours() >= 17 ? "tonight" : "today") : whenLabel(run.startAt).split(" · ")[0].toLowerCase()}
              </Text>
              <Title size={32} style={{ marginTop: 6 }}>
                {run.title}
              </Title>
            </View>
            <Chip label={`${run.going} going`} tone="blue" />
          </Row>

          <View style={styles.trio}>
            <View style={styles.trioCell}>
              <Text style={styles.trioBig}>{clock(run.meetAt)}</Text>
              <Body dim size={12}>Meet</Body>
            </View>
            <View style={[styles.trioCell, styles.trioMid]}>
              <Text style={styles.trioBig}>{kmLabel(run.km)}</Text>
              <Body dim size={12}>Route</Body>
            </View>
            <View style={styles.trioCell}>
              <Text style={styles.trioBig}>{clock(run.startAt)}</Text>
              <Body dim size={12}>Set off</Body>
            </View>
          </View>

          {run.paceGroups?.length > 1 ? (
            <Segment options={run.paceGroups} value={run.pace || run.paceGroups[Math.min(1, run.paceGroups.length - 1)]} onChange={pickPace} style={{ marginTop: S.lg }} />
          ) : null}

          <Faces people={run.faces} label={run.checkedIn ? `You and ${run.here - 1} others are here` : run.status === "live" ? `${run.here} here now` : `${run.going} going · ${run.lastTurnout} last week`} />
          {fixtureLine ? (
            <Body dim size={13} style={{ marginTop: S.md }}>
              {fixtureLine}
            </Body>
          ) : null}

          <Row gap={S.sm} style={{ marginTop: S.xl }}>
            <Button title="" icon={Navigation} variant="secondary" size="lg" onPress={directions} accessibilityLabel="Directions" style={{ width: 58, paddingHorizontal: 0 }} />
            <View style={{ flex: 1 }}>
              {run.checkedIn ? (
                <Button title="You're checked in" variant="outline" size="lg" full onPress={() => router.push(`/clubs/checkin/${id}`)} />
              ) : run.checkInOpen ? (
                <Button title="Check in at the start" icon={run.needsCode ? QrCode : null} size="lg" full onPress={startCheckIn} loading={checkIn.isPending} />
              ) : (
                <Button title={run.isGoing ? "You're going" : "I'm going"} variant={run.isGoing ? "outline" : "primary"} size="lg" full onPress={() => rsvp.mutate([id, !run.isGoing])} loading={rsvp.isPending} />
              )}
            </View>
          </Row>
          {!run.checkInOpen && !run.checkedIn ? (
            <Body mute size={12} style={{ textAlign: "center", marginTop: S.sm }}>
              Check-in opens 30 minutes before the start.
            </Body>
          ) : null}
        </View>
      </Screen>

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
  slab: { overflow: "hidden", backgroundColor: C.surface },
  top: { position: "absolute", left: S.gutter, right: S.gutter, gap: S.sm },
  meet: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 99, backgroundColor: "rgba(10,14,20,0.7)", flexShrink: 1 },
  meetText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13, flexShrink: 1 },
  pin: { position: "absolute", left: "50%", top: "52%", marginLeft: -40, width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  pinHalo: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(79,155,255,0.18)" },
  pinDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.bg, borderWidth: 5, borderColor: C.accentHi },
  sheet: { marginTop: -28, marginHorizontal: S.md, padding: S.xl, borderRadius: 26, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  trio: { flexDirection: "row", marginTop: S.lg, borderRadius: R.md, backgroundColor: C.bg, paddingVertical: S.md },
  trioCell: { flex: 1, alignItems: "center", gap: 2 },
  trioMid: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  trioBig: { color: C.text, fontFamily: F.display, fontSize: 24 },
  code: { marginTop: S.lg, height: 64, borderRadius: R.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, color: C.text, fontFamily: F.display, fontSize: 34, letterSpacing: 10, textAlign: "center" },
});
