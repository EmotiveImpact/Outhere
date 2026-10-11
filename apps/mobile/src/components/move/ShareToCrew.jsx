// Pick one of your crews and post a saved run to its feed.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, Send, Users } from "lucide-react-native";
import { Avatar, Body, Button, C, Label, Loading, R, Row, S, Title } from "@/components/ui";
import { engine, useEngineMutation, useMyCrews } from "@/data/hooks";
import { hapticSuccess } from "@/services/haptics";

export default function ShareToCrew({ runId, onBeforeNavigate }) {
  const router = useRouter();
  const { data: crews, isPending } = useMyCrews();
  const [crewId, setCrewId] = useState(null);
  const [caption, setCaption] = useState("");
  const [sharedTo, setSharedTo] = useState([]);
  const share = useEngineMutation(engine.shareRunToCrew, {
    onSuccess: () => {
      hapticSuccess();
      setSharedTo((list) => [...list, crewId]);
      setCrewId(null);
      setCaption("");
    },
  });

  if (isPending) return <Loading style={{ paddingVertical: S.xl }} />;

  if (!crews?.length) {
    return (
      <View style={styles.box}>
        <Row gap={S.md}>
          <View style={styles.icon}>
            <Users size={18} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Title size={17}>Share with a crew</Title>
            <Body dim size={13}>Join a crew to post your runs to its feed.</Body>
          </View>
        </Row>
        <Button
          title="Find a crew"
          variant="secondary"
          size="sm"
          onPress={() => {
            onBeforeNavigate?.();
            router.push("/(tabs)/club");
          }}
          style={{ marginTop: S.md, alignSelf: "flex-start" }}
        />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Title size={17}>Share to crew</Title>
      <Body dim size={13} style={{ marginTop: 2, marginBottom: S.md }}>
        Post it to the feed so the crew sees the work.
      </Body>
      <View style={{ gap: S.sm }}>
        {crews.map((crew) => {
          const done = sharedTo.includes(crew.id);
          const active = crewId === crew.id;
          return (
            <Pressable
              key={crew.id}
              disabled={done}
              onPress={() => setCrewId(active ? null : crew.id)}
              style={[styles.crew, active && styles.crewActive, done && { opacity: 0.6 }]}
            >
              <Avatar uri={crew.logo} name={crew.name} size={36} ring={crew.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.crewName} numberOfLines={1}>
                  {crew.name}
                </Text>
                <Text style={styles.crewMeta}>{done ? "Shared" : `${crew.memberCount} members`}</Text>
              </View>
              {done || active ? <Check size={18} color={C.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
      {crewId ? (
        <View style={{ marginTop: S.md, gap: S.sm }}>
          <Label>Caption</Label>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="How did it feel?"
            placeholderTextColor={C.textMute}
            maxLength={140}
            style={styles.input}
          />
          <Button
            title="Post to crew"
            icon={Send}
            loading={share.isPending}
            onPress={() => share.mutate([crewId, { runId, caption }])}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  crew: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  crewActive: { borderColor: C.accent, backgroundColor: "#0f1a14" },
  crewName: { color: C.text, fontSize: 15, fontWeight: "600" },
  crewMeta: { color: C.textDim, fontSize: 12, marginTop: 2 },
  input: { height: 46, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.bg, color: C.text, paddingHorizontal: S.md, fontSize: 15 },
});
