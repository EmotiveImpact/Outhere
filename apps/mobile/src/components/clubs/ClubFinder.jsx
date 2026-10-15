// Find your run club: verified clubs near you with their meet times, distance
// and paces, filtered by Near me, Tonight or Beginners. Ends with starting a
// founding club and, for organisers, claiming theirs.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { BadgeCheck, ChevronRight, Search, X } from "lucide-react-native";
import { Body, C, Card, EmptyState, F, FadeIn, PressableScale, R, Row, S, Segment, SkeletonList } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { engine, useEngineMutation, useFindClubs } from "@/data/hooks";
import { useCrewFocus } from "@/components/crew/shared";
import { ClubCard } from "./parts";

const FILTERS = [
  { value: "near", label: "Near me" },
  { value: "tonight", label: "Tonight" },
  { value: "beginners", label: "Beginners" },
];

const useDebounced = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

export default function ClubFinder({ onJoined, searchOpen = false, onCloseSearch }) {
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const [filter, setFilter] = useState("near");
  const [query, setQuery] = useState("");
  const q = useDebounced(query);
  const { data, isPending } = useFindClubs(filter, q);
  const join = useEngineMutation(engine.joinCrew, {
    success: (crew) => `You're in ${crew.name}`,
    onSuccess: (crew) => {
      focus(crew.id);
      onJoined?.(crew);
    },
  });
  const clubs = data || [];
  const official = clubs.filter((c) => c.verified);
  const founding = clubs.filter((c) => !c.verified);

  return (
    <View>
      {searchOpen ? (
        <Row style={styles.search}>
          <Search size={16} color={C.textDim} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Club, area or meet spot" placeholderTextColor={C.textMute} autoFocus style={styles.input} accessibilityLabel="Search clubs" />
          <PressableScale
            onPress={() => {
              setQuery("");
              onCloseSearch?.();
            }}
            hitSlop={8}
            accessibilityLabel="Close search"
          >
            <X size={16} color={C.textDim} />
          </PressableScale>
        </Row>
      ) : null}
      <Segment options={FILTERS} value={filter} onChange={setFilter} style={{ marginBottom: S.md }} />
      {isPending ? (
        <SkeletonList count={3} height={96} />
      ) : official.length ? (
        official.map((c, i) => (
          <FadeIn key={c.id} index={i}>
            <ClubCard club={c} onPress={() => router.push(`/crew/${c.id}`)} onJoin={() => join.mutate(c.id)} joining={join.isPending && join.variables === c.id} />
          </FadeIn>
        ))
      ) : (
        <EmptyState title={filter === "tonight" ? "No club runs tonight" : "No clubs here yet"} body={filter === "tonight" ? "Try Near me for this week's runs." : "Start the first one below."} />
      )}

      {founding.length ? (
        <>
          <Text style={styles.section}>Founding clubs</Text>
          {founding.map((c) => (
            <ClubCard key={c.id} club={c} onPress={() => router.push(`/clubs/founding/${c.id}`)} onJoin={() => join.mutate(c.id)} joining={join.isPending && join.variables === c.id} />
          ))}
        </>
      ) : null}

      <PressableScale onPress={() => router.push("/crew/create")} scaleTo={0.98} style={styles.found}>
        <Image source={PHOTOS.founding} style={styles.foundImg} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.foundTitle}>No club where you live?</Text>
          <Body dim size={13}>Start one. It goes official after 3 meetups.</Body>
        </View>
        <ChevronRight size={16} color={C.textMute} />
      </PressableScale>

      <Card onPress={() => router.push("/clubs/claim")} padding={S.lg} style={{ marginTop: S.sm }}>
        <Row gap={S.md}>
          <BadgeCheck size={22} color="#fff" fill={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.foundTitle}>Run a club already?</Text>
            <Body dim size={13}>Claim it, get verified, and organisers get Pro free.</Body>
          </View>
          <ChevronRight size={16} color={C.textMute} />
        </Row>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { height: 46, borderRadius: R.full, backgroundColor: C.surface, paddingHorizontal: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15, height: 46 },
  section: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", marginTop: S.lg, marginBottom: S.sm },
  found: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, marginTop: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  foundImg: { width: 54, height: 54, borderRadius: R.md },
  foundTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
