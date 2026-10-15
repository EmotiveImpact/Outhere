// Every badge: earned ones lit, with progress bars on the ones still to win.
// Tap one for what it's for and how far you've got.

import React, { useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Upload } from "lucide-react-native";
import { useBadges, useProfile } from "@/data/hooks";
import { Body, C, F, FadeIn, Meter, Row, S, Segment, Sheet, Skeleton, Surface } from "@/components/ui";
import { HeroPage, RoundButton } from "@/components/account/parts";
import { badgeArt } from "@/constants/badges";
import { PHOTOS } from "@/constants/photos";

// .bg.off img: grey and dimmed until it's earned
const LOCKED = Platform.OS === "web" ? { filter: "grayscale(1) brightness(0.55)" } : { opacity: 0.45 };

/** .bg: the art on near black, its name, and Earned in blue or a thin bar. */
function BadgeCell({ badge: b, onPress }) {
  return (
    <Surface onPress={onPress} radius={18} padding={null} style={{ flex: 1 }} contentStyle={styles.cell} accessibilityLabel={`${b.label}. ${b.earned ? "Earned" : b.toGo}`}>
      <View style={styles.cellArt}>
        <Image source={badgeArt(b.id)} style={[{ width: "100%", height: "100%" }, !b.earned && LOCKED]} contentFit="contain" />
      </View>
      <Text style={[styles.cellName, !b.earned && { color: C.textDim }]} numberOfLines={1}>
        {b.label}
      </Text>
      {b.earned ? <Text style={styles.cellEarned}>Earned</Text> : <Meter value={b.progress} size={4} flow={false} glow={false} style={{ width: "70%", marginTop: 5 }} />}
    </Surface>
  );
}
import { formatNumber } from "@/utils/format";

export default function Badges() {
  const { data, isPending, refetch, isRefetching } = useBadges();
  const { data: me } = useProfile();
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(null);

  const items = (data?.items || []).filter((b) => (tab === "earned" ? b.earned : tab === "next" ? !b.earned : true));
  const sorted = tab === "next" ? [...items].sort((a, b) => b.progress - a.progress) : items;
  const rows = [];
  for (let i = 0; i < sorted.length; i += 3) rows.push(sorted.slice(i, i + 3));

  const share = () =>
    Share.share({ message: `${data?.earnedCount || 0} of ${data?.total || 24} badges on Outhere${me ? ` as @${me.username}` : ""}.` }).catch(() => {});

  return (
    // .slab 212 with the medal floating on the right; the count is the headline
    <HeroPage
      kicker="Badges"
      top={
        data ? (
          <>
            {data.earnedCount} <Text style={styles.of}>of {data.total}</Text>
          </>
        ) : (
          " "
        )
      }
      height={198}
      size={44}
      object={PHOTOS.medal}
      objectSize={196}
      objectTop={12}
      objectStyle={{ right: -30 }}
      right={<RoundButton icon={Upload} label="Share" onPress={share} />}
      onRefresh={refetch}
      refreshing={isRefetching}
      bodyStyle={{ paddingTop: 14, gap: 10 }}
      tab="profile"
    >
      <View>
        <Segment
          options={[
            { value: "all", label: "All" },
            { value: "earned", label: "Earned" },
            { value: "next", label: "Next up" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ marginTop: 10, gap: 8 }}>
          {isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={18} />)
          ) : !rows.length ? (
            <Body dim style={{ textAlign: "center", marginTop: S.xl }}>
              {tab === "earned" ? "Your first badge is a walk away." : "You've earned every one. Respect."}
            </Body>
          ) : (
            rows.map((row, ri) => (
              <FadeIn key={row.map((b) => b.id).join()} index={ri}>
                <Row gap={8} style={{ alignItems: "stretch" }}>
                  {row.map((b) => (
                    <BadgeCell key={b.id} badge={b} onPress={() => setOpen(b)} />
                  ))}
                  {row.length < 3 ? Array.from({ length: 3 - row.length }).map((_, k) => <View key={k} style={{ flex: 1 }} />) : null}
                </Row>
              </FadeIn>
            ))
          )}
        </View>
      </View>

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        {open ? (
          <View style={{ alignItems: "center" }}>
            <View style={styles.art}>
              <Image source={badgeArt(open.id)} style={[{ width: "100%", height: "100%" }, !open.earned && LOCKED]} contentFit="contain" />
            </View>
            <Text style={styles.name}>{open.label}</Text>
            <Body dim size={14} style={{ textAlign: "center", marginTop: 4 }}>
              {open.description}
            </Body>
            {open.earned ? (
              <Text style={styles.earned}>
                Earned{open.earnedAt ? ` ${new Date(open.earnedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}
              </Text>
            ) : (
              <View style={{ alignSelf: "stretch", marginTop: S.lg }}>
                <Meter value={open.progress} size={8} cap />
                <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={styles.dim}>
                    {formatNumber(open.value)} of {formatNumber(open.target)}
                  </Text>
                  <Text style={styles.dim}>{open.toGo}</Text>
                </Row>
              </View>
            )}
          </View>
        ) : null}
      </Sheet>
    </HeroPage>
  );
}

const styles = StyleSheet.create({
  // .display .blue on one line with the count
  of: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  cell: { alignItems: "center", paddingTop: 6, paddingBottom: 10, paddingLeft: 6, paddingRight: 6 },
  cellArt: { alignSelf: "stretch", height: 62, borderRadius: 13, backgroundColor: "#05080e", overflow: "hidden", marginBottom: 7 },
  cellName: { color: C.text, fontFamily: F.bodySemi, fontSize: 11 },
  cellEarned: { color: C.accent, fontFamily: F.bodySemi, fontSize: 9.5, marginTop: 2 },
  art: { width: 160, height: 128, borderRadius: 18, overflow: "hidden", backgroundColor: "#05080e" },
  name: { color: C.text, fontFamily: F.display, fontSize: 30, textTransform: "uppercase", marginTop: S.md },
  earned: { color: C.accent, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.md },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
});
