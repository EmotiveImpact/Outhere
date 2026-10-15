// Crew tab. No crew yet: three ways in (a code, crews near you, your own),
// with the run clubs near you underneath. In a crew: Leaderboard, Feed,
// Chat, Challenges and Stats, each with its own header. The crew's rank is
// in its own city, so nothing here assumes London.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BadgeCheck, ChevronsRight, Compass, Inbox, Lock, Plus, Search, Settings2, Share2, Trophy, UserPlus, Users } from "lucide-react-native";
import { PHOTOS } from "@/constants/photos";
import { Body, C, EmptyState, F, Hero, IconButton, PhotoBackground, PressableScale, Row, S, Screen, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { useCrew, useCrewGoal, useCrewHeader, useCrewLimits, useCrewStats, useCrewUnread, useCrewsNear, useJoinRequests, useMyCrews, useUpgradePrompt } from "@/data/hooks";
import { CREW_PHOTOS } from "@/data/seedCrew";
import { tierLabel } from "@/utils/format";
import ActionSheet from "@/components/crew/ActionSheet";
import ClubFinder from "@/components/clubs/ClubFinder";
import CrewChallenges from "@/components/crew/CrewChallenges";
import CrewChat from "@/components/crew/CrewChat";
import CrewFeed from "@/components/crew/CrewFeed";
import { BellButton, CrewBar, CrewSlab, FeedHead, MoreButton, twoTone } from "@/components/crew/CrewHead";
import CrewRace from "@/components/crew/CrewRace";
import CrewStats from "@/components/crew/CrewStats";
import UnderlineTabs from "@/components/crew/UnderlineTabs";
import { shareInvite, useCrewFocus } from "@/components/crew/shared";
import { Surface } from "@/components/ui/Surface";

const TAB_KEYS = ["board", "feed", "chat", "challenges", "stats"];
// .r11ph::after: dark at the top, clear, then into the floor
const FIND_FADE = [[0, 0.45], [0.22, 0], [0.48, 0], [0.78, 0.7], [1, 1]];

function useStartCrew() {
  const router = useRouter();
  const limits = useCrewLimits();
  const openUpgrade = useUpgradePrompt((s) => s.open);
  return () => {
    const l = limits.data;
    if (l && !l.canCreate) {
      openUpgrade(l.maxOwned === 0 ? "pro" : "black", l.maxOwned === 0 ? "Starting a crew is a Pro feature." : `You already own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}.`);
      return;
    }
    router.push("/crew/create");
  };
}

/** .card.eopt: a lit row, the icon in a blue tinted circle; the suggested one ringed in blue. */
function WayIn({ icon: Icon, title, sub, onPress, highlight }) {
  return (
    <Surface onPress={onPress} radius={20} padding={null} style={highlight ? styles.wayOn : null} contentStyle={styles.way} accessibilityLabel={title}>
      <View style={styles.wayIcon}>
        <Icon size={16} color={C.accentHi} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.wayTitle}>{title}</Text>
        <Text style={styles.waySub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View>
        <ChevronsRight size={16} color={C.textDim} />
      </View>
    </Surface>
  );
}

/** Running solo: three ways in rather than an empty page. */
function NoCrew({ refresh, refreshing }) {
  const router = useRouter();
  const near = useCrewsNear();
  const start = useStartCrew();
  const scroll = useRef(null);
  const [finderY, setFinderY] = useState(0);
  const [searching, setSearching] = useState(false);
  const count = near.data?.length || 0;
  const closest = near.data?.length ? Math.max(...near.data.map((c) => c.awayKm || 0)) : 0;
  return (
    <Screen tab scroll={false} padded={false} style={{ paddingTop: 0 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      >
        {/* .slab 300: the podium with its star, waiting for a crew to stand on it */}
        <Hero object={PHOTOS.podium} objectSize={240} objectStyle={{ right: -34 }} kicker="Crew" top="Running solo" bottom="for now" sub="Crews share a weekly goal, a chat and the Area Cup." height={286} />
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
          <WayIn icon={Lock} title="Join with a code" sub="A friend sent you six letters" onPress={() => router.push("/crew/join")} />
          <WayIn
            icon={Compass}
            title="Find crews near you"
            sub={count ? `${count} ${count === 1 ? "crew" : "crews"}${closest ? ` within ${Math.ceil(closest)} km` : " in your city"}` : "Run clubs in your city"}
            highlight
            onPress={() => scroll.current?.scrollTo({ y: finderY, animated: true })}
          />
          <WayIn icon={Plus} title="Start your own" sub="Invite friends, set a goal" onPress={start} />
        </View>
        {/* clubFind: the photo band, then the clubs */}
        <View onLayout={(e) => setFinderY(e.nativeEvent.layout.y)} style={{ marginTop: S.xl }}>
          <View style={styles.findBand}>
            <PhotoBackground source={PHOTOS.clubfind} fade={FIND_FADE} focus={{ x: 0.5, y: 0.4 }} glow={false} grain={0.05} />
            <PressableScale onPress={() => setSearching((v) => !v)} scaleTo={0.9} hitSlop={8} style={styles.findSearch} accessibilityLabel="Search clubs">
              <View>
                <Search size={18} color="#fff" />
              </View>
            </PressableScale>
            <Text style={styles.findKick}>Real clubs, near you</Text>
            <Text style={styles.findTitle}>Find your</Text>
            <Text style={[styles.findTitle, styles.findBlue]}>run club</Text>
          </View>
          <View style={{ paddingHorizontal: S.gutter, marginTop: -4 }}>
            <ClubFinder searchOpen={searching} onCloseSearch={() => setSearching(false)} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CrewSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      <Skeleton height={280} radius={30} />
      <View style={{ paddingHorizontal: S.gutter, gap: S.md }}>
        <Skeleton height={36} radius={10} />
        <Skeleton height={260} radius={20} />
      </View>
    </View>
  );
}

export default function CrewTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myCrews = useMyCrews();
  const focusedId = useCrewFocus((s) => s.crewId);
  const focus = useCrewFocus((s) => s.focus);
  const [tab, setTab] = useState("board");
  const [menu, setMenu] = useState(false);
  const start = useStartCrew();

  // ?crew= and ?tab= links (notifications, other screens) open that crew and tab.
  useEffect(() => {
    if (params.crew) focus(String(params.crew));
    if (params.tab && TAB_KEYS.includes(String(params.tab))) setTab(String(params.tab));
  }, [params.crew, params.tab, focus]);

  const crews = useMemo(() => myCrews.data || [], [myCrews.data]);
  const activeId = crews.some((c) => c.id === focusedId) ? focusedId : crews[0]?.id;
  const crewQuery = useCrew(activeId);
  const crew = crewQuery.data && crewQuery.data.id === activeId && crewQuery.data.isMember ? crewQuery.data : null;
  const header = useCrewHeader(crew?.id);
  const goal = useCrewGoal(tab === "challenges" ? crew?.id : null);
  const stats = useCrewStats(tab === "stats" ? crew?.id : null);
  const unread = useCrewUnread(crew?.id);
  const staff = crew && (crew.myRole === "owner" || crew.myRole === "admin");
  const requests = useJoinRequests(crew?.id, !!staff);

  const refreshing = myCrews.isRefetching || crewQuery.isRefetching;
  const refresh = () => {
    myCrews.refetch();
    crewQuery.refetch();
    header.refetch();
  };

  if (myCrews.isPending) {
    return (
      <Screen tab scroll={false} padded={false} style={{ paddingTop: 0 }}>
        <CrewSkeleton />
      </Screen>
    );
  }

  if (!crews.length) return <NoCrew refresh={refresh} refreshing={refreshing} />;

  if (!crew) {
    return (
      <Screen tab scroll={false} padded={false} style={{ paddingTop: 0 }}>
        {crewQuery.isError ? <EmptyState title="Couldn't load this crew" body="Pull down or pick another crew." action="Try again" onAction={refresh} style={{ marginTop: 120 }} /> : <CrewSkeleton />}
      </Screen>
    );
  }

  const h = header.data;
  const asks = requests.data?.length || 0;
  const menuOptions = [
    { label: "Invite people", hint: crew.inviteCode ? `Code ${crew.inviteCode}` : undefined, icon: UserPlus, onPress: () => shareInvite(crew) },
    staff ? { label: "Crew settings", hint: "Who can join, weekly goal, chat and roles", icon: Settings2, onPress: () => router.push(`/crew/settings/${crew.id}`) } : null,
    staff && (asks || crew.joinPolicy === "request") ? { label: "Join requests", hint: asks ? `${asks} waiting` : "Nobody waiting", icon: Inbox, onPress: () => router.push(`/crew/requests/${crew.id}`) } : null,
    { label: "Club page", hint: "Runs, fixtures and members", icon: Users, onPress: () => router.push(`/crew/${crew.id}`) },
    { label: `${h?.city || crew.city} leaderboard`, hint: "People, crews and areas", icon: Trophy, onPress: () => router.push("/crew/board") },
    ...crews.filter((c) => c.id !== crew.id).map((c) => ({ label: `Switch to ${c.name}`, icon: ChevronsRight, onPress: () => focus(c.id) })),
    { label: "Find more crews", hint: "Join with a code or one near you", icon: Compass, onPress: () => router.push("/crew/join") },
    { label: "Start your own", icon: Plus, onPress: start },
    { label: "Claim your club", hint: "For organisers of a real run club", icon: BadgeCheck, onPress: () => router.push("/clubs/claim") },
    !staff ? { label: "Crew settings", hint: "Leave the crew", icon: Settings2, onPress: () => router.push(`/crew/settings/${crew.id}`) } : null,
  ].filter(Boolean);

  const more = <MoreButton onPress={() => setMenu(true)} />;
  const tabs = (
    <View style={{ backgroundColor: C.bg }}>
      <UnderlineTabs
        options={[
          { value: "board", label: "Leaderboard" },
          { value: "feed", label: "Feed" },
          { value: "chat", label: "Chat", badge: tab === "chat" ? 0 : unread.data || 0 },
          { value: "challenges", label: "Challenges" },
          { value: "stats", label: "Stats" },
        ]}
        value={tab}
        onChange={setTab}
      />
    </View>
  );
  const sheet = <ActionSheet visible={menu} title={crew.name} subtitle={h ? `${h.memberCount} members · ${h.city}` : undefined} options={menuOptions} onClose={() => setMenu(false)} />;

  if (tab === "chat") {
    return (
      <Screen tab scroll={false} padded={false}>
        <CrewBar crew={crew} header={h} right={more} />
        {tabs}
        <CrewChat key={crew.id} crew={crew} />
        {sheet}
      </Screen>
    );
  }

  const [top, bottom] = twoTone(crew.name);
  let head;
  if (tab === "board") {
    head = (
      <CrewSlab
        kicker={h ? `Crew · #${h.cityRank} in ${h.city}` : "Crew"}
        top={top}
        bottom={bottom}
        sub={h ? `${h.memberCount} members · ${h.outNow} out right now` : " "}
        object={PHOTOS.podium}
        objectSize={186}
        objectStyle={{ right: -18 }}
        right={more}
      />
    );
  } else if (tab === "challenges") {
    const g = goal.data;
    head = <CrewSlab kicker={g ? `Crew goal · ${g.daysLeft} ${g.daysLeft === 1 ? "day" : "days"} left` : "Crew goal"} top={`${(g?.goalKm ?? crew.weeklyGoalKm ?? 100).toLocaleString("en-GB")} km`} bottom="together" photo={PHOTOS.crew} height={210} right={more} />;
  } else if (tab === "stats") {
    const st = stats.data;
    const share = () =>
      st &&
      Share.share({ message: `${crew.name} ran ${st.monthKm.toLocaleString("en-GB")} km together in ${st.monthLabel}. ${st.runs} runs, all on Outhere.` }).catch(() => {});
    head = (
      <CrewSlab
        kicker={st ? `${st.monthLabel} so far` : "This month"}
        top={st ? `${st.monthKm.toLocaleString("en-GB")} km` : " "}
        bottom="as a crew"
        object={CREW_PHOTOS.bars}
        height={230}
        right={
          <>
            <IconButton icon={Share2} label="Share the month" onPress={share} />
            {more}
          </>
        }
      />
    );
  } else {
    head = (
      <FeedHead
        crew={crew}
        right={
          <>
            <BellButton />
            {more}
          </>
        }
      />
    );
  }

  const slab = tab !== "feed";
  return (
    <Screen tab scroll={false} padded={false} style={slab ? { paddingTop: 0 } : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 20 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      >
        <View key={`${crew.id}:${tab}:head`}>{head}</View>
        {tabs}
        <View key={`${crew.id}:${tab}`}>
          {tab === "board" ? <CrewRace crew={crew} /> : null}
          {tab === "feed" ? <CrewFeed crew={crew} /> : null}
          {tab === "challenges" ? <CrewChallenges crew={crew} /> : null}
          {tab === "stats" ? <CrewStats crew={crew} /> : null}
        </View>
      </ScrollView>
      {sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  way: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 13, paddingBottom: 13, paddingLeft: 14, paddingRight: 14 },
  wayOn: { borderRadius: 20, boxShadow: "0 0 0 1.5px #3d8bff, 0 0 22px -8px rgba(61,139,255,0.8)" },
  wayIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center" },
  wayTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  waySub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  section: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase", marginBottom: S.md },
  findBand: { height: 300, justifyContent: "flex-end", paddingHorizontal: S.gutter, paddingBottom: 22 },
  findSearch: { position: "absolute", top: 14, right: S.gutter, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  findKick: { color: "#9cc4ff", fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 8 },
  findTitle: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 42, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  findBlue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
});
