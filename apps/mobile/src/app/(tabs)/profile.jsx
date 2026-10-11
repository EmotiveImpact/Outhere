// Your profile: who you are, how you're doing, what you've earned.

import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Crown,
  Flame,
  Footprints,
  Gift,
  Lock,
  MapPin,
  Pencil,
  Route,
  Settings,
  Star,
  Swords,
  Trophy,
  Users,
} from "lucide-react-native";
import { useProfile, useRuns, useSettings, useWallet } from "@/data/hooks";
import { compactNumber, formatDuration, formatKm, formatNumber, formatPace, tierLabel, timeAgo } from "@/utils/format";
import {
  Body,
  Button,
  C,
  Card,
  EmptyState,
  F,
  IconButton,
  Label,
  ListRow,
  Loading,
  ProgressBar,
  R,
  Row,
  S,
  Screen,
  SectionHeader,
  StatTile,
  Title,
  TierBadge,
  tierColour,
} from "@/components/ui";
import { MeAvatar } from "@/components/profile/shared";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import StepHistory from "@/components/profile/StepHistory";

const BADGE_ICONS = { star: Star, flame: Flame, swords: Swords, trophy: Trophy, "map-pin": MapPin, users: Users, route: Route };

export default function ProfileScreen() {
  const router = useRouter();
  const profileQ = useProfile();
  const walletQ = useWallet();
  const runsQ = useRuns(5);
  const { data: settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const p = profileQ.data;
  const units = settings?.units || "km";

  const refresh = () => {
    profileQ.refetch();
    walletQ.refetch();
    runsQ.refetch();
  };

  const header = (
    <Row style={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.md, justifyContent: "space-between" }}>
      <Title size={26}>Profile</Title>
      <IconButton icon={Settings} label="Settings" onPress={() => router.push("/settings")} />
    </Row>
  );

  if (profileQ.isPending || !p) {
    return (
      <Screen tab header={header}>
        <Loading />
      </Screen>
    );
  }

  const { level } = p;
  const record = p.battleRecord;

  return (
    <Screen tab header={header} onRefresh={refresh} refreshing={profileQ.isRefetching}>
      {/* Identity */}
      <Card padding={S.xl}>
        <Row gap={S.lg}>
          <MeAvatar uri={p.avatar} name={p.name || p.username} colour={p.color || C.accent} size={84} />
          <View style={{ flex: 1 }}>
            <Row gap={S.sm}>
              <Title size={24} numberOfLines={1} style={{ flexShrink: 1 }}>
                {p.name || p.username}
              </Title>
              <TierBadge tier={p.tier} />
            </Row>
            <Body dim size={14}>
              @{p.username}
            </Body>
            <Row gap={4} style={{ marginTop: 4 }}>
              <MapPin size={13} color={C.textMute} />
              <Body mute size={13}>
                {[p.area, p.city].filter(Boolean).join(", ")}
              </Body>
            </Row>
          </View>
        </Row>
        {p.bio ? (
          <Body size={14} style={{ marginTop: S.lg }}>
            {p.bio}
          </Body>
        ) : null}

        <View style={{ marginTop: S.lg }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 15 }}>
              Level {level.level} <Text style={{ color: C.accent }}>{level.title}</Text>
            </Text>
            <Body mute size={12}>
              {formatNumber(level.xpIntoLevel)} / {formatNumber(level.xpForNext)} XP
            </Body>
          </Row>
          <ProgressBar value={level.progress} style={{ marginTop: S.sm }} />
        </View>

        <Row gap={S.lg} style={{ marginTop: S.lg }}>
          <Follow value={p.followersCount} label="Followers" />
          <Follow value={p.followingCount} label="Following" />
          <Follow value={p.crewsCount} label={p.crewsCount === 1 ? "Crew" : "Crews"} />
          <View style={{ flex: 1 }} />
          <Button title="Edit" icon={Pencil} size="sm" variant="secondary" onPress={() => setEditing(true)} />
        </Row>
      </Card>

      {/* Stats */}
      <SectionHeader title="Stats" />
      <Card highlight padding={S.lg}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Label>Outside score</Label>
            <Text style={{ color: C.accent, fontFamily: F.display, fontSize: 40, lineHeight: 44 }}>{formatNumber(p.outsideScore)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Row gap={4}>
              <Flame size={18} color={p.streak ? C.fire : C.textMute} />
              <Text style={{ color: C.text, fontFamily: F.display, fontSize: 24 }}>{p.streak}</Text>
            </Row>
            <Body mute size={12}>
              day streak · best {p.longestStreak}
            </Body>
          </View>
        </Row>
      </Card>
      <View style={{ gap: S.sm, marginTop: S.sm }}>
        <Row gap={S.sm}>
          <StatTile label="Total steps" value={compactNumber(p.totals.steps)} />
          <StatTile label="Distance" value={formatKm(p.totals.distance, units)} />
          <StatTile label="Runs" value={formatNumber(p.totals.runs)} />
        </Row>
        <Row gap={S.sm}>
          <StatTile label="Battles" value={`${record.wins}-${record.losses}-${record.draws}`} hint="W-L-D" />
          <StatTile label="Events" value={formatNumber(p.eventsAttended)} hint="checked in" />
          <StatTile label="This week" value={formatKm(p.week.distanceKm, units)} hint="walked" />
        </Row>
      </View>

      {/* Wallet */}
      <SectionHeader title="Wallet" />
      <Wallet wallet={walletQ.data} loading={walletQ.isPending} onRewards={() => router.push("/rewards")} />

      {/* Badges */}
      <SectionHeader title={`Badges  ${p.badges.filter((b) => b.earned).length}/${p.badges.length}`} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
        {p.badges.map((b) => (
          <Badge key={b.id} badge={b} />
        ))}
      </View>

      {/* Steps */}
      <SectionHeader title="Step history" />
      <StepHistory goal={p.dailyGoal || 10000} />

      {/* Runs */}
      <SectionHeader title="Recent runs" action="Start a run" onAction={() => router.push("/(tabs)/move")} />
      <Runs runs={runsQ.data} loading={runsQ.isPending} units={units} onStart={() => router.push("/(tabs)/move")} />

      {/* Membership */}
      <SectionHeader title="Membership" />
      <Card onPress={() => router.push("/membership")} padding={S.lg}>
        <Row gap={S.md}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" }}>
            <Crown size={20} color={p.tier === "free" ? C.accent : tierColour(p.tier)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 17 }}>OutHere {tierLabel(p.tier)}</Text>
            <Body dim size={13}>
              {p.tier === "free"
                ? "Go Pro for 1.2x XP, unlimited battles and more rewards."
                : p.tier === "pro"
                  ? p.blackEligible
                    ? "You've unlocked Black. Take a look."
                    : "Keep a 14 day streak to unlock Black."
                  : "Top tier. 1.5x XP and Black-only drops."}
            </Body>
          </View>
          <ChevronRight size={18} color={C.textMute} />
        </Row>
      </Card>

      <EditProfileSheet visible={editing} profile={p} onClose={() => setEditing(false)} />
    </Screen>
  );
}

const Follow = ({ value, label }) => (
  <View>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 18 }}>{compactNumber(value)}</Text>
    <Body mute size={12}>
      {label}
    </Body>
  </View>
);

function Wallet({ wallet, loading, onRewards }) {
  if (loading || !wallet) return <Loading />;
  const recent = wallet.transactions.slice(0, 4);
  return (
    <Card padding={0}>
      <Row style={{ padding: S.lg }}>
        <View style={{ flex: 1 }}>
          <Label>XP</Label>
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 28 }}>{formatNumber(wallet.xp)}</Text>
        </View>
        <View style={{ width: 1, alignSelf: "stretch", backgroundColor: C.border, marginHorizontal: S.lg }} />
        <View style={{ flex: 1 }}>
          <Label>OUT</Label>
          <Text style={{ color: C.accent, fontFamily: F.display, fontSize: 28 }}>{formatNumber(wallet.out)}</Text>
        </View>
      </Row>
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: S.lg }}>
        {recent.length ? (
          recent.map((t) => (
            <Row key={t.id} style={{ paddingVertical: S.md, justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {t.label}
                </Text>
                <Body mute size={12}>
                  {timeAgo(t.at)}
                </Body>
              </View>
              <Text style={{ color: t.amount < 0 ? C.danger : t.type === "out" ? C.accent : C.text, fontFamily: F.displayMedium, fontSize: 15 }}>
                {t.amount > 0 ? "+" : ""}
                {formatNumber(t.amount)} {t.type.toUpperCase()}
              </Text>
            </Row>
          ))
        ) : (
          <Body mute size={13} style={{ paddingVertical: S.lg }}>
            Nothing yet. Steps, streaks and battles all pay out here.
          </Body>
        )}
      </View>
      <View style={{ padding: S.lg, paddingTop: 0 }}>
        <Button title="Spend OUT on rewards" icon={Gift} variant="secondary" full onPress={onRewards} />
      </View>
    </Card>
  );
}

function Badge({ badge: b }) {
  const Icon = BADGE_ICONS[b.icon] || Star;
  return (
    <View
      style={{
        width: "31.5%",
        flexGrow: 1,
        alignItems: "center",
        padding: S.md,
        borderRadius: R.md,
        borderWidth: 1,
        borderColor: b.earned ? "rgba(0,255,127,0.3)" : C.border,
        backgroundColor: b.earned ? "#0f1a14" : C.surface,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: b.earned ? C.accentDim : C.surfaceHigh }}>
        {b.earned ? <Icon size={20} color={C.accent} /> : <Lock size={16} color={C.textMute} />}
      </View>
      <Text style={{ color: b.earned ? C.text : C.textDim, fontSize: 12, fontWeight: "700", marginTop: S.sm, textAlign: "center" }} numberOfLines={1}>
        {b.title}
      </Text>
      <Text style={{ color: C.textMute, fontSize: 10, marginTop: 2, textAlign: "center" }} numberOfLines={2}>
        {b.description}
      </Text>
    </View>
  );
}

function Runs({ runs, loading, units, onStart }) {
  if (loading) return <Loading />;
  if (!runs?.length) return <EmptyState icon={Footprints} title="No runs yet" body="Track a run or walk from the Move tab and it'll show here." action="Start a run" onAction={onStart} />;
  return (
    <Card padding={0} style={{ paddingHorizontal: S.lg }}>
      {runs.map((r, i) => (
        <ListRow
          key={r.id}
          style={i ? { borderTopWidth: 1, borderTopColor: C.border } : null}
          leading={
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" }}>
              <Route size={18} color={C.accent} />
            </View>
          }
          title={r.title}
          subtitle={`${timeAgo(r.startedAt)} · ${formatDuration(r.durationSec)} · ${formatPace(r.paceSecPerKm)} /km`}
          trailing={<Text style={{ color: C.text, fontFamily: F.display, fontSize: 17 }}>{formatKm(r.distanceKm, units, 2)}</Text>}
        />
      ))}
    </Card>
  );
}
