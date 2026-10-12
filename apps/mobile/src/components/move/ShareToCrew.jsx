// Pick one of your crews and post a saved run to its feed.

import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, Send, Users } from "lucide-react-native";
import { Body, Button, C, Cover, F, PressableScale, R, Row, S, Skeleton, Title, toast } from "@/components/ui";
import { engine, useEngineMutation, useMyCrews } from "@/data/hooks";

function CrewBadge({ crew, size = 40 }) {
  return (
    <Cover source={crew.logo} seed={crew.id} accent={crew.accent} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      {crew.logo ? null : <Text style={{ color: "#fff", fontFamily: F.display, fontSize: size * 0.4 }}>{(crew.name || "?")[0].toUpperCase()}</Text>}
    </Cover>
  );
}

export default function ShareToCrew({ runId, onBeforeNavigate }) {
  const router = useRouter();
  const { data: crews, isPending } = useMyCrews();
  const [crewId, setCrewId] = useState(null);
  const [caption, setCaption] = useState("");
  const [sharedTo, setSharedTo] = useState([]);
  const share = useEngineMutation(engine.shareRunToCrew, {
    onSuccess: () => {
      const crew = crews?.find((c) => c.id === crewId);
      toast.success(crew ? `Posted to ${crew.name}` : "Posted to your crew");
      setSharedTo((list) => [...list, crewId]);
      setCrewId(null);
      setCaption("");
    },
  });

  if (isPending) {
    return (
      <View style={[styles.box, { gap: S.md }]}>
        <Skeleton width={140} height={18} />
        <Skeleton height={60} radius={R.md} />
      </View>
    );
  }

  if (!crews?.length) {
    return (
      <View style={styles.box}>
        <Row gap={S.md}>
          <View style={styles.icon}>
            <Users size={18} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Title size={17}>Run it with a crew</Title>
            <Body dim size={13}>Join a crew to post your sessions to its feed.</Body>
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
      <Row gap={S.sm}>
        <Send size={16} color={C.accent} />
        <Title size={17}>Share to crew</Title>
      </Row>
      <Body dim size={13} style={{ marginTop: 4, marginBottom: S.md }}>
        Drop it in the feed so the crew sees the work.
      </Body>
      <View style={{ gap: S.sm }}>
        {crews.map((crew) => {
          const done = sharedTo.includes(crew.id);
          const active = crewId === crew.id;
          return (
            <PressableScale
              key={crew.id}
              disabled={done}
              scaleTo={0.98}
              accessibilityLabel={`Share to ${crew.name}`}
              onPress={() => setCrewId(active ? null : crew.id)}
              style={[styles.crew, active && styles.crewActive, done && styles.crewDone]}
            >
              <CrewBadge crew={crew} />
              <View style={{ flex: 1 }}>
                <Text style={styles.crewName} numberOfLines={1}>
                  {crew.name}
                </Text>
                <Text style={[styles.crewMeta, done && { color: C.accent }]}>{done ? "Posted" : `${crew.memberCount} ${crew.memberCount === 1 ? "member" : "members"}`}</Text>
              </View>
              <View style={[styles.tick, (active || done) && styles.tickOn]}>{active || done ? <Check size={14} color={C.accentText} strokeWidth={3} /> : null}</View>
            </PressableScale>
          );
        })}
      </View>
      {crewId ? (
        <View style={{ marginTop: S.md, gap: S.sm }}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption. How did it feel?"
            placeholderTextColor={C.textMute}
            maxLength={140}
            style={styles.input}
          />
          <Button title="Post to crew" icon={Send} loading={share.isPending} onPress={() => share.mutate([crewId, { runId, caption }])} full />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  crew: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, minHeight: 64, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  crewActive: { borderColor: C.accent, backgroundColor: "#0f1a14" },
  crewDone: { opacity: 0.7 },
  crewName: { color: C.text, fontSize: 15, fontWeight: "600" },
  crewMeta: { color: C.textDim, fontSize: 12, marginTop: 2 },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  tickOn: { backgroundColor: C.accent, borderColor: C.accent },
  input: { height: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.bg, color: C.text, paddingHorizontal: S.md, fontSize: 15 },
});
