import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Crown, PackageOpen } from "lucide-react-native";
import { engine, useDrops, useEngineMutation, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, EmptyState, F, FadeIn, PressableScale, R, Row, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import DropCard, { DropCardSkeleton, useDropBoundaries } from "@/components/happenings/DropCard";
import { SectionLabel, useNow } from "@/components/happenings/shared";

function AccessBanner({ member, tier, onPress }) {
  const colour = tier === "black" ? C.black : C.pro;
  const body = (
    <>
      <LinearGradient colors={[`${colour}26`, "rgba(0,0,0,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Row gap={S.md}>
        <View style={[styles.crown, { backgroundColor: `${colour}22`, borderColor: `${colour}55` }]}>
          <Crown size={20} color={colour} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{member ? "Early access unlocked" : "Get in before everyone else"}</Text>
          <Text style={styles.bannerBody}>{member ? "You shop every drop before the public. Set reminders and we'll ping you." : "Pro and Black shop every drop early."}</Text>
        </View>
        {member ? null : <ChevronRight size={20} color={colour} />}
      </Row>
    </>
  );
  const style = [styles.banner, { borderColor: `${colour}55` }];
  return member ? (
    <View style={style}>{body}</View>
  ) : (
    <PressableScale onPress={onPress} scaleTo={0.98} style={style}>
      {body}
    </PressableScale>
  );
}

export default function OutsideDropsScreen() {
  const router = useRouter();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("drops");
  const { data, isPending, isRefetching, refetch } = useDrops();
  const { data: profile } = useProfile();
  const now = useNow(1000);
  const drops = useMemo(() => data || [], [data]);

  useDropBoundaries(drops, now, refetch);

  const reminder = useEngineMutation(engine.toggleDropReminder, { success: (d) => (d?.reminder ? "Reminder on. We'll ping you" : "Reminder off") });

  const sections = useMemo(
    () =>
      [
        { key: "live", title: "Live now", items: drops.filter((d) => d.status === "live" || d.status === "early") },
        { key: "soon", title: "Coming up", items: drops.filter((d) => d.status === "upcoming") },
        { key: "gone", title: "Sold out", items: drops.filter((d) => d.status === "soldout") },
      ].filter((s) => s.items.length),
    [drops],
  );

  const member = profile?.tier === "pro" || profile?.tier === "black";
  let index = 0;

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.lg, paddingBottom: TAB_BAR_SPACE }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
    >
      {isPending ? (
        <View>
          <Skeleton height={76} radius={R.lg} />
          <Skeleton width={120} height={20} style={{ marginTop: S.xxl, marginBottom: S.md }} />
          <DropCardSkeleton />
          <DropCardSkeleton />
        </View>
      ) : drops.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No drops yet" body="New kit lands here first. Pull down to refresh." />
      ) : (
        <>
          <FadeIn>
            <AccessBanner member={member} tier={profile?.tier} onPress={() => router.push("/membership")} />
          </FadeIn>
          {sections.map((section) => (
            <View key={section.key}>
              <SectionLabel title={section.title} count={section.items.length} live={section.key === "live"} />
              {section.items.map((d) => (
                <FadeIn key={d.id} index={index++}>
                  <DropCard
                    drop={d}
                    now={now}
                    onPress={() => router.push(`/drops/${d.id}`)}
                    onToggleReminder={() => reminder.mutate(d.id)}
                    reminderBusy={reminder.isPending && reminder.variables === d.id}
                  />
                </FadeIn>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: R.lg, borderWidth: 1, backgroundColor: C.surface, padding: S.lg, overflow: "hidden" },
  crown: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: C.text, fontFamily: F.display, fontSize: 17 },
  bannerBody: { color: C.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
});
