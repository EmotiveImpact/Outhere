import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Crown } from "lucide-react-native";
import { engine, useDrops, useEngineMutation, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, EmptyState, FadeIn, PressableScale, R, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import DropCard, { DropCardSkeleton, useDropBoundaries } from "@/components/happenings/DropCard";
import { SectionLabel, useNow } from "@/components/happenings/shared";

/** One quiet line about early access; taps through to membership for free players. */
function AccessBanner({ member, onPress }) {
  const body = (
    <>
      <Crown size={18} color={C.textDim} />
      <Text style={styles.bannerTitle} numberOfLines={1}>
        {member ? "Early access on every drop" : "Pro and Black shop drops early"}
      </Text>
      {member ? null : <ChevronRight size={18} color={C.textMute} />}
    </>
  );
  return member ? (
    <View style={styles.banner}>{body}</View>
  ) : (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.banner}>
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
          <Skeleton height={52} radius={R.md} />
          <Skeleton width={120} height={20} style={{ marginTop: S.xxl, marginBottom: S.md }} />
          <DropCardSkeleton />
          <DropCardSkeleton />
        </View>
      ) : drops.length === 0 ? (
        <EmptyState title="No drops yet" body="New kit lands here first. Pull down to refresh." />
      ) : (
        <>
          <FadeIn>
            <AccessBanner member={member} onPress={() => router.push("/membership")} />
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
  banner: { flexDirection: "row", alignItems: "center", gap: S.md, height: 52, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface },
  bannerTitle: { color: C.text, fontSize: 15, fontWeight: "600", flex: 1 },
});
