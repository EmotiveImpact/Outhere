// Join requests for a crew that asks first. Admins say yes or no; a yes
// puts them straight in the crew and tells them.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Inbox } from "lucide-react-native";
import { Body, Button, C, Card, EmptyState, F, FadeIn, Header, Row, S, Screen, SkeletonList } from "@/components/ui";
import { engine, useCrew, useEngineMutation, useJoinRequests } from "@/data/hooks";
import { timeAgo } from "@/utils/format";
import { PlayerAvatar, playerName } from "@/components/crew/shared";

const PACE = { easy: "easy pace", steady: "steady pace", quick: "quick pace", fast: "fast pace" };

export default function JoinRequests() {
  const { crewId } = useLocalSearchParams();
  const id = String(crewId || "");
  const router = useRouter();
  const { data: crew } = useCrew(id);
  const staff = crew?.myRole === "owner" || crew?.myRole === "admin";
  const requests = useJoinRequests(id, !!staff);
  const decide = useEngineMutation(engine.decideJoinRequest, {
    success: (r) => (r?.status === "approved" ? `${(r.player?.name || "They").split(" ")[0]} is in` : "Request declined"),
  });
  const list = requests.data || [];

  return (
    <Screen header={<Header back title="Join requests" subtitle={crew?.name} />}>
      {crew && !staff ? (
        <EmptyState icon={Inbox} title="For crew admins" body="Owners and admins answer join requests." action="Back" onAction={() => router.back()} />
      ) : requests.isPending ? (
        <SkeletonList count={3} height={76} />
      ) : list.length ? (
        list.map((r, i) => (
          <FadeIn key={r.id} index={i}>
            <Card padding={S.md} style={{ marginBottom: S.md }} onPress={() => r.player && router.push(`/player/${r.player.id}`)}>
              <Row gap={S.md}>
                <PlayerAvatar player={r.player} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {playerName(r.player)}
                  </Text>
                  <Body dim size={13} numberOfLines={2}>
                    {[`Asked ${timeAgo(r.at)}`, PACE[r.paceGroup] || null].filter(Boolean).join(" · ")}
                  </Body>
                </View>
                <Button title="No" size="sm" variant="secondary" disabled={decide.isPending} onPress={() => decide.mutate([id, r.id, false])} accessibilityLabel={`Decline ${playerName(r.player)}`} />
                <Button title="Yes" size="sm" disabled={decide.isPending} onPress={() => decide.mutate([id, r.id, true])} accessibilityLabel={`Let ${playerName(r.player)} in`} />
              </Row>
            </Card>
          </FadeIn>
        ))
      ) : (
        <EmptyState icon={Inbox} title="Nobody waiting" body={crew?.joinPolicy === "request" ? "New requests land here and in your notifications." : "Anyone can join this crew straight away. Switch to Ask first in crew settings to see requests here."} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
});
