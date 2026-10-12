import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, KeyRound, Plus, Search, Users, X } from "lucide-react-native";
import { Body, Button, C, Card, Cover, EmptyState, F, FadeIn, Label, PressableScale, Row, S, SectionHeader, Skeleton, Title } from "@/components/ui";
import { engine, useCrewLimits, useDiscoverCrews, useEngineMutation, useUpgradePrompt } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import CrewCard from "./CrewCard";
import { useCrewFocus } from "./shared";

const useDebounced = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

/** Invite code entry. `hero` lays it over route art as the screen's focal point. */
function CodeJoin({ hero, onJoined }) {
  const [code, setCode] = useState("");
  const joinByCode = useEngineMutation(engine.joinCrewByCode, {
    success: (crew) => `You're in ${crew.name}`,
    onSuccess: (crew) => {
      setCode("");
      onJoined(crew);
    },
  });
  const submit = () => code.trim() && !joinByCode.isPending && joinByCode.mutate(code);
  const ready = !!code.trim();

  return (
    <View style={hero ? styles.codeHero : styles.codeCard}>
      <Row gap={S.sm}>
        <KeyRound size={15} color={C.accent} />
        <Text style={styles.codeTitle}>Got an invite code?</Text>
      </Row>
      <View style={styles.codeRow}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/\s/g, ""))}
          placeholder="CREW CODE"
          placeholderTextColor={C.textMute}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          returnKeyType="go"
          onSubmitEditing={submit}
          style={styles.codeInput}
          accessibilityLabel="Crew invite code"
        />
        <PressableScale
          onPress={submit}
          disabled={!ready || joinByCode.isPending}
          scaleTo={0.9}
          accessibilityLabel="Join with code"
          style={[styles.codeGo, { backgroundColor: ready ? C.accent : C.surfaceHigh }]}
        >
          {joinByCode.isPending ? <Text style={styles.codeGoText}>...</Text> : <ArrowRight size={20} color={ready ? C.accentText : C.textMute} strokeWidth={2.6} />}
        </PressableScale>
      </View>
    </View>
  );
}

function DiscoverSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skel}>
          <Skeleton height={84} radius={0} />
          <View style={{ padding: S.lg, gap: 10 }}>
            <Skeleton width={56} height={56} radius={18} style={{ marginTop: -40 }} />
            <Skeleton width="55%" height={18} />
            <Skeleton width="80%" height={12} />
            <Skeleton height={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Everything a player needs to get into a crew: join by code, create, and a
 * searchable list. Used as the Crew tab empty state and in the "Find a crew"
 * sheet. `onDone` runs after a join (to close a sheet).
 */
export default function CrewDiscover({ intro = false, onDone }) {
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const openUpgrade = useUpgradePrompt((s) => s.open);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const discover = useDiscoverCrews(debounced);
  const limits = useCrewLimits();
  const l = limits.data;

  const joined = (crew) => {
    focus(crew.id);
    onDone?.();
  };

  const join = useEngineMutation(engine.joinCrew, { success: (crew) => `You're in ${crew.name}`, onSuccess: joined });

  const startCreate = () => {
    if (l && !l.canCreate) {
      const needs = l.maxOwned === 0 ? "pro" : "black";
      openUpgrade(needs, l.maxOwned === 0 ? "Owning a crew is a Pro feature." : `You already own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}.`);
      return;
    }
    onDone?.();
    router.push("/crew/create");
  };

  const crews = discover.data || [];

  return (
    <View>
      {intro ? (
        <FadeIn>
          <Cover seed="crew:find-your-crew" accent={C.accent} style={styles.hero}>
            <View style={styles.heroScrim} />
            <View style={styles.heroIcon}>
              <Users size={22} color={C.accentText} strokeWidth={2.4} />
            </View>
            <Title size={34} style={{ marginTop: S.lg, letterSpacing: -1 }}>Find your crew</Title>
            <Body size={15} style={{ marginTop: S.sm, color: "#d0d0d4" }}>
              Pool your kilometres, chase a weekly goal together and climb the badge tiers.
            </Body>
            <CodeJoin hero onJoined={joined} />
          </Cover>
        </FadeIn>
      ) : (
        <CodeJoin onJoined={joined} />
      )}

      <FadeIn index={1}>
        <Card style={{ marginTop: S.md }} onPress={startCreate}>
          <Row gap={S.md}>
            <View style={styles.plus}>
              <Plus size={20} color={C.accent} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Start your own</Text>
              <Body dim size={13} style={{ marginTop: 2 }}>
                {l && l.maxOwned === 0 ? "Pro and Black members can run a crew." : "Name it, pick a colour, bring your people."}
              </Body>
            </View>
            <ArrowRight size={18} color={C.textMute} />
          </Row>
        </Card>
      </FadeIn>

      {l ? (
        <Row style={{ marginTop: S.md, justifyContent: "space-between", paddingHorizontal: 4 }}>
          <Label>
            {tierLabel(l.tier)} · in {l.joined} of {l.maxJoined} · own {l.owned} of {l.maxOwned}
          </Label>
          {l.tier !== "black" ? (
            <PressableScale onPress={() => router.push("/membership")} hitSlop={10}>
              <Text style={{ color: C.accent, fontWeight: "700", fontSize: 12 }}>Get more</Text>
            </PressableScale>
          ) : null}
        </Row>
      ) : null}

      <SectionHeader title="Discover crews" />
      <View style={styles.searchWrap}>
        <Search size={16} color={C.textMute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or city"
          placeholderTextColor={C.textMute}
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query ? (
          <PressableScale onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <X size={16} color={C.textMute} />
          </PressableScale>
        ) : null}
      </View>

      {discover.isPending ? (
        <DiscoverSkeleton />
      ) : crews.length === 0 ? (
        <EmptyState
          icon={Search}
          title={query ? "No crews found" : "You're in them all"}
          body={query ? "Try another name or city." : "Every crew going has you in it. Time to start your own."}
          action={query ? "Clear search" : "Start a crew"}
          onAction={query ? () => setQuery("") : startCreate}
        />
      ) : (
        crews.map((crew, i) => (
          <FadeIn key={crew.id} index={i}>
            <CrewCard
              crew={crew}
              onPress={() => {
                onDone?.();
                router.push(`/crew/${crew.id}`);
              }}
              right={
                crew.privacy === "public" ? (
                  <Button
                    title="Join"
                    size="sm"
                    variant="outline"
                    loading={join.isPending && join.variables === crew.id}
                    disabled={join.isPending}
                    onPress={() => join.mutate(crew.id)}
                  />
                ) : (
                  <Button title="View" size="sm" variant="secondary" onPress={() => router.push(`/crew/${crew.id}`)} />
                )
              }
            />
          </FadeIn>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: S.xl, paddingTop: S.xxl, marginTop: S.md, borderWidth: 1, borderColor: "rgba(0,255,127,0.25)" },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.35)" },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  codeHero: { marginTop: S.xl, padding: S.md, borderRadius: 20, backgroundColor: "rgba(10,10,10,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  codeCard: { padding: S.lg, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  codeTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 15 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  codeInput: { flex: 1, minWidth: 0, height: 52, borderRadius: 16, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderStrong, color: C.text, paddingHorizontal: S.lg, fontSize: 18, fontFamily: F.display, letterSpacing: 4 },
  codeGo: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  codeGoText: { color: C.accentText, fontFamily: F.display, fontSize: 16 },
  cardTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  plus: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentDim, borderWidth: 1, borderColor: "rgba(0,255,127,0.35)", alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 48, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: S.md, marginBottom: S.md },
  searchInput: { flex: 1, height: 46, color: C.text, fontSize: 15 },
  skel: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
});
