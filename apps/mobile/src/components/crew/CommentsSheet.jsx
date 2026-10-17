// Comments on a feed post, with a box to add your own.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowUp } from "@/components/ui/icons";
import { Body, C, F, PressableScale, Row, S, Sheet, Skeleton } from "@/components/ui";
import { engine, useEngineMutation, usePostComments } from "@/data/hooks";
import { timeAgo } from "@/utils/format";
import { PlayerAvatar, playerName } from "./shared";

export default function CommentsSheet({ crewId, post, onClose }) {
  const comments = usePostComments(crewId, post?.id);
  const [text, setText] = useState("");
  const send = useEngineMutation(engine.commentOnPost, { onSuccess: () => setText("") });
  const ready = !!text.trim() && !send.isPending;
  const submit = () => ready && send.mutate([crewId, post.id, text.trim()]);
  const list = comments.data || [];
  return (
    <Sheet visible={!!post} onClose={onClose}>
      <Text style={styles.title}>Comments</Text>
      <ScrollView style={{ maxHeight: 380, marginTop: S.md }} keyboardShouldPersistTaps="handled">
        {comments.isPending ? (
          <Skeleton height={48} radius={14} />
        ) : list.length ? (
          list.map((c) => (
            <Row key={c.id} gap={S.md} style={{ alignItems: "flex-start", marginBottom: S.md }}>
              <PlayerAvatar player={c.author} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {playerName(c.author)} <Text style={styles.when}>{timeAgo(c.at)}</Text>
                </Text>
                <Body size={14}>{c.text}</Body>
              </View>
            </Row>
          ))
        ) : (
          <Body dim style={{ paddingVertical: S.lg }}>
            No comments yet. Say something nice.
          </Body>
        )}
      </ScrollView>
      <Row gap={S.sm} style={{ marginTop: S.sm }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment"
          placeholderTextColor={C.textMute}
          maxLength={500}
          onSubmitEditing={submit}
          returnKeyType="send"
          style={styles.input}
          accessibilityLabel="Comment"
        />
        <PressableScale onPress={submit} disabled={!ready} scaleTo={0.88} style={[styles.send, { backgroundColor: ready ? C.accent : C.surfaceHigh }]} accessibilityLabel="Send comment">
          <ArrowUp size={18} color={ready ? "#fff" : C.textMute} strokeWidth={2.8} />
        </PressableScale>
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase", marginTop: S.xs },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  when: { color: C.textMute, fontFamily: F.body, fontSize: 12 },
  input: { flex: 1, height: 46, borderRadius: 23, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.lg, fontFamily: F.body, fontSize: 15, outlineStyle: "none" },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
});
