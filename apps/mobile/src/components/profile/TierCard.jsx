// Membership plan cards and the Road to Black streak track.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, Flame, Lock } from "lucide-react-native";
import { tierLabel } from "@/utils/format";
import { Body, Button, C, F, Label, R, Row, S, Title } from "@/components/ui";

export const TAGLINES = {
  free: "Everything you need to get moving.",
  pro: "For people who are out most days.",
  black: "For the ones who never miss.",
};

const fmtLimit = (n) => (n === Infinity ? "∞" : String(n));

const LOOK = {
  free: { name: C.text, check: C.textDim, border: C.border, glow: null },
  pro: { name: C.pro, check: C.pro, border: "rgba(124,196,255,0.55)", glow: C.pro },
  black: { name: C.black, check: C.black, border: "#4a4a50", glow: "#ffffff" },
};

/** One plan. Free is plain, Pro has a blue edge, Black is dark metal with a sheen. */
export function TierCard({ tier, rules, perks, current, locked, upgrade, streakNeeded, busy, onChoose }) {
  const look = LOOK[tier];
  const border = current ? C.accent : look.border;
  const content = (
    <View style={{ padding: S.xl }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Row gap={S.sm}>
            {tier !== "free" ? <Crown size={20} color={look.name} /> : null}
            <Title size={32} style={{ color: look.name, letterSpacing: -1 }}>
              {tierLabel(tier)}
            </Title>
          </Row>
          <Body dim size={14} style={{ marginTop: 2 }}>
            {TAGLINES[tier]}
          </Body>
        </View>
        {current ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 10, height: 26 }}>
            <Check size={13} color={C.accentText} strokeWidth={3} />
            <Text style={{ color: C.accentText, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>YOUR PLAN</Text>
          </View>
        ) : locked ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, paddingHorizontal: 10, height: 26 }}>
            <Lock size={12} color={C.textDim} />
            <Text style={{ color: C.textDim, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>LOCKED</Text>
          </View>
        ) : null}
      </Row>

      <Row gap={0} style={{ marginTop: S.lg, borderRadius: R.md, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat value={`${rules.xpMultiplier}x`} label="XP" colour={look.name} />
        <Stat value={fmtLimit(rules.battlesPerWeek)} label="Battles/wk" colour={look.name} divider />
        <Stat value={fmtLimit(rules.redemptionsPerWeek)} label="Rewards/wk" colour={look.name} divider />
      </Row>

      <View style={{ marginTop: S.lg, gap: 10 }}>
        {perks.map((p) => (
          <Row key={p} gap={S.sm} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: tier === "free" ? C.surfaceHigh : `${look.check}22`, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Check size={11} color={look.check} strokeWidth={3} />
            </View>
            <Body size={14} style={{ flex: 1, color: tier === "free" ? C.textDim : C.text }}>
              {p}
            </Body>
          </Row>
        ))}
      </View>

      {current ? null : (
        <Button
          title={locked ? `Unlocks at a ${streakNeeded} day streak` : upgrade ? `Switch to ${tierLabel(tier)}` : `Move to ${tierLabel(tier)}`}
          variant={locked ? "secondary" : upgrade ? "primary" : "ghost"}
          icon={locked ? Lock : undefined}
          disabled={locked}
          loading={busy}
          full
          onPress={() => onChoose(tier)}
          style={[{ marginTop: S.xl }, upgrade && !locked && tier !== "free" ? { backgroundColor: look.name, borderColor: look.name, shadowColor: look.name } : null]}
        />
      )}
    </View>
  );

  const shell = {
    borderRadius: R.lg,
    borderWidth: current ? 1.5 : 1,
    borderColor: border,
    overflow: "hidden",
    backgroundColor: C.surface,
  };
  const glow = current
    ? { shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6, borderRadius: R.lg }
    : tier === "pro"
      ? { shadowColor: C.pro, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderRadius: R.lg }
      : null;

  if (tier === "black") {
    return (
      <View style={glow}>
        <LinearGradient colors={["#3b3b40", "#18181b", "#0b0b0c", "#232326"]} locations={[0, 0.35, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={shell}>
          {/* Brushed-metal sheen: a soft diagonal highlight band. */}
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.09)", "rgba(255,255,255,0)"]}
            locations={[0.3, 0.45, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.6 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: "rgba(255,255,255,0.18)" }} />
          {content}
        </LinearGradient>
      </View>
    );
  }
  if (tier === "pro") {
    return (
      <View style={glow}>
        <View style={shell}>
          <LinearGradient
            colors={["rgba(124,196,255,0.16)", "rgba(124,196,255,0.02)", "rgba(20,20,22,0)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {content}
        </View>
      </View>
    );
  }
  return (
    <View style={glow}>
      <View style={shell}>{content}</View>
    </View>
  );
}

const Stat = ({ value, label, colour, divider }) => (
  <View style={{ flex: 1, alignItems: "center", paddingVertical: S.md, borderLeftWidth: divider ? 1 : 0, borderLeftColor: "rgba(255,255,255,0.06)" }}>
    <Text style={{ color: colour, fontFamily: F.display, fontSize: 20 }}>{value}</Text>
    <Text style={{ color: C.textMute, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>{label}</Text>
  </View>
);

/** 14 day streak track towards Black. Hidden once you're on Black. */
export function RoadToBlack({ streak, needed, eligible }) {
  const filled = eligible ? needed : Math.min(streak, needed);
  const left = Math.max(0, needed - streak);
  const tint = eligible ? C.black : C.fire;
  return (
    <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: eligible ? "#4a4a50" : C.border, backgroundColor: C.surface, padding: S.xl, overflow: "hidden" }}>
      {eligible ? (
        <LinearGradient colors={["#2c2c30", "#141416"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : null}
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={S.sm}>
          <Flame size={18} color={tint} fill={filled ? tint : "transparent"} />
          <Title size={18}>{eligible ? "Black unlocked" : "Road to Black"}</Title>
        </Row>
        <Text style={{ color: eligible ? C.black : C.text, fontFamily: F.display, fontSize: 16 }}>
          {filled}
          <Text style={{ color: C.textMute }}>/{needed}</Text>
        </Text>
      </Row>
      <Row gap={5} style={{ marginTop: S.lg }}>
        {Array.from({ length: needed }).map((_, i) => {
          const on = i < filled;
          const next = !eligible && i === filled;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 7,
                backgroundColor: on ? tint : C.surfaceHigh,
                borderWidth: next ? 1.5 : 0,
                borderColor: C.fire,
                opacity: on ? 1 : 0.9,
              }}
            />
          );
        })}
      </Row>
      <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
        <Label style={{ fontSize: 10 }}>Day 1</Label>
        <Label style={{ fontSize: 10 }}>Day {needed}</Label>
      </Row>
      <Body dim size={13} style={{ marginTop: S.sm }}>
        {eligible
          ? "You held a 14 day streak. Black stays open to you for good."
          : streak
            ? `${left} more active day${left === 1 ? "" : "s"} in a row and Black opens up. Don't break the chain.`
            : `String together ${needed} active days in a row to open up Black. Day one is today.`}
      </Body>
    </View>
  );
}
