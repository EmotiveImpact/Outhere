// Challenge a club, for captains: character select for clubs (the derby
// record, turnout and table place), then a club mode, then when. A mystery
// pick sends it to a random club near you; they find out who at the reveal.

import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  ChevronLeft,
  Lock,
  MapPin,
  Shuffle,
  Trophy,
  Users,
  Zap,
} from "lucide-react-native";
import {
  Body,
  Button,
  C,
  EmptyState,
  F,
  IconButton,
  PressableScale,
  R,
  Row,
  S,
  Screen,
  SkeletonList,
} from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { CLUB_MODES } from "@/constants/clubModes";
import {
  engine,
  useClubRoster,
  useCrew,
  useEngineMutation,
  useMyCrews,
} from "@/data/hooks";
import { RED, ordinal, whenLabel } from "@/components/clubs/parts";

const MODE_ART = {
  steps: { icon: Trophy, photo: PHOTOS.derby },
  live_race: { icon: Zap, photo: PHOTOS.clubrun },
  relay: { icon: ArrowRight, photo: PHOTOS.pacers },
  blind_time_trial: { icon: Lock, photo: PHOTOS.clubhero },
  turnout_night: { icon: Users, photo: PHOTOS.founding },
  turf_war: { icon: MapPin, photo: PHOTOS.marsh },
};

// Start options: tonight at seven if there's time, tomorrow at seven, Saturday at nine.
const startOptions = () => {
  const now = Date.now();
  const at = (days, h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const out = [];
  if (at(0, 19) - now > 60 * 60 * 1000) out.push(at(0, 19));
  out.push(at(1, 19));
  const sat = (6 - new Date(now).getDay() + 7) % 7 || 7;
  out.push(at(sat, 9));
  return out;
};

export default function ChallengeClub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Four tiles a row, sized in pixels: percentage widths collapse inside PressableScale on web.
  const tileW = Math.floor(
    (Math.min(width, 520) - 2 * S.gutter - 3 * S.sm) / 4,
  );
  const tileSize = { width: tileW, height: Math.round(tileW / 0.85) };
  const params = useLocalSearchParams();
  const mine = useMyCrews();
  const clubId = String(
    params.club ||
      (mine.data || []).find((c) => c.isCaptain && c.verified)?.id ||
      "",
  );
  const crew = useCrew(clubId || null);
  const roster = useClubRoster(clubId || null);
  const [step, setStep] = useState("select");
  const [pick, setPick] = useState(
    params.opponent ? String(params.opponent) : null,
  );
  const [mode, setMode] = useState(params.mode ? String(params.mode) : "steps");
  const starts = useMemo(startOptions, []);
  const [startAt, setStartAt] = useState(starts[0]);

  const send = useEngineMutation(engine.challengeClub, {
    success: (b) =>
      b.opponent ? `Sent to ${b.opponent.name}` : "Sent to a mystery club",
    onSuccess: (b) => router.replace(`/clubs/battle/${b.id}`),
  });

  const list = roster.data?.roster || [];
  const chosen =
    pick === "mystery" ? null : list.find((r) => r.club.id === pick) || list[0];
  const picked = pick || chosen?.club.id;
  const back = () =>
    step === "select"
      ? router.canGoBack()
        ? router.back()
        : router.replace("/(tabs)/club")
      : setStep(step === "when" ? "mode" : "select");

  if (!clubId || (crew.data && !crew.data.isCaptain)) {
    return (
      <Screen>
        <EmptyState
          title="Captains only"
          body="Your club captain calls friendlies. Members vote when a club challenges yours."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (roster.isPending) {
    return (
      <Screen>
        <SkeletonList count={4} height={120} />
      </Screen>
    );
  }

  const oppName = picked === "mystery" ? "a mystery club" : chosen?.club.name;
  const m = CLUB_MODES.find((x) => x.key === mode);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen
        padded={false}
        style={{ paddingTop: 0 }}
        contentStyle={{ paddingBottom: 140 }}
      >
        {step === "select" ? (
          <>
            <View style={[styles.hero, { height: 330 + insets.top }]}>
              <Image
                source={
                  picked === "mystery"
                    ? PHOTOS.clubrun
                    : imageSource(chosen?.club.cover) || PHOTOS.pacers
                }
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(7,9,12,0.45)",
                  "rgba(7,9,12,0.1)",
                  "rgba(7,9,12,0.97)",
                ]}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Row style={[styles.nav, { top: insets.top + S.sm }]}>
                <IconButton icon={ChevronLeft} onPress={back} label="Back" />
                <View style={styles.cap}>
                  <Users size={13} color="#fff" />
                  <Text style={styles.capText}>Captains only</Text>
                </View>
              </Row>
              <View style={{ padding: S.gutter }}>
                <Text style={[styles.tag, { backgroundColor: RED }]}>
                  {picked === "mystery" ? "?" : "Away"}
                </Text>
                <Text style={styles.big} numberOfLines={2} adjustsFontSizeToFit>
                  {picked === "mystery" ? "Mystery club" : chosen?.club.name}
                </Text>
                <Body dim size={13}>
                  {picked === "mystery"
                    ? "A random club near you. They find out who at the reveal."
                    : [
                        chosen?.group,
                        chosen?.club.memberCount != null
                          ? `${chosen.club.memberCount} members`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </Body>
                {picked !== "mystery" && chosen ? (
                  <Row style={styles.rec}>
                    <View style={styles.recCell}>
                      <Text style={styles.recBig}>
                        {chosen.record.w}
                        <Text style={{ color: C.textMute }}>–</Text>
                        {chosen.record.l}
                      </Text>
                      <Body dim size={11}>
                        {chosen.isDerby ? "Derbies" : "Head to head"}
                      </Body>
                    </View>
                    <View style={styles.recCell}>
                      <Text style={styles.recBig}>
                        {chosen.turnout != null ? `${chosen.turnout}%` : "–"}
                      </Text>
                      <Body dim size={11}>
                        Turnout
                      </Body>
                    </View>
                    <View style={styles.recCell}>
                      <Text
                        style={[
                          styles.recBig,
                          chosen.tablePos === 1 && { color: C.gold },
                        ]}
                      >
                        {chosen.tablePos ? ordinal(chosen.tablePos) : "–"}
                      </Text>
                      <Body dim size={11}>
                        In your group
                      </Body>
                    </View>
                  </Row>
                ) : null}
              </View>
            </View>
            <View style={styles.grid}>
              {list.map((r) => {
                const on = picked === r.club.id;
                return (
                  <PressableScale
                    key={r.club.id}
                    onPress={() => setPick(r.club.id)}
                    scaleTo={0.94}
                    style={[styles.tile, tileSize, on && { borderColor: RED }]}
                    accessibilityLabel={`Pick ${r.club.name}`}
                  >
                    <Image
                      source={imageSource(r.club.logo) || PHOTOS.crest}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.9)"]}
                      locations={[0.4, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    {on ? <Text style={styles.away}>Away</Text> : null}
                    <Text style={styles.tileName} numberOfLines={1}>
                      {r.club.short}
                    </Text>
                  </PressableScale>
                );
              })}
              <PressableScale
                onPress={() => setPick("mystery")}
                scaleTo={0.94}
                style={[
                  styles.tile,
                  tileSize,
                  picked === "mystery" && { borderColor: RED },
                ]}
                accessibilityLabel="Pick a mystery club"
              >
                <Image
                  source={PHOTOS.clubrun}
                  style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
                  contentFit="cover"
                />
                <Text style={styles.qm}>?</Text>
                <Text style={styles.tileName}>Mystery</Text>
              </PressableScale>
            </View>
          </>
        ) : step === "mode" ? (
          <View
            style={{
              paddingHorizontal: S.gutter,
              paddingTop: insets.top + S.sm,
            }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <IconButton icon={ChevronLeft} onPress={back} label="Back" />
              <View style={styles.vsChip}>
                <Text style={styles.capText}>vs {oppName}</Text>
              </View>
            </Row>
            <Text style={styles.kick}>Club v club · captains</Text>
            <Text style={styles.big}>Pick a</Text>
            <Text style={[styles.big, { color: C.accent }]}>club mode</Text>
            <View style={styles.modes}>
              {CLUB_MODES.map((x) => {
                const art = MODE_ART[x.key];
                const Icon = art.icon;
                const on = x.key === mode;
                return (
                  <PressableScale
                    key={x.key}
                    disabled={x.soon}
                    onPress={() => setMode(x.key)}
                    scaleTo={0.97}
                    style={[
                      styles.mode,
                      on && { borderColor: C.accent },
                      x.soon && { opacity: 0.55 },
                    ]}
                    accessibilityLabel={x.name}
                  >
                    <Image
                      source={art.photo}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={["rgba(7,9,12,0.15)", "rgba(7,9,12,0.94)"]}
                      locations={[0.05, 0.7]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View
                      style={[
                        styles.modeIcon,
                        on && { backgroundColor: C.accent },
                      ]}
                    >
                      <Icon size={15} color="#fff" />
                    </View>
                    <View style={{ padding: 11 }}>
                      <Text
                        style={[styles.modeTag, on && { color: C.accentHi }]}
                      >
                        {x.soon ? "NEXT SEASON" : x.tag}
                      </Text>
                      <Text style={styles.modeName}>{x.name}</Text>
                      <Text style={styles.modeLine} numberOfLines={4}>
                        {x.line}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Body mute size={12} style={{ marginTop: S.md }}>
              League fixtures are always steps so every club size plays fair.
              The other modes are friendlies and cup nights.
            </Body>
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: S.gutter,
              paddingTop: insets.top + S.sm,
            }}
          >
            <IconButton icon={ChevronLeft} onPress={back} label="Back" />
            <Text style={styles.kick}>{m.name}</Text>
            <Text style={styles.big}>When do</Text>
            <Text style={[styles.big, { color: C.accent }]}>you start?</Text>
            <View style={{ gap: S.sm, marginTop: S.lg }}>
              {starts.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setStartAt(t)}
                  style={[styles.when, startAt === t && styles.whenOn]}
                >
                  <Text
                    style={[
                      styles.whenText,
                      startAt === t && { color: C.text },
                    ]}
                  >
                    {whenLabel(t)}
                  </Text>
                  <Body dim size={12}>
                    for{" "}
                    {m.hours >= 24
                      ? `${Math.round(m.hours / 24)} days`
                      : `${m.hours} hour${m.hours === 1 ? "" : "s"}`}
                  </Body>
                </Pressable>
              ))}
            </View>
            <View style={styles.summary}>
              <Body size={14}>
                {roster.data?.me?.name} v {oppName}
              </Body>
              <Body dim size={13} style={{ marginTop: 4 }}>
                {m.line} Friendly, no league points. Their captain has a day to
                accept.
              </Body>
            </View>
          </View>
        )}
      </Screen>

      <View style={[styles.foot, { paddingBottom: insets.bottom + S.md }]}>
        {step === "select" ? (
          <Row gap={S.sm}>
            <IconButton
              icon={Shuffle}
              onPress={() =>
                setPick(list[Math.floor(Math.random() * list.length)]?.club.id)
              }
              label="Random club"
              style={styles.shuffle}
            />
            <View style={{ flex: 1 }}>
              <Button
                title={
                  picked === "mystery"
                    ? "Challenge a mystery club"
                    : `Challenge ${chosen?.club.short || ""}`
                }
                size="lg"
                full
                disabled={!picked}
                onPress={() => setStep("mode")}
              />
            </View>
          </Row>
        ) : step === "mode" ? (
          <Button
            title={`${m.name} it is`}
            size="lg"
            full
            onPress={() => setStep("when")}
          />
        ) : (
          <Button
            title={
              picked === "mystery" ? "Send it" : `Send to ${chosen?.club.short}`
            }
            size="lg"
            full
            loading={send.isPending}
            onPress={() =>
              send.mutate({
                crewId: clubId,
                opponentId: picked === "mystery" ? null : picked,
                mode,
                startAt,
              })
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
    justifyContent: "flex-end",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  nav: {
    position: "absolute",
    left: S.gutter,
    right: S.gutter,
    justifyContent: "space-between",
  },
  cap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: "rgba(10,14,20,0.7)",
  },
  capText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12.5 },
  vsChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: C.surface,
    justifyContent: "center",
  },
  tag: {
    alignSelf: "flex-start",
    color: "#fff",
    fontFamily: F.display,
    fontSize: 13,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  big: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 44,
    lineHeight: 44,
    textTransform: "uppercase",
  },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginTop: S.lg,
    marginBottom: 6,
  },
  rec: {
    marginTop: S.md,
    borderRadius: R.md,
    backgroundColor: "rgba(10,14,20,0.7)",
    paddingVertical: S.sm,
  },
  recCell: { flex: 1, alignItems: "center" },
  recBig: { color: C.text, fontFamily: F.display, fontSize: 24 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
    paddingHorizontal: S.gutter,
    marginTop: S.lg,
  },
  tile: {
    borderRadius: R.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: C.surface,
    justifyContent: "flex-end",
  },
  tileName: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12, padding: 7 },
  away: {
    position: "absolute",
    top: 6,
    left: 6,
    color: "#fff",
    backgroundColor: RED,
    fontFamily: F.display,
    fontSize: 11,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  qm: {
    position: "absolute",
    top: "18%",
    alignSelf: "center",
    color: "#fff",
    fontFamily: F.display,
    fontSize: 40,
  },
  foot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: S.gutter,
    paddingTop: S.md,
    backgroundColor: "rgba(7,9,12,0.94)",
  },
  shuffle: { width: 58, height: 58, borderRadius: 29 },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.lg },
  mode: {
    flexBasis: "48%",
    flexGrow: 1,
    height: 196,
    borderRadius: R.lg,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "flex-end",
  },
  modeIcon: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(10,14,20,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTag: {
    color: C.textDim,
    fontFamily: F.bodySemi,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  modeName: {
    color: "#fff",
    fontFamily: F.display,
    fontSize: 21,
    textTransform: "uppercase",
    lineHeight: 22,
    marginTop: 3,
  },
  modeLine: {
    color: "#c3cad6",
    fontFamily: F.body,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  when: {
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  whenOn: { borderColor: C.accent },
  whenText: {
    color: C.textSoft,
    fontFamily: F.display,
    fontSize: 24,
    textTransform: "uppercase",
  },
  summary: {
    marginTop: S.lg,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
});
