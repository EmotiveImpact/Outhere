import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MessageSquare, Send } from "lucide-react-native";
import { Avatar, C, EmptyState, Loading, S } from "@/components/ui";
import { engine, useCrewMessages, useEngineMutation } from "@/data/hooks";
import { dateLabel, timeLabel } from "@/utils/format";

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

function Bubble({ msg, prev, accent }) {
  const router = useRouter();
  const newDay = !prev || !sameDay(prev.at, msg.at);
  const grouped = !newDay && prev && prev.authorId === msg.authorId && msg.at - prev.at < 5 * 60 * 1000;
  const name = msg.author?.name || msg.author?.username || "Former member";
  return (
    <View>
      {newDay ? <Text style={styles.day}>{dateLabel(msg.at)}</Text> : null}
      <View style={[styles.line, msg.isMine && { justifyContent: "flex-end" }, grouped ? { marginTop: 3 } : { marginTop: S.md }]}>
        {!msg.isMine ? (
          grouped ? (
            <View style={{ width: 30 }} />
          ) : (
            <Pressable onPress={() => msg.author && router.push(`/player/${msg.author.id}`)}>
              <Avatar uri={msg.author?.avatar} name={name} size={30} />
            </Pressable>
          )
        ) : null}
        <View style={{ maxWidth: "78%" }}>
          {!msg.isMine && !grouped ? <Text style={[styles.author, { color: msg.author?.color || C.textDim }]}>{name}</Text> : null}
          <View style={[styles.bubble, msg.isMine ? { backgroundColor: accent, borderBottomRightRadius: 6 } : styles.theirs]}>
            <Text style={[styles.text, msg.isMine && { color: C.accentText }]}>{msg.text}</Text>
          </View>
          {!grouped || msg.isMine ? <Text style={[styles.time, msg.isMine && { textAlign: "right" }]}>{timeLabel(msg.at)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

/** Crew chat: message list with a composer that rides above the keyboard. */
export default function CrewChat({ crew }) {
  const messages = useCrewMessages(crew.id);
  const [text, setText] = useState("");
  const tabBarHeight = useBottomTabBarHeight();
  const keyboard = useKeyboardVisible();
  const send = useEngineMutation(engine.sendCrewMessage, { onSuccess: () => setText("") });
  const accent = crew.accent || C.accent;
  // KeyboardAvoidingView needs to know how far down the screen it starts.
  const wrapRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const measure = () => wrapRef.current?.measureInWindow((_x, y) => setOffset(y || 0));

  // Newest first for the inverted list, each paired with the message before it.
  const items = useMemo(() => {
    const list = messages.data || [];
    return list.map((m, i) => ({ msg: m, prev: list[i - 1] })).reverse();
  }, [messages.data]);

  const submit = () => {
    const clean = text.trim();
    if (!clean || send.isPending) return;
    send.mutate([crew.id, clean]);
  };

  const bottomPad = Platform.OS === "ios" && keyboard ? S.sm : tabBarHeight + S.sm;

  return (
    <View ref={wrapRef} onLayout={measure} style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={offset}>
      {messages.isPending ? (
        <Loading />
      ) : items.length === 0 ? (
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <EmptyState icon={MessageSquare} title="Quiet in here" body={`Be the first to say something to ${crew.name}.`} />
        </Pressable>
      ) : (
        <FlatList
          data={items}
          inverted
          keyExtractor={(it) => it.msg.id}
          renderItem={({ item }) => <Bubble msg={item.msg} prev={item.prev} accent={accent} />}
          contentContainerStyle={{ paddingHorizontal: S.gutter, paddingVertical: S.md }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={[styles.composer, { paddingBottom: bottomPad }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`Message ${crew.name}`}
          placeholderTextColor={C.textMute}
          multiline
          maxLength={1000}
          style={styles.input}
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim() || send.isPending}
          accessibilityLabel="Send message"
          style={({ pressed }) => [styles.send, { backgroundColor: text.trim() ? accent : C.surfaceHigh }, pressed && { opacity: 0.7 }]}
        >
          <Send size={18} color={text.trim() ? C.accentText : C.textMute} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { alignSelf: "center", color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: S.lg },
  line: { flexDirection: "row", alignItems: "flex-end", gap: S.sm },
  author: { fontSize: 12, fontWeight: "700", marginBottom: 3, marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  theirs: { backgroundColor: C.surfaceHigh, borderBottomLeftRadius: 6 },
  text: { color: C.text, fontSize: 15, lineHeight: 20 },
  time: { color: C.textMute, fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, paddingHorizontal: S.gutter, paddingTop: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.bg },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 15, paddingHorizontal: S.lg, paddingTop: 12, paddingBottom: 12 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
