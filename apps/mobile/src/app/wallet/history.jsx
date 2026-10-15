// OUT history: every OUT you earned or spent, grouped by day, from the
// ledger. All, Earned or Spent.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarCheck, Check, Flame, Footprints, Gift, Layers, Route, ShoppingBag, Swords, Target, Trophy, UserPlus, Zap } from "lucide-react-native";
import { useOutHistory } from "@/data/hooks";
import { C, Card, EmptyState, F, FadeIn, R, Row, S, Screen, Segment, Skeleton } from "@/components/ui";
import { IconWell, Slab } from "@/components/profile/parts";
import { formatNumber } from "@/utils/format";

const KIND = {
  run: { icon: Route, sub: "Run" },
  steps: { icon: Footprints, sub: "Steps" },
  active_day: { icon: CalendarCheck, sub: "Active day" },
  goal: { icon: Target, sub: "Daily goal" },
  checkin: { icon: Check, sub: "Check-in" },
  streak: { icon: Flame, sub: "Streak" },
  challenge: { icon: Check, sub: "Challenge" },
  battle: { icon: Swords, sub: "Battle" },
  battle_win: { icon: Swords, sub: "1v1 battle win" },
  battle_stake: { icon: Swords, sub: "Battle stake" },
  member_bonus: { icon: Layers, sub: "Membership bonus" },
  referral: { icon: UserPlus, sub: "Invite" },
  event: { icon: CalendarCheck, sub: "Event" },
  drop: { icon: ShoppingBag, sub: "Drop" },
  redeem: { icon: Gift, sub: "Reward" },
  welcome: { icon: Trophy, sub: "Welcome" },
};

const dayHeading = (ms) => {
  const d = new Date(ms);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
};

export default function OutHistory() {
  const router = useRouter();
  const { data: h, isPending, refetch, isRefetching } = useOutHistory();
  const [tab, setTab] = useState("all");

  const groups = useMemo(() => {
    const items = (h?.items || []).filter((t) => (tab === "earned" ? t.amount > 0 : tab === "spent" ? t.amount < 0 : true));
    const out = [];
    for (const t of items) {
      const key = dayHeading(t.at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(t);
      else out.push({ key, items: [t] });
    }
    return out;
  }, [h, tab]);

  const sub = h ? [`+${formatNumber(h.weekEarned)} this week`, h.spentOnDrops ? `${formatNumber(h.spentOnDrops)} spent on drops` : null].filter(Boolean).join(" · ") : " ";

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab kicker="OUT history" top={h ? `${formatNumber(h.balance)} OUT` : "OUT"} sub={sub} height={200} onBack={() => (router.canGoBack() ? router.back() : router.replace("/wallet"))} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
        <Segment
          options={[
            { value: "all", label: "All" },
            { value: "earned", label: "Earned" },
            { value: "spent", label: "Spent" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ marginTop: S.md }}>
          {isPending ? (
            <Skeleton height={320} radius={R.lg} />
          ) : !groups.length ? (
            <EmptyState
              icon={Zap}
              title={tab === "spent" ? "Nothing spent yet" : "No OUT yet"}
              body={tab === "spent" ? "Drops and rewards you claim with OUT show up here." : "Walk, run and win battles. Every OUT you earn shows up here."}
            />
          ) : (
            <Card padding={0} style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
              {groups.map((g, gi) => (
                <View key={g.key}>
                  <Text style={[styles.day, gi === 0 && { marginTop: S.md }]}>{g.key}</Text>
                  {g.items.map((t, i) => {
                    const k = KIND[t.reason] || { icon: Zap, sub: "OUT" };
                    const neg = t.amount < 0;
                    return (
                      <FadeIn key={t.id} index={Math.min(i, 6)}>
                        <Row gap={S.md} style={styles.row}>
                          <IconWell icon={k.icon} size={40} colour={neg ? C.textSoft : C.accentHi} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={1}>
                              {t.label}
                            </Text>
                            <Text style={styles.sub} numberOfLines={1}>
                              {t.heldUntil && t.heldUntil > Date.now() ? `${k.sub} · clears soon` : k.sub}
                            </Text>
                          </View>
                          <Text style={[styles.amount, neg && { color: C.text }]}>
                            {neg ? "−" : "+"}
                            {formatNumber(Math.abs(t.amount))}
                          </Text>
                        </Row>
                      </FadeIn>
                    );
                  })}
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", marginTop: S.lg, marginBottom: S.xs },
  row: { paddingVertical: 10 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 1 },
  amount: { color: C.accent, fontFamily: F.display, fontSize: 20 },
});
