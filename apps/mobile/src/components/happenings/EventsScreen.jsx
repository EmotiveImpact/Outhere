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
export const whenWord = (ms) => {
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
        <Avatar key={p.id} uri={p.avatar} name={p.name} size={32} style={[styles.face, i > 0 && { marginLeft: -10 }]} />
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
      {/* .slab.photo 384: the event photo at full strength, faded into the floor */}
      <GlowHero photo={imageSource(event.image)} photoFocus={{ x: 0.5, y: 0.3 }} height={370} headlineSize={46} kicker={kicker} top={top} bottom={bottom}>
        <Row style={{ marginTop: 12, justifyContent: "space-between" }}>
          <Row gap={S.sm} style={{ flex: 1 }}>
            <Faces people={going?.people} />
            <Text style={styles.going} numberOfLines={1}>
              {formatNumber(going?.count ?? event.rsvpCount)} going
            </Text>
          </Row>
          {event.checkedIn ? (
            <Button title="Checked in" size="sm" variant="secondary" onPress={onOpen} />
          ) : event.isGoing ? (
            <Button title="Going" size="sm" variant="secondary" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, false])} />
          ) : (
            <Button
              size="sm"
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

/** .poster: the photo fills the card, a frosted day badge top left and the words over a dark fade. */
function Poster({ event, onPress }) {
  const at = new Date(event.startAt);
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.poster} accessibilityLabel={`Open ${event.title}`}>
      {event.image ? <Image source={imageSource(event.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(2,6,14,0.9)"]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.badge}>
        <Text style={styles.badgeDay}>{at.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</Text>
        <Text style={styles.badgeNum}>{at.getDate()}</Text>
      </View>
      {event.isGoing ? <Text style={styles.goingTag}>Going</Text> : null}
      <View style={styles.posterText}>
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
          {/* The prototype runs the posters straight under the strip; a label only shows once a day is picked. */}
          {picked != null ? (
            <View style={{ paddingHorizontal: S.gutter }}>
              <SectionLabel style={{ marginTop: 12 }} right="This week" onRight={() => setPicked(null)}>
                {new Date(picked).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </SectionLabel>
            </View>
          ) : (
            <View style={{ height: 12 }} />
          )}
          {cards.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 10 }}>
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
  going: { color: "#c3cad6", fontFamily: F.body, fontSize: 12 },
  // .strip: seven lit day tiles, today in blue with a glow
  strip: { paddingHorizontal: S.gutter, marginTop: 16 },
  day: { flex: 1, borderRadius: 14, backgroundColor: C.surface, alignItems: "center", paddingTop: 9, paddingBottom: 8, gap: 5, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)" },
  dayOn: { backgroundColor: C.accent, boxShadow: "0 8px 20px -8px rgba(61,139,255,0.8), inset 0 1px 0 rgba(255,255,255,0.25)" },
  dayName: { color: C.textDim, fontFamily: F.body, fontSize: 10.5 },
  dayNum: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, marginTop: -2 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  // .poster 168 x 112
  poster: { width: 168, height: 112, borderRadius: 18, backgroundColor: "#0d1118", overflow: "hidden" },
  badge: { position: "absolute", left: 9, top: 9, alignItems: "center", backgroundColor: "rgba(10,14,20,0.6)", backdropFilter: "blur(8px)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 5 },
  badgeDay: { color: "#fff", fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 0.6 },
  badgeNum: { color: "#fff", fontFamily: F.display, fontSize: 17, lineHeight: 18, marginTop: 2 },
  goingTag: { position: "absolute", right: 9, top: 9, color: "#fff", backgroundColor: C.accent, borderRadius: R.full, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 2, fontFamily: F.bodySemi, fontSize: 10.5 },
  posterText: { position: "absolute", left: 12, right: 10, bottom: 10 },
  posterTitle: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13, lineHeight: 16 },
  posterSub: { color: "#c3cad6", fontFamily: F.body, fontSize: 10.5, marginTop: 1 },
  nothing: { color: C.textDim, fontFamily: F.body, fontSize: 14, paddingHorizontal: S.gutter, lineHeight: 20 },
});
