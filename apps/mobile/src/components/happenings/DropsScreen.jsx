import React, { useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, PackageOpen } from "lucide-react-native";
import { engine, useDrops, useEngineMutation, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { Body, C, Card, EmptyState, Loading, Row, S, TAB_BAR_SPACE, Title } from "@/components/ui";
import DropCard, { useDropBoundaries } from "@/components/happenings/DropCard";
import { SectionLabel, useNow } from "@/components/happenings/shared";
import { hapticSuccess } from "@/services/haptics";

export default function OutsideDropsScreen() {
  const router = useRouter();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("drops");
  const { data, isPending, isRefetching, refetch } = useDrops();
  const { data: profile } = useProfile();
  const now = useNow(1000);
  const drops = data || [];

  useDropBoundaries(drops, now, refetch);

  const reminder = useEngineMutation(engine.toggleDropReminder, { onSuccess: (d) => d?.reminder && hapticSuccess() });

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
        <Loading />
      ) : drops.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No drops yet" body="New merch lands here first. Pull down to refresh." />
      ) : (
        <>
          <Card padding={S.lg} highlight={member} onPress={member ? undefined : () => router.push("/membership")}>
            <Row gap={S.md}>
              <Crown size={22} color={member ? C.accent : C.pro} />
              <View style={{ flex: 1 }}>
                <Title size={17}>{member ? "Early access unlocked" : "Get in before everyone else"}</Title>
                <Body dim size={13} style={{ marginTop: 2 }}>
                  {member
                    ? "Your membership opens every drop before the public release. Set reminders and we'll ping you."
                    : "Pro and Black members shop drops early. Tap to see membership."}
                </Body>
              </View>
            </Row>
          </Card>
          {sections.map((section) => (
            <View key={section.key}>
              <SectionLabel title={section.title} count={section.items.length} live={section.key === "live"} />
              {section.items.map((d) => (
                <DropCard
                  key={d.id}
                  drop={d}
                  now={now}
                  onPress={() => router.push(`/drops/${d.id}`)}
                  onToggleReminder={() => reminder.mutate(d.id)}
                  reminderBusy={reminder.isPending && reminder.variables === d.id}
                />
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
