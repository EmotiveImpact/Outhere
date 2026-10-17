// Find your run club: verified clubs near you with their meet times, distance
// and paces, filtered by Near me, Tonight or Beginners. Ends with starting a
// founding club and, for organisers, claiming theirs.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronsRight, Search, X } from "@/components/ui/icons";
import { BlendImage, C, EmptyState, F, FadeIn, PressableScale, R, Row, S, Segment, SkeletonList, Surface } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { engine, useEngineMutation, useFindClubs } from "@/data/hooks";
import { joinedToast, useCrewFocus } from "@/components/crew/shared";
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
    success: joinedToast,
    onSuccess: (crew) => {
      if (!crew.isMember) return;
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
      <Segment options={FILTERS} value={filter} onChange={setFilter} style={{ marginBottom: 12 }} />
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

      {/* .r11found: the founding badge set into the card, no box */}
      <Surface onPress={() => router.push("/crew/create")} radius={20} padding={null} style={{ marginTop: 2 }} contentStyle={styles.found}>
        <BlendImage source={PHOTOS.founding} size={46} mask="tight" />
        <View style={{ flex: 1 }}>
          <Text style={styles.foundTitle}>No club where you live?</Text>
          <Text style={styles.foundSub}>Start one. It goes official after 3 meetups.</Text>
        </View>
        <ChevronsRight size={16} color={C.textMute} />
      </Surface>

      <Surface onPress={() => router.push("/clubs/claim")} radius={20} padding={null} style={{ marginTop: 10 }} contentStyle={styles.found}>
        <BlendImage source={PHOTOS.verified} size={46} mask="tight" />
        <View style={{ flex: 1 }}>
          <Text style={styles.foundTitle}>Run a club already?</Text>
          <Text style={styles.foundSub}>Claim it, get verified, and organisers get Pro free.</Text>
        </View>
        <ChevronsRight size={16} color={C.textMute} />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { height: 46, borderRadius: R.full, backgroundColor: C.surface, paddingHorizontal: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15, height: 46 },
  section: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", marginTop: S.md, marginBottom: 10 },
  found: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 8, paddingRight: 14 },
  foundTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  foundSub: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
});
