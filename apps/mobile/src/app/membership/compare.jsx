// Compare plans: each plan as its membership ring on your own photo, then
// the table with the Black column lit, and the promise that paying never
// changes a score.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Check, Flame, Ghost, Layers, ShoppingBag, Swords, Zap } from "lucide-react-native";
import { useMembershipDetails, useProfile } from "@/data/hooks";
import { Avatar, Button, C, F, FadeIn, R, Row, S, Screen } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { COMPARE, PLAN_ORDER, PLANS, TRIAL_DAYS, priceLabel } from "@/constants/plans";

const ICONS = { zap: Zap, swords: Swords, "shopping-bag": ShoppingBag, calendar: Calendar, ghost: Ghost, flame: Flame, layers: Layers };

export default function ComparePlans() {
  const router = useRouter();
  const { billing = "monthly" } = useLocalSearchParams();
  const { data: p } = useProfile();
  const { data: m } = useMembershipDetails();
  const trial = !m?.trialUsed;
  const onBlack = m?.tier === "black";

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <Slab object={PHOTOS.procard} kicker="Compare plans" top="What each" bottom="plan gets you" height={220} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
        <Row gap={0} style={{ alignItems: "flex-end" }}>
          <View style={{ flex: 1.25 }} />
          {PLAN_ORDER.map((t) => (
            <View key={t} style={[styles.head, t === "black" && styles.headOn]}>
              {t === "pro" ? (
                <View style={styles.pop}>
                  <Text style={styles.popText}>Most picked</Text>
                </View>
              ) : null}
              <Avatar uri={p?.avatar} name={p?.name || "You"} tier={t} size={42} />
              <Text style={styles.headName}>{PLANS[t].name}</Text>
              <Text style={styles.headPrice}>{priceLabel(t, String(billing))}</Text>
            </View>
          ))}
        </Row>

        <FadeIn>
          <View style={styles.table}>
            <LinearGradient colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"]} style={styles.band} />
            {COMPARE.map((row, i) => {
              const Icon = ICONS[row.icon] || Zap;
              return (
                <Row key={row.key} gap={0} style={[styles.row, i > 0 && styles.rowLine]}>
                  <Row gap={8} style={{ flex: 1.25 }}>
                    <Icon size={15} color={C.textDim} />
                    <Text style={styles.label} numberOfLines={2}>
                      {row.label}
                    </Text>
                  </Row>
                  {PLAN_ORDER.map((t) => (
                    <View key={t} style={styles.cell}>
                      <Cell value={row.cells[t]} on={t === "black"} />
                    </View>
                  ))}
                </Row>
              );
            })}
          </View>
        </FadeIn>

        <Text style={styles.fine}>Same game for everyone. Battles, club runs and fixtures score the same on every plan.</Text>

        <Button
          title={onBlack ? "Manage your plan" : trial ? `Go Black · ${TRIAL_DAYS} days free` : `Go Black · ${priceLabel("black", String(billing))}`}
          size="lg"
          full
          style={{ marginTop: S.lg }}
          onPress={() => (onBlack ? router.push("/membership/manage") : router.push({ pathname: "/membership/checkout", params: { plan: "black", billing: String(billing) } }))}
        />
      </View>
    </Screen>
  );
}

function Cell({ value, on }) {
  if (value === false) return <Text style={styles.no}>–</Text>;
  if (value === true) return <Check size={16} color={on ? C.accentHi : C.accent} />;
  if (value && typeof value === "object") {
    return (
      <View style={{ alignItems: "center", width: "100%" }}>
        <Text style={[styles.val, on && styles.valOn]}>{value.label}</Text>
        <View style={styles.mx}>
          <View style={[styles.mxFill, { width: `${value.value * 100}%` }]} />
        </View>
      </View>
    );
  }
  return (
    <Text style={[styles.val, on && styles.valOn]} numberOfLines={2}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, alignItems: "center", paddingTop: S.md, paddingBottom: S.sm, borderTopLeftRadius: R.md, borderTopRightRadius: R.md },
  headOn: { backgroundColor: "#151a22" },
  headName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: 6 },
  headPrice: { color: C.textDim, fontFamily: F.body, fontSize: 11, textAlign: "center", marginTop: 1 },
  pop: { position: "absolute", top: -10, paddingHorizontal: 7, height: 19, borderRadius: 10, backgroundColor: C.accent, justifyContent: "center" },
  popText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10 },
  table: { backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  band: { position: "absolute", right: 0, top: 0, bottom: 0, width: "21.05%" },
  row: { paddingHorizontal: S.md, minHeight: 50 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  label: { color: C.textSoft, fontFamily: F.body, fontSize: 12.5, flex: 1 },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  val: { color: C.textSoft, fontFamily: F.body, fontSize: 12, textAlign: "center" },
  valOn: { color: C.text, fontFamily: F.bodySemi },
  no: { color: C.textMute, fontSize: 14 },
  mx: { width: "70%", height: 4, borderRadius: 2, backgroundColor: C.surfaceHigh, marginTop: 4, overflow: "hidden" },
  mxFill: { height: 4, borderRadius: 2, backgroundColor: C.accent },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.lg, lineHeight: 17 },
});
