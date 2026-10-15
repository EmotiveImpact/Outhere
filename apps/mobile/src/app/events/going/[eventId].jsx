// Who's going: people you follow and your club first, then everyone else,
// with add to calendar and directions.

import React from "react";
import { FlatList, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarPlus, Navigation } from "lucide-react-native";
import { engine, useEngineMutation, useEvent, useEventGoing } from "@/data/hooks";
import { Avatar, Button, C, EmptyState, F, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { BottomBar, ButtonPair, GlowHero, TopBar } from "@/components/arena/OutsideKit";
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
      <GlowHero height={170} kicker={event ? `${event.title} · ${whenWord(event.startAt)}` : "Who's going"} top={null}>
        <Text style={styles.big}>
          {formatNumber(data?.count ?? event?.rsvpCount ?? 0)} <Text style={{ color: C.accent }}>going</Text>
        </Text>
      </GlowHero>
      {firstNames.length ? (
        <View style={styles.friends}>
          <Row gap={0}>
            {known.slice(0, 3).map((p, i) => (
              <Avatar key={p.id} uri={p.avatar} name={p.name} size={30} style={[styles.face, i > 0 && { marginLeft: -10 }]} />
            ))}
          </Row>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendsTitle} numberOfLines={2}>
              {listNames(firstNames)} {firstNames.length === 1 ? "is" : "are"} going
            </Text>
            {clubExtra && data?.clubName ? <Text style={styles.sub}>And {clubExtra} more from {data.clubName}</Text> : null}
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
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
            <Avatar uri={p.avatar} name={p.name} size={40} tier={p.tier} />
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
      <BottomBar>
        <ButtonPair
          secondary={{ title: "Add to calendar", icon: CalendarPlus, onPress: () => event && addToCalendar(event) }}
          primary={{ title: "Directions", icon: Navigation, onPress: () => event && openDirections(event.location, event.city) }}
        />
      </BottomBar>
      <TopBar onShare={() => event && Share.share({ message: `${formatNumber(data?.count || 0)} going to ${event.title}. Come with me on Outhere.` }).catch(() => {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 52, textTransform: "uppercase" },
  friends: { flexDirection: "row", alignItems: "center", gap: S.md, margin: S.gutter, marginBottom: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  face: { borderWidth: 2, borderColor: C.surface },
  friendsTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, marginHorizontal: S.gutter, paddingHorizontal: S.lg, paddingVertical: 12, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rowFirst: { borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderTopWidth: 0 },
  rowLast: { borderBottomLeftRadius: R.lg, borderBottomRightRadius: R.lg },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
