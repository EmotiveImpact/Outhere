// New battle in three steps: character select (who), pick a mode (how), then
// set it up (how long or how far, the stake, the route) and send it.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Coins, MapPin, Search, X } from "lucide-react-native";
import { engine, useBattleLimits, useEngineMutation, usePlayer, useRivalRoster, useRuns, useSearchPlayers, useWallet } from "@/data/hooks";
import { Avatar, Body, Button, C, Card, Divider, F, FadeIn, Header, PressableScale, R, Row, S, Screen, Skeleton, TierBadge } from "@/components/ui";
import { CharacterSelect } from "@/components/arena/CharacterSelect";
import { ModePicker } from "@/components/arena/ModePicker";
import { limitsText } from "@/components/arena/ArenaHero";
import { BATTLE_PRIZES, durationLabel } from "@/components/arena/shared";
import { BLIND_FINISH_HOURS, BLIND_START_HOURS, LIVE_RACE_HOURS, distanceLabel, modeOf, standingTarget } from "@/constants/battleModes";
import { compactNumber, formatNumber } from "@/utils/format";

const STEPS = ["select", "mode", "setup"];
const STAKES = [0, 10, 25, 50];

const RULES = {
  most_steps: () => ["Counted steps from the moment they accept.", "Most steps when the clock runs out wins."],
  live_race: () => ["You both press ready, wherever you are.", "The start lands on both phones at the same moment.", `First to the distance wins. The race stays open for ${LIVE_RACE_HOURS} hours.`],
  blind_time_trial: () => ["Run it whenever, wherever. One go each.", "Nobody sees a time until both are in.", `${BLIND_START_HOURS} hours to start, ${BLIND_FINISH_HOURS} to finish. A no show loses.`],
  ghost_race: () => ["Their best time over the distance runs beside you as a ghost.", "Your first run of the distance counts. Faster wins."],
  last_one_standing: () => [`Day one is ${formatNumber(standingTarget(0))} steps, then 1,000 more each day.`, "Miss a day and you're out. Last one standing wins."],
  hold_the_route: () => ["Both of you run the same saved route.", "Run it as often as you like. Your best time counts.", "Fastest time when the clock runs out owns it."],
};

const personLine = (p) => [`@${p.username}`, p.area || p.city].filter(Boolean).join(" · ");

export default function NewBattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initial = Array.isArray(params.opponent) ? params.opponent[0] : params.opponent;
  const [step, setStep] = useState("select");
  const [opponentId, setOpponentId] = useState(initial && initial !== "me" ? initial : null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(typeof params.mode === "string" ? params.mode : "most_steps");
  const def = modeOf(mode);
  const [duration, setDuration] = useState(null);
  const [distance, setDistance] = useState(null);
  const [stake, setStake] = useState(0);
  const [routeRunId, setRouteRunId] = useState(null);

  const roster = useRivalRoster();
  const search = useSearchPlayers(query.trim());
  const limits = useBattleLimits();
  const wallet = useWallet();
  const runs = useRuns(20);
  const opponent = usePlayer(opponentId);

  const hide = useEngineMutation(engine.hideFromRoster, { success: "Taken off your list" });
  const show = useEngineMutation(engine.showInRoster, { success: "Back on your list" });
  const random = useEngineMutation(engine.randomRival, {
    onSuccess: (p) => p && setOpponentId(p.id),
  });
  const create = useEngineMutation(engine.createBattle, {
    success: (b) => `Challenge sent to ${b?.opponent?.player?.name || "your rival"}`,
    onSuccess: (battle) => router.replace(`/battles/${battle.id}`),
  });

  // A rival picked from search or a player page joins the roster for now.
  const rosterData = useMemo(() => {
    const data = roster.data;
    if (!data || !opponent.data || data.roster.some((r) => r.player.id === opponent.data.id)) return data;
    return { ...data, roster: [{ player: opponent.data, record: { played: 0, wins: 0, losses: 0 }, regular: false, bars: null, bestDay: 0 }, ...data.roster] };
  }, [roster.data, opponent.data]);

  const lim = limits.data;
  const blocked = lim && !lim.canCreate;
  const hours = duration ?? def.defaultDuration;
  const metres = distance ?? def.defaultDistance;
  const myRoutes = (runs.data || []).filter((r) => r.distanceKm >= 1);
  const route = myRoutes.find((r) => r.id === routeRunId) || null;
  const out = wallet.data?.out ?? 0;
  const oppName = opponent.data?.name || "your rival";

  const back = () => {
    if (searching) return setSearching(false);
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
    else if (router.canGoBack()) router.back();
    else router.replace("/outside/arena");
  };

  const next = () => {
    if (step === "select") return setStep("mode");
    if (step === "mode") return setStep("setup");
    create.mutate({ opponentId, mode, durationHours: hours, distanceM: metres, stakeOut: stake, routeRunId: mode === "hold_the_route" ? routeRunId : null });
  };

  const cta =
    step === "select"
      ? opponent.data
        ? `Lock in ${opponent.data.name}`
        : "Pick a rival"
      : step === "mode"
        ? `${def.name} it is`
        : blocked
          ? "Over your limit"
          : `Send to ${oppName}`;
  const ctaDisabled = step === "select" ? !opponent.data : step === "setup" ? blocked || (stake > out) : false;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen
        header={<Header back onBack={back} title={step === "select" ? "Character select" : step === "mode" ? "Pick a mode" : "Set it up"} subtitle={opponent.data && step !== "select" ? `vs ${opponent.data.name}` : undefined} right={<StepDots step={step} />} />}
        contentStyle={{ paddingBottom: 150 + insets.bottom }}
      >
        {step === "select" ? (
          searching ? (
            <FindSomeone query={query} setQuery={setQuery} results={search.data || []} loading={search.isPending} onPick={(p) => { setOpponentId(p.id); setSearching(false); setQuery(""); }} />
          ) : roster.isPending ? (
            <Skeleton height={520} radius={20} />
          ) : (
            <FadeIn>
              <CharacterSelect
                roster={rosterData}
                picked={opponentId}
                onPick={setOpponentId}
                onRandom={() => random.mutate()}
                randomBusy={random.isPending}
                onSearch={() => setSearching(true)}
                onHide={(pid) => {
                  if (pid === opponentId) setOpponentId(null);
                  hide.mutate(pid);
                }}
                onShow={(pid) => show.mutate(pid)}
              />
            </FadeIn>
          )
        ) : null}

        {step === "mode" ? (
          <FadeIn>
            <Text style={styles.kick}>Choose your battle</Text>
            <Text style={styles.big}>
              Pick a <Text style={{ color: C.accent }}>mode</Text>
            </Text>
            <View style={{ marginTop: S.lg }}>
              <ModePicker value={mode} onChange={(m) => { setMode(m); setDuration(null); setDistance(null); }} />
            </View>
          </FadeIn>
        ) : null}

        {step === "setup" ? (
          <FadeIn>
            <Row gap={S.md} style={styles.summary}>
              {opponent.data ? <Avatar uri={opponent.data.avatar} name={opponent.data.name} tier={opponent.data.tier} dot={opponent.data.dot} size={48} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryKick}>{def.name}</Text>
                <Text style={styles.summaryName}>vs {oppName}</Text>
              </View>
            </Row>

            {def.kind === "window" ? (
              <>
                <StepTitle title="How long" />
                <Chips options={def.durations.map((h) => ({ value: h, label: durationLabel(h) }))} value={hours} onChange={setDuration} />
              </>
            ) : (
              <>
                <StepTitle title="How far" />
                <Chips options={def.distances.map((m) => ({ value: m, label: distanceLabel(m) }))} value={metres} onChange={setDistance} />
              </>
            )}

            {mode === "hold_the_route" ? (
              <>
                <StepTitle title="Which route" />
                <View style={styles.list}>
                  <RouteRow title="Any 2 km loop" sub="Fastest 2 km wins" on={!routeRunId} onPress={() => setRouteRunId(null)} />
                  {myRoutes.slice(0, 6).map((r) => (
                    <RouteRow key={r.id} title={r.title} sub={`${r.distanceKm.toFixed(1)} km · your best ${Math.floor(r.durationSec / 60)} min`} on={routeRunId === r.id} onPress={() => setRouteRunId(r.id)} />
                  ))}
                </View>
                {route ? <Body dim size={12} style={{ marginTop: S.sm }}>Runs that cover 95% of the route count as a go.</Body> : null}
              </>
            ) : null}

            <StepTitle title="Stake" right={<Text style={styles.wallet}>{formatNumber(out)} OUT to spend</Text>} />
            <Chips options={STAKES.map((v) => ({ value: v, label: v ? `${v} OUT` : "No stake", disabled: v > out }))} value={stake} onChange={setStake} />
            <Body dim size={12} style={{ marginTop: S.sm }}>
              {stake ? `You both put in ${stake} OUT. The winner takes ${stake * 2}, a draw hands it back.` : "Just the win, the XP and the bragging rights."}
            </Body>

            <Card style={{ marginTop: S.xl, borderWidth: 0 }} padding={S.lg}>
              {RULES[mode]().map((line, i) => (
                <Row key={i} gap={S.sm} style={{ alignItems: "flex-start", marginTop: i ? S.sm : 0 }}>
                  <View style={styles.tick}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </View>
                  <Body size={13.5} style={{ flex: 1 }}>{line}</Body>
                </Row>
              ))}
            </Card>

            <Card style={{ marginTop: S.md, borderWidth: 0 }} padding={S.lg}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.limitsTitle}>Your limits</Text>
                {lim ? <TierBadge tier={lim.tier} /> : null}
              </Row>
              <Body dim size={13} style={{ marginTop: S.sm }}>
                {lim ? limitsText(lim) : "Checking..."}
              </Body>
              {blocked && lim?.tier !== "black" ? <Button title="See membership" variant="secondary" size="sm" onPress={() => router.push("/membership")} style={{ marginTop: S.md, alignSelf: "flex-start" }} /> : null}
            </Card>
          </FadeIn>
        ) : null}
      </Screen>

      {!searching ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]} pointerEvents="box-none">
          <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.92)", C.bg]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Button title={cta} size="lg" full disabled={ctaDisabled} loading={create.isPending} onPress={next} />
          <Text style={styles.footNote}>
            {step === "setup" ? `Winner takes ${BATTLE_PRIZES.win.xp} XP and ${BATTLE_PRIZES.win.out + stake * 2} OUT.` : step === "mode" ? modeOf(mode).line : "Your record, their best day and their numbers, side by side."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StepDots({ step }) {
  const at = STEPS.indexOf(step);
  return (
    <Row gap={5}>
      {STEPS.map((s, i) => (
        <View key={s} style={[styles.dot, i === at && styles.dotOn, i < at && { backgroundColor: C.accentHi }]} />
      ))}
    </Row>
  );
}

function StepTitle({ title, right }) {
  return (
    <Row style={{ marginTop: S.xl, marginBottom: S.md, justifyContent: "space-between" }}>
      <Text style={styles.stepTitle}>{title}</Text>
      {right}
    </Row>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <Row gap={S.sm} style={{ flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale key={String(o.value)} disabled={o.disabled} onPress={() => onChange(o.value)} scaleTo={0.95} style={[styles.chip, on && styles.chipOn, o.disabled && { opacity: 0.4 }]}>
            {o.label.includes("OUT") ? <Coins size={14} color={on ? "#fff" : C.textDim} /> : null}
            <Text style={[styles.chipText, on && { color: "#fff" }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </Row>
  );
}

function RouteRow({ title, sub, on, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.route, on && { borderColor: C.accent }]}>
      <View style={styles.routeIcon}>
        <MapPin size={16} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.routeTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.routeSub}>{sub}</Text>
      </View>
      <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
    </PressableScale>
  );
}

function FindSomeone({ query, setQuery, results, loading, onPick }) {
  const searching = query.trim().length > 0;
  return (
    <View>
      <View style={styles.search}>
        <Search size={18} color={C.textMute} />
        <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search by name, username or area" placeholderTextColor={C.textMute} autoCapitalize="none" autoCorrect={false} style={styles.input} />
        {searching ? (
          <PressableScale onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <X size={16} color={C.textMute} />
          </PressableScale>
        ) : null}
      </View>
      {loading ? (
        <View style={{ gap: S.sm, marginTop: S.lg }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={16} />
          ))}
        </View>
      ) : results.length ? (
        <View style={{ marginTop: S.md }}>
          {results.slice(0, 20).map((p, i) => (
            <FadeIn key={p.id} index={i}>
              {i > 0 ? <Divider style={{ marginLeft: 56 }} /> : null}
              <PressableScale onPress={() => onPick(p)} scaleTo={0.98} style={styles.person}>
                <Avatar uri={p.avatar} name={p.name} tier={p.tier} dot={p.dot} outside={p.isOutside} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.personSub} numberOfLines={1}>{personLine(p)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.personSteps}>{compactNumber(p.todaySteps)}</Text>
                  <Text style={styles.personSub}>today</Text>
                </View>
              </PressableScale>
            </FadeIn>
          ))}
        </View>
      ) : searching ? (
        <Body dim style={{ textAlign: "center", marginTop: S.xl }}>No one called "{query.trim()}". Try a first name or an area.</Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: S.sm },
  big: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 40, textTransform: "uppercase", marginTop: 6 },
  summary: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, marginTop: S.sm },
  summaryKick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  summaryName: { color: C.text, fontFamily: F.display, fontSize: 26, textTransform: "uppercase", marginTop: 2 },
  stepTitle: { color: C.text, fontFamily: F.display, fontSize: 20, textTransform: "uppercase", letterSpacing: 0.3 },
  wallet: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.accent },
  chipText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 14 },
  list: { gap: S.sm },
  route: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1.5, borderColor: "transparent" },
  routeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  routeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  routeSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: C.accent, borderColor: C.accent },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", marginTop: 1 },
  limitsTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  dot: { width: 14, height: 4, borderRadius: 2, backgroundColor: C.surfaceHigh },
  dotOn: { width: 26, backgroundColor: C.accent },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.xxl },
  footNote: { color: C.textDim, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.sm },
  search: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 50, paddingHorizontal: S.lg, borderRadius: R.full, backgroundColor: C.surface, marginTop: S.sm },
  input: { flex: 1, color: C.text, fontSize: 15, height: "100%", outlineStyle: "none" },
  person: { flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 64, paddingVertical: S.md },
  personName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  personSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  personSteps: { color: C.text, fontFamily: F.display, fontSize: 16 },
});
