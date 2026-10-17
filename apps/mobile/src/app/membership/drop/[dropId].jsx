// A drop locked for Black first: the moment people want Black most. The
// sheet sells first pick right there, or lets you wait for the public drop
// with a reminder.

import React, { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellRing, ChevronLeft, Clock, Lock, Share2 } from "@/components/ui/icons";
import { engine, useDrop, useEngineMutation, useMembershipDetails } from "@/data/hooks";
import { Body, Button, C, EmptyState, F, Header, IconButton, Kicker, R, Row, S, Screen, Skeleton } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { TRIAL_DAYS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

const clock = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

export default function LockedDrop() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dropId } = useLocalSearchParams();
  const id = Array.isArray(dropId) ? dropId[0] : dropId;
  const { data: drop, isPending, error } = useDrop(id);
  const { data: m } = useMembershipDetails();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const reminder = useEngineMutation(engine.toggleDropReminder, {
    success: (d) => (d?.reminder || d?.reminded ? "Reminder on. We'll ping you when it's public" : "Reminder off"),
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "flex-end", padding: S.gutter }}>
        <Skeleton height={320} radius={R.lg} />
      </View>
    );
  }
  if (error || !drop) {
    return (
      <Screen header={<Header back title="Drop" />}>
        <EmptyState title="Drop not found" body="It may have been pulled." action="See all drops" onAction={() => router.replace("/(tabs)/outside/drops")} />
      </Screen>
    );
  }

  const publicAt = drop.releaseAt || drop.dropAt || now;
  const isPublic = now >= publicAt;
  const onBlack = m?.tier === "black";
  const reminded = !!(drop.reminder || drop.reminded);
  const price = drop.priceOut != null ? `${formatNumber(drop.priceOut)} OUT` : drop.priceGbp != null ? `£${Number(drop.priceGbp).toFixed(Number(drop.priceGbp) % 1 ? 2 : 0)}` : null;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/outside/drops"));
  const share = () => Share.share({ message: `${drop.title} drops on Outhere. Black members get first pick.` }).catch(() => {});
  const goDrop = () => router.replace(`/drops/${drop.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Image source={drop.image || PHOTOS.shoe} style={[StyleSheet.absoluteFill, { bottom: "30%" }]} contentFit="cover" />
      <LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]} locations={[0, 0.3, 0.7]} style={StyleSheet.absoluteFill} />

      <Row style={[styles.top, { paddingTop: insets.top + S.sm }]}>
        <IconButton icon={ChevronLeft} onPress={back} label="Back" />
        <Row gap={6} style={styles.lockPill}>
          <Lock size={13} color={C.text} />
          <Text style={styles.lockText}>{isPublic ? "Now public" : onBlack ? "Your first pick" : "Black members first"}</Text>
        </Row>
        <IconButton icon={Share2} onPress={share} label="Share" />
      </Row>

      <View style={{ flex: 1 }} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
        <View style={styles.grab} />
        <Kicker>
          {drop.title}
          {drop.remaining != null && drop.remaining > 0 ? ` · ${drop.remaining} left` : drop.remaining === 0 ? " · sold out" : ""}
        </Kicker>
        <Text style={styles.h}>{onBlack ? "First pick" : "Claim it"}</Text>
        <Text style={[styles.h, { color: C.accent }]}>{onBlack ? "is yours" : "before anyone"}</Text>
        <Body dim size={13} style={{ marginTop: S.sm, lineHeight: 19 }}>
          {onBlack
            ? "You're Black, so you can claim it now, before it goes public."
            : "Black members get first pick of every drop. Everyone else can claim when it goes public."}
        </Body>
        <Row gap={S.sm} style={{ marginTop: S.md, flexWrap: "wrap" }}>
          <Row gap={6} style={styles.chip}>
            <Clock size={14} color={C.accent} />
            <Text style={styles.chipText}>{isPublic ? "Public now" : `Public in `}</Text>
            {!isPublic ? <Text style={[styles.chipText, styles.mono]}>{clock(publicAt - now)}</Text> : null}
          </Row>
          {price ? (
            <Row gap={6} style={styles.chip}>
              {drop.priceOut != null ? <Image source={PHOTOS.coin} style={{ width: 16, height: 16, borderRadius: 8 }} /> : null}
              <Text style={styles.chipText}>{price}</Text>
            </Row>
          ) : null}
        </Row>

        {onBlack || isPublic ? (
          <Button title={onBlack ? "Claim it now" : "See the drop"} size="lg" full style={{ marginTop: S.lg }} onPress={goDrop} />
        ) : (
          <>
            <Button
              title="Go Black and claim it now"
              size="lg"
              full
              style={{ marginTop: S.lg }}
              onPress={() => router.push({ pathname: "/membership/checkout", params: { plan: "black", billing: "monthly", drop: drop.id } })}
            />
            <Button
              title={reminded ? "We'll tell you when it's public" : "Wait for the public drop"}
              icon={reminded ? BellRing : undefined}
              variant="secondary"
              size="lg"
              full
              loading={reminder.isPending}
              style={{ marginTop: S.sm }}
              onPress={() => reminder.mutate(drop.id)}
            />
            {!m?.trialUsed ? (
              <Text style={styles.fine}>Black starts with {TRIAL_DAYS} days free. Cancel any time.</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, paddingHorizontal: S.gutter, justifyContent: "space-between", zIndex: 2 },
  lockPill: { height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(20,24,30,0.85)", borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  lockText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  sheet: { backgroundColor: "#0d1015", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: S.gutter, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  grab: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: C.surfaceHigh, marginBottom: 14 },
  h: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 37, textTransform: "uppercase" },
  chip: { height: 30, paddingHorizontal: 11, borderRadius: R.full, backgroundColor: C.surface, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 11.5 },
  mono: { fontVariant: ["tabular-nums"] },
  fine: { color: C.textMute, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.md },
});
