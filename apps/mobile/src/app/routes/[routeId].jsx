// A saved route: the line, your best, how often you've run it, the climb and
// who's fastest here this month. Start it, or race your ghost from your best
// run on it.

import React, { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark, ChevronLeft, Ghost, Pencil, Play, Share2, Trash2 } from "lucide-react-native";
import { Avatar, Button, C, EmptyState, F, FadeIn, PressableScale, S, Skeleton } from "@/components/ui";
import { engine, useEngineMutation, useProfile, useRoute } from "@/data/hooks";
import { formatDuration } from "@/utils/format";
import { RoundGlass } from "@/components/move/parts";
import { ClimbChart, Slab, StatCards, twoLines } from "@/components/move/RunBits";
import { runRoute } from "@/components/move/launch";

const kickerFor = (route, where) =>
  route.mine
    ? `Saved route${where ? ` · ${where}` : ""}`
    : route.clubName
      ? `Club route · ${route.clubName}`
      : route.owner
        ? `Popular · by ${route.owner.name.split(" ")[0]}`
        : "Popular route";

const climbNote = (route) => {
  if (route.note && !/km/.test(route.note)) return route.note;
  const per = route.distanceKm ? route.climbM / route.distanceKm : 0;
  return per < 6 ? "flat" : per < 15 ? "rolling" : "hilly";
};

function Leaders({ leaders }) {
  return (
    <View style={styles.box}>
      <View style={styles.boxHead}>
        <Text style={styles.boxTitle}>Fastest here</Text>
        <Text style={styles.boxSide}>This month</Text>
      </View>
      {leaders.length ? (
        leaders.map((l, i) => (
          <View key={`${l.player.id}-${l.rank}`} style={[styles.leader, i > 0 && styles.rule]}>
            <Text style={styles.rank}>{l.rank}</Text>
            <Avatar uri={l.player.avatar} name={l.player.name} size={30} tier={l.player.tier} />
            <Text style={[styles.leaderName, l.isMe && { color: C.accentHi }]} numberOfLines={1}>
              {l.isMe ? "You" : l.player.name.split(" ")[0]}
            </Text>
            <Text style={[styles.leaderTime, l.isMe && { color: C.accentHi }]}>{formatDuration(l.sec)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Nobody's run it this month. First one sets the time.</Text>
      )}
    </View>
  );
}

export default function RouteDetail() {
  const { routeId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const { data: route, isPending } = useRoute(routeId);
  const [renaming, setRenaming] = useState(null);

  const rename = useEngineMutation(engine.renameRoute, { success: "Route renamed", onSuccess: () => setRenaming(null) });
  const remove = useEngineMutation(engine.deleteRoute, { success: "Route deleted", onSuccess: () => router.back() });
  const keep = useEngineMutation(engine.saveRoute, { success: (r) => `${r.name} saved to your routes`, onSuccess: (r) => router.replace(`/routes/${r.id}`) });

  const back = () => (router.canGoBack() ? router.back() : router.navigate("/routes"));

  if (isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 60, paddingHorizontal: S.gutter, gap: S.md }]}>
        <Skeleton height={220} radius={26} />
        <Skeleton height={80} radius={18} />
        <Skeleton height={140} radius={20} />
      </View>
    );
  }
  if (!route) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 80 }]}>
        <EmptyState title="Route not found" body="It may have been deleted, or it's private to whoever drew it." action="Back" onAction={back} />
      </View>
    );
  }

  const [l1, l2] = twoLines(route.name);
  const where = profile?.area || profile?.city;
  const share = () =>
    Share.share({ message: `${route.name}: ${route.distanceKm.toFixed(1)} km${route.stats?.bestSec ? `, my best ${formatDuration(route.stats.bestSec)}` : ""}. Run it with me on Outhere.` }).catch(() => {});
  const confirmDelete = () =>
    Alert.alert(`Delete ${route.name}?`, "Your runs on it stay in your history.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(route.id) },
    ]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Slab
          route={route.path}
          height={250}
          kicker={kickerFor(route, where)}
          top={l1}
          bottom={l2}
          left={<RoundGlass icon={ChevronLeft} label="Back" onPress={back} />}
          right={<RoundGlass icon={Share2} label="Share route" onPress={share} />}
        />
        <View style={styles.body}>
          <FadeIn>
            <StatCards
              items={[
                { label: "km", value: route.distanceKm.toFixed(1) },
                { label: "Your best", value: route.stats?.bestSec ? formatDuration(route.stats.bestSec) : "--" },
                { label: "Runs", value: String(route.stats?.runs || 0) },
              ]}
            />
          </FadeIn>
          <FadeIn index={1}>
            <ClimbChart profile={route.elevation} climbM={route.climbM} note={climbNote(route)} />
          </FadeIn>
          <FadeIn index={2}>
            <Leaders leaders={route.leaders || []} />
          </FadeIn>

          {route.mine ? (
            <FadeIn index={3}>
              {renaming != null ? (
                <View style={styles.renameRow}>
                  <TextInput value={renaming} onChangeText={setRenaming} maxLength={30} autoFocus style={styles.input} placeholder="Route name" placeholderTextColor={C.textMute} returnKeyType="done" onSubmitEditing={() => rename.mutate([route.id, renaming])} />
                  <Button title="Save" size="sm" onPress={() => rename.mutate([route.id, renaming])} loading={rename.isPending} />
                </View>
              ) : (
                <View style={styles.actions}>
                  <PressableScale onPress={() => setRenaming(route.name)} style={styles.action} accessibilityLabel="Rename route">
                    <Pencil size={15} color={C.textDim} />
                    <Text style={styles.actionText}>Rename</Text>
                  </PressableScale>
                  <PressableScale onPress={confirmDelete} style={styles.action} accessibilityLabel="Delete route">
                    <Trash2 size={15} color={C.danger} />
                    <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
                  </PressableScale>
                </View>
              )}
            </FadeIn>
          ) : (
            <FadeIn index={3}>
              <PressableScale
                onPress={() => keep.mutate({ name: route.name, path: route.path, distanceKm: route.distanceKm, climbM: route.climbM, hideEnds: true })}
                style={[styles.action, { alignSelf: "center" }]}
                accessibilityLabel="Save to my routes"
              >
                <Bookmark size={15} color={C.accentHi} />
                <Text style={[styles.actionText, { color: C.accentHi }]}>Save to my routes</Text>
              </PressableScale>
            </FadeIn>
          )}
        </View>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + S.lg }]}>
        <Button
          title="Ghost race"
          icon={Ghost}
          variant="secondary"
          disabled={!route.ghost}
          onPress={() => runRoute(router, route, { ghost: true })}
          accessibilityLabel={route.ghost ? `Race your ghost, ${formatDuration(route.ghost.sec)}` : "Run it once to race your ghost"}
          style={{ flex: 1, height: 56 }}
        />
        <Button title="Start route" icon={Play} onPress={() => runRoute(router, route)} style={{ flex: 1.15, height: 56 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md },
  box: { backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: S.lg, paddingVertical: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  boxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, marginTop: 4 },
  boxTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  boxSide: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  leader: { flexDirection: "row", alignItems: "center", gap: 12, height: 50 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rank: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 14, width: 14 },
  leaderName: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  leaderTime: { color: C.text, fontFamily: F.display, fontSize: 19, fontVariant: ["tabular-nums"] },
  empty: { color: C.textDim, fontFamily: F.body, fontSize: 14, paddingVertical: 10 },
  actions: { flexDirection: "row", justifyContent: "center", gap: S.xl },
  action: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 6 },
  actionText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 14 },
  renameRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: { flex: 1, height: 48, borderRadius: 14, backgroundColor: C.surface, color: C.text, fontFamily: F.body, fontSize: 15, paddingHorizontal: 14 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: S.lg, paddingTop: S.md, backgroundColor: "rgba(7,9,12,0.94)" },
});
