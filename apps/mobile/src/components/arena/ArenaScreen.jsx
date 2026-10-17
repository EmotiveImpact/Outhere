// Outside > Arena. The season is the hero, your live battle reads like a
// scoreboard, three challenge rings (See all opens Challenges), the doors to
// everything else in the Arena, your battles, then the rankings.

import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import Svg, { Circle } from "react-native-svg";
import { Dices, EyeOff, Hexagon, Layers, Shield, Swords, Trophy } from "@/components/ui/icons";
import { PHOTOS } from "@/constants/photos";
import { useArenaNow, useBattles, useCallUp, useChallenges, useLeaderboard, usePicks, usePlaySide } from "@/data/hooks";
import { Avatar, Body, C, EmptyState, F, IconTile, PressableScale, R, Row, S, Segment, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { formatNumber } from "@/utils/format";
import BattlesHub from "./BattlesHub";
import { LeaderRow, MetricChips, Podium } from "./LeaderRow";
import { Bar, GlowHero, SectionLabel } from "./OutsideKit";
import { formatScore, useNow } from "./shared";

const SCOPES = [
  { value: "city", label: "City" },
  { value: "global", label: "Global" },
  { value: "friends", label: "Friends" },
];
const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "30 days" },
];

export const leftLabel = (ms) => {
  if (ms <= 0) return "Ending";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
};

/** A challenge as a ring you fill. */
export function ProgressRing({ value = 0, size = 76, stroke = 8, label, colour = C.accent }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1b1f26" strokeWidth={stroke} fill="none" />
        {/* the arc's glow (drop-shadow 0 0 5px var(--glow)) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colour}
          strokeOpacity={0.22}
          strokeWidth={stroke + 6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colour}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringText}>{label}</Text>
    </View>
  );
}

function LiveScoreboard({ battle, now }) {
  const router = useRouter();
  if (!battle) return null;
  const mine = battle.me.value || 0;
  const theirs = battle.opponent.value || 0;
  const share = mine + theirs > 0 ? mine / (mine + theirs) : 0.5;
  const gap = Math.abs(mine - theirs);
  const lead = battle.leader === "me" ? "you lead by" : battle.leader ? `${battle.opponent.player?.name} leads by` : "dead level";
  return (
    <Surface onPress={() => router.push(`/battles/${battle.id}`)} pressScale={0.98} radius={20} padding={null} contentStyle={styles.board}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={10}>
          <Avatar uri={battle.me.player?.avatar} runner={battle?.me?.player?.runner} runnerFigure={battle?.me?.player?.runnerFigure} name={battle.me.player?.name} tier={battle.me.player?.tier} size={44} />
          <View>
            <Text style={styles.boardNum}>{formatScore(battle.metric, mine)}</Text>
            <Text style={styles.boardWho}>You</Text>
          </View>
        </Row>
        <View style={styles.vs}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <Row gap={10}>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.boardNum}>{formatScore(battle.metric, theirs)}</Text>
            <Text style={styles.boardWho}>{battle.opponent.player?.name}</Text>
          </View>
          <Avatar uri={battle.opponent.player?.avatar} name={battle.opponent.player?.name} tier={battle.opponent.player?.tier} size={44} />
        </Row>
      </Row>
      <Bar value={share} style={{ marginTop: S.md }} height={7} />
      <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
        <Text style={styles.boardFoot}>
          Live battle · {lead}
          {battle.leader ? <Text style={{ color: C.accent, fontFamily: F.bodySemi }}> {formatScore(battle.metric, gap)}</Text> : null}
        </Text>
        <Text style={styles.boardFoot}>{battle.endAt ? leftLabel(battle.endAt - now) : ""}</Text>
      </Row>
    </Surface>
  );
}

function ChallengeRings() {
  const router = useRouter();
  const { data, isPending } = useChallenges();
  const list = (data || []).filter((c) => c.status !== "upcoming").slice(0, 3);
  if (isPending) return <Skeleton height={150} radius={20} />;
  if (!list.length) return null;
  return (
    <Row gap={S.sm} style={{ alignItems: "stretch" }}>
      {list.map((c) => {
        const pct = Math.round((c.percent || 0) * 100);
        const reward = c.rewardOut && c.period !== "day" ? `+${c.rewardOut} OUT` : `+${c.rewardXp} XP`;
        return (
          <Surface key={c.id} onPress={() => router.push("/outside/challenges")} pressScale={0.96} radius={20} padding={null} style={{ flex: 1 }} contentStyle={styles.ringCard}>
            <ProgressRing value={c.percent} label={`${pct}%`} size={66} stroke={7} />
            <Text style={styles.ringTitle} numberOfLines={1}>
              {c.title}
            </Text>
            <Text style={styles.ringReward}>{reward}</Text>
          </Surface>
        );
      })}
    </Row>
  );
}

const DOORS = [
  { key: "swipe", label: "Find a rival", sub: "Swipe fair matches", icon: Layers, href: "/swipe" },
  { key: "mystery", label: "Mystery", sub: "A random challenger", icon: Dices, href: "/swipe/mystery" },
  { key: "create", label: "Quick 1v1", sub: "Put OUT on it", icon: Swords, href: "/battles/create" },
  { key: "cities", label: "City League", sub: "City v city", icon: Shield, href: "/cities" },
  { key: "map", label: "Area Cup", sub: "The map this week", icon: Hexagon, href: "/cities/map" },
  { key: "season", label: "Season", sub: "Results and rewards", icon: Trophy, href: "/battles/season" },
];

function Doors() {
  const router = useRouter();
  const { data: picks } = usePicks();
  const { data: callUp } = useCallUp();
  const side = usePlaySide().data;
  // Three to a row; each cell holds the width so the press animation can't squash it.
  return (
    <View style={styles.doors}>
      {DOORS.map((d) => {
        const Icon = d.icon;
        const badge = d.key === "swipe" && picks?.length ? `${picks.length}` : d.key === "cities" && callUp && !callUp.answer ? "!" : null;
        const label = d.key === "map" && side?.cityId === "london" ? "Borough Cup" : d.label;
        return (
          <View key={d.key} style={styles.doorCell}>
          <Surface onPress={() => router.push(d.href)} pressScale={0.95} radius={R.md} padding={S.md} style={{ flex: 1 }}>
            <View style={styles.doorIcon}>
              <IconTile icon={Icon} size={34} radius={11} iconSize={18} />
              {badge ? (
                <View style={styles.doorBadge}>
                  <Text style={styles.doorBadgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.doorLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.doorSub} numberOfLines={1}>
              {d.sub}
            </Text>
          </Surface>
          </View>
        );
      })}
    </View>
  );
}

function CallUpBanner() {
  const router = useRouter();
  const { data: call } = useCallUp();
  if (!call || call.answer) return null;
  return (
    <Surface tone="blue" onPress={() => router.push("/cities/called-up")} pressScale={0.98} radius={R.lg} padding={S.md} style={{ marginTop: S.md }} contentStyle={styles.callUp}>
      <View style={styles.callUpNum}>
        <Text style={styles.callUpNumText}>#{call.number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.callUpTitle}>You've been called up</Text>
        <Text style={styles.callUpSub}>
          {call.home} vs {call.away} · Saturday
        </Text>
      </View>
    </Surface>
  );
}

function Rankings() {
  const router = useRouter();
  const [scope, setScope] = useState("city");
  const [period, setPeriod] = useState("week");
  const [metric, setMetric] = useState("steps");
  const board = useLeaderboard({ scope, period, metric });
  const data = board.data;
  const entries = data?.entries || [];
  const timeless = metric === "xp" || metric === "streak";
  const podium = entries.length >= 3 && scope !== "friends" ? entries.slice(0, 3) : [];
  const rows = entries.slice(podium.length).slice(0, 25);
  const openPlayer = (entry) => router.push(entry.isMe ? "/(tabs)/profile" : `/player/${entry.player.id}`);
  return (
    <View>
      <SectionLabel>Rankings</SectionLabel>
      <Segment options={SCOPES} value={scope} onChange={setScope} />
      <MetricChips value={metric} onChange={setMetric} style={{ marginTop: S.md }} />
      {!timeless ? (
        <Row gap={S.lg} style={{ marginTop: S.lg, paddingHorizontal: 2 }}>
          {PERIODS.map((p) => {
            const active = p.value === period;
            return (
              <PressableScale key={p.value} onPress={() => setPeriod(p.value)} scaleTo={0.94} style={[styles.period, active && styles.periodActive]}>
                <Text style={[styles.periodText, active && { color: C.text }]}>{p.label}</Text>
              </PressableScale>
            );
          })}
        </Row>
      ) : null}
      {data?.hiddenMe ? (
        <PressableScale onPress={() => router.push("/settings")} style={styles.notice}>
          <EyeOff size={16} color={C.textDim} />
          <Body dim size={13} style={{ flex: 1 }}>
            You're hidden from rankings. Change it in Settings.
          </Body>
        </PressableScale>
      ) : null}
      <View style={{ marginTop: S.xl }}>
        {board.isPending ? (
          <Skeleton height={240} radius={20} />
        ) : !entries.length ? (
          <EmptyState title="Nobody here yet" body="Rankings fill up as people move. Check back soon." />
        ) : (
          <MotiView key={`${scope}-${period}-${metric}`} from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220 }}>
            {podium.length ? <Podium entries={podium} metric={metric} onPress={openPlayer} /> : null}
            <View style={{ gap: 2 }}>
              {rows.map((entry) => (
                <LeaderRow key={entry.player.id} entry={entry} metric={metric} onPress={openPlayer} />
              ))}
            </View>
          </MotiView>
        )}
      </View>
    </View>
  );
}

export default function ArenaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow(30 * 1000);
  const arena = useArenaNow();
  const battles = useBattles();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("arena");
  const a = arena.data;
  const live = (battles.data || []).filter((b) => b.status === "active" && b.phase === "live" && !b.timed).sort((x, y) => (x.endAt || 0) - (y.endAt || 0));

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={arena.isRefetching} onRefresh={() => { arena.refetch(); battles.refetch(); }} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
    >
      <GlowHero
        object={PHOTOS.trophy}
        objectSize={270}
        objectStyle={{ right: -34, top: insets.top + 38 }}
        height={342}
        kicker={a ? `${a.name} · Week ${a.week}` : "The Arena"}
        top="The"
        bottom="Arena"
        sub={a ? `${formatNumber(a.outside)} outside · ${formatNumber(a.battlesLive)} battles live` : " "}
      />

      <View style={{ paddingHorizontal: S.gutter }}>
        <View style={{ marginTop: S.lg }}>
          <LiveScoreboard battle={live[0]} now={now} />
        </View>
        <CallUpBanner />

        <SectionLabel right="See all »" onRight={() => router.push("/outside/challenges")}>
          Challenges
        </SectionLabel>
        <ChallengeRings />

        <SectionLabel>In the Arena</SectionLabel>
        <Doors />

        <BattlesHub />
        <Rankings />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  board: { paddingVertical: 14, paddingHorizontal: 16 },
  boardNum: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28 },
  boardWho: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  boardFoot: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  vs: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1b1f26", alignItems: "center", justifyContent: "center" },
  vsText: { color: C.textDim, fontFamily: F.display, fontSize: 13 },
  ringCard: { alignItems: "center", paddingTop: 14, paddingBottom: 12, paddingHorizontal: 6 },
  ringText: { color: C.text, fontFamily: F.display, fontSize: 19 },
  ringTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: S.md },
  ringReward: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  doors: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  doorCell: { flexBasis: "30%", flexGrow: 1 },
  doorIcon: { width: 34, height: 34, marginBottom: S.sm },
  doorBadge: { position: "absolute", top: -5, right: -7, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: C.surface },
  doorBadgeText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10 },
  doorLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  doorSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  callUp: { flexDirection: "row", alignItems: "center", gap: S.md },
  callUpNum: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  callUpNumText: { color: C.accentHi, fontFamily: F.display, fontSize: 18 },
  callUpTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  callUpSub: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  period: { minHeight: 32, justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent" },
  periodActive: { borderColor: C.text },
  periodText: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 15 },
  notice: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg, padding: S.md, borderRadius: R.md, backgroundColor: C.surface },
});
