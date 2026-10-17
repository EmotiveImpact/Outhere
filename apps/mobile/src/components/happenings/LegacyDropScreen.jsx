import React, { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bell, BellRing, Crown, Lock, PackageCheck } from "@/components/ui/icons";
import { engine, useDrop, useEngineMutation } from "@/data/hooks";
import { Body, Button, C, EmptyState, F, FadeIn, Header, ProgressBar, Row, S, Screen, Title } from "@/components/ui";
import { DropPills, dropAccent, dropState, earlyHours, useDropBoundaries } from "@/components/happenings/DropCard";
import { CountdownBoxes, HeroScreen, HeroSkeleton, priceLabel, useNow } from "@/components/happenings/shared";
import { ReservedSheet, SizePicker } from "@/components/happenings/DropParts";
import { detailStyles } from "@/components/happenings/DetailParts";
import Celebration from "@/components/happenings/Celebration";
import { dateLabel, formatNumber, timeLabel } from "@/utils/format";

export default function DropDetailScreen() {
  const router = useRouter();
  const { dropId } = useLocalSearchParams();
  const id = Array.isArray(dropId) ? dropId[0] : dropId;
  const { data: drop, isPending, error, refetch, isRefetching } = useDrop(id);
  const now = useNow(1000);
  const [size, setSize] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [party, setParty] = useState(0);

  useDropBoundaries(drop ? [drop] : [], now, refetch);

  useEffect(() => {
    if (drop?.sizes?.length === 1) setSize(drop.sizes[0]);
  }, [drop?.sizes]);

  const reserve = useEngineMutation(engine.reserveDrop, {
    success: "Reserved. It's yours",
    onSuccess: () => {
      setParty(Date.now());
      setTimeout(() => setSheet(true), 500);
    },
  });
  const reminder = useEngineMutation(engine.toggleDropReminder, { success: (d) => (d?.reminder ? "Reminder on. We'll ping you" : "Reminder off") });

  if (isPending) return <HeroSkeleton />;
  if (error || !drop) {
    return (
      <Screen header={<Header back title="Drop" />}>
        <EmptyState title="Drop not found" body="It may have been pulled." action="See all drops" onAction={() => router.replace("/outside/drops")} />
      </Screen>
    );
  }

  const state = dropState(drop);
  const lockedEarly = drop.status === "early" && !drop.hasEarlyAccess;
  const onSale = drop.status === "live" || drop.status === "early";
  const needsSize = drop.sizes.length > 1;
  const hrs = earlyHours(drop);
  const ReminderIcon = drop.reminder ? BellRing : Bell;
  const left = drop.stock ? drop.remaining / drop.stock : 0;

  const footer = (() => {
    if (drop.reservation) {
      return (
        <Row gap={S.md}>
          <View style={styles.tick}>
            <PackageCheck size={18} color={C.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.barTitle}>{`Reserved, size ${drop.reservation.size}`}</Text>
            <Text style={styles.barSub}>{`Ref ${drop.reservation.ref}`}</Text>
          </View>
          <Button size="sm" variant="secondary" title="Details" onPress={() => setSheet(true)} />
        </Row>
      );
    }
    if (drop.status === "soldout") return <Button full size="lg" variant="secondary" title="Sold out" disabled />;
    const priceBlock = (
      <View>
        <Text style={styles.barPrice}>{priceLabel(drop.priceGbp)}</Text>
        {!needsSize || size ? <Text style={styles.barSub}>{needsSize ? `Size ${size}` : drop.sizes[0]}</Text> : null}
      </View>
    );
    if (lockedEarly) {
      return (
        <Row gap={S.md}>
          {priceBlock}
          <View style={{ flex: 1 }}>
            <Button full size="lg" icon={Lock} title="Unlock early access" loading={reserve.isPending} onPress={() => reserve.mutate([drop.id, size || drop.sizes[0]])} />
          </View>
        </Row>
      );
    }
    if (onSale) {
      return (
        <Row gap={S.md}>
          {priceBlock}
          <View style={{ flex: 1 }}>
            <Button full size="lg" title={needsSize && !size ? "Pick a size" : "Reserve"} disabled={needsSize && !size} loading={reserve.isPending} onPress={() => reserve.mutate([drop.id, size])} />
          </View>
        </Row>
      );
    }
    return (
      <Row gap={S.md}>
        {priceBlock}
        <View style={{ flex: 1 }}>
          <Button
            full
            size="lg"
            variant={drop.reminder ? "secondary" : "primary"}
            icon={ReminderIcon}
            title={drop.reminder ? "Reminder on" : "Remind me"}
            loading={reminder.isPending}
            onPress={() => reminder.mutate(drop.id)}
          />
        </View>
      </Row>
    );
  })();

  const overlay = (
    <>
      <DropPills drop={drop} />
      <Row style={{ alignItems: "flex-end", marginTop: S.md }} gap={S.md}>
        <Title size={36} style={styles.heroTitle}>
          {drop.title}
        </Title>
        <Text style={styles.heroPrice}>{priceLabel(drop.priceGbp)}</Text>
      </Row>
      <Body size={15} style={{ color: "#c8c8cc", marginTop: 6 }}>
        {drop.subtitle}
      </Body>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <HeroScreen
        source={drop.image}
        seed={drop.id}
        accent={dropAccent(drop)}
        height={460}
        overlay={overlay}
        footer={footer}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      >
        {state.target ? (
          <FadeIn>
            <View style={detailStyles.card}>
              <Text style={styles.cardTitle}>{state.sub}</Text>
              <CountdownBoxes target={state.target} now={now} size="lg" style={{ marginVertical: S.md }} />
              <Body dim size={13}>
                {state.headline}
              </Body>
            </View>
          </FadeIn>
        ) : null}

        {drop.status === "live" ? (
          <FadeIn>
            <View style={detailStyles.card}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.cardTitle}>Stock</Text>
                {left < 0.2 ? <Text style={styles.small}>Going fast</Text> : null}
              </Row>
              <Row gap={6} style={{ alignItems: "flex-end", marginTop: S.md, marginBottom: S.md }}>
                <Text style={styles.big}>{formatNumber(drop.remaining)}</Text>
                <Text style={[styles.small, { marginBottom: 10 }]}>{`of ${formatNumber(drop.stock)} left`}</Text>
              </Row>
              <ProgressBar value={left} height={6} />
            </View>
          </FadeIn>
        ) : null}

        {!drop.reservation && drop.status !== "soldout" && needsSize ? (
          <FadeIn index={1}>
            <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: S.md }]}>Size</Text>
            <SizePicker sizes={drop.sizes} value={size} onChange={setSize} />
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: S.md }]}>The kit</Text>
          <Body dim size={16} style={{ lineHeight: 25 }}>
            {drop.description}
          </Body>
        </FadeIn>

        {drop.status !== "soldout" ? (
          <FadeIn index={3}>
            <View style={[detailStyles.card, { marginTop: 32 }]}>
              <Row gap={S.md} style={{ alignItems: "flex-start" }}>
                <Crown size={18} color={C.pro} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Title size={17}>{drop.hasEarlyAccess ? "You have early access" : "How early access works"}</Title>
                  <Body dim size={13} style={{ marginTop: 4 }}>
                    {`Pro and Black reserve ${hrs} hours before the public, from ${dateLabel(drop.earlyAccessAt)} at ${timeLabel(drop.earlyAccessAt)}. Everyone else gets in from ${dateLabel(drop.releaseAt)} at ${timeLabel(drop.releaseAt)}.`}
                  </Body>
                  {!drop.hasEarlyAccess ? (
                    <Button variant="secondary" size="sm" title="See membership" onPress={() => router.push("/membership")} style={{ alignSelf: "flex-start", marginTop: S.md }} />
                  ) : null}
                </View>
              </Row>
            </View>
          </FadeIn>
        ) : null}

        {lockedEarly ? (
          <Row style={{ justifyContent: "space-between", marginTop: S.xl }} gap={S.md}>
            <Body dim size={14} style={{ flex: 1 }}>
              {drop.reminder ? "We'll ping you at public release" : "Get a ping at public release"}
            </Body>
            <Button size="sm" variant="secondary" icon={ReminderIcon} title={drop.reminder ? "On" : "Remind me"} loading={reminder.isPending} onPress={() => reminder.mutate(drop.id)} />
          </Row>
        ) : null}
      </HeroScreen>
      <Celebration trigger={party} title="Reserved" subtitle={drop.reservation ? `Size ${drop.reservation.size}` : undefined} />
      <ReservedSheet visible={sheet} onClose={() => setSheet(false)} drop={drop} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: { flex: 1, lineHeight: 38, letterSpacing: -0.8 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  heroPrice: { color: C.text, fontFamily: F.display, fontSize: 36, letterSpacing: -1 },
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  big: { color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 60, letterSpacing: -1 },
  sectionTitle: { color: C.text, fontFamily: F.display, fontSize: 20 },
  tick: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  barTitle: { color: C.text, fontFamily: F.display, fontSize: 17 },
  barSub: { color: C.textDim, fontSize: 12, marginTop: 1 },
  barPrice: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: -0.5 },
});

