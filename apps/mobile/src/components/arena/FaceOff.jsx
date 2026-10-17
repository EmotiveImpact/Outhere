// Battle detail pieces: the face-off hero, the big countdown and the result.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Coins, Zap } from "@/components/ui/icons";
import { C, F, FadeIn, PressableScale, R, RollingNumber, Row, S } from "@/components/ui";
import { formatScore, ME, metricUnit, metricValue, playerName } from "./shared";
import { TugBar, VsBadge } from "./BattleCard";
import { PortraitMini } from "./BattleKit";
import { fighterPhoto } from "@/utils/fighter";

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

export function Fighter({ player, value, metric, lead, colour, onPress, sealed = false }) {
  const body = (
    <View style={{ alignItems: "center" }}>
      <PortraitMini source={fighterPhoto(player, "profile").source} name={player?.isMe ? "You" : player?.name} side={colour === ME ? "left" : "right"} width={84} height={96} radius={22} style={!lead && { opacity: 0.85 }} />
      <Text style={styles.name} numberOfLines={1}>
        {playerName(player)}
      </Text>
      {sealed ? (
        <Text style={styles.score}>SEALED</Text>
      ) : metric === "time" ? (
        <Text style={[styles.score, lead && { color: C.text }]} adjustsFontSizeToFit numberOfLines={1}>
          {formatScore(metric, value)}
        </Text>
      ) : (
        <RollingNumber value={value || 0} format={(v) => formatScore(metric, v)} size={36} lineHeight={40} letterSpacing={-1} colour={lead ? C.text : C.textDim} style={{ marginTop: 2, justifyContent: "center" }} />
      )}
      <Text style={styles.unit}>{sealed ? "until you've both run" : metricUnit(metric)}</Text>
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
        <Fighter player={me.player} value={me.value} metric={metric} lead={iLead} colour={ME} />
        <VsBadge size={40} style={{ marginTop: 22 }} />
        <Fighter player={opponent.player} value={opponent.value} metric={metric} lead={theyLead} colour={rival} onPress={onOpponent} sealed={battle.sealed} />
      </Row>
      {battle.status !== "pending" && !battle.sealed && battle.phase !== "lobby" ? (
        <TugBar
          mine={metric === "time" ? (opponent.value == null ? 0 : opponent.value) : me.value || 0}
          theirs={metric === "time" ? (me.value == null ? 0 : me.value) : opponent.value || 0}
          height={12}
          style={{ marginTop: S.xl }}
        />
      ) : null}
    </>
  );
}

/** Result banner: celebratory for a win, respectful for a loss. */
export function ResultCard({ battle, prize, rival }) {
  const { result, metric, me, opponent } = battle;
  const opp = playerName(opponent.player);
  const won = result === "won";
  const lost = result === "lost";
  const title = won ? "You won" : lost ? `${opp} took it` : "Honours even";
  const line = won
    ? `${metricValue(metric, me.value)} to ${metricValue(metric, opponent.value)}. Proper.`
    : lost
      ? `${metricValue(metric, opponent.value)} to your ${metricValue(metric, me.value)}. Good fight. Run it back.`
      : `Both on ${metricValue(metric, me.value)}. Settle it with a rematch.`;

  return (
    <FadeIn>
      <View style={styles.result}>
        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={styles.resultLine}>{line}</Text>
        {prize ? (
          <Row gap={S.lg} style={{ marginTop: S.lg }}>
            <Reward icon={Zap} label={`+${prize.xp} XP`} />
            {prize.out ? <Reward icon={Coins} label={`+${prize.out} OUT`} /> : null}
          </Row>
        ) : null}
      </View>
    </FadeIn>
  );
}

function Reward({ icon: Icon, label }) {
  return (
    <Row gap={6}>
      <Icon size={15} color={C.textDim} />
      <Text style={styles.rewardText}>{label}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  tile: { minWidth: 64, alignItems: "center" },
  tileValue: { color: C.text, fontFamily: F.display, fontSize: 52, letterSpacing: -1, lineHeight: 58, fontVariant: ["tabular-nums"] },
  tileLabel: { color: C.textDim, fontSize: 13, marginTop: 2 },
  colon: { color: C.textMute, fontFamily: F.display, fontSize: 36, marginTop: -20 },
  name: { color: C.textDim, fontSize: 15, fontWeight: "600", marginTop: S.md, maxWidth: "90%" },
  score: { color: C.textDim, fontFamily: F.display, fontSize: 36, letterSpacing: -1, marginTop: 2, maxWidth: "100%" },
  unit: { color: C.textMute, fontSize: 13 },
  result: { marginTop: S.lg, alignItems: "center", paddingVertical: S.xxl, paddingHorizontal: S.xl, borderRadius: R.lg, backgroundColor: C.surface },
  resultTitle: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8, textAlign: "center" },
  resultLine: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: "center" },
  rewardText: { color: C.text, fontFamily: F.display, fontSize: 16 },
});
