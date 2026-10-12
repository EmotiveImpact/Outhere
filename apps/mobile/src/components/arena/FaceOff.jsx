// Battle detail pieces: the face-off hero, the big countdown and the result.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Coins, Handshake, Trophy, Zap } from "lucide-react-native";
import { AnimatedNumber, Avatar, C, F, FadeIn, PressableScale, R, Row, S } from "@/components/ui";
import { formatScore, metricUnit, metricValue, playerName } from "./shared";
import { TugBar, VsBadge } from "./BattleCard";

const pad = (n) => String(n).padStart(2, "0");

/** Big scoreboard style clock: D/H/M over a day out, otherwise H/M/S. */
export function Countdown({ ms }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const units = d > 0 ? [[d, "days"], [h, "hrs"], [m, "mins"]] : [[h, "hrs"], [m, "mins"], [s, "secs"]];
  return (
    <Row gap={6} style={{ justifyContent: "center" }}>
      {units.map(([v, label], i) => (
        <React.Fragment key={label}>
          {i > 0 ? <Text style={styles.colon}>:</Text> : null}
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{pad(v)}</Text>
            <Text style={styles.tileLabel}>{label}</Text>
          </View>
        </React.Fragment>
      ))}
    </Row>
  );
}

export function Fighter({ player, value, metric, lead, colour, onPress }) {
  const body = (
    <View style={{ alignItems: "center" }}>
      <View style={[styles.avatarGlow, lead && { shadowColor: colour, shadowOpacity: 0.7 }]}>
        <View style={[styles.avatarRing, { borderColor: lead ? colour : C.borderStrong }]}>
          <Avatar uri={player?.avatar} name={player?.name || ""} colour={colour} size={84} />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {playerName(player)}
      </Text>
      <AnimatedNumber
        value={value}
        duration={900}
        format={(v) => formatScore(metric, v)}
        adjustsFontSizeToFit
        style={[styles.score, lead && { color: colour === C.accent ? C.accent : C.text }]}
      />
      <Text style={styles.unit}>{metricUnit(metric)}</Text>
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{body}</View>;
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} style={{ flex: 1 }}>
      {body}
    </PressableScale>
  );
}

export function FaceOffRow({ battle, rival, onOpponent }) {
  const { me, opponent, metric } = battle;
  const iLead = battle.leader === "me" || battle.result === "won";
  const theyLead = (battle.leader && battle.leader !== "me") || battle.result === "lost";
  return (
    <>
      <Row style={{ alignItems: "flex-start" }}>
        <Fighter player={me.player} value={me.value} metric={metric} lead={iLead} colour={C.accent} />
        <VsBadge size={46} style={{ marginTop: 22 }} />
        <Fighter player={opponent.player} value={opponent.value} metric={metric} lead={theyLead} colour={rival} onPress={onOpponent} />
      </Row>
      {battle.status !== "pending" ? <TugBar mine={me.value} theirs={opponent.value} rival={rival} height={12} style={{ marginTop: S.xl }} /> : null}
    </>
  );
}

/** Result banner: celebratory for a win, respectful for a loss. */
export function ResultCard({ battle, prize, rival }) {
  const { result, metric, me, opponent } = battle;
  const opp = playerName(opponent.player);
  const won = result === "won";
  const lost = result === "lost";
  const Icon = won ? Trophy : lost ? Handshake : Handshake;
  const tint = won ? C.accent : lost ? rival : C.textDim;
  const title = won ? "You won" : lost ? `${opp} took it` : "Honours even";
  const line = won
    ? `${metricValue(metric, me.value)} to ${metricValue(metric, opponent.value)}. Proper.`
    : lost
      ? `${metricValue(metric, opponent.value)} to your ${metricValue(metric, me.value)}. Good fight. Run it back.`
      : `Both on ${metricValue(metric, me.value)}. Settle it with a rematch.`;

  return (
    <FadeIn>
      <View style={[styles.result, won && styles.resultWon]}>
        <LinearGradient
          colors={won ? ["rgba(0,255,127,0.28)", "rgba(0,255,127,0.04)"] : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.resultIcon, { backgroundColor: `${tint}22`, borderColor: `${tint}55` }]}>
          <Icon size={30} color={won ? C.gold : tint} fill={won ? C.gold : "transparent"} />
        </View>
        <Text style={[styles.resultTitle, won && { color: C.accent }]}>{title}</Text>
        <Text style={styles.resultLine}>{line}</Text>
        {prize ? (
          <Row gap={S.sm} style={{ marginTop: S.lg }}>
            <Reward icon={Zap} colour={C.accent} label={`+${prize.xp} XP`} />
            {prize.out ? <Reward icon={Coins} colour={C.gold} label={`+${prize.out} OUT`} /> : null}
          </Row>
        ) : null}
      </View>
    </FadeIn>
  );
}

function Reward({ icon: Icon, colour, label }) {
  return (
    <View style={[styles.reward, { borderColor: `${colour}66`, backgroundColor: `${colour}14` }]}>
      <Icon size={15} color={colour} fill={Icon === Zap ? colour : "transparent"} />
      <Text style={[styles.rewardText, { color: colour }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { minWidth: 74, paddingVertical: 10, paddingHorizontal: 8, borderRadius: R.md, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: C.border, alignItems: "center" },
  tileValue: { color: C.text, fontFamily: F.display, fontSize: 40, letterSpacing: 1, lineHeight: 44, fontVariant: ["tabular-nums"] },
  tileLabel: { color: C.textMute, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 },
  colon: { color: C.textMute, fontFamily: F.display, fontSize: 28, marginTop: -16 },
  avatarGlow: { borderRadius: 60, shadowColor: "#000", shadowOpacity: 0, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  avatarRing: { padding: 3, borderRadius: 60, borderWidth: 2.5, backgroundColor: C.bg },
  name: { color: C.textDim, fontSize: 14, fontWeight: "700", marginTop: S.md, maxWidth: "90%" },
  score: { color: C.textDim, fontFamily: F.display, fontSize: 40, letterSpacing: -1.2, marginTop: 2, maxWidth: "100%" },
  unit: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  result: { marginTop: S.lg, alignItems: "center", paddingVertical: S.xxl, paddingHorizontal: S.xl, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: "hidden" },
  resultWon: { borderColor: "rgba(0,255,127,0.5)", shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  resultIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resultTitle: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8, marginTop: S.md, textAlign: "center" },
  resultLine: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: "center" },
  reward: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: R.full, borderWidth: 1 },
  rewardText: { fontFamily: F.display, fontSize: 15 },
});
