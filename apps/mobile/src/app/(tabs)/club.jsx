// Crew tab. No crew yet: discover, join with a code or create one. In a crew:
// switcher, crew header and Feed / Chat / Leaderboard / Members.

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Compass, Plus, Settings2, Share2, X } from "lucide-react-native";
import { C, EmptyState, F, IconButton, Loading, Row, S, Screen, Segment, TAB_BAR_SPACE, Title } from "@/components/ui";
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
import { CrewLogo, useCrewFocus } from "@/components/crew/shared";

const TABS = [
  { value: "feed", label: "Feed" },
  { value: "chat", label: "Chat" },
  { value: "board", label: "Ranks" },
  { value: "members", label: "Members" },
];

function DiscoverSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Row style={[styles.sheetTop, { paddingTop: Platform.OS === "android" ? insets.top + S.md : S.lg }]}>
          <Title size={22} style={{ flex: 1 }}>Find a crew</Title>
          <IconButton icon={X} onPress={onClose} label="Close" />
        </Row>
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <CrewDiscover onDone={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Switcher({ crews, activeId, onSelect }) {
  if (crews.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter, paddingBottom: S.md }}>
      {crews.map((c) => {
        const active = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[styles.chip, active && { borderColor: c.accent || C.accent, backgroundColor: `${c.accent || C.accent}1f` }]}
          >
            <CrewLogo crew={c} size={24} radius={8} />
            <Text style={[styles.chipText, active && { color: C.text }]} numberOfLines={1}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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

  if (myCrews.isPending) {
    return (
      <Screen tab scroll={false}>
        <Loading style={{ flex: 1, justifyContent: "center" }} />
      </Screen>
    );
  }

  if (!crews.length) {
    return (
      <Screen tab onRefresh={refresh} refreshing={refreshing}>
        <Title size={30} style={{ marginTop: S.md }}>Crew</Title>
        <CrewDiscover intro />
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

  const menuOptions = [
    { label: "Find a crew", icon: Compass, onPress: () => setDiscover(true) },
    { label: "Create a crew", icon: Plus, onPress: startCreate },
  ];

  const header = (
    <View>
      <Row style={styles.top}>
        <Title size={30} style={{ flex: 1 }}>Crew</Title>
        {crew ? <IconButton icon={Share2} onPress={() => shareInvite(crew)} label="Share invite code" /> : null}
        {crew ? <IconButton icon={Settings2} onPress={() => setSettings(true)} label="Crew settings" /> : null}
        <IconButton icon={Plus} onPress={() => setMenu(true)} label="More crews" />
      </Row>
      <Switcher crews={crews} activeId={activeId} onSelect={focus} />
    </View>
  );

  const sheets = (
    <>
      <ActionSheet
        visible={menu}
        title="More crews"
        subtitle={limits.data ? `In ${limits.data.joined} of ${limits.data.maxJoined} crews · own ${limits.data.owned} of ${limits.data.maxOwned}` : undefined}
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
          <Loading />
        )}
        {sheets}
      </Screen>
    );
  }

  const tabs = <Segment options={TABS} value={tab} onChange={setTab} style={{ marginHorizontal: S.gutter, marginBottom: S.md }} />;

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
        <View style={{ paddingHorizontal: S.gutter, paddingBottom: S.lg }}>
          <CrewHero crew={crew} />
        </View>
        <View style={{ backgroundColor: C.bg, paddingTop: S.xs }}>{tabs}</View>
        <View style={{ paddingHorizontal: S.gutter }}>
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
  sheetTop: { paddingHorizontal: S.gutter, paddingBottom: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, marginBottom: S.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 38, paddingLeft: 7, paddingRight: 14, borderRadius: 99, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, maxWidth: 220 },
  chipText: { color: C.textDim, fontSize: 13, fontWeight: "600", fontFamily: F.displayMedium, flexShrink: 1 },
});
