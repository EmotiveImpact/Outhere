// Pieces of the Rewards screen: balance hero, reward cards, the ticket and
// the redeem sheet.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { ChevronRight, Copy, Lock } from "lucide-react-native";
import { formatNumber } from "@/utils/format";
import { AnimatedNumber, Body, Button, C, Cover, Divider, F, Pill, PressableScale, ProgressBar, R, Row, S, Sheet, Title, toast } from "@/components/ui";
import { Coin, CoinPill } from "./shared";
import Celebrate from "./Celebrate";

export const expiryLabel = (ms) => new Date(Number(ms)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// Matches the Sheet surface, so the ticket notches read as cut-outs.
const SHEET_BG = "#141416";
const isTierLock = (r) => !!r.lockedReason && /only$/.test(r.lockedReason);

export function BalanceHero({ data, tier, onUpgrade }) {
  const { balance, weeklyLimit, usedThisWeek } = data;
  const left = Math.max(0, weeklyLimit - usedThisWeek);
  const dots = weeklyLimit <= 10;
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl }}>
      <Row gap={S.md}>
        <Coin size={36} />
        <AnimatedNumber value={balance} duration={900} style={{ color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 62, letterSpacing: -1.5 }} />
      </Row>
      <Body dim size={13}>
        {balance ? "OUT to spend" : "Walk, keep your streak and win battles to start earning."}
      </Body>

      <Divider style={{ marginVertical: S.lg }} />

      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>This week</Text>
        <Text style={{ color: left ? C.textDim : C.warn, fontSize: 13 }}>
          {left ? `${left} of ${weeklyLimit} reward${weeklyLimit === 1 ? "" : "s"} left` : "Weekly limit reached"}
        </Text>
      </Row>
      {dots ? (
        <Row gap={4} style={{ marginTop: S.md }}>
          {Array.from({ length: weeklyLimit }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < usedThisWeek ? (left ? C.accent : C.warn) : C.surfaceHigh }} />
          ))}
        </Row>
      ) : (
        <ProgressBar value={weeklyLimit ? usedThisWeek / weeklyLimit : 0} height={6} colour={left ? C.accent : C.warn} style={{ marginTop: S.md }} />
      )}
      <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
        <Body mute size={13}>
          Resets on a rolling 7 days
        </Body>
        {tier !== "black" ? (
          <PressableScale onPress={onUpgrade} hitSlop={10} scaleTo={0.94} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>Get more</Text>
            <ChevronRight size={14} color={C.textDim} />
          </PressableScale>
        ) : null}
      </Row>
    </View>
  );
}

export function CategoryChips({ categories, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter, marginBottom: S.lg }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.sm }}>
      {categories.map((c) => {
        const active = c === value;
        return (
          <PressableScale
            key={c}
            onPress={() => onChange(c)}
            scaleTo={0.94}
            style={{
              paddingHorizontal: 16,
              height: 38,
              borderRadius: R.full,
              justifyContent: "center",
              backgroundColor: active ? C.text : C.surface,
            }}
          >
            <Text style={{ color: active ? C.bg : C.textDim, fontSize: 13, fontWeight: "600" }}>{c}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export function RewardCard({ reward: r, balance, onOpen }) {
  const tierLocked = isTierLock(r);
  const short = !r.canRedeem && !tierLocked && r.lockedReason?.endsWith("to go");
  return (
    <PressableScale onPress={onOpen} scaleTo={0.97} accessibilityLabel={`${r.title}, ${r.costOut} OUT`} style={{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }}>
      <Cover source={r.image} seed={r.id} scrim style={{ height: 112 }}>
        {tierLocked ? <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,10,10,0.55)" }} /> : null}
        <View style={{ position: "absolute", top: S.sm, left: S.sm, right: S.sm, flexDirection: "row", justifyContent: "space-between" }}>
          {r.tierRequired !== "free" ? <Pill label={r.tierRequired === "black" ? "BLACK" : "PRO"} tone={r.tierRequired} icon={tierLocked ? Lock : undefined} /> : <View />}
        </View>
        <View style={{ position: "absolute", left: S.md, bottom: S.sm }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" }}>{r.partner}</Text>
        </View>
      </Cover>
      <View style={{ padding: S.md }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "600", lineHeight: 19, minHeight: 38 }} numberOfLines={2}>
          {r.title}
        </Text>
        <Body mute size={12} numberOfLines={2} style={{ marginTop: 2, minHeight: 34 }}>
          {r.description}
        </Body>
        <View style={{ height: S.md }} />
        <CoinPill amount={r.costOut} dim={!r.canRedeem} />
        {short ? (
          <View style={{ marginTop: S.sm, height: 24 }}>
            <ProgressBar value={balance / r.costOut} height={4} />
            <Text style={{ color: C.textMute, fontSize: 11, marginTop: 4 }}>{r.lockedReason}</Text>
          </View>
        ) : !r.canRedeem ? (
          <Row gap={4} style={{ marginTop: S.sm, height: 24 }}>
            <Lock size={11} color={C.textMute} />
            <Text style={{ color: C.textMute, fontSize: 11 }}>{r.lockedReason}</Text>
          </Row>
        ) : (
          <Text style={{ color: C.textDim, fontSize: 12, marginTop: S.sm, height: 24, lineHeight: 24 }}>Ready to redeem</Text>
        )}
      </View>
    </PressableScale>
  );
}

/** A code laid out like a torn ticket: details up top, code below the perforation. */
export function TicketCard({ redemption: rd, accentSeed }) {
  const expired = rd.expiresAt < Date.now();
  const copy = async () => {
    await Clipboard.setStringAsync(rd.code);
    toast.success("Code copied", `${rd.code} is on your clipboard.`);
  };
  const notch = { position: "absolute", top: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: SHEET_BG };
  return (
    <View style={{ borderRadius: R.lg, overflow: "hidden" }}>
      <Cover seed={accentSeed || rd.rewardId} scrim style={{ height: 96 }}>
        <View style={{ flex: 1, justifyContent: "flex-end", padding: S.lg }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" }}>{rd.partner}</Text>
          <Title size={20} numberOfLines={1} style={{ marginTop: 2 }}>
            {rd.title}
          </Title>
        </View>
      </Cover>
      <View style={{ backgroundColor: C.surfaceHigh }}>
        <View style={{ height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.18)", marginHorizontal: 18 }} />
        <View style={[notch, { left: -12 }]} />
        <View style={[notch, { right: -12 }]} />
        <View style={{ padding: S.lg, alignItems: "center" }}>
          <PressableScale onPress={copy} scaleTo={0.96} accessibilityLabel="Copy code" style={{ flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 44 }}>
            <Text style={{ color: expired ? C.textMute : C.text, fontFamily: F.display, fontSize: 30, letterSpacing: 3 }} selectable>
              {rd.code}
            </Text>
            <Copy size={18} color={C.textDim} />
          </PressableScale>
          <Body mute size={12} style={{ marginTop: 4 }}>
            {expired ? "This code has expired." : `Valid until ${expiryLabel(rd.expiresAt)}`}
          </Body>
        </View>
      </View>
    </View>
  );
}

/**
 * One sheet for the whole flow: confirm a reward, then show its code.
 * `state` is { reward } to confirm or { redemption } to show a code.
 */
export function RedeemSheet({ state, balance, busy, burst = 0, onRedeem, onClose }) {
  const reward = state?.reward;
  const redemption = state?.redemption;
  const copy = async () => {
    await Clipboard.setStringAsync(redemption.code);
    toast.success("Code copied", `${redemption.code} is on your clipboard.`);
  };
  return (
    <Sheet visible={!!state} onClose={onClose} scroll>
      {redemption ? (
        <View style={{ paddingTop: S.sm }}>
          <Title size={24}>{redemption.fresh ? "Unlocked. Enjoy." : "Your code"}</Title>
          <Body dim style={{ marginTop: 4, marginBottom: S.lg }}>
            Show or enter this code at {redemption.partner}.
          </Body>
          <TicketCard redemption={redemption} />
          <Row gap={S.md} style={{ marginTop: S.xl }}>
            <View style={{ flex: 1 }}>
              <Button title="Copy code" icon={Copy} variant="secondary" onPress={copy} full />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Done" onPress={onClose} full />
            </View>
          </Row>
          {redemption.fresh ? <Celebrate burst={burst} originY={150} /> : null}
        </View>
      ) : reward ? (
        <View style={{ paddingTop: S.sm }}>
          <Cover source={reward.image} seed={reward.id} scrim style={{ height: 150, borderRadius: R.lg }}>
            <View style={{ flex: 1, justifyContent: "flex-end", padding: S.lg }}>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" }}>{reward.partner}</Text>
              <Title size={24} style={{ marginTop: 2 }}>
                {reward.title}
              </Title>
            </View>
          </Cover>
          <Body dim style={{ marginTop: S.lg }}>
            {reward.description}
          </Body>
          <Divider style={{ marginTop: S.lg }} />
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end", paddingVertical: S.lg }}>
            <View>
              <CoinPill amount={reward.costOut} size="lg" dim={!reward.canRedeem} />
              <Body dim size={13} style={{ marginTop: 4 }}>
                cost
              </Body>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: C.text, fontFamily: F.display, fontSize: 20 }}>{formatNumber(Math.max(0, balance - reward.costOut))} OUT</Text>
              <Body dim size={13} style={{ marginTop: 4 }}>
                left after
              </Body>
            </View>
          </Row>
          <Divider />
          <Body mute size={13} style={{ marginTop: S.md }}>
            Uses 1 of your weekly rewards. Your code lasts 30 days.
          </Body>
          {reward.canRedeem ? (
            <Button title={`Spend ${reward.costOut} OUT`} size="lg" full loading={busy} onPress={() => onRedeem(reward)} style={{ marginTop: S.xl }} />
          ) : (
            <Button
              title={isTierLock(reward) ? `Unlock with ${reward.tierRequired === "black" ? "Black" : "Pro"}` : reward.lockedReason}
              icon={Lock}
              variant="secondary"
              size="lg"
              full
              loading={busy}
              onPress={() => onRedeem(reward)}
              style={{ marginTop: S.xl }}
            />
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

export function CodeRow({ redemption: r, first, onOpen }) {
  const expired = r.expiresAt < Date.now();
  return (
    <PressableScale onPress={onOpen} scaleTo={0.985} style={{ flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.border }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
          {r.title}
        </Text>
        <Body mute size={13} numberOfLines={1}>
          {r.partner} · {expired ? "Expired" : `Until ${expiryLabel(r.expiresAt)}`}
        </Body>
      </View>
      <Text style={{ color: expired ? C.textMute : C.text, fontFamily: F.displayMedium, fontSize: 13, letterSpacing: 1 }}>{r.code}</Text>
    </PressableScale>
  );
}
