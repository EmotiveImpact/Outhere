// One search across people, crews and events, with the match highlighted.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useProfile, useSearchAll, useSuggestedPeople } from "@/data/hooks";
import { Avatar, C, EmptyState, F, FadeIn, PressableScale, Row, Screen, Segment, Skeleton, Surface, TOP_GAP } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen tab padded={false} style={{ paddingTop: 0 }}>
      <View style={{ paddingTop: insets.top + TOP_GAP + 6, paddingHorizontal: 18 }}>
        <Row gap={12}>
          <SearchField value={text} onChangeText={setText} placeholder="People, crews and events" autoFocus focused style={{ flex: 1 }} />
          <PressableScale onPress={close} accessibilityLabel="Cancel">
            <Text style={styles.cancel}>Cancel</Text>
          </PressableScale>
        </Row>
        <Segment options={TABS} value={tab} onChange={setTab} style={{ marginTop: 12 }} />
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 14 }}>
        {!query ? (
          suggested?.length ? (
            <View>
              <SecHead title={me?.area || me?.city ? `People near ${me.area || me.city}` : "People you might know"} />
              <View style={{ gap: 8 }}>
                {suggested.slice(0, 6).map((p, i) => (
                  <PersonRow key={p.id} p={p} index={i} onPress={() => router.push(`/player/${p.id}`)} />
                ))}
              </View>
            </View>
          ) : (
            <EmptyState icon={Search} title="Search Outhere" body="Find people by name or @username, crews near you and events coming up." />
          )
        ) : !r ? (
          <Skeleton height={220} radius={20} />
        ) : !total ? (
          <EmptyState icon={Search} title={`Nothing for "${query}"`} body="Try a name, a @username, a crew or a place." />
        ) : (
          <>
            {show("crews") && r.crews.length ? (
              <View>
                <SecHead title="Crews" action={tab === "all" && r.crews.length > 3 ? `See ${r.crews.length}` : undefined} onAction={() => setTab("crews")} />
                <View style={{ gap: 8 }}>
                  {cap(r.crews).map((c, i) => (
                    <FadeIn key={c.id} index={i}>
                      {/* .res: crest, name with the match in blue, and a quiet pill (Joined, or View) */}
                      <Surface radius={20} padding={null} contentStyle={styles.res}>
                        <PressableScale onPress={() => router.push(`/crew/${c.id}`)} scaleTo={0.98} accessibilityLabel={c.name} style={styles.who}>
                          <CrewLogo crew={c} size={42} />
                          <View style={{ flex: 1 }}>
                            <Highlight text={c.name} query={query} style={styles.name} />
                            <Text style={styles.meta} numberOfLines={1}>
                              {[`${c.memberCount} member${c.memberCount === 1 ? "" : "s"}`, c.area || c.city].filter(Boolean).join(" · ")}
                            </Text>
                          </View>
                        </PressableScale>
                        <PillButton title={c.isMember ? "Joined" : "View"} ghost onPress={() => router.push(`/crew/${c.id}`)} />
                      </Surface>
                    </FadeIn>
                  ))}
                </View>
              </View>
            ) : null}

            {show("events") && r.events.length ? (
              <View>
                <SecHead title="Events" action={tab === "all" && r.events.length > 2 ? `See ${r.events.length}` : undefined} onAction={() => setTab("events")} />
                <View style={{ gap: 8 }}>
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
                <SecHead title="People" action={tab === "all" && r.people.length > 3 ? `See ${r.people.length}` : undefined} onAction={() => setTab("people")} />
                <View style={{ gap: 8 }}>
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
    {/* Search opens from Home in the prototype, so Home stays lit. */}
    <StackTabBar current="index" />
    </View>
  );
}

/** .sec: 13.5px title, the See link in blue. */
function SecHead({ title, action, onAction }) {
  return (
    <Row style={{ justifyContent: "space-between", marginBottom: 9 }}>
      <Text style={styles.secHead}>{title}</Text>
      {action ? (
        <PressableScale onPress={onAction} accessibilityLabel={action}>
          <Text style={styles.secLink}>{action}</Text>
        </PressableScale>
      ) : null}
    </Row>
  );
}

function PersonRow({ p, index, query = "", onPress }) {
  const place = p.area || p.city;
  return (
    <FadeIn index={index}>
      <Surface radius={20} padding={null} contentStyle={styles.res}>
        <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={p.name} style={styles.who}>
          <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={42} />
          <View style={{ flex: 1 }}>
            <Highlight text={place ? `${p.name} · ${place}` : p.name} query={query} style={styles.name} />
            <Highlight text={`@${p.username}${p.level ? ` · Level ${p.level}` : ""}`} query={query} style={styles.meta} />
          </View>
        </PressableScale>
        <FollowButton person={p} />
      </Surface>
    </FadeIn>
  );
}

// 8pm, 6:30am
const clock = (d) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};

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
          {[clock(d), `${e.rsvpCount || 0} going`, e.location].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cancel: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13.5 },
  secHead: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  secLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12 },
  res: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12 },
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  // .evt: the photo, a date chip and the title over a dark fade
  event: { height: 118, borderRadius: 20, overflow: "hidden", padding: 12, backgroundColor: "#11151c", boxShadow: "0 14px 30px -14px rgba(0,0,0,0.9)" },
  date: { alignSelf: "flex-start", alignItems: "center", backgroundColor: "rgba(7,9,12,0.6)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  dow: { color: C.text, fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 1 },
  dom: { color: C.text, fontFamily: F.display, fontSize: 19, lineHeight: 21 },
});
