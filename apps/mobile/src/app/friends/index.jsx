// Friends: search by name or @username, people from your contacts who are
// already on Outhere (or people near you when contacts aren't available),
// your invite link and the people you follow.

import React, { useEffect, useState } from "react";
import { Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Contacts from "expo-contacts";
import { BookUser, Users } from "lucide-react-native";
import { engine, useFriends, useProfile, useReferrals, useSearchPlayers, useSuggestedPeople } from "@/data/hooks";
import { Avatar, Body, Button, C, Card, F, FadeIn, LIT, PressableScale, R, Row, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { FollowButton, Highlight, SearchField } from "@/components/profile/PeopleBits";
import { PillButton, Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { inviteLink } from "@/constants/plans";
import { LinearGradient } from "expo-linear-gradient";

export default function Friends() {
  const router = useRouter();
  const { data: me } = useProfile();
  const { data: following } = useFriends();
  const { data: suggested } = useSuggestedPeople();
  const { data: refs } = useReferrals();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);
  const search = useSearchPlayers(query);
  const [contacts, setContacts] = useState({ state: "idle", people: [] });

  const checkContacts = async () => {
    setContacts({ state: "loading", people: [] });
    try {
      const available = Platform.OS !== "web" && (await Contacts.isAvailableAsync());
      if (!available) return setContacts({ state: "unavailable", people: [] });
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") return setContacts({ state: "denied", people: [] });
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Emails, Contacts.Fields.Name] });
      const list = (data || []).map((c) => ({ name: c.name || "", emails: (c.emails || []).map((e) => e.email).filter(Boolean) }));
      const people = await engine.matchContacts(list);
      setContacts({ state: "done", people: (people || []).filter((p) => !p.isMe) });
    } catch {
      setContacts({ state: "unavailable", people: [] });
    }
  };

  const link = refs?.link || (me ? inviteLink(me.username) : "");
  const share = async () => {
    try {
      await Share.share({ message: `Come out with me on Outhere. We both get 500 OUT when you walk your first 10k: https://${link}` });
      engine.recordInviteShare().catch(() => {});
    } catch {
      // closed the sheet
    }
  };

  const fromContacts = contacts.state === "done" && contacts.people.length > 0;
  const tiles = fromContacts ? contacts.people : (suggested || []).slice(0, 8);
  const place = me?.area || me?.city;
  const results = query ? (search.data || []).filter((p) => !p.isMe) : [];

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <Slab photo={PHOTOS.friends} kicker="Friends" top="Bring your" bottom="people" height={236} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.lg }}>
        <SearchField value={text} onChangeText={setText} placeholder="Search by name or @username" />

        {query ? (
          <View style={{ gap: S.sm }}>
            {search.isPending ? (
              <Skeleton height={72} radius={R.lg} />
            ) : results.length ? (
              results.slice(0, 20).map((p, i) => (
                <FadeIn key={p.id} index={i}>
                  <Card padding={S.md} onPress={() => router.push(`/player/${p.id}`)}>
                    <Row gap={S.md}>
                      <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={46} />
                      <View style={{ flex: 1 }}>
                        <Highlight text={p.name} query={query} style={styles.name} />
                        <Highlight text={[`@${p.username}`, p.area || p.city].filter(Boolean).join(" · ")} query={query} style={styles.meta} />
                      </View>
                      <FollowButton person={p} />
                    </Row>
                  </Card>
                </FadeIn>
              ))
            ) : (
              <Body dim size={14}>
                No one called "{query}" yet. Send them your link.
              </Body>
            )}
          </View>
        ) : (
          <>
            <View>
              <SectionHeader
                title={fromContacts ? "In your contacts" : place ? `People near ${place}` : "People you might know"}
                action={fromContacts ? `${contacts.people.length} on Outhere` : undefined}
              />
              {contacts.state !== "done" || !fromContacts ? (
                <Card padding={S.md} style={{ marginBottom: S.md }}>
                  <Row gap={S.md}>
                    <BookUser size={22} color={C.accentHi} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>
                        {contacts.state === "denied"
                          ? "Contacts are off"
                          : contacts.state === "unavailable"
                            ? "Contacts work in the app"
                            : contacts.state === "done"
                              ? "None of your contacts yet"
                              : "Who's already here?"}
                      </Text>
                      <Text style={styles.meta}>
                        {contacts.state === "denied"
                          ? "Turn them on in your phone's Settings to find friends."
                          : contacts.state === "unavailable"
                            ? "On your phone we can check who you know."
                            : contacts.state === "done"
                              ? "Be the first. Send them your link below."
                              : "We check your contacts against Outhere. Nothing is stored."}
                      </Text>
                    </View>
                    {contacts.state === "idle" || contacts.state === "loading" ? (
                      <PillButton title={contacts.state === "loading" ? "Checking" : "Check"} disabled={contacts.state === "loading"} onPress={checkContacts} />
                    ) : null}
                  </Row>
                </Card>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }} style={{ marginHorizontal: -S.gutter }}>
                <View style={{ width: S.gutter - S.sm }} />
                {tiles.length
                  ? tiles.map((p) => <PersonTile key={p.id} p={p} onPress={() => router.push(`/player/${p.id}`)} />)
                  : [0, 1, 2, 3].map((i) => <Skeleton key={i} width={80} height={150} radius={R.md} />)}
                <View style={{ width: S.gutter - S.sm }} />
              </ScrollView>
            </View>

            <View style={styles.invite}>
              <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteLabel}>Your invite link</Text>
                <Text style={styles.inviteLink} numberOfLines={1}>
                  {link}
                </Text>
              </View>
              <PillButton title="Share" onPress={share} />
            </View>
            <PressableScale onPress={() => router.push("/friends/invite")} accessibilityLabel="Give 500, get 500">
              <Text style={styles.referLink}>Give 500 OUT, get 500 OUT. See your invites</Text>
            </PressableScale>

            <View>
              <SectionHeader title="You follow" action={following?.length ? String(following.length) : undefined} />
              {!following ? (
                <Skeleton height={72} radius={R.lg} />
              ) : following.length ? (
                <Card padding={0} style={{ paddingHorizontal: S.md }}>
                  {following.map((p, i) => (
                    <PressableScale key={p.id} onPress={() => router.push(`/player/${p.id}`)} scaleTo={0.98} accessibilityLabel={p.name}>
                      <Row gap={S.md} style={[styles.followRow, i > 0 && styles.line]}>
                        <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={42} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {p.isOutside ? "Out now" : [p.area || p.city, p.streak ? `${p.streak} day streak` : null].filter(Boolean).join(" · ")}
                          </Text>
                        </View>
                        <FollowButton person={p} />
                      </Row>
                    </PressableScale>
                  ))}
                </Card>
              ) : (
                <Card padding={S.lg}>
                  <Row gap={S.md}>
                    <Users size={22} color={C.textDim} />
                    <Body dim size={13.5} style={{ flex: 1 }}>
                      Follow people to see when they're out and battle them.
                    </Body>
                  </Row>
                </Card>
              )}
            </View>
            <Button title="Search everything" variant="ghost" onPress={() => router.push("/search")} />
          </>
        )}
      </View>
    </Screen>
  );
}

function PersonTile({ p, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} accessibilityLabel={p.name}>
      <View style={styles.tile}>
        <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.md }]} />
        <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={54} />
        <Text style={[styles.name, { marginTop: S.sm, fontSize: 14 }]} numberOfLines={1}>
          {p.name.split(" ")[0]}
        </Text>
        <Text style={[styles.meta, { textAlign: "center" }]} numberOfLines={1}>
          {p.area || p.city || `@${p.username}`}
        </Text>
        <View style={{ marginTop: S.sm }}>
          <FollowButton person={p} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 1 },
  tile: { width: 96, alignItems: "center", backgroundColor: C.surface, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: 6, overflow: "hidden" },
  invite: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  inviteLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
  inviteLink: { color: C.text, fontFamily: F.bodySemi, fontSize: 17, marginTop: 2 },
  referLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13, textAlign: "center", marginTop: -S.sm },
  followRow: { paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
});
