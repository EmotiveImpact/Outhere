// Crew tab. No crew yet: discover, join with a code or create one. In a crew:
// switcher, crew hero and Feed / Chat / Ranks / Members.

import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Compass, MessageCircle, Newspaper, Plus, Settings2, Share2, Trophy, Users, X } from "lucide-react-native";
import { PHOTOS } from "@/constants/photos";
import { C, EmptyState, F, FadeIn, Hero, IconButton, PressableScale, Row, S, Screen, Sheet, Skeleton, TAB_BAR_SPACE, Title } from "@/components/ui";
import { useCrew, useCrewLimits, useMyCrews, useUpgradePrompt } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import ActionSheet from "@/components/crew/ActionSheet";
import CrewChat from "@/components/crew/CrewChat";
import CrewDiscover from "@/components/crew/CrewDiscover";
import CrewFeed from "@/components/crew/CrewFeed";
import CrewHero from "@/components/crew/CrewHero";
import CrewLeaderboard from "@/components/crew/CrewLeaderboard";
import CrewMembers from "@/components/crew/CrewMembers";
import CrewSettings, { shareInvite } from "@/components/crew/CrewSettings";
import CrewTabs from "@/components/crew/CrewTabs";
import { CrewLogo, useCrewFocus } from "@/components/crew/shared";

const TABS = [
  { value: "feed", label: "Feed", icon: Newspaper },
  { value: "chat", label: "Chat", icon: MessageCircle },
  { value: "board", label: "Ranks", icon: Trophy },
  { value: "members", label: "Members", icon: Users },
];

function DiscoverSheet({ visible, onClose }) {
  return (
    <Sheet visible={visible} onClose={onClose} scroll maxHeight="92%">
      <Row style={{ paddingBottom: S.md }}>
        <Title size={24} style={{ flex: 1 }}>Find a crew</Title>
        <IconButton icon={X} onPress={onClose} label="Close" />
      </Row>
      <CrewDiscover onDone={onClose} />
    </Sheet>
  );
}

function Switcher({ crews, activeId, onSelect }) {
  if (crews.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter, paddingBottom: S.md }}>
      {crews.map((c) => {
        const active = c.id === activeId;
        return (
          <PressableScale
            key={c.id}
            onPress={() => onSelect(c.id)}
            scaleTo={0.94}
            style={[styles.chip, active && styles.chipActive]}
          >
            <CrewLogo crew={c} size={28} radius={9} ring={false} />
            <Text style={[styles.chipText, active && { color: C.text }]} numberOfLines={1}>
              {c.name}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function CrewSkeleton() {
  return (
    <View style={{ paddingHorizontal: S.gutter, gap: S.md }}>
      <Skeleton height={300} radius={24} />
      <Skeleton height={48} radius={99} />
      <Skeleton height={200} radius={20} />
    </View>
  );
}

export default function CrewTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myCrews = useMyCrews();
  const limits = useCrewLimits();
  const openUpgrade = useUpgradePrompt((s) => s.open);
  const focusedId = useCrewFocus((s) => s.crewId);
  const focus = useCrewFocus((s) => s.focus);
  const [tab, setTab] = useState("feed");
  const [menu, setMenu] = useState(false);
  const [discover, setDiscover] = useState(false);
  const [settings, setSettings] = useState(false);

  // A ?crew= link (from notifications or other screens) focuses that crew.
  useEffect(() => {
    if (params.crew) focus(String(params.crew));
  }, [params.crew, focus]);

  const crews = useMemo(() => myCrews.data || [], [myCrews.data]);
  const activeId = crews.some((c) => c.id === focusedId) ? focusedId : crews[0]?.id;
  const crewQuery = useCrew(activeId);
  const crew = crewQuery.data && crewQuery.data.id === activeId && crewQuery.data.isMember ? crewQuery.data : null;

  const refreshing = myCrews.isRefetching || crewQuery.isRefetching;
  const refresh = () => {
    myCrews.refetch();
    crewQuery.refetch();
  };

  const titleRow = (right) => (
    <Row style={styles.top}>
      <Title size={34} style={{ flex: 1 }}>Crew</Title>
      {right}
    </Row>
  );

  if (myCrews.isPending) {
    return (
      <Screen tab scroll={false} padded={false} header={titleRow(null)}>
        <CrewSkeleton />
      </Screen>
    );
  }

  if (!crews.length) {
    return (
      <Screen tab onRefresh={refresh} refreshing={refreshing} padded={false} style={{ paddingTop: 0 }}>
        <Hero
          photo={PHOTOS.clubfind}
          height={330}
          kicker="Run clubs"
          top="Find your"
          bottom="run club"
          sub="Every crew on Outhere is a real run club. Join one near you, or start a founding club with your people."
        />
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
          <CrewDiscover />
        </View>
      </Screen>
    );
  }

  const startCreate = () => {
    const l = limits.data;
    if (l && !l.canCreate) {
      openUpgrade(l.maxOwned === 0 ? "pro" : "black", l.maxOwned === 0 ? "Owning a crew is a Pro feature." : `You already own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}.`);
      return;
    }
    router.push("/crew/create");
  };

  const l = limits.data;
  const menuOptions = [
    { label: "Find a crew", hint: "Browse crews near you or join with a code", icon: Compass, onPress: () => setDiscover(true) },
    { label: "Start a crew", hint: l && l.maxOwned === 0 ? "Pro and Black members can run a crew" : "Name it, pick a colour, bring your people", icon: Plus, onPress: startCreate },
  ];

  const header = (
    <View>
      {titleRow(
        <>
          {crew ? <IconButton icon={Share2} onPress={() => shareInvite(crew)} label="Share invite code" /> : null}
          {crew ? <IconButton icon={Settings2} onPress={() => setSettings(true)} label="Crew settings" /> : null}
          <IconButton icon={Plus} onPress={() => setMenu(true)} label="More crews" />
        </>
      )}
      <Switcher crews={crews} activeId={activeId} onSelect={focus} />
    </View>
  );

  const sheets = (
    <>
      <ActionSheet
        visible={menu}
        title="More crews"
        subtitle={l ? `In ${l.joined} of ${l.maxJoined} crews · own ${l.owned} of ${l.maxOwned} on ${tierLabel(l.tier)}` : undefined}
        options={menuOptions}
        onClose={() => setMenu(false)}
      />
      <DiscoverSheet visible={discover} onClose={() => setDiscover(false)} />
      {crew ? <CrewSettings crew={crew} visible={settings} onClose={() => setSettings(false)} onLeft={() => focus(null)} /> : null}
    </>
  );

  if (!crew) {
    return (
      <Screen tab scroll={false} padded={false} header={header}>
        {crewQuery.isError ? (
          <EmptyState title="Couldn't load this crew" body="Pull down or pick another crew." action="Try again" onAction={refresh} />
        ) : (
          <CrewSkeleton />
        )}
        {sheets}
      </Screen>
    );
  }

  const tabs = <CrewTabs options={TABS} value={tab} onChange={setTab} style={{ marginHorizontal: S.gutter, marginBottom: S.md }} />;

  if (tab === "chat") {
    return (
      <Screen tab scroll={false} padded={false} header={header}>
        {tabs}
        <CrewChat key={crew.id} crew={crew} />
        {sheets}
      </Screen>
    );
  }

  return (
    <Screen tab scroll={false} padded={false} header={header}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 20 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      >
        <FadeIn key={crew.id} style={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.xxl }}>
          <CrewHero crew={crew} />
        </FadeIn>
        <View style={{ backgroundColor: C.bg, paddingTop: S.xs }}>{tabs}</View>
        <View key={`${crew.id}:${tab}`} style={{ paddingHorizontal: S.gutter }}>
          {tab === "feed" ? <CrewFeed crew={crew} /> : null}
          {tab === "board" ? <CrewLeaderboard crew={crew} /> : null}
          {tab === "members" ? <CrewMembers crew={crew} /> : null}
        </View>
      </ScrollView>
      {sheets}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.md, gap: S.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 44, paddingLeft: 7, paddingRight: 14, borderRadius: 99, backgroundColor: C.surface, maxWidth: 220 },
  chipActive: { backgroundColor: C.surfaceHigh },
  chipText: { color: C.textDim, fontSize: 13, fontFamily: F.bodySemi, flexShrink: 1 },
});
