// A place on the way: it needs 100 active to go national and play as itself.
// The first 500 get a numbered founding medal, and on call-up weekend an
// invite pays both of you. Medals and invite payouts are done on the server.

import React, { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import { engine, useCityInvite, useEngineMutation, useRising } from "@/data/hooks";
import { BlendImage, C, F, GlowButton, IconTile, Meter, R, Row, S, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { cityPhoto } from "@/components/arena/CityParts";
import { StackTabBar } from "@/components/AppTabBar";
import { formatNumber } from "@/utils/format";

// The founding medal (laurel and footprint), as in the prototype's Founding 500 card.
const FOUNDERS_MEDAL = require("../../../assets/images/oh/founders.jpg");

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <GlowHero
          height={290}
          photo={cityPhoto(r.id || r.name)}
          kicker={`${r.isLive ? "Live" : "Rising"} · ${r.name}`}
          top={r.isLive ? `${r.name} is` : `${formatNumber(r.active)} of ${r.needed}`}
          bottom={r.isLive ? "national" : "to go national"}
          sub={r.isLive ? `${r.name} plays as itself in the City League.` : `Until then ${r.name} plays for ${r.region}.`}
        />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          {!r.isLive ? (
            <Surface padding={S.lg}>
              <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
                <Text style={styles.title}>{more} more walkers</Text>
                <Text style={[styles.small, { marginTop: 0 }]}>League One at {r.needed}</Text>
              </Row>
              <Meter value={r.active / r.needed} size={10} cap />
            </Surface>
          ) : null}

          <Surface padding={S.lg} contentStyle={styles.row}>
            <BlendImage source={FOUNDERS_MEDAL} size={96} glow float style={{ marginVertical: -14, marginLeft: -14, marginRight: -6 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kick}>Founding 500</Text>
              <Text style={styles.title}>{r.medal ? `Your medal is #${r.medal} of 500` : `${formatNumber(r.medalsClaimed)} of 500 claimed`}</Text>
              <Text style={styles.small}>
                {r.name}'s first 500 keep a numbered medal for good.
              </Text>
              {!r.medal && r.isHome && !r.isLive && r.medalsClaimed < r.medalsTotal ? (
                <GlowButton title="Claim mine" size="sm" loading={medal.isPending} onPress={() => medal.mutate(r.id)} style={{ alignSelf: "flex-start", marginTop: S.sm }} />
              ) : null}
            </View>
          </Surface>

          {r.isHome && !r.isLive ? (
            <Surface padding={S.lg} contentStyle={styles.row}>
              <IconTile icon={Send} size={44} radius={13} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.callUpWeekend ? "Call-up weekend" : "Bring a friend"}</Text>
                <Text style={styles.small}>
                  Bring a friend in and you both get {formatNumber(r.inviteOut)} OUT.{r.invitesRedeemed ? ` ${r.invitesRedeemed} joined with your code.` : ""}
                </Text>
                {invite ? <Text style={styles.code}>{invite}</Text> : null}
              </View>
              <GlowButton title="Invite" size="sm" onPress={share} />
            </Surface>
          ) : null}

          {r.isHome && !r.isLive ? (
            <Surface padding={S.lg}>
              <Text style={styles.title}>Got a friend's code?</Text>
              <Row gap={S.sm} style={{ marginTop: S.sm }}>
                <TextInput value={code} onChangeText={setCode} placeholder="KEMI2026" placeholderTextColor={C.textMute} autoCapitalize="characters" autoCorrect={false} style={styles.input} accessibilityLabel="Friend's code" />
                <GlowButton title="Use it" variant="quiet" disabled={code.trim().length < 4} loading={redeem.isPending} onPress={() => redeem.mutate(code)} />
              </Row>
              <Text style={[styles.small, { marginTop: S.sm }]}>For people who joined in the last two weeks, while the place is still rising.</Text>
            </Surface>
          ) : null}
        </View>
      </ScrollView>
      <TopBar onShare={share} />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.md },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  code: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1.5, marginTop: 4 },
  input: { flex: 1, height: 46, borderRadius: R.md, backgroundColor: "#0d1015", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.07)", color: C.text, paddingHorizontal: S.md, fontFamily: F.bodySemi, fontSize: 15, letterSpacing: 1.5 },
});
