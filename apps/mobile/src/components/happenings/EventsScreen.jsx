import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarCheck, CalendarX2 } from "lucide-react-native";
import { useEvents, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, EmptyState, F, FadeIn, R, Row, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import EventCard, { EventCardSkeleton } from "@/components/happenings/EventCard";
import { Chips, SectionLabel } from "@/components/happenings/shared";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ALL = "all";

function GoingBanner({ count, city }) {
  return (
    <View style={styles.banner}>
      <LinearGradient colors={["rgba(0,255,127,0.14)", "rgba(0,255,127,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Row gap={S.md}>
        <View style={styles.bannerIcon}>
          <CalendarCheck size={20} color={C.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{`${count} event${count === 1 ? "" : "s"} lined up${city === ALL ? "" : ` in ${city}`}`}</Text>
          <Text style={styles.bannerBody}>Check in on the day for XP and OUT.</Text>
        </View>
      </Row>
    </View>
  );
}

function EventsSkeleton() {
  return (
    <View>
      <Row gap={S.sm} style={{ paddingHorizontal: S.gutter }}>
        {[64, 96, 112].map((w) => (
          <Skeleton key={w} width={w} height={44} radius={22} />
        ))}
      </Row>
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.xxl }}>
        <Skeleton width={120} height={20} style={{ marginBottom: S.md }} />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </View>
    </View>
  );
}

export default function OutsideEventsScreen() {
  const router = useRouter();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("events");
  const { data: events, isPending, isRefetching, refetch } = useEvents();
  const { data: profile } = useProfile();
  const [city, setCity] = useState(null);

  const list = useMemo(() => events || [], [events]);

  const cities = useMemo(() => {
    const counts = new Map();
    for (const e of list) counts.set(e.city, (counts.get(e.city) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);

  // Default to the player's city once, if anything is on there.
  useEffect(() => {
    if (city !== null || !events) return;
    const home = profile?.city;
    setCity(home && cities.some(([c]) => c === home) ? home : ALL);
  }, [city, events, profile?.city, cities]);

  const active = city || ALL;
  const filtered = useMemo(() => (active === ALL ? list : list.filter((e) => e.city === active)), [list, active]);

  const sections = useMemo(() => {
    const now = Date.now();
    const live = filtered.filter((e) => e.status !== "upcoming");
    const week = filtered.filter((e) => e.status === "upcoming" && e.startAt - now <= WEEK_MS);
    const later = filtered.filter((e) => e.status === "upcoming" && e.startAt - now > WEEK_MS);
    return [
      { key: "live", title: "Live now", items: live },
      { key: "week", title: "This week", items: week },
      { key: "later", title: "Later", items: later },
    ].filter((s) => s.items.length);
  }, [filtered]);

  const going = filtered.filter((e) => e.isGoing || e.checkedIn).length;
  const options = [{ value: ALL, label: "All", count: list.length }, ...cities.map(([c, n]) => ({ value: c, label: c, count: n }))];

  let index = 0;
  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: S.lg, paddingBottom: TAB_BAR_SPACE }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
    >
      {isPending ? (
        <EventsSkeleton />
      ) : (
        <>
          <Chips options={options} value={active} onChange={setCity} />
          <View style={{ paddingHorizontal: S.gutter }}>
            {going ? (
              <FadeIn style={{ marginTop: S.lg }}>
                <GoingBanner count={going} city={active} />
              </FadeIn>
            ) : null}
            {sections.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="Nothing on here yet"
                body={active === ALL ? "New link-ups land every week. Pull down to refresh." : `No events in ${active} right now. Try another city.`}
                action={active === ALL ? undefined : "Show all cities"}
                onAction={() => setCity(ALL)}
              />
            ) : (
              sections.map((section) => (
                <View key={section.key}>
                  <SectionLabel title={section.title} count={section.items.length} live={section.key === "live"} />
                  {section.items.map((e) => (
                    <FadeIn key={e.occurrenceId} index={index++}>
                      <EventCard event={e} onPress={() => router.push(`/events/${e.id}`)} />
                    </FadeIn>
                  ))}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.35)", backgroundColor: C.surface, padding: S.lg, overflow: "hidden" },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: C.text, fontFamily: F.display, fontSize: 17 },
  bannerBody: { color: C.textDim, fontSize: 13, marginTop: 2 },
});
