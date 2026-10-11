// Rewards: spend OUT on partner perks. Shows balance, the weekly redemption
// allowance for your plan, the catalogue and the codes you've unlocked.

import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, Gift, Lock, Ticket } from "lucide-react-native";
import { engine, useEngineMutation, useProfile, useRedemptions, useRewards } from "@/data/hooks";
import { hapticSuccess } from "@/services/haptics";
import { formatNumber, timeAgo } from "@/utils/format";
import { Body, Button, C, Card, EmptyState, F, Header, Label, Loading, Pill, ProgressBar, R, Row, S, Screen, SectionHeader, Title } from "@/components/ui";

const expiryLabel = (ms) => new Date(Number(ms)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function RewardsScreen() {
  const router = useRouter();
  const rewardsQ = useRewards();
  const redemptionsQ = useRedemptions();
  const { data: profile } = useProfile();
  const [category, setCategory] = useState("All");
  const [result, setResult] = useState(null);

  const redeem = useEngineMutation(engine.redeemReward, {
    onSuccess: (redemption) => {
      hapticSuccess();
      setResult(redemption);
    },
  });

  const data = rewardsQ.data;
  const categories = useMemo(() => ["All", ...new Set((data?.rewards || []).map((r) => r.category))], [data]);
  const list = (data?.rewards || []).filter((r) => category === "All" || r.category === category);

  const confirm = (r) => {
    Alert.alert(`Redeem ${r.title}?`, `This uses ${r.costOut} OUT and 1 of your weekly rewards. You'll get a code from ${r.partner}.`, [
      { text: "Not now", style: "cancel" },
      { text: `Spend ${r.costOut} OUT`, onPress: () => redeem.mutate(r.id) },
    ]);
  };

  // Tier and weekly-limit locks go through the engine so the upgrade sheet opens.
  const onLocked = (r) => {
    if (r.lockedReason?.endsWith("to go")) {
      Alert.alert("Not enough OUT yet", `You need ${r.lockedReason}. Walk, keep your streak and win battles to earn more.`);
      return;
    }
    redeem.mutate(r.id);
  };

  const refresh = () => {
    rewardsQ.refetch();
    redemptionsQ.refetch();
  };

  return (
    <Screen header={<Header back title="Rewards" />} onRefresh={refresh} refreshing={rewardsQ.isRefetching}>
      {rewardsQ.isPending ? (
        <Loading />
      ) : !data ? (
        <EmptyState icon={Gift} title="Rewards unavailable" body="Set up your profile to start earning OUT." />
      ) : (
        <>
          <BalanceCard data={data} tier={profile?.tier} onUpgrade={() => router.push("/membership")} />

          <SectionHeader title="Spend your OUT" />
          <Row gap={S.sm} style={{ flexWrap: "wrap", marginBottom: S.lg }}>
            {categories.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{ paddingHorizontal: 14, height: 34, borderRadius: R.full, justifyContent: "center", borderWidth: 1, borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accentDim : C.surface }}
                >
                  <Text style={{ color: active ? C.accent : C.textDim, fontSize: 13, fontWeight: "600" }}>{c}</Text>
                </Pressable>
              );
            })}
          </Row>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.md }}>
            {list.map((r) => (
              <RewardCard key={r.id} reward={r} busy={redeem.isPending && redeem.variables === r.id} onRedeem={() => confirm(r)} onLocked={() => onLocked(r)} />
            ))}
          </View>

          <SectionHeader title="Your codes" />
          <Codes items={redemptionsQ.data || []} loading={redemptionsQ.isPending} onOpen={setResult} />
        </>
      )}
      <ResultSheet redemption={result} onClose={() => setResult(null)} />
    </Screen>
  );
}

function BalanceCard({ data, tier, onUpgrade }) {
  const { balance, weeklyLimit, usedThisWeek } = data;
  const left = Math.max(0, weeklyLimit - usedThisWeek);
  return (
    <Card padding={S.xl} highlight>
      <Label>OUT balance</Label>
      <Row gap={S.sm} style={{ alignItems: "flex-end", marginTop: S.xs }}>
        <Text style={{ color: C.accent, fontFamily: F.display, fontSize: 48, lineHeight: 52 }}>{formatNumber(balance)}</Text>
        <Text style={{ color: C.textDim, fontFamily: F.displayMedium, fontSize: 18, marginBottom: 8 }}>OUT</Text>
      </Row>
      <View style={{ height: 1, backgroundColor: C.border, marginVertical: S.lg }} />
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: C.text, fontWeight: "600" }}>This week</Text>
        <Text style={{ color: C.textDim }}>
          {usedThisWeek} of {weeklyLimit} used
        </Text>
      </Row>
      <ProgressBar value={weeklyLimit ? usedThisWeek / weeklyLimit : 0} style={{ marginTop: S.sm }} colour={left ? C.accent : C.warn} />
      <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
        <Body mute size={12}>
          {left ? `${left} reward${left === 1 ? "" : "s"} left. Resets on a rolling 7 days.` : "Weekly limit reached."}
        </Body>
        {tier !== "black" ? (
          <Pressable onPress={onUpgrade} hitSlop={8}>
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>Get more</Text>
          </Pressable>
        ) : null}
      </Row>
    </Card>
  );
}

function RewardCard({ reward: r, onRedeem, onLocked, busy }) {
  const tierLocked = r.lockedReason && /only$/.test(r.lockedReason);
  return (
    <View style={{ width: "48%", flexGrow: 1, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
      <View>
        <Image source={{ uri: r.image }} style={{ width: "100%", height: 104, opacity: tierLocked ? 0.45 : 1 }} contentFit="cover" transition={200} />
        <View style={{ position: "absolute", top: S.sm, left: S.sm }}>
          {r.tierRequired !== "free" ? <Pill label={r.tierRequired === "black" ? "BLACK" : "PRO"} tone={r.tierRequired} icon={tierLocked ? Lock : undefined} /> : null}
        </View>
      </View>
      <View style={{ padding: S.md, flex: 1 }}>
        <Label style={{ fontSize: 10 }}>{r.partner}</Label>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", marginTop: 4 }} numberOfLines={2}>
          {r.title}
        </Text>
        <Body mute size={12} numberOfLines={2} style={{ marginTop: 2 }}>
          {r.description}
        </Body>
        <View style={{ flex: 1 }} />
        <Text style={{ color: C.accent, fontFamily: F.display, fontSize: 18, marginTop: S.sm }}>{r.costOut} OUT</Text>
        {r.canRedeem ? (
          <Button title="Redeem" size="sm" full loading={busy} onPress={onRedeem} style={{ marginTop: S.sm }} />
        ) : (
          <Button title={r.lockedReason} size="sm" variant="secondary" full onPress={onLocked} style={{ marginTop: S.sm }} />
        )}
      </View>
    </View>
  );
}

function Codes({ items, loading, onOpen }) {
  if (loading) return <Loading />;
  if (!items.length) return <EmptyState icon={Ticket} title="No codes yet" body="Redeem a reward and your code lands here." />;
  return (
    <Card padding={0}>
      {items.map((r, i) => {
        const expired = r.expiresAt < Date.now();
        return (
          <Pressable
            key={r.id}
            onPress={() => onOpen(r)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: expired ? C.surfaceHigh : C.accentDim, alignItems: "center", justifyContent: "center" }}>
              <Ticket size={18} color={expired ? C.textMute : C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "600" }} numberOfLines={1}>
                {r.title}
              </Text>
              <Body mute size={12}>
                {r.partner} · {expired ? "Expired" : `Expires ${expiryLabel(r.expiresAt)}`} · {timeAgo(r.at)}
              </Body>
            </View>
            <Text style={{ color: expired ? C.textMute : C.text, fontFamily: F.displayMedium, letterSpacing: 1 }}>{r.code}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}

function ResultSheet({ redemption, onClose }) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(redemption.code);
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Modal visible={!!redemption} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
      {redemption ? (
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderWidth: 1, borderColor: C.border, padding: S.xxl, paddingBottom: S.xxl + insets.bottom }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: S.lg }}>
            <Gift size={24} color={C.accent} />
          </View>
          <Title size={26}>{redemption.title}</Title>
          <Body dim style={{ marginTop: 4 }}>
            Show or enter this code at {redemption.partner}.
          </Body>
          <Pressable
            onPress={copy}
            style={{ marginTop: S.xl, height: 72, borderRadius: R.md, borderWidth: 1, borderStyle: "dashed", borderColor: C.accent, backgroundColor: C.accentDim, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.md }}
          >
            <Text style={{ color: C.accent, fontFamily: F.display, fontSize: 28, letterSpacing: 3 }}>{redemption.code}</Text>
            {copied ? <Check size={20} color={C.accent} /> : <Copy size={20} color={C.accent} />}
          </Pressable>
          <Body mute size={13} style={{ marginTop: S.sm, textAlign: "center" }}>
            {redemption.expiresAt < Date.now() ? "This code has expired." : `Valid until ${expiryLabel(redemption.expiresAt)}`}
          </Body>
          <Row gap={S.md} style={{ marginTop: S.xl }}>
            <Button title={copied ? "Copied" : "Copy code"} icon={copied ? Check : Copy} variant="secondary" onPress={copy} style={{ flex: 1 }} />
            <Button title="Done" onPress={onClose} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : null}
    </Modal>
  );
}
