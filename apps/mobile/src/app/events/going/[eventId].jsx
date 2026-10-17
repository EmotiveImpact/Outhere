// Who's going: people you follow and your club first, then everyone else,
// with add to calendar and directions.

import React from "react";
import { FlatList, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarPlus, Navigation } from "@/components/ui/icons";
import { engine, useEngineMutation, useEvent, useEventGoing } from "@/data/hooks";
import { Avatar, Button, C, EmptyState, F, imageSource, PressableScale, R, Row, S, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { ButtonPair, GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { whenWord } from "@/components/happenings/EventsScreen";
import { openDirections } from "@/components/happenings/shared";
import { addToCalendar } from "@/components/happenings/calendar";
import { formatNumber } from "@/utils/format";

const listNames = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

function FollowButton({ person }) {
  const follow = useEngineMutation(person.following ? engine.unfollow : engine.follow, { silent: false });
  return (
    <Button
      size="sm"
      variant={person.following ? "secondary" : "primary"}
      title={person.following ? "Following" : "Follow"}
      loading={follow.isPending}
      style={{ height: 30, paddingHorizontal: 12 }}
      onPress={() => follow.mutate(person.id)}
    />
  );
}

export default function GoingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams();
  const id = String(eventId || "");
  const event = useEvent(id).data;
  const { data, isPending, refetch, isRefetching } = useEventGoing(id);
  const people = data?.people || [];
  const known = people.filter((p) => p.following || p.sameClub);
  const firstNames = known.slice(0, 3).map((p) => p.name.split(" ")[0]);
  const clubExtra = Math.max(0, (data?.clubCount || 0) - known.filter((p) => p.sameClub).length);

  const header = (
    <>
      {/* .slab.photo 250: the event photo at full strength behind the count */}
      <GlowHero photo={event?.image ? imageSource(event.image) : undefined} photoFocus={{ x: 0.5, y: 0.3 }} height={236} kicker={event ? `${event.title} · ${whenWord(event.startAt)}` : "Who's going"} top={null}>
        <Text style={styles.big}>
          {formatNumber(data?.count ?? event?.rsvpCount ?? 0)} <Text style={{ color: C.accent }}>going</Text>
        </Text>
      </GlowHero>
      {/* .card.fgo: the people you know first */}
      {firstNames.length ? (
        <Surface radius={20} padding={null} style={styles.friendsWrap} contentStyle={styles.friends}>
          <Row gap={0}>
            {known.slice(0, 3).map((p, i) => (
              <Avatar key={p.id} uri={p.avatar} name={p.name} size={24} style={[styles.face, i > 0 && { marginLeft: -8 }]} />
            ))}
          </Row>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendsTitle} numberOfLines={2}>
              {listNames(firstNames)} {firstNames.length === 1 ? "is" : "are"} going
            </Text>
            {clubExtra && data?.clubName ? <Text style={styles.sub}>And {clubExtra} more from {data.clubName}</Text> : null}
          </View>
        </Surface>
      ) : (
        <View style={{ height: 16 }} />
      )}
    </>
  );
  // The prototype keeps the two buttons right under the list, with the tab bar below.
  const footer = (
    <ButtonPair
      style={{ marginTop: 10, marginHorizontal: S.gutter }}
      secondary={{ title: "Add to calendar", icon: CalendarPlus, style: styles.footBtn, onPress: () => event && addToCalendar(event) }}
      primary={{ title: "Directions", icon: Navigation, style: styles.footBtn, onPress: () => event && openDirections(event.location, event.city) }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + S.lg }}
        ListEmptyComponent={
          isPending ? (
            <View style={{ padding: S.gutter, gap: S.md }}>
              <Skeleton height={60} radius={R.md} />
              <Skeleton height={60} radius={R.md} />
            </View>
          ) : (
            <EmptyState title="Be the first in" body="Nobody has said they're going yet." />
          )
        }
        renderItem={({ item: p, index }) => (
          <PressableScale onPress={() => router.push(`/player/${p.id}`)} scaleTo={0.99} style={[styles.row, index === 0 && styles.rowFirst, index === people.length - 1 && styles.rowLast]}>
            {index > 0 ? <View pointerEvents="none" style={styles.line} /> : null}
            <Avatar uri={p.avatar} name={p.name} size={32} tier={p.tier} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                Wave {p.wave}
                {p.club ? ` · ${p.club}` : ""}
              </Text>
            </View>
            <FollowButton person={p} />
          </PressableScale>
        )}
      />
      <StackTabBar current="outside" />
      <TopBar onShare={() => event && Share.share({ message: `${formatNumber(data?.count || 0)} going to ${event.title}. Come with me on Outhere.` }).catch(() => {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 46, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  friendsWrap: { marginHorizontal: S.gutter, marginTop: 16, marginBottom: 10 },
  friends: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  face: { borderWidth: 2, borderColor: "#14181f" },
  friendsTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2 },
  footBtn: { flex: 1, height: 46, paddingHorizontal: 10 },
  // .setlist: one lit card, a hairline between people
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: S.gutter, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.surface },
  rowFirst: { borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" },
  rowLast: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  name: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13 },
  line: { position: "absolute", top: 0, left: 14, right: 14, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
});
