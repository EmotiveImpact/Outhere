// Wallet: XP and OUT balances on a gradient card, the latest few payouts, and
// a way into rewards.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { formatNumber, timeAgo } from "@/utils/format";
import { AnimatedNumber, Body, C, F, Label, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { Coin } from "./shared";

export default function WalletCard({ wallet, loading, onRewards }) {
  if (loading || !wallet) return <Skeleton height={260} radius={R.lg} />;
  const recent = wallet.transactions.slice(0, 4);
  return (
    <View style={{ borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}>
      <LinearGradient
        colors={["#103522", "#0c1f16", "#141416"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: S.xl, paddingBottom: S.lg }}
      >
        {/* Soft diagonal sheen across the card. */}
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Label style={{ color: "rgba(255,255,255,0.55)" }}>OUT balance</Label>
            <Row gap={S.sm} style={{ marginTop: 4 }}>
              <Coin size={26} />
              <AnimatedNumber value={wallet.out} style={{ color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.2 }} />
            </Row>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Label style={{ color: "rgba(255,255,255,0.55)" }}>XP</Label>
            <AnimatedNumber value={wallet.xp} style={{ color: C.text, fontFamily: F.display, fontSize: 24, marginTop: 6 }} />
          </View>
        </Row>
        <PressableScale
          onPress={onRewards}
          scaleTo={0.97}
          style={{
            marginTop: S.lg,
            height: 46,
            borderRadius: R.full,
            backgroundColor: C.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: S.sm,
          }}
          accessibilityLabel="Spend OUT on rewards"
        >
          <Sparkles size={16} color={C.accentText} />
          <Text style={{ color: C.accentText, fontFamily: F.displayMedium, fontSize: 15 }}>Spend OUT on rewards</Text>
        </PressableScale>
      </LinearGradient>

      <View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
        {recent.length ? (
          recent.map((t, i) => {
            const neg = t.amount < 0;
            const out = t.type === "out";
            return (
              <Row key={t.id} gap={S.md} style={{ paddingVertical: S.md, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                    {t.label}
                  </Text>
                  <Body mute size={12}>
                    {timeAgo(t.at)}
                  </Body>
                </View>
                <Text style={{ color: neg ? C.danger : out ? C.accent : C.text, fontFamily: F.displayMedium, fontSize: 15 }}>
                  {t.amount > 0 ? "+" : ""}
                  {formatNumber(t.amount)} {t.type.toUpperCase()}
                </Text>
              </Row>
            );
          })
        ) : (
          <Body mute size={13} style={{ paddingVertical: S.lg }}>
            Steps, streaks and battle wins all pay out here.
          </Body>
        )}
      </View>
    </View>
  );
}
