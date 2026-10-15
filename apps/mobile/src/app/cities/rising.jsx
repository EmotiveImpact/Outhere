// A place on the way: it needs 100 active to go national and play as itself.
// The first 500 get a numbered founding medal, and on call-up weekend an
// invite pays both of you. Medals and invite payouts are done on the server.

import React, { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Send } from "lucide-react-native";
import { engine, useCityInvite, useEngineMutation, useRising } from "@/data/hooks";
import { Button, C, F, R, Row, S, Skeleton } from "@/components/ui";
import { Bar, GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";

export default function Rising() {
  const insets = useSafeAreaInsets();
  const { city } = useLocalSearchParams();
  const { data: r, isPending } = useRising(typeof city === "string" ? city : null);
  const invite = useCityInvite(!!r?.isHome).data;
  const [code, setCode] = useState("");
  const medal = useEngineMutation(engine.claimFoundingMedal, { success: (n) => `Founding medal #${n} is yours` });
  const redeem = useEngineMutation(engine.redeemCityInvite, { success: "1,000 OUT each. Welcome in", onSuccess: () => setCode("") });

  if (isPending || !r) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={260 + insets.top} radius={30} />
        <TopBar />
      </View>
    );
  }

  const more = Math.max(0, r.needed - r.active);
  const share = () =>
    Share.share({ message: `${r.name} needs ${more} more walkers to go national on Outhere. Join with my code ${invite || r.inviteCode || ""} and we both get 1,000 OUT.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <GlowHero
          height={240}
          kicker={`${r.isLive ? "Live" : "Rising"} · ${r.name}`}
          top={r.isLive ? `${r.name} is` : `${formatNumber(r.active)} of ${r.needed}`}
          bottom={r.isLive ? "national" : "to go national"}
          sub={r.isLive ? `${r.name} plays as itself in the City League.` : `Until then ${r.name} plays for ${r.region}.`}
        />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          {!r.isLive ? (
            <View style={styles.card}>
              <Row style={{ justifyContent: "space-between", marginBottom: S.sm }}>
                <Text style={styles.title}>{more} more walkers</Text>
                <Text style={styles.small}>League One at {r.needed}</Text>
              </Row>
              <Bar value={r.active / r.needed} height={8} />
            </View>
          ) : null}

          <View style={[styles.card, styles.row]}>
            <Image source={PHOTOS.founding} style={styles.medal} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.kick}>Founding 500</Text>
              <Text style={styles.title}>{r.medal ? `Your medal is #${r.medal} of 500` : `${formatNumber(r.medalsClaimed)} of 500 claimed`}</Text>
              <Text style={styles.small}>
                {r.name}'s first 500 keep a numbered medal for good.
              </Text>
              {!r.medal && r.isHome && !r.isLive && r.medalsClaimed < r.medalsTotal ? (
                <Button title="Claim mine" size="sm" loading={medal.isPending} onPress={() => medal.mutate(r.id)} style={{ alignSelf: "flex-start", marginTop: S.sm }} />
              ) : null}
            </View>
          </View>

          {r.isHome && !r.isLive ? (
            <View style={[styles.card, styles.row]}>
              <View style={styles.icon}>
                <Send size={18} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.callUpWeekend ? "Call-up weekend" : "Bring a friend"}</Text>
                <Text style={styles.small}>
                  Bring a friend in and you both get {formatNumber(r.inviteOut)} OUT.{r.invitesRedeemed ? ` ${r.invitesRedeemed} joined with your code.` : ""}
                </Text>
                {invite ? <Text style={styles.code}>{invite}</Text> : null}
              </View>
              <Button title="Invite" size="sm" onPress={share} />
            </View>
          ) : null}

          {r.isHome && !r.isLive ? (
            <View style={styles.card}>
              <Text style={styles.title}>Got a friend's code?</Text>
              <Row gap={S.sm} style={{ marginTop: S.sm }}>
                <TextInput value={code} onChangeText={setCode} placeholder="KEMI2026" placeholderTextColor={C.textMute} autoCapitalize="characters" autoCorrect={false} style={styles.input} accessibilityLabel="Friend's code" />
                <Button title="Use it" variant="secondary" disabled={code.trim().length < 4} loading={redeem.isPending} onPress={() => redeem.mutate(code)} />
              </Row>
              <Text style={[styles.small, { marginTop: S.sm }]}>For people who joined in the last two weeks, while the place is still rising.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <TopBar onShare={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  row: { flexDirection: "row", alignItems: "center", gap: S.md },
  medal: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#000" },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center" },
  code: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1.5, marginTop: 4 },
  input: { flex: 1, height: 46, borderRadius: R.md, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.md, fontFamily: F.bodySemi, fontSize: 15, letterSpacing: 1.5 },
});
