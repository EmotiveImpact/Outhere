// People you've blocked. They can't battle you, follow you or see you on the
// map. Unblock puts them back to strangers, not friends.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { UserX } from "@/components/ui/icons";
import { engine, useBlocked, useEngineMutation } from "@/data/hooks";
import { Avatar, C, EmptyState, F, PressableScale, R, S, Screen, SkeletonList } from "@/components/ui";
import { Group, Note, TopBar } from "@/components/account/parts";

export default function BlockedScreen() {
  const { data, isPending } = useBlocked();
  const unblock = useEngineMutation(engine.unblockPlayer, { success: "Unblocked" });

  return (
    <Screen header={<TopBar title="Blocked people" />} contentStyle={{ gap: S.md, paddingTop: S.sm }}>
      {isPending ? (
        <SkeletonList count={3} />
      ) : !data?.length ? (
        <EmptyState icon={UserX} title="Nobody blocked" body="Block someone from their profile and they'll show here." />
      ) : (
        <>
          <Group>
            {data.map((p) => (
              <View key={p.id} style={styles.row}>
                <Avatar uri={p.avatar} name={p.name || p.username} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name || p.username}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    @{p.username}
                    {p.city ? ` · ${p.city}` : ""}
                  </Text>
                </View>
                <PressableScale onPress={() => unblock.mutate(p.id)} disabled={unblock.isPending} scaleTo={0.94} style={styles.btn} accessibilityLabel={`Unblock ${p.name || p.username}`}>
                  <Text style={styles.btnText}>Unblock</Text>
                </PressableScale>
              </View>
            ))}
          </Group>
          <Note>They aren't told. Unblocking doesn't follow them again.</Note>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: S.lg },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  btn: { height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  btnText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
