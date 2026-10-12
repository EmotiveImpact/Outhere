// Wallet: OUT and XP balances, the latest few payouts, and a way into rewards.

import React from "react";
import { Text, View } from "react-native";
import { formatNumber, timeAgo } from "@/utils/format";
import { AnimatedNumber, Body, Button, C, Card, Divider, F, R, Row, S, Skeleton } from "@/components/ui";
import { Coin } from "./shared";

export default function WalletCard({ wallet, loading, onRewards }) {
  if (loading || !wallet) return <Skeleton height={260} radius={R.lg} />;
  const recent = wallet.transactions.slice(0, 4);
  return (
    <Card padding={S.xl}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Row gap={S.sm}>
            <Coin size={22} />
            <AnimatedNumber value={wallet.out} style={{ color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.8 }} />
          </Row>
          <Body dim size={13}>
            OUT balance
          </Body>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AnimatedNumber value={wallet.xp} style={{ color: C.text, fontFamily: F.display, fontSize: 20 }} />
          <Body dim size={13}>
            XP
          </Body>
        </View>
      </Row>

      <Button title="Spend OUT on rewards" onPress={onRewards} full style={{ marginTop: S.lg }} />

      <View style={{ marginTop: S.md }}>
        {recent.length ? (
          recent.map((t, i) => {
            const neg = t.amount < 0;
            const out = t.type === "out";
            return (
              <View key={t.id}>
                {i ? <Divider /> : null}
                <Row gap={S.md} style={{ paddingVertical: S.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 15 }} numberOfLines={1}>
                      {t.label}
                    </Text>
                    <Body mute size={13}>
                      {timeAgo(t.at)}
                    </Body>
                  </View>
                  <Text style={{ color: neg ? C.danger : out ? C.accent : C.textDim, fontFamily: F.displayMedium, fontSize: 15 }}>
                    {t.amount > 0 ? "+" : ""}
                    {formatNumber(t.amount)} {t.type.toUpperCase()}
                  </Text>
                </Row>
              </View>
            );
          })
        ) : (
          <Body mute size={13} style={{ paddingTop: S.md }}>
            Steps, streaks and battle wins all pay out here.
          </Body>
        )}
      </View>
    </Card>
  );
}
