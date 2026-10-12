import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  Footprints,
  Route,
  Search,
  X,
} from "lucide-react-native";
import {
  engine,
  useBattleLimits,
  useEngineMutation,
  useFriends,
  usePlayer,
  useSearchPlayers,
} from "@/data/hooks";
import { BATTLE_DURATIONS } from "@/data/engine";
import {
  Avatar,
  Body,
  Button,
  C,
  Card,
  Divider,
  F,
  FadeIn,
  Header,
  PressableScale,
  R,
  Row,
  S,
  Screen,
  Skeleton,
  TierBadge,
} from "@/components/ui";
import { limitsText } from "@/components/arena/ArenaHero";
import { BATTLE_PRIZES, durationLabel } from "@/components/arena/shared";
import { compactNumber } from "@/utils/format";

const DURATION_HINTS = {
  2: "Quick fire",
  6: "Half a day",
  24: "Full day",
  168: "Long game",
};

const METRIC_OPTIONS = [
  {
    value: "steps",
    label: "Steps",
    hint: "Every step counts",
    icon: Footprints,
  },
  {
    value: "distance",
    label: "Distance",
    hint: "Km from steps and runs",
    icon: Route,
  },
];

const personLine = (p) =>
  [`@${p.username}`, p.area || p.city].filter(Boolean).join(" · ");

export default function NewBattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initial = Array.isArray(params.opponent)
    ? params.opponent[0]
    : params.opponent;
  const [opponentId, setOpponentId] = useState(
    initial && initial !== "me" ? initial : null,
  );
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState(24);
  const [metric, setMetric] = useState("steps");

  const friends = useFriends();
  const search = useSearchPlayers(query.trim());
  const limits = useBattleLimits();
  const opponent = usePlayer(opponentId);

  const create = useEngineMutation(engine.createBattle, {
    success: (b) => `Battle on vs ${b?.opponent?.player?.name || "your rival"}`,
    onSuccess: (battle) => router.replace(`/battles/${battle.id}`),
  });

  const friendIds = new Set((friends.data || []).map((p) => p.id));
  const searching = query.trim().length > 0;
  const results = search.data || [];
  const suggested = results.filter((p) => !friendIds.has(p.id)).slice(0, 8);
  const lim = limits.data;
  const blocked = lim && !lim.canCreate;

  const pick = (p) => {
    setOpponentId(p.id);
    setQuery("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen
        header={
          <Header back title="New battle" />
        }
        contentStyle={{ paddingBottom: 150 + insets.bottom }}
      >
        <Step n="01" title="Opponent" first />
        {opponentId ? (
          opponent.isPending ? (
            <Skeleton height={92} radius={20} />
          ) : opponent.data ? (
            <FadeIn>
              <SelectedRival
                player={opponent.data}
                onClear={() => setOpponentId(null)}
              />
            </FadeIn>
          ) : (
            <Body dim>That player could not be found. Pick someone else.</Body>
          )
        ) : (
          <>
            <View style={styles.search}>
              <Search size={18} color={C.textMute} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name, username or city"
                placeholderTextColor={C.textMute}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              {searching ? (
                <PressableScale
                  onPress={() => setQuery("")}
                  hitSlop={10}
                  accessibilityLabel="Clear search"
                >
                  <X size={16} color={C.textMute} />
                </PressableScale>
              ) : null}
            </View>

            {searching ? (
              <PeopleList
                title="Results"
                people={results}
                loading={search.isPending}
                onPick={pick}
                emptyQuery={query.trim()}
              />
            ) : (
              <>
                {friends.isPending ? (
                  <PeopleList
                    title="People you follow"
                    people={[]}
                    loading
                    onPick={pick}
                  />
                ) : null}
                {friends.data?.length ? (
                  <PeopleList
                    title="People you follow"
                    people={friends.data}
                    onPick={pick}
                  />
                ) : null}
                <PeopleList
                  title={
                    friends.data?.length ? "More rivals" : "Suggested rivals"
                  }
                  people={suggested}
                  loading={search.isPending}
                  onPick={pick}
                />
              </>
            )}
          </>
        )}

        <Step n="02" title="How long" />
        <View style={styles.grid}>
          {BATTLE_DURATIONS.map((h) => {
            const active = h === duration;
            return (
              <View key={h} style={styles.cell}>
                <PressableScale
                  onPress={() => setDuration(h)}
                  scaleTo={0.95}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Row
                    style={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Text style={styles.chipValue}>
                      {durationLabel(h)}
                    </Text>
                    <Tick on={active} />
                  </Row>
                  <Text style={styles.chipHint}>{DURATION_HINTS[h] || ""}</Text>
                </PressableScale>
              </View>
            );
          })}
        </View>

        <Step n="03" title="What counts" />
        <View style={styles.grid}>
          {METRIC_OPTIONS.map((m) => {
            const active = m.value === metric;
            const Icon = m.icon;
            return (
              <View key={m.value} style={styles.cell}>
                <PressableScale
                  onPress={() => setMetric(m.value)}
                  scaleTo={0.95}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Row
                    style={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Icon size={20} color={active ? C.text : C.textDim} />
                    <Tick on={active} />
                  </Row>
                  <Text style={styles.metricLabel}>
                    {m.label}
                  </Text>
                  <Text style={styles.chipHint}>{m.hint}</Text>
                </PressableScale>
              </View>
            );
          })}
        </View>

        <Card style={{ marginTop: S.xxl, borderWidth: 0 }} padding={S.lg}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.limitsTitle}>Your limits</Text>
            {lim ? <TierBadge tier={lim.tier} /> : null}
          </Row>
          <Body dim size={14} style={{ marginTop: S.sm }}>
            {lim ? limitsText(lim) : "Checking..."}
          </Body>
          {blocked ? (
            <Body dim size={13} style={{ marginTop: S.sm }}>
              {lim.active >= lim.maxActive
                ? "Finish a live battle first, or go up a tier for more at once."
                : "You've used this week's battle. Pro gets unlimited."}
            </Body>
          ) : null}
          {lim?.tier !== "black" && blocked ? (
            <Button
              title="See membership"
              variant="secondary"
              size="sm"
              onPress={() => router.push("/membership")}
              style={{ marginTop: S.md, alignSelf: "flex-start" }}
            />
          ) : null}
        </Card>
      </Screen>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.92)", C.bg]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.ctaBase}>
          <Button
            title={
              opponent.data
                ? `Battle ${opponent.data.name}`
                : "Pick an opponent"
            }
            size="lg"
            full
            disabled={!opponent.data}
            loading={create.isPending}
            onPress={() =>
              create.mutate({ opponentId, durationHours: duration, metric })
            }
          />
        </View>
        <Text style={styles.footNote}>
          {opponent.data
            ? `${durationLabel(duration)} of ${metric === "distance" ? "distance" : "steps"}. Starts now. Winner takes ${BATTLE_PRIZES.win.xp} XP + ${BATTLE_PRIZES.win.out} OUT.`
            : `Winner takes ${BATTLE_PRIZES.win.xp} XP and ${BATTLE_PRIZES.win.out} OUT.`}
        </Text>
      </View>
    </View>
  );
}

function Step({ n, title, first = false }) {
  return (
    <Row
      gap={S.sm}
      style={{ marginTop: first ? S.md : S.xxl, marginBottom: S.md }}
    >
      <Text style={styles.stepNum}>{n}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
    </Row>
  );
}

function Tick({ on }) {
  return (
    <View style={[styles.tick, on && styles.tickOn]}>
      {on ? <Check size={12} color={C.bg} strokeWidth={3} /> : null}
    </View>
  );
}

function SelectedRival({ player, onClear }) {
  const colour = player.color || C.textDim;
  return (
    <View style={styles.selected}>
      <Row gap={S.md}>
        <Avatar
          uri={player.avatar}
          name={player.name}
          colour={colour}
          size={60}
          ring={colour}
          outside={player.isOutside}
        />
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {player.name}
            </Text>
            <TierBadge tier={player.tier} />
          </Row>
          <Text style={styles.selectedSub} numberOfLines={1}>
            {personLine(player)} · {compactNumber(player.todaySteps)} today
          </Text>
        </View>
        <PressableScale
          onPress={onClear}
          hitSlop={8}
          style={styles.change}
          accessibilityLabel="Change opponent"
        >
          <Text style={styles.changeText}>Change</Text>
        </PressableScale>
      </Row>
    </View>
  );
}

function PeopleList({
  title,
  people,
  loading = false,
  onPick,
  emptyQuery = null,
}) {
  return (
    <View style={{ marginTop: S.lg }}>
      <Text style={styles.listTitle}>{title}</Text>
      {loading ? (
        <View style={{ gap: S.sm }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={16} />
          ))}
        </View>
      ) : people.length ? (
        <View>
          {people.map((p, i) => (
            <FadeIn key={p.id} index={i}>
              {i > 0 ? <Divider style={{ marginLeft: 56 }} /> : null}
              <PersonRow person={p} onPress={() => onPick(p)} />
            </FadeIn>
          ))}
        </View>
      ) : emptyQuery ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No one called "{emptyQuery}"</Text>
          <Body dim size={13} style={{ textAlign: "center" }}>
            Try a first name or a city like London.
          </Body>
        </View>
      ) : null}
    </View>
  );
}

function PersonRow({ person: p, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.person}>
      <Avatar
        uri={p.avatar}
        name={p.name}
        colour={p.color}
        size={44}
        outside={p.isOutside}
      />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <Text style={styles.personName} numberOfLines={1}>
            {p.name}
          </Text>
          <TierBadge tier={p.tier} />
        </Row>
        <Text style={styles.personSub} numberOfLines={1}>
          {personLine(p)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.personSteps}>{compactNumber(p.todaySteps)}</Text>
        <Text style={styles.personStepsLabel}>today</Text>
      </View>
      <View style={styles.radio} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stepNum: {
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  stepTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    height: 50,
    paddingHorizontal: S.lg,
    borderRadius: R.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: { flex: 1, color: C.text, fontSize: 15, height: "100%" },
  listTitle: {
    color: C.textDim,
    fontSize: 13,
    marginBottom: S.xs,
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    minHeight: 64,
    paddingVertical: S.md,
  },
  personName: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  personSub: { color: C.textDim, fontSize: 13, marginTop: 2 },
  personSteps: { color: C.text, fontFamily: F.display, fontSize: 15 },
  personStepsLabel: { color: C.textMute, fontSize: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    marginLeft: 4,
  },
  selected: {
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  selectedName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  selectedSub: { color: C.textDim, fontSize: 13, marginTop: 2 },
  change: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: R.full,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: { color: C.text, fontSize: 13, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  cell: { flexBasis: "47%", flexGrow: 1 },
  chip: {
    minHeight: 88,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: { borderColor: C.text },
  chipValue: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  chipHint: { color: C.textMute, fontSize: 12, marginTop: 4 },
  metricLabel: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 20,
    marginTop: S.md,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  tickOn: { backgroundColor: C.text, borderColor: C.text },
  empty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: S.xl,
  },
  limitsTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  emptyTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: S.gutter,
    paddingTop: S.xxl,
  },
  ctaBase: { borderRadius: R.full, backgroundColor: C.bg },
  footNote: {
    color: C.textMute,
    fontSize: 12,
    textAlign: "center",
    marginTop: S.sm,
  },
});
