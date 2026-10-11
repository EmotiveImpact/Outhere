import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Footprints, Route, Search, Swords, X } from "lucide-react-native";
import { engine, useBattleLimits, useEngineMutation, useFriends, usePlayer, useSearchPlayers } from "@/data/hooks";
import { BATTLE_DURATIONS } from "@/data/engine";
import { Avatar, Body, Button, C, Card, F, Header, Label, ListRow, Loading, R, Row, S, Screen, Segment, TierBadge, Title } from "@/components/ui";
import { limitsText } from "@/components/arena/BattlesHub";
import { durationLabel } from "@/components/arena/shared";
import { compactNumber } from "@/utils/format";
import { hapticSelection, hapticSuccess } from "@/services/haptics";

const DURATION_HINTS = { 2: "Quick fire", 6: "Half a day", 24: "Full day", 168: "Long game" };

const METRIC_OPTIONS = [
  { value: "steps", label: "Steps" },
  { value: "distance", label: "Distance" },
];

const personLine = (p) => [`@${p.username}`, p.area || p.city, `${compactNumber(p.todaySteps)} today`].filter(Boolean).join(" · ");

export default function NewBattleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initial = Array.isArray(params.opponent) ? params.opponent[0] : params.opponent;
  const [opponentId, setOpponentId] = useState(initial && initial !== "me" ? initial : null);
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState(24);
  const [metric, setMetric] = useState("steps");

  const friends = useFriends();
  const search = useSearchPlayers(query.trim());
  const limits = useBattleLimits();
  const opponent = usePlayer(opponentId);

  const create = useEngineMutation(engine.createBattle, {
    onSuccess: (battle) => {
      hapticSuccess();
      router.replace(`/battles/${battle.id}`);
    },
  });

  const friendIds = new Set((friends.data || []).map((p) => p.id));
  const searching = query.trim().length > 0;
  const results = search.data || [];
  const suggested = results.filter((p) => !friendIds.has(p.id)).slice(0, 8);
  const lim = limits.data;
  const blocked = lim && !lim.canCreate;

  const pick = (p) => {
    hapticSelection();
    setOpponentId(p.id);
    setQuery("");
  };

  return (
    <Screen header={<Header back title="New battle" subtitle="Pick a rival and set the clock" />}>
      <Label style={styles.step}>1 · Opponent</Label>
      {opponentId ? (
        opponent.isPending ? (
          <Loading style={{ paddingVertical: 24 }} />
        ) : opponent.data ? (
          <Card highlight>
            <Row gap={S.md}>
              <Avatar uri={opponent.data.avatar} name={opponent.data.name} size={52} outside={opponent.data.isOutside} />
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Title size={20}>{opponent.data.name}</Title>
                  <TierBadge tier={opponent.data.tier} />
                </Row>
                <Body dim size={13} style={{ marginTop: 2 }}>
                  {personLine(opponent.data)}
                </Body>
              </View>
              <Pressable onPress={() => setOpponentId(null)} hitSlop={10} style={styles.clear} accessibilityLabel="Change opponent">
                <X size={16} color={C.text} />
              </Pressable>
            </Row>
          </Card>
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
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <X size={16} color={C.textMute} />
              </Pressable>
            ) : null}
          </View>

          {searching ? (
            <PeopleList title="Results" people={results} loading={search.isPending} onPick={pick} empty="No one by that name. Try a city like London." />
          ) : (
            <>
              {friends.data?.length ? <PeopleList title="People you follow" people={friends.data} onPick={pick} /> : null}
              <PeopleList title={friends.data?.length ? "More rivals" : "Suggested rivals"} people={suggested} loading={search.isPending} onPick={pick} />
            </>
          )}
        </>
      )}

      <Label style={styles.step}>2 · Duration</Label>
      <View style={styles.grid}>
        {BATTLE_DURATIONS.map((h) => {
          const active = h === duration;
          return (
            <Pressable
              key={h}
              onPress={() => {
                hapticSelection();
                setDuration(h);
              }}
              style={[styles.duration, active && styles.durationActive]}
            >
              <Text style={[styles.durationValue, active && { color: C.accent }]}>{durationLabel(h)}</Text>
              <Text style={styles.durationHint}>{DURATION_HINTS[h] || ""}</Text>
            </Pressable>
          );
        })}
      </View>

      <Label style={styles.step}>3 · What counts</Label>
      <Segment options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      <Row gap={S.sm} style={{ marginTop: S.sm }}>
        {metric === "steps" ? <Footprints size={14} color={C.textMute} /> : <Route size={14} color={C.textMute} />}
        <Body mute size={13}>{metric === "steps" ? "Every step from your phone counts." : "Kilometres walked or run, from your steps and runs."}</Body>
      </Row>

      <Card style={{ marginTop: S.xxl }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Your limits</Label>
          {lim ? <TierBadge tier={lim.tier} /> : null}
        </Row>
        <Body size={14} style={{ marginTop: S.sm }}>{lim ? limitsText(lim) : "Checking..."}</Body>
        {blocked ? (
          <Body dim size={13} style={{ marginTop: S.sm }}>
            {lim.active >= lim.maxActive ? "Finish a live battle first, or go up a tier for more at once." : "You've used this week's battle. Pro gets unlimited."}
          </Body>
        ) : null}
        {lim?.tier !== "black" && blocked ? <Button title="See membership" variant="outline" size="sm" onPress={() => router.push("/membership")} style={{ marginTop: S.md, alignSelf: "flex-start" }} /> : null}
      </Card>

      <Button
        title={opponent.data ? `Battle ${opponent.data.name}` : "Pick an opponent"}
        icon={Swords}
        size="lg"
        full
        disabled={!opponent.data}
        loading={create.isPending}
        onPress={() => create.mutate({ opponentId, durationHours: duration, metric })}
        style={{ marginTop: S.xl }}
      />
      <Body mute size={12} style={{ textAlign: "center", marginTop: S.sm }}>
        Starts straight away. Winner takes 150 XP and 15 OUT.
      </Body>
    </Screen>
  );
}

function PeopleList({ title, people, loading = false, onPick, empty = null }) {
  return (
    <View style={{ marginTop: S.lg }}>
      <Text style={styles.listTitle}>{title}</Text>
      {loading ? (
        <Loading style={{ paddingVertical: 20 }} />
      ) : people.length ? (
        <Card padding={S.md} style={{ paddingVertical: 0 }}>
          {people.map((p, i) => (
            <ListRow
              key={p.id}
              style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border } : null}
              leading={<Avatar uri={p.avatar} name={p.name} size={40} outside={p.isOutside} />}
              title={p.name}
              subtitle={personLine(p)}
              trailing={<TierBadge tier={p.tier} />}
              onPress={() => onPick(p)}
            />
          ))}
        </Card>
      ) : empty ? (
        <Body dim size={14}>{empty}</Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { marginTop: S.xxl, marginBottom: S.md },
  search: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 48, paddingHorizontal: S.lg, borderRadius: R.full, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.text, fontSize: 15 },
  clear: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  listTitle: { color: C.textDim, fontSize: 13, fontWeight: "600", marginBottom: S.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  duration: { flexBasis: "48%", flexGrow: 1, padding: S.lg, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  durationActive: { borderColor: C.accent, backgroundColor: "#0f1a14" },
  durationValue: { color: C.text, fontFamily: F.display, fontSize: 22 },
  durationHint: { color: C.textMute, fontSize: 12, marginTop: 2 },
});
