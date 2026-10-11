import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarX2 } from "lucide-react-native";
import { useEvents, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { Body, C, EmptyState, Loading, S, TAB_BAR_SPACE } from "@/components/ui";
import EventCard from "@/components/happenings/EventCard";
import { Chips, SectionLabel } from "@/components/happenings/shared";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ALL = "all";

export default function OutsideEventsScreen() {
  const router = useRouter();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("events");
  const { data: events, isPending, isRefetching, refetch } = useEvents();
  const { data: profile } = useProfile();
  const [city, setCity] = useState(null);

  const list = events || [];

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
  const filtered = active === ALL ? list : list.filter((e) => e.city === active);

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

  const going = filtered.filter((e) => e.isGoing).length;

  const options = [{ value: ALL, label: "All", count: list.length }, ...cities.map(([c, n]) => ({ value: c, label: c, count: n }))];

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
        <Loading />
      ) : (
        <>
          <Chips options={options} value={active} onChange={setCity} />
          <View style={{ paddingHorizontal: S.gutter }}>
            {going ? (
              <Body dim size={13} style={{ marginTop: S.md }}>
                {`You're going to ${going} event${going === 1 ? "" : "s"}${active === ALL ? "" : ` in ${active}`}. Check in on the day for XP and OUT.`}
              </Body>
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
                    <EventCard key={e.occurrenceId} event={e} onPress={() => router.push(`/events/${e.id}`)} />
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
