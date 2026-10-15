// Outside > Events. The next event fills the top with one-tap RSVP, a week
// strip picks a day, and poster cards cover the rest of the week.

import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { engine, useEngineMutation, useEventGoing, useEvents, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { Avatar, Button, C, EmptyState, F, FadeIn, imageSource, PressableScale, R, Row, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, SectionLabel } from "@/components/arena/OutsideKit";
import { formatNumber, timeLabel } from "@/utils/format";

const DAY = 86_400_000;
const dayStart = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const weekStart = (ms) => {
  const d = new Date(dayStart(ms));
  const back = (d.getDay() + 6) % 7; // Monday first
  return d.getTime() - back * DAY;
};

/** "Tonight", "Today", "Tomorrow" or "Sat". */
const whenWord = (ms) => {
  const days = Math.round((dayStart(ms) - dayStart(Date.now())) / DAY);
  if (days === 0) return new Date(ms).getHours() >= 17 ? "Tonight" : "Today";
  if (days === 1) return "Tomorrow";
  return new Date(ms).toLocaleDateString("en-GB", { weekday: "long" });
};

/** Split a title over the white and blue lines: "City" / "Night Run". */
export const splitTitle = (title = "") => {
  const words = String(title).trim().split(/\s+/);
  if (words.length < 2) return [title, null];
  const cut = Math.max(1, Math.floor(words.length / 2));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
};

function Faces({ people }) {
  if (!people?.length) return null;
  return (
    <Row gap={0}>
      {people.slice(0, 3).map((p, i) => (
        <Avatar key={p.id} uri={p.avatar} name={p.name} size={28} style={[styles.face, i > 0 && { marginLeft: -9 }]} />
      ))}
    </Row>
  );
}

function NextEvent({ event, onOpen }) {
  const going = useEventGoing(event.id).data;
  const rsvp = useEngineMutation(engine.rsvpEvent, { success: (e) => (e?.isGoing ? "You're going" : "Maybe next time") });
  const [top, bottom] = splitTitle(event.title);
  const live = event.status === "live";
  const kicker = `${live ? "On now" : whenWord(event.startAt)} · ${timeLabel(event.startAt)} · ${event.location}`;
  return (
    <PressableScale onPress={onOpen} scaleTo={0.995} haptic={false} accessibilityLabel={`Open ${event.title}`}>
      <GlowHero photo={imageSource(event.image)} photoOpacity={0.4} height={330} kicker={kicker} top={top} bottom={bottom}>
        <Row style={{ marginTop: S.lg, justifyContent: "space-between" }}>
          <Row gap={S.sm} style={{ flex: 1 }}>
            <Faces people={going?.people} />
            <Text style={styles.going} numberOfLines={1}>
              {formatNumber(going?.count ?? event.rsvpCount)} going
            </Text>
          </Row>
          {event.checkedIn ? (
            <Button title="Checked in" variant="secondary" onPress={onOpen} />
          ) : event.isGoing ? (
            <Button title="Going" variant="secondary" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, false])} />
          ) : (
            <Button
              title={event.isFull ? "Full" : !event.canAttend ? "Members" : "I'm going"}
              disabled={event.isFull}
              loading={rsvp.isPending}
              onPress={() => (event.canAttend ? rsvp.mutate([event.id, true]) : onOpen())}
            />
          )}
        </Row>
      </GlowHero>
    </PressableScale>
  );
}

function WeekStrip({ days, selected, today, onPick }) {
  return (
    <Row gap={6} style={styles.strip}>
      {days.map((d) => {
        const on = d.at === selected;
        const past = d.at < today;
        return (
          <PressableScale key={d.at} onPress={() => onPick(d.at)} scaleTo={0.92} style={[styles.day, on && styles.dayOn, past && !on && { opacity: 0.45 }]} accessibilityLabel={new Date(d.at).toDateString()}>
            <Text style={[styles.dayName, on && { color: "#fff" }]}>{new Date(d.at).toLocaleDateString("en-GB", { weekday: "short" })}</Text>
            <Text style={[styles.dayNum, on && { color: "#fff" }]}>{new Date(d.at).getDate()}</Text>
            <View style={[styles.dayDot, { backgroundColor: d.count ? (on ? "#fff" : C.accent) : "transparent" }]} />
          </PressableScale>
        );
      })}
    </Row>
  );
}

function Poster({ event, onPress }) {
  const at = new Date(event.startAt);
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.poster}>
      <View style={styles.posterArt}>
        {event.image ? <Image source={imageSource(event.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <LinearGradient colors={["rgba(7,9,12,0.55)", "rgba(7,9,12,0)"]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
        <View style={styles.badge}>
          <Text style={styles.badgeDay}>{at.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</Text>
          <Text style={styles.badgeNum}>{at.getDate()}</Text>
        </View>
        {event.isGoing ? <Text style={styles.goingTag}>Going</Text> : null}
      </View>
      <View style={{ padding: S.md }}>
        <Text style={styles.posterTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.posterSub} numberOfLines={1}>
          {event.location} · {formatNumber(event.rsvpCount)} going
        </Text>
      </View>
    </PressableScale>
  );
}

export default function OutsideEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("events");
  const { data: events, isPending, isRefetching, refetch } = useEvents();
  const city = useProfile().data?.city;
  const [picked, setPicked] = useState(null);

  const list = useMemo(() => (events || []).filter((e) => e.status !== "ended"), [events]);
  // The hero is the next thing on in your city, else anywhere.
  const hero = useMemo(() => list.find((e) => e.city === city) || list[0] || null, [list, city]);

  const today = dayStart(Date.now());
  const days = useMemo(() => {
    const start = weekStart(Date.now());
    return Array.from({ length: 7 }, (_, i) => {
      const at = start + i * DAY;
      return { at, count: list.filter((e) => dayStart(e.startAt) === at).length };
    });
  }, [list]);

  const selected = picked ?? today;
  const cards = picked == null ? list.filter((e) => e.occurrenceId !== hero?.occurrenceId) : list.filter((e) => dayStart(e.startAt) === picked);
  const open = (e) => router.push(`/events/${e.id}`);

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + S.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
    >
      {isPending ? (
        <View>
          <Skeleton height={360 + insets.top} radius={30} />
          <Row gap={6} style={styles.strip}>
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} height={62} radius={14} style={{ flex: 1 }} />
            ))}
          </Row>
        </View>
      ) : !hero ? (
        <EmptyState style={{ paddingTop: insets.top + 90 }} title="Nothing on yet" body="New link-ups land every week. Pull down to refresh." />
      ) : (
        <>
          <NextEvent event={hero} onOpen={() => open(hero)} />
          <WeekStrip days={days} selected={selected} today={today} onPick={(at) => setPicked(at === picked ? null : at)} />
          <View style={{ paddingHorizontal: S.gutter }}>
            <SectionLabel style={{ marginTop: S.md }} right={picked != null ? "This week" : null} onRight={() => setPicked(null)}>
              {picked == null ? "Coming up" : new Date(picked).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </SectionLabel>
          </View>
          {cards.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.md }}>
              {cards.map((e, i) => (
                <FadeIn key={e.occurrenceId} index={i}>
                  <Poster event={e} onPress={() => open(e)} />
                </FadeIn>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.nothing}>Nothing on this day. Pick another, or start a link-up from your club.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  face: { borderWidth: 2, borderColor: C.bg },
  going: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 14 },
  strip: { paddingHorizontal: S.gutter, marginTop: S.lg },
  day: { flex: 1, height: 64, borderRadius: 14, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", gap: 2 },
  dayOn: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  dayName: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  dayNum: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  poster: { width: 200, borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  posterArt: { height: 112, backgroundColor: "#0d1118" },
  badge: { position: "absolute", left: 10, top: 8, alignItems: "flex-start" },
  badgeDay: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 0.6 },
  badgeNum: { color: "#fff", fontFamily: F.display, fontSize: 20, lineHeight: 22 },
  goingTag: { position: "absolute", right: 10, top: 10, color: "#fff", backgroundColor: C.accent, borderRadius: R.full, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 2, fontFamily: F.bodySemi, fontSize: 11 },
  posterTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  posterSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 3 },
  nothing: { color: C.textDim, fontFamily: F.body, fontSize: 14, paddingHorizontal: S.gutter, lineHeight: 20 },
});
