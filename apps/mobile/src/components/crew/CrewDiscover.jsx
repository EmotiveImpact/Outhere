import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyRound, Plus, Search, Users, X } from "lucide-react-native";
import { Body, Button, C, Card, EmptyState, F, Label, Loading, Row, S, SectionHeader, Title } from "@/components/ui";
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

/**
 * Everything a player needs to get into a crew: limits, join by code, create,
 * and a searchable list. Used as the Crew tab empty state and in the
 * "Find a crew" sheet. `onDone` runs after a join (to close a sheet).
 */
export default function CrewDiscover({ intro = false, onDone }) {
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const openUpgrade = useUpgradePrompt((s) => s.open);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const debounced = useDebounced(query);
  const discover = useDiscoverCrews(debounced);
  const limits = useCrewLimits();
  const l = limits.data;

  const joined = (crew) => {
    focus(crew.id);
    onDone?.();
  };

  const joinByCode = useEngineMutation(engine.joinCrewByCode, {
    onSuccess: (crew) => {
      setCode("");
      Alert.alert(`You're in ${crew.name}`, "Say hello in the crew chat.");
      joined(crew);
    },
  });
  const join = useEngineMutation(engine.joinCrew, { onSuccess: joined });

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
        <View style={{ alignItems: "center", paddingTop: S.xl, paddingBottom: S.lg }}>
          <View style={styles.introIcon}>
            <Users size={30} color={C.accent} />
          </View>
          <Title size={28} style={{ textAlign: "center" }}>Find your crew</Title>
          <Body dim style={{ textAlign: "center", marginTop: S.sm, maxWidth: 300 }}>
            Crews pool their kilometres, chase a weekly goal together and climb the badge tiers. Better outside with people.
          </Body>
        </View>
      ) : null}

      {l ? (
        <Card style={{ marginTop: S.md }} padding={S.md}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Label>{tierLabel(l.tier)} limits</Label>
              <Body size={14} style={{ marginTop: 4 }}>
                In {l.joined} of {l.maxJoined} crews · Own {l.owned} of {l.maxOwned}
              </Body>
            </View>
            {l.tier !== "black" ? (
              <Pressable onPress={() => router.push("/membership")} hitSlop={8}>
                <Text style={{ color: C.accent, fontWeight: "600", fontSize: 13 }}>Upgrade</Text>
              </Pressable>
            ) : null}
          </Row>
        </Card>
      ) : null}

      <Card style={{ marginTop: S.md }}>
        <Row gap={S.sm}>
          <KeyRound size={16} color={C.accent} />
          <Text style={styles.cardTitle}>Join with a code</Text>
        </Row>
        <Body dim size={13} style={{ marginTop: 4 }}>Got an invite code from a mate? Drop it in.</Body>
        <Row gap={S.sm} style={{ marginTop: S.md }}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="e.g. SOUTH1"
            placeholderTextColor={C.textMute}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            returnKeyType="go"
            onSubmitEditing={() => code.trim() && joinByCode.mutate(code)}
            style={[styles.input, styles.codeInput]}
          />
          <Button title="Join" onPress={() => joinByCode.mutate(code)} disabled={!code.trim()} loading={joinByCode.isPending} />
        </Row>
      </Card>

      <Card style={{ marginTop: S.md }} onPress={startCreate}>
        <Row gap={S.md}>
          <View style={styles.plus}>
            <Plus size={20} color={C.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Create a crew</Text>
            <Body dim size={13} style={{ marginTop: 2 }}>
              {l && l.maxOwned === 0 ? "Pro and Black members can start their own crew." : "Name it, pick a colour, invite your people."}
            </Body>
          </View>
        </Row>
      </Card>

      <SectionHeader title="Discover crews" />
      <View style={styles.searchWrap}>
        <Search size={16} color={C.textMute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or city"
          placeholderTextColor={C.textMute}
          autoCorrect={false}
          style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <X size={16} color={C.textMute} />
          </Pressable>
        ) : null}
      </View>

      {discover.isPending ? (
        <Loading />
      ) : crews.length === 0 ? (
        <EmptyState icon={Search} title="No crews found" body={query ? "Try another name or city." : "You're already in every crew going. Start your own."} />
      ) : (
        crews.map((crew) => (
          <CrewCard
            key={crew.id}
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
              ) : null
            }
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  introIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: S.lg },
  cardTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.md, fontSize: 15 },
  codeInput: { flex: 1, fontFamily: F.displayMedium, letterSpacing: 2 },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: S.md, marginBottom: S.md },
});
