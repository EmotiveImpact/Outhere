// One search across people, crews and events, with the match highlighted.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useProfile, useSearchAll, useSuggestedPeople } from "@/data/hooks";
import { Avatar, C, Card, EmptyState, F, FadeIn, PressableScale, R, Row, S, Screen, SectionHeader, Segment, Skeleton } from "@/components/ui";
import { CrewLogo, FollowButton, Highlight, SearchField } from "@/components/profile/PeopleBits";
import { PillButton } from "@/components/profile/parts";

const TABS = [
  { value: "all", label: "All" },
  { value: "people", label: "People" },
  { value: "crews", label: "Crews" },
  { value: "events", label: "Events" },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [text, setText] = useState(typeof params.q === "string" ? params.q : "");
  const [query, setQuery] = useState(text);
  const [tab, setTab] = useState("all");
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);
  const { data: me } = useProfile();
  const { data, isFetching } = useSearchAll(query);
  const { data: suggested } = useSuggestedPeople();
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const r = query && data ? data : null;
  const total = r ? r.people.length + r.crews.length + r.events.length : 0;
  const show = (k) => tab === "all" || tab === k;
  const cap = (list) => (tab === "all" ? list.slice(0, 3) : list);

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View style={{ paddingTop: insets.top + S.md, paddingHorizontal: S.gutter }}>
        <Row gap={S.md}>
          <SearchField value={text} onChangeText={setText} placeholder="People, crews and events" autoFocus focused style={{ flex: 1 }} />
          <PressableScale onPress={close} accessibilityLabel="Cancel">
            <Text style={styles.cancel}>Cancel</Text>
          </PressableScale>
        </Row>
        <Segment options={TABS} value={tab} onChange={setTab} style={{ marginTop: S.md }} />
      </View>

      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.lg }}>
        {!query ? (
          suggested?.length ? (
            <View>
              <SectionHeader title={me?.area || me?.city ? `People near ${me.area || me.city}` : "People you might know"} />
              <View style={{ gap: S.sm }}>
                {suggested.slice(0, 6).map((p, i) => (
                  <PersonRow key={p.id} p={p} index={i} onPress={() => router.push(`/player/${p.id}`)} />
                ))}
              </View>
            </View>
          ) : (
            <EmptyState icon={Search} title="Search Outhere" body="Find people by name or @username, crews near you and events coming up." />
          )
        ) : !r ? (
          <Skeleton height={220} radius={R.lg} />
        ) : !total ? (
          <EmptyState icon={Search} title={`Nothing for "${query}"`} body="Try a name, a @username, a crew or a place." />
        ) : (
          <>
            {show("crews") && r.crews.length ? (
              <View>
                <SectionHeader title="Crews" action={tab === "all" && r.crews.length > 3 ? `See ${r.crews.length}` : undefined} onAction={() => setTab("crews")} />
                <View style={{ gap: S.sm }}>
                  {cap(r.crews).map((c, i) => (
                    <FadeIn key={c.id} index={i}>
                      <Card padding={S.md} onPress={() => router.push(`/crew/${c.id}`)}>
                        <Row gap={S.md}>
                          <CrewLogo crew={c} />
                          <View style={{ flex: 1 }}>
                            <Highlight text={c.name} query={query} style={styles.name} />
                            <Text style={styles.meta} numberOfLines={1}>
                              {[`${c.memberCount} member${c.memberCount === 1 ? "" : "s"}`, c.area || c.city].filter(Boolean).join(" · ")}
                            </Text>
                          </View>
                          <PillButton title={c.isMember ? "Joined" : "View"} ghost={c.isMember} onPress={() => router.push(`/crew/${c.id}`)} />
                        </Row>
                      </Card>
                    </FadeIn>
                  ))}
                </View>
              </View>
            ) : null}

            {show("events") && r.events.length ? (
              <View>
                <SectionHeader title="Events" action={tab === "all" && r.events.length > 2 ? `See ${r.events.length}` : undefined} onAction={() => setTab("events")} />
                <View style={{ gap: S.sm }}>
                  {(tab === "all" ? r.events.slice(0, 2) : r.events).map((e, i) => (
                    <FadeIn key={e.occurrenceId || e.id} index={i}>
                      <EventTile e={e} query={query} onPress={() => router.push(`/events/${e.id}`)} />
                    </FadeIn>
                  ))}
                </View>
              </View>
            ) : null}

            {show("people") && r.people.length ? (
              <View>
                <SectionHeader title="People" action={tab === "all" && r.people.length > 3 ? `See ${r.people.length}` : undefined} onAction={() => setTab("people")} />
                <View style={{ gap: S.sm }}>
                  {cap(r.people).map((p, i) => (
                    <PersonRow key={p.id} p={p} index={i} query={query} onPress={() => router.push(`/player/${p.id}`)} />
                  ))}
                </View>
              </View>
            ) : null}

            {tab !== "all" && !(r[tab] || []).length ? <EmptyState icon={Search} title={`No ${tab} for "${query}"`} body="Try All to see everything that matches." /> : null}
            {isFetching ? <Text style={styles.meta}>Searching…</Text> : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function PersonRow({ p, index, query = "", onPress }) {
  const place = p.area || p.city;
  return (
    <FadeIn index={index}>
      <Card padding={S.md} onPress={onPress}>
        <Row gap={S.md}>
          <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={48} />
          <View style={{ flex: 1 }}>
            <Highlight text={place ? `${p.name} · ${place}` : p.name} query={query} style={styles.name} />
            <Highlight text={`@${p.username}${p.level ? ` · Level ${p.level}` : ""}`} query={query} style={styles.meta} />
          </View>
          <FollowButton person={p} />
        </Row>
      </Card>
    </FadeIn>
  );
}

function EventTile({ e, query, onPress }) {
  const d = new Date(e.startAt);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={e.title}>
      <View style={styles.event}>
        {e.image ? <Image source={e.image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <LinearGradient colors={["rgba(7,9,12,0.15)", "rgba(7,9,12,0.9)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.date}>
          <Text style={styles.dow}>{d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</Text>
          <Text style={styles.dom}>{d.getDate()}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Highlight text={e.title} query={query} style={styles.name} />
        <Text style={styles.meta} numberOfLines={1}>
          {[d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", ""), `${e.rsvpCount || 0} going`, e.location].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cancel: { color: C.accent, fontFamily: F.bodySemi, fontSize: 15 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15.5 },
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  event: { height: 130, borderRadius: R.lg, overflow: "hidden", padding: S.md, backgroundColor: C.surface },
  date: { alignSelf: "flex-start", alignItems: "center", backgroundColor: "rgba(7,9,12,0.6)", borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
  dow: { color: C.text, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1 },
  dom: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 24 },
});
