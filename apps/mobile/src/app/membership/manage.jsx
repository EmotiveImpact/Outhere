// Manage membership: what your plan has earned you in extra OUT, the next
// payment, change plan, restore purchases and cancel.

import React from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Calendar, ChevronRight, Layers, Lock, RotateCcw } from "lucide-react-native";
import { engine, useEngineMutation, useMembershipDetails } from "@/data/hooks";
import { Body, Button, C, Card, F, FadeIn, PressableScale, R, Row, S, Screen, Skeleton, toast } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

const monthYear = (ms) => new Date(ms).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const shortDate = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ManageMembership() {
  const router = useRouter();
  const { data: m, isPending, refetch, isRefetching } = useMembershipDetails();
  const restore = useEngineMutation(engine.restorePurchases, { success: "Your membership is up to date" });
  const cancel = useEngineMutation(engine.cancelMembership, {
    onSuccess: async (r) => {
      if (r?.manageUrl) {
        await WebBrowser.openBrowserAsync(r.manageUrl);
        refetch();
        return;
      }
      toast.success("Membership cancelled", r?.membership?.endsAt ? `Your perks stay on until ${shortDate(r.membership.endsAt)}.` : undefined);
    },
  });

  if (isPending || !m) {
    return (
      <Screen>
        <Skeleton height={236} radius={R.lg} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  const plan = PLANS[m.tier] || PLANS.free;
  const free = m.tier === "free";
  const total = m.earned.base + m.earned.bonus;

  const confirmCancel = () => {
    const go = () => cancel.mutate([]);
    const msg = `You keep ${plan.name} until the end of what you've paid for. Your streak, badges and OUT stay yours.`;
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (typeof window !== "undefined" && window.confirm(msg)) go();
      return;
    }
    Alert.alert(`Cancel ${plan.name}?`, msg, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel membership", style: "destructive", onPress: go },
    ]);
  };

  const next = m.trialEndsAt
    ? `Trial ends ${shortDate(m.trialEndsAt)}${m.price ? ` · then ${m.price}` : ""}`
    : m.endsAt
      ? `Ends ${shortDate(m.endsAt)}`
      : m.renewsAt
        ? `${shortDate(m.renewsAt)}${m.price ? ` · ${m.price.replace(/ a (month|year)$/, "")}` : ""}`
        : "None";

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab
        object={m.tier === "pro" ? PHOTOS.procard : PHOTOS.blackcard}
        kicker={free ? "Your membership" : m.since ? `Member since ${monthYear(m.since)}` : "Your membership"}
        top="Outhere"
        bottom={plan.name}
        height={236}
      />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        {free ? (
          <Card padding={S.lg}>
            <Text style={styles.cardTitle}>You're on Free</Text>
            <Body dim size={13} style={{ marginTop: 4 }}>
              Pro earns 1.5x OUT on every km and Black 2x, with first pick of drops and private events.
            </Body>
            <Button title="See the plans" full style={{ marginTop: S.lg }} onPress={() => router.push("/membership")} />
          </Card>
        ) : (
          <FadeIn>
            <Card padding={S.lg}>
              <Row style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={styles.cardTitle}>{plan.name} earned you</Text>
                <Text style={styles.big}>+{formatNumber(m.earned.bonus)} OUT</Text>
              </Row>
              <Row gap={3} style={styles.earnBar}>
                <View style={{ flex: Math.max(1, m.earned.base), backgroundColor: "#3a4352", height: 8, borderRadius: 4 }} />
                <View style={{ flex: Math.max(total ? m.earned.bonus : 1, 1), backgroundColor: C.accent, height: 8, borderRadius: 4 }} />
              </Row>
              <Row gap={S.lg} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
                <Legend colour="#3a4352" label={`${formatNumber(m.earned.base)} OUT from moving`} />
                <Legend colour={C.accent} label={`${formatNumber(m.earned.bonus)} extra from ${plan.name}`} />
              </Row>
            </Card>
          </FadeIn>
        )}

        <Card padding={0} style={{ paddingHorizontal: S.lg }}>
          {!free ? <SetRow icon={Calendar} label={m.trialEndsAt ? "Free trial" : m.endsAt ? "Membership" : "Next payment"} value={next} /> : null}
          <SetRow icon={Layers} label="Change plan" onPress={() => router.push("/membership")} chevron />
          <SetRow icon={RotateCcw} label="Restore purchases" onPress={() => restore.mutate([])} chevron />
          {!free && !m.endsAt && m.source !== "referral" ? <SetRow icon={Lock} label="Cancel membership" danger onPress={confirmCancel} /> : null}
        </Card>

        {m.source === "referral" ? <Body dim size={12.5}>This month is on us, for the friends you brought. It ends on its own.</Body> : null}
        {m.endsAt && m.source !== "referral" ? <Body dim size={12.5}>Cancelled. You keep {plan.name} until {shortDate(m.endsAt)}, then you're on Free.</Body> : null}
        <Body mute size={12}>Signed in as {m.account}</Body>
      </View>
    </Screen>
  );
}

function Legend({ colour, label }) {
  return (
    <Row gap={6}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colour }} />
      <Text style={{ color: C.textDim, fontFamily: F.body, fontSize: 12 }}>{label}</Text>
    </Row>
  );
}

function SetRow({ icon: Icon, label, value, onPress, chevron, danger }) {
  const inner = (
    <Row gap={S.md} style={styles.setRow}>
      <Icon size={18} color={danger ? C.danger : C.textDim} />
      <Text style={[styles.setLabel, danger && { color: C.danger }]}>{label}</Text>
      {value ? (
        <Text style={styles.setValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {chevron ? <ChevronRight size={16} color={C.textMute} /> : null}
    </Row>
  );
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={label}>
      {inner}
    </PressableScale>
  ) : (
    inner
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  big: { color: C.accent, fontFamily: F.display, fontSize: 26 },
  earnBar: { marginTop: S.md },
  setRow: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  setLabel: { color: C.text, fontFamily: F.body, fontSize: 15, flex: 1 },
  setValue: { color: C.textDim, fontFamily: F.body, fontSize: 13, flexShrink: 1 },
});
