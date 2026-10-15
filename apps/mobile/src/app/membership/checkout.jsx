// Checkout: the payment sheet with the free week, what you pay today, when
// it renews and the account it's on.
//
// In-app purchases aren't set up. With the local engine the purchase is
// simulated (the engine changes your plan). With Supabase this opens the
// web checkout on weouthere.app, whose Stripe webhook writes the
// subscription; the app picks the new plan up when you come back.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, X } from "lucide-react-native";
import { engine, isRemote, showEngineError, useMembershipDetails } from "@/data/hooks";
import { Button, C, F, Logo, PressableScale, R, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { PLANS, TRIAL_DAYS, priceLabel } from "@/constants/plans";

const dateLong = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

export default function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams();
  const plan = params.plan === "pro" ? "pro" : "black";
  const billing = params.billing === "monthly" ? "monthly" : "yearly";
  const { data: m } = useMembershipDetails();
  const [busy, setBusy] = useState(false);
  const p = PLANS[plan];
  const trial = !m?.trialUsed;
  const firstCharge = Date.now() + (trial ? TRIAL_DAYS * 24 * 60 * 60 * 1000 : 0);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/membership"));

  const subscribe = async () => {
    setBusy(true);
    try {
      const r = await engine.purchaseMembership({ plan, billing });
      if (r.checkoutUrl) {
        await WebBrowser.openBrowserAsync(r.checkoutUrl);
        await qc.invalidateQueries({ queryKey: ["engine"] });
        const after = await engine.getMembershipDetails().catch(() => null);
        if (after?.tier === plan) router.replace({ pathname: "/membership/welcome", params: { plan } });
        else close();
        return;
      }
      router.replace({ pathname: "/membership/welcome", params: { plan } });
    } catch (e) {
      showEngineError(e);
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    trial ? ["Free trial", `${TRIAL_DAYS} days`] : null,
    ["Today", trial ? "£0.00" : priceLabel(plan, billing).split(" ")[0]],
    [trial ? `From ${dateLong(firstCharge)}` : "Then", priceLabel(plan, billing)],
    ["Account", m?.account || ""],
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Image source={PHOTOS.blackhero} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" />
      <View style={{ flex: 1 }} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.xl }]}>
        <Row gap={S.md}>
          <View style={styles.appIcon}>
            <Logo size={30} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Outhere {p.name}</Text>
            <Text style={styles.sub}>{billing === "yearly" ? "Yearly" : "Monthly"} membership</Text>
          </View>
          {/* The pay sheet's own small grey close, like the system sheet */}
          <PressableScale onPress={close} scaleTo={0.9} hitSlop={10} accessibilityLabel="Close" style={styles.close}>
            <X size={15} color="#5b6576" strokeWidth={2.4} />
          </PressableScale>
        </Row>

        <View style={styles.rows}>
          {rows.map(([k, v], i) => (
            <Row key={k} style={[styles.row, i > 0 && styles.rowLine]}>
              <Text style={styles.k}>{k}</Text>
              <Text style={styles.v} numberOfLines={1}>
                {v}
              </Text>
            </Row>
          ))}
        </View>

        <View style={{ alignItems: "center", marginTop: S.lg }}>
          <Lock size={26} color={C.accent} />
          <Text style={styles.confirm}>{isRemote ? "Finish on weouthere.app" : trial ? "Start your free week" : "Confirm your plan"}</Text>
          <Text style={styles.small}>
            {isRemote
              ? "Payments run through our website for now. Your ring updates as soon as it's done."
              : trial
                ? "Cancel any time in Settings at least a day before the trial ends."
                : "Cancel any time in Settings."}
          </Text>
        </View>
        <Button title={isRemote ? "Continue to checkout" : trial ? "Start free trial" : `Subscribe · ${priceLabel(plan, billing)}`} size="lg" full loading={busy} onPress={subscribe} style={{ marginTop: S.lg }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#e3e6ea", alignItems: "center", justifyContent: "center" },
  sheet: { backgroundColor: "#f2f4f7", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: S.xl },
  appIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: "#0b0d11", alignItems: "center", justifyContent: "center" },
  title: { color: "#0b0d11", fontFamily: F.bodySemi, fontSize: 17 },
  sub: { color: "#5f6772", fontFamily: F.body, fontSize: 13, marginTop: 1 },
  rows: { backgroundColor: "#fff", borderRadius: R.md, paddingHorizontal: S.lg, marginTop: S.lg },
  row: { justifyContent: "space-between", paddingVertical: 13 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#dfe3e8" },
  k: { color: "#5f6772", fontFamily: F.body, fontSize: 14 },
  v: { color: "#0b0d11", fontFamily: F.bodySemi, fontSize: 14, flexShrink: 1, marginLeft: S.md },
  confirm: { color: "#0b0d11", fontFamily: F.bodySemi, fontSize: 15, marginTop: S.sm },
  small: { color: "#5f6772", fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: 4, lineHeight: 17, paddingHorizontal: S.lg },
});
