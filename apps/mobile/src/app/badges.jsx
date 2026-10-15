// Every badge: earned ones lit, with progress bars on the ones still to win.
// Tap one for what it's for and how far you've got.

import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Share2 } from "lucide-react-native";
import { useBadges, useProfile } from "@/data/hooks";
import { AnimatedBar, Body, C, F, FadeIn, IconButton, R, Row, S, Screen, Segment, Sheet, Skeleton } from "@/components/ui";
import { BadgeTile, Slab } from "@/components/profile/parts";
import { badgeArt } from "@/constants/badges";
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
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab
        kicker="Badges"
        height={190}
        right={<IconButton icon={Share2} onPress={share} label="Share" />}
      >
        <Text style={styles.head}>
          {data ? data.earnedCount : " "} <Text style={{ color: C.accent }}>{data ? `of ${data.total}` : ""}</Text>
        </Text>
      </Slab>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
        <Segment
          options={[
            { value: "all", label: "All" },
            { value: "earned", label: "Earned" },
            { value: "next", label: "Next up" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ marginTop: S.md, gap: S.sm }}>
          {isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={R.md} />)
          ) : !rows.length ? (
            <Body dim style={{ textAlign: "center", marginTop: S.xl }}>
              {tab === "earned" ? "Your first badge is a walk away." : "You've earned every one. Respect."}
            </Body>
          ) : (
            rows.map((row, ri) => (
              <FadeIn key={row.map((b) => b.id).join()} index={ri}>
                <Row gap={S.sm} style={{ alignItems: "stretch" }}>
                  {row.map((b) => (
                    <BadgeTile key={b.id} badge={b} bar onPress={() => setOpen(b)} />
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
              <Image source={badgeArt(open.id)} style={[StyleSheet.absoluteFill, !open.earned && { opacity: 0.4 }]} contentFit="cover" />
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
                <AnimatedBar value={open.progress} height={8} colour={C.accent} track={C.surfaceHigh} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 52, textTransform: "uppercase" },
  art: { width: 160, height: 128, borderRadius: R.md, overflow: "hidden", backgroundColor: "#0b0e13" },
  name: { color: C.text, fontFamily: F.display, fontSize: 30, textTransform: "uppercase", marginTop: S.md },
  earned: { color: C.accent, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.md },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
});
