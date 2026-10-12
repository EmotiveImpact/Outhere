// Membership plan cards and the Road to Black streak track.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Flame, Lock } from "lucide-react-native";
import { tierLabel } from "@/utils/format";
import { Body, Button, C, Divider, F, Pill, R, Row, S, Title } from "@/components/ui";

export const TAGLINES = {
  free: "Everything you need to get moving.",
  pro: "For people who are out most days.",
  black: "For the ones who never miss.",
};

const fmtLimit = (n) => (n === Infinity ? "∞" : String(n));

const NAME = { free: C.text, pro: C.pro, black: C.black };

/**
 * One plan. Free is plain, Pro carries a blue edge mark, Black sits on a
 * subtle dark metal fill. `primary` marks the one upgrade to push.
 */
export function TierCard({ tier, rules, perks, current, locked, upgrade, primary, streakNeeded, busy, onChoose }) {
  const name = NAME[tier];
  const shell = { borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface };
  const content = (
    <View style={{ padding: S.xl }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Title size={28} style={{ color: name, letterSpacing: -0.8 }}>
            {tierLabel(tier)}
          </Title>
          <Body dim size={13} style={{ marginTop: 2 }}>
            {TAGLINES[tier]}
          </Body>
        </View>
        {current ? <Pill label="Your plan" icon={Check} /> : locked ? <Pill label="Locked" icon={Lock} /> : null}
      </Row>

      <Row style={{ marginTop: S.xl }}>
        <Stat value={`${rules.xpMultiplier}x`} label="XP" />
        <Stat value={fmtLimit(rules.battlesPerWeek)} label="battles a week" />
        <Stat value={fmtLimit(rules.redemptionsPerWeek)} label="rewards a week" />
      </Row>

      <Divider style={{ marginVertical: S.lg }} />

      <View style={{ gap: S.md }}>
        {perks.map((p) => (
          <Row key={p} gap={S.md} style={{ alignItems: "flex-start" }}>
            <View style={{ marginTop: 2 }}>
              <Check size={15} color={C.textDim} strokeWidth={2.5} />
            </View>
            <Body size={15} style={{ flex: 1, color: C.textDim }}>
              {p}
            </Body>
          </Row>
        ))}
      </View>

      {current ? null : (
        <Button
          title={locked ? `Unlocks at a ${streakNeeded} day streak` : upgrade ? `Switch to ${tierLabel(tier)}` : `Move to ${tierLabel(tier)}`}
          variant={locked ? "secondary" : upgrade ? (primary ? "primary" : "secondary") : "ghost"}
          icon={locked ? Lock : undefined}
          disabled={locked}
          loading={busy}
          full
          onPress={() => onChoose(tier)}
          style={{ marginTop: S.xl }}
        />
      )}
    </View>
  );

  if (tier === "black") {
    return (
      <LinearGradient colors={["#1f1f22", "#121214"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={shell}>
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={shell}>
      {tier === "pro" ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.pro }} /> : null}
      {content}
    </View>
  );
}

const Stat = ({ value, label }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 22 }}>{value}</Text>
    <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>{label}</Text>
  </View>
);

/** 14 day streak track towards Black. Hidden once you're on Black. */
export function RoadToBlack({ streak, needed, eligible }) {
  const filled = eligible ? needed : Math.min(streak, needed);
  const left = Math.max(0, needed - streak);
  const tint = eligible ? C.black : C.fire;
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={S.sm}>
          <Flame size={18} color={tint} fill={filled ? tint : "transparent"} />
          <Title size={20}>{eligible ? "Black unlocked" : "Road to Black"}</Title>
        </Row>
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 16 }}>
          {filled}
          <Text style={{ color: C.textMute }}>/{needed}</Text>
        </Text>
      </Row>
      <Row gap={4} style={{ marginTop: S.lg }}>
        {Array.from({ length: needed }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < filled ? tint : C.surfaceHigh }} />
        ))}
      </Row>
      <Body dim size={13} style={{ marginTop: S.md }}>
        {eligible
          ? "You held a 14 day streak. Black stays open to you for good."
          : streak
            ? `${left} more active day${left === 1 ? "" : "s"} in a row and Black opens up.`
            : `${needed} active days in a row opens up Black.`}
      </Body>
    </View>
  );
}
