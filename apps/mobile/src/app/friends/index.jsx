// Friends: search by name or @username, people from your contacts who are
// already on Outhere (or people near you when contacts aren't available),
// your invite link and the people you follow.

import React, { useEffect, useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Contacts from "expo-contacts/legacy";
import { BookUser, Users } from "@/components/ui/icons";
import { engine, useFriends, useProfile, useReferrals, useSearchPlayers, useSuggestedPeople } from "@/data/hooks";
import { Avatar, Body, Button, C, F, FadeIn, IconTile, PressableScale, Row, Screen, Skeleton, Surface } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { FollowButton, Highlight, SearchField } from "@/components/profile/PeopleBits";
import { PillButton, Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { inviteLink } from "@/constants/plans";

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
  const people = fromContacts ? contacts.people : suggested || [];
  const tiles = people.slice(0, 4);
  const place = me?.area || me?.city;
  const results = query ? (search.data || []).filter((p) => !p.isMe) : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab padded={false} style={{ paddingTop: 0 }}>
        {/* .slab.photo 300: the fist bump in full, the headline over its lower half */}
        <Slab photo={PHOTOS.friends} focus={{ x: 0.5, y: 0.3 }} kicker="Friends" top="Bring your" bottom="people" height={258} />
        <View style={{ paddingHorizontal: 18, paddingTop: 18, gap: 14 }}>
          <SearchField value={text} onChangeText={setText} placeholder="Search by name or @username" />

          {query ? (
            <View style={{ gap: 8 }}>
              {search.isPending ? (
                <Skeleton height={64} radius={20} />
              ) : results.length ? (
                results.slice(0, 20).map((p, i) => (
                  <FadeIn key={p.id} index={i}>
                    <Surface radius={20} padding={null} contentStyle={styles.result}>
                      <PressableScale onPress={() => router.push(`/player/${p.id}`)} scaleTo={0.98} accessibilityLabel={p.name} style={styles.who}>
                        <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={42} />
                        <View style={{ flex: 1 }}>
                          <Highlight text={p.name} query={query} style={styles.name} />
                          <Highlight text={[`@${p.username}`, p.area || p.city].filter(Boolean).join(" · ")} query={query} style={styles.meta} />
                        </View>
                      </PressableScale>
                      <FollowButton person={p} />
                    </Surface>
                  </FadeIn>
                ))
              ) : (
                <Body dim size={13}>
                  No one called "{query}" yet. Send them your link.
                </Body>
              )}
            </View>
          ) : (
            <>
              <View style={{ gap: 10 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.secHead}>{fromContacts ? "In your contacts" : place ? `People near ${place}` : "People you might know"}</Text>
                  {fromContacts ? <Text style={styles.secLink}>{contacts.people.length} on Outhere</Text> : null}
                </Row>
                {/* .row4: four people across, photo, first name, area and Add */}
                <View style={styles.row4}>
                  {tiles.length
                    ? tiles.slice(0, 4).map((p) => <PersonTile key={p.id} p={p} onPress={() => router.push(`/player/${p.id}`)} />)
                    : [0, 1, 2, 3].map((i) => <Skeleton key={i} height={134} radius={18} style={{ flex: 1 }} />)}
                </View>
                {!fromContacts ? (
                  <Surface radius={20} padding={null} contentStyle={styles.check}>
                    <IconTile icon={BookUser} size={38} iconSize={18} tone="blue" />
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
                  </Surface>
                ) : null}
              </View>

              {/* .card.invite: the link in white, Share on the act gradient */}
              <Surface radius={20} padding={null} contentStyle={styles.invite}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteLabel}>Your invite link</Text>
                  <Text style={styles.inviteLink} numberOfLines={1}>
                    {link}
                  </Text>
                </View>
                <PillButton title="Share" onPress={share} />
              </Surface>
              <PressableScale onPress={() => router.push("/friends/invite")} accessibilityLabel="Give 500, get 500">
                <Text style={styles.referLink}>Give 500 OUT, get 500 OUT. See your invites</Text>
              </PressableScale>

              <View style={{ gap: 10 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.secHead}>You follow</Text>
                  {following?.length ? <Text style={styles.secLink}>{following.length}</Text> : null}
                </Row>
                {!following ? (
                  <Skeleton height={64} radius={20} />
                ) : following.length ? (
                  <Surface radius={20} padding={null}>
                    {following.map((p, i) => (
                      <View key={p.id} style={[styles.followRow, i > 0 && styles.line]}>
                        <PressableScale onPress={() => router.push(`/player/${p.id}`)} scaleTo={0.98} accessibilityLabel={p.name} style={styles.who}>
                          <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={40} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.name} numberOfLines={1}>
                              {p.name}
                            </Text>
                            <Text style={styles.meta} numberOfLines={1}>
                              {p.isOutside ? "Out now" : [p.area || p.city, p.streak ? `${p.streak} day streak` : null].filter(Boolean).join(" · ")}
                            </Text>
                          </View>
                        </PressableScale>
                        <FollowButton person={p} />
                      </View>
                    ))}
                  </Surface>
                ) : (
                  <Surface radius={20} padding={null} contentStyle={styles.check}>
                    <IconTile icon={Users} size={38} iconSize={18} />
                    <Body dim size={12.5} style={{ flex: 1 }}>
                      Follow people to see when they're out and battle them.
                    </Body>
                  </Surface>
                )}
              </View>
              <Button title="Search everything" variant="ghost" onPress={() => router.push("/search")} />
            </>
          )}
        </View>
      </Screen>
      {/* The prototype draws Friends under Crew. */}
      <StackTabBar current="club" />
    </View>
  );
}

/** .row4 .card: the person, then Add on its own (a button can't sit inside another). */
function PersonTile({ p, onPress }) {
  return (
    <Surface radius={18} padding={null} style={{ flex: 1 }} contentStyle={styles.tile}>
      <PressableScale onPress={onPress} scaleTo={0.96} accessibilityLabel={p.name} style={{ alignItems: "center", alignSelf: "stretch" }}>
        <Avatar uri={p.avatar} name={p.name} tier={p.tier} outside={p.isOutside} size={48} />
        <Text style={styles.tileName} numberOfLines={1}>
          {p.name.split(" ")[0]}
        </Text>
        <Text style={styles.tileMeta} numberOfLines={1}>
          {p.area || p.city || `@${p.username}`}
        </Text>
      </PressableScale>
      <FollowButton person={p} small />
    </Surface>
  );
}

const styles = StyleSheet.create({
  // .sec h3 13.5, the count in blue
  secHead: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  secLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 11, lineHeight: 15, marginTop: 2 },
  row4: { flexDirection: "row", gap: 8 },
  tile: { alignItems: "center", gap: 8, paddingTop: 12, paddingBottom: 12, paddingLeft: 4, paddingRight: 4 },
  tileName: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 7 },
  tileMeta: { color: C.textDim, fontFamily: F.body, fontSize: 10, marginTop: 1, textAlign: "center" },
  check: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 },
  result: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12 },
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  invite: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 13, paddingBottom: 13, paddingLeft: 14, paddingRight: 12 },
  inviteLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  inviteLink: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, marginTop: 2 },
  referLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12, textAlign: "center", marginTop: -4 },
  followRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, marginHorizontal: 0 },
});
