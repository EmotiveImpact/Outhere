import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { Bell, BellRing, Crown, Lock, PackageCheck, PackageOpen } from "lucide-react-native";
import { engine, useDrop, useEngineMutation } from "@/data/hooks";
import { Body, Button, C, Card, EmptyState, F, Header, Label, Loading, Pill, ProgressBar, R, Row, S, Screen, Title } from "@/components/ui";
import { dropState, earlyHours, useDropBoundaries } from "@/components/happenings/DropCard";
import { HeroScreen, priceLabel, useNow } from "@/components/happenings/shared";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { countdown, dateLabel, formatNumber, timeLabel } from "@/utils/format";

export default function DropDetailScreen() {
  const router = useRouter();
  const { dropId } = useLocalSearchParams();
  const id = Array.isArray(dropId) ? dropId[0] : dropId;
  const { data: drop, isPending, error, refetch, isRefetching } = useDrop(id);
  const now = useNow(1000);
  const [size, setSize] = useState(null);
  const [justReserved, setJustReserved] = useState(false);

  useDropBoundaries(drop ? [drop] : [], now, refetch);

  useEffect(() => {
    if (drop?.sizes?.length === 1) setSize(drop.sizes[0]);
  }, [drop?.sizes]);

  const reserve = useEngineMutation(engine.reserveDrop, {
    onSuccess: () => {
      hapticSuccess();
      setJustReserved(true);
    },
  });
  const reminder = useEngineMutation(engine.toggleDropReminder, { onSuccess: (d) => d?.reminder && hapticSuccess() });

  if (isPending) {
    return (
      <Screen header={<Header back title="Drop" />}>
        <Loading />
      </Screen>
    );
  }
  if (error || !drop) {
    return (
      <Screen header={<Header back title="Drop" />}>
        <EmptyState
          icon={PackageOpen}
          title="Drop not found"
          body="It may have been pulled."
          action="See all drops"
          onAction={() => router.replace("/outside/drops")}
        />
      </Screen>
    );
  }

  const state = dropState(drop);
  const lockedEarly = drop.status === "early" && !drop.hasEarlyAccess;
  const onSale = drop.status === "live" || drop.status === "early";
  const needsSize = drop.sizes.length > 1;
  const hrs = earlyHours(drop);
  const ReminderIcon = drop.reminder ? BellRing : Bell;

  const footer = (() => {
    if (drop.reservation) return null;
    if (drop.status === "soldout") return <Button full size="lg" variant="secondary" title="Sold out" disabled />;
    if (lockedEarly) {
      return (
        <Button
          full
          size="lg"
          icon={Lock}
          title="Unlock early access"
          loading={reserve.isPending}
          onPress={() => reserve.mutate([drop.id, size || drop.sizes[0]])}
        />
      );
    }
    if (onSale) {
      return (
        <Button
          full
          size="lg"
          title={needsSize && !size ? "Pick a size" : `Reserve${size && needsSize ? ` size ${size}` : ""} for ${priceLabel(drop.priceGbp)}`}
          disabled={needsSize && !size}
          loading={reserve.isPending}
          onPress={() => reserve.mutate([drop.id, size])}
        />
      );
    }
    return (
      <Button
        full
        size="lg"
        variant={drop.reminder ? "secondary" : "primary"}
        icon={ReminderIcon}
        title={drop.reminder ? "Reminder on. Tap to turn off" : "Remind me when it drops"}
        loading={reminder.isPending}
        onPress={() => reminder.mutate(drop.id)}
      />
    );
  })();

  return (
    <HeroScreen
      image={drop.image}
      height={380}
      footer={footer}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
    >
      <Row gap={6}>
        <Pill {...state.pill} icon={drop.status === "early" ? Crown : undefined} />
        <Pill label={drop.tag.toUpperCase()} />
      </Row>
      <Title size={32} style={{ marginTop: S.md }}>
        {drop.title}
      </Title>
      <Body dim style={{ marginTop: 4 }}>
        {drop.subtitle}
      </Body>
      <Text style={styles.price}>{priceLabel(drop.priceGbp)}</Text>

      {drop.reservation ? (
        <MotiView
          from={justReserved ? { opacity: 0, translateY: 12 } : undefined}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 350 }}
        >
          <Card highlight style={{ marginTop: S.xl }}>
            <Row gap={S.md}>
              <View style={styles.badge}>
                <PackageCheck size={22} color={C.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Title size={19}>{justReserved ? "Reserved. It's yours" : "You've reserved this"}</Title>
                <Body dim size={13}>
                  {`Size ${drop.reservation.size}, held since ${dateLabel(drop.reservation.at)} at ${timeLabel(drop.reservation.at)}.`}
                </Body>
              </View>
            </Row>
            <View style={styles.ref}>
              <Label>Reference</Label>
              <Text style={styles.refText}>{drop.reservation.ref}</Text>
            </View>
            <Body mute size={13}>
              {"Checkout isn't live in the app yet, so we're holding it for you. We'll message you when payment opens."}
            </Body>
          </Card>
        </MotiView>
      ) : null}

      {state.target ? (
        <Card style={{ marginTop: S.xl }}>
          <Label>{state.sub}</Label>
          <Text style={styles.count}>{countdown(state.target, now)}</Text>
          <Body dim size={13}>
            {state.headline}
          </Body>
        </Card>
      ) : null}

      {drop.status === "live" ? (
        <Card style={{ marginTop: S.xl }}>
          <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
            <Label>Stock</Label>
            <Text style={styles.small}>{`${formatNumber(drop.remaining)} of ${formatNumber(drop.stock)} left`}</Text>
          </Row>
          <ProgressBar value={drop.stock ? drop.remaining / drop.stock : 0} colour={drop.remaining / drop.stock < 0.2 ? C.fire : C.accent} />
        </Card>
      ) : null}

      {!drop.reservation && drop.status !== "soldout" && needsSize ? (
        <>
          <Label style={{ marginTop: S.xl, marginBottom: S.md }}>Size</Label>
          <Row gap={S.sm} style={{ flexWrap: "wrap" }}>
            {drop.sizes.map((s) => {
              const active = s === size;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    hapticSelection();
                    setSize(s);
                  }}
                  style={[styles.size, active && styles.sizeActive]}
                >
                  <Text style={[styles.sizeText, active && { color: C.accentText }]}>{s}</Text>
                </Pressable>
              );
            })}
          </Row>
          {!onSale ? (
            <Body mute size={13} style={{ marginTop: S.sm }}>
              Pick now and you're ready to go the second it opens.
            </Body>
          ) : null}
        </>
      ) : null}

      <Body dim style={{ marginTop: S.xl, lineHeight: 23 }}>
        {drop.description}
      </Body>

      {drop.status !== "soldout" ? (
        <Card style={{ marginTop: S.xl }}>
          <Row gap={S.md} style={{ alignItems: "flex-start" }}>
            <Crown size={20} color={drop.hasEarlyAccess ? C.accent : C.pro} />
            <View style={{ flex: 1 }}>
              <Title size={17}>{drop.hasEarlyAccess ? "You have early access" : "How early access works"}</Title>
              <Body dim size={13} style={{ marginTop: 4 }}>
                {`Pro and Black members can reserve ${hrs} hours before the public release, from ${dateLabel(drop.earlyAccessAt)} at ${timeLabel(drop.earlyAccessAt)}. Everyone else gets in from ${dateLabel(drop.releaseAt)} at ${timeLabel(drop.releaseAt)}.`}
              </Body>
              {!drop.hasEarlyAccess ? (
                <Button
                  variant="outline"
                  size="sm"
                  title="See membership"
                  onPress={() => router.push("/membership")}
                  style={{ alignSelf: "flex-start", marginTop: S.md }}
                />
              ) : null}
            </View>
          </Row>
        </Card>
      ) : null}

      {lockedEarly ? (
        <Row style={{ justifyContent: "space-between", marginTop: S.xl }}>
          <Body dim size={14} style={{ flex: 1 }}>
            {drop.reminder ? "We'll ping you at public release" : "Get a ping at public release"}
          </Body>
          <Button
            size="sm"
            variant={drop.reminder ? "primary" : "secondary"}
            icon={ReminderIcon}
            title={drop.reminder ? "On" : "Remind me"}
            loading={reminder.isPending}
            onPress={() => reminder.mutate(drop.id)}
          />
        </Row>
      ) : null}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  price: { color: C.text, fontFamily: F.display, fontSize: 28, marginTop: S.md },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  ref: { backgroundColor: C.bg, borderRadius: R.md, padding: S.md, marginVertical: S.md, gap: 4 },
  refText: { color: C.accent, fontFamily: F.display, fontSize: 24, letterSpacing: 2 },
  count: { color: C.text, fontFamily: F.display, fontSize: 40, marginVertical: 4, fontVariant: ["tabular-nums"] },
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  size: {
    minWidth: 56,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeActive: { backgroundColor: C.accent, borderColor: C.accent },
  sizeText: { color: C.text, fontSize: 15, fontWeight: "700" },
});
