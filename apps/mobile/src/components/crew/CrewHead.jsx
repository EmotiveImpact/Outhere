// Headers for the Crew tab. Leaderboard, Challenges and Stats open on a dark
// slab with a kicker and a two-tone headline; the Chat keeps a compact bar
// with the crest so the messages get the room; the Feed is the club feed.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell, ChevronLeft, MoreHorizontal } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, Hero, IconButton, LiveDot, PressableScale, Row, S } from "@/components/ui";
import { useUnreadCount } from "@/data/hooks";
import { useRouter } from "expo-router";
import { CrewLogo } from "./shared";

/** Splits "Southbank Runners" into a white first word and a blue rest. */
export const twoTone = (name = "") => {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name, null];
  return [words[0], words.slice(1).join(" ")];
};

export function CrewSlab({ kicker, top, bottom, sub, object, photo, height = 236, right, children }) {
  return (
    <Hero object={object} photo={photo} kicker={kicker} top={top} bottom={bottom} sub={sub} height={height} right={right}>
      {children}
    </Hero>
  );
}

/** A slab with a back button, for screens pushed over the tab. */
export function BackSlab({ onBack, ...props }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = onBack || (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club")));
  return (
    <View>
      <CrewSlab {...props} />
      <IconButton icon={ChevronLeft} label="Back" onPress={back} style={{ position: "absolute", left: S.gutter, top: insets.top + S.sm }} />
    </View>
  );
}

export function BellButton() {
  const router = useRouter();
  const unread = useUnreadCount();
  return <IconButton icon={Bell} label="Notifications" badge={unread.data || 0} onPress={() => router.push("/notifications")} />;
}

export const MoreButton = ({ onPress }) => <IconButton icon={MoreHorizontal} label="Crew menu" onPress={onPress} />;

/** Compact bar: crest, name, who's out. Tapping the crest opens the club page. */
export function CrewBar({ crew, header, right }) {
  const router = useRouter();
  const out = header?.outNow ?? 0;
  const members = header?.memberCount ?? crew.memberCount ?? 0;
  return (
    <Row gap={S.md} style={styles.bar}>
      <PressableScale onPress={() => router.push(`/crew/${crew.id}`)} scaleTo={0.96} style={{ flexDirection: "row", alignItems: "center", gap: S.md, flex: 1 }} accessibilityLabel={`Open ${crew.name}`}>
        <CrewLogo crew={crew} size={44} radius={13} ring={false} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {crew.name}
          </Text>
          <Row gap={6} style={{ marginTop: 2 }}>
            {out ? <LiveDot size={7} /> : null}
            <Text style={styles.sub} numberOfLines={1}>
              {out ? `${out} out now · ` : ""}
              {members} {members === 1 ? "member" : "members"}
            </Text>
          </Row>
        </View>
      </PressableScale>
      {right}
    </Row>
  );
}

/** "SOUTHBANK RUNNERS" kicker over "CLUB FEED", from the stories round. */
export function FeedHead({ crew, right }) {
  const router = useRouter();
  return (
    <Row style={styles.feedHead}>
      <PressableScale onPress={() => router.push(`/crew/${crew.id}`)} scaleTo={0.97} style={{ flex: 1 }} accessibilityLabel={`Open ${crew.name}`}>
        <Text style={styles.kicker} numberOfLines={1}>
          {crew.name}
        </Text>
        <Text style={styles.feedTitle}>
          Club <Text style={{ color: C.accent }}>feed</Text>
        </Text>
      </PressableScale>
      {right}
    </Row>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xs },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  feedHead: { paddingHorizontal: S.gutter, paddingTop: S.md, gap: S.sm },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  feedTitle: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 40, textTransform: "uppercase", marginTop: 2 },
});
