import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ArrowUp, MessageSquare } from "lucide-react-native";
import { C, EmptyState, PressableScale, S, Skeleton } from "@/components/ui";
import { engine, useCrewMessages, useEngineMutation } from "@/data/hooks";
import { dateLabel, timeLabel } from "@/utils/format";
import { PlayerAvatar, playerName } from "./shared";

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const GROUP_MS = 5 * 60 * 1000;

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

function Bubble({ msg, prev, next, fresh }) {
  const router = useRouter();
  const newDay = !prev || !sameDay(prev.at, msg.at);
  const groupedAbove = !newDay && prev && prev.authorId === msg.authorId && msg.at - prev.at < GROUP_MS;
  const groupedBelow = next && next.authorId === msg.authorId && sameDay(next.at, msg.at) && next.at - msg.at < GROUP_MS;
  const mine = msg.isMine;
  const tint = msg.author?.color || C.textDim;

  const corners = mine
    ? { borderTopRightRadius: groupedAbove ? 6 : 20, borderBottomRightRadius: groupedBelow ? 6 : 20 }
    : { borderTopLeftRadius: groupedAbove ? 6 : 20, borderBottomLeftRadius: groupedBelow ? 6 : 20 };

  return (
    <Animated.View entering={fresh ? FadeInDown.springify().damping(18) : undefined}>
      {newDay ? (
        <View style={styles.dayWrap}>
          <Text style={styles.day}>{dateLabel(msg.at)}</Text>
        </View>
      ) : null}
      <View style={[styles.line, mine && { justifyContent: "flex-end" }, { marginTop: groupedAbove ? 3 : S.md }]}>
        {!mine ? (
          groupedBelow ? (
            <View style={{ width: 32 }} />
          ) : (
            <PressableScale onPress={() => msg.author && router.push(`/player/${msg.author.id}`)} scaleTo={0.9} accessibilityLabel={`Open ${playerName(msg.author)}`}>
              <PlayerAvatar player={msg.author} size={32} />
            </PressableScale>
          )
        ) : null}
        <View style={{ maxWidth: "76%", alignItems: mine ? "flex-end" : "flex-start" }}>
          {!mine && !groupedAbove ? <Text style={[styles.author, { color: tint }]}>{playerName(msg.author)}</Text> : null}
          <View style={[styles.bubble, mine ? styles.mine : styles.theirs, corners]}>
            <Text style={[styles.text, mine && { color: C.accentText }]}>{msg.text}</Text>
          </View>
          {!groupedBelow ? <Text style={styles.time}>{timeLabel(msg.at)}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

function ChatSkeleton() {
  return (
    <View style={{ flex: 1, justifyContent: "flex-end", padding: S.gutter, gap: S.md }}>
      {[180, 140, 220].map((w, i) => (
        <View key={i} style={{ flexDirection: "row", gap: S.sm, alignItems: "flex-end", alignSelf: i === 1 ? "flex-end" : "flex-start" }}>
          {i !== 1 ? <Skeleton width={32} height={32} radius={16} /> : null}
          <Skeleton width={w} height={40} radius={20} />
        </View>
      ))}
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
  const mountedAt = useRef(Date.now()).current;
  const [focused, setFocused] = useState(false);
  // KeyboardAvoidingView needs to know how far down the screen it starts.
  const wrapRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const measure = () => wrapRef.current?.measureInWindow((_x, y) => setOffset(y || 0));

  const ready = !!text.trim() && !send.isPending;
  const sendScale = useSharedValue(ready ? 1 : 0.85);
  useEffect(() => {
    sendScale.value = withSpring(ready ? 1 : 0.85, { damping: 14, stiffness: 300 });
  }, [ready, sendScale]);
  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  // Newest first for the inverted list, each paired with its neighbours.
  const items = useMemo(() => {
    const list = messages.data || [];
    return list.map((m, i) => ({ msg: m, prev: list[i - 1], next: list[i + 1] })).reverse();
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
          <ChatSkeleton />
        ) : items.length === 0 ? (
          <Pressable style={{ flex: 1, justifyContent: "center" }} onPress={Keyboard.dismiss}>
            <EmptyState icon={MessageSquare} title="Quiet in here" body={`Kick it off. Say hello to ${crew.name}.`} />
          </Pressable>
        ) : (
          <FlatList
            data={items}
            inverted
            keyExtractor={(it) => it.msg.id}
            renderItem={({ item }) => <Bubble msg={item.msg} prev={item.prev} next={item.next} fresh={item.msg.at > mountedAt} />}
            contentContainerStyle={{ paddingHorizontal: S.gutter, paddingVertical: S.md }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          />
        )}
        <View style={[styles.composer, { paddingBottom: bottomPad }]}>
          <View style={[styles.inputWrap, focused && { borderColor: C.borderStrong }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Message ${crew.name}`}
              placeholderTextColor={C.textMute}
              multiline
              maxLength={1000}
              style={styles.input}
            />
          </View>
          <Animated.View style={sendStyle}>
            <PressableScale
              onPress={submit}
              disabled={!ready}
              scaleTo={0.88}
              accessibilityLabel="Send message"
              style={[styles.send, { backgroundColor: ready ? C.accent : C.surfaceHigh }]}
            >
              <ArrowUp size={20} color={ready ? C.accentText : C.textMute} strokeWidth={2.8} />
            </PressableScale>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  dayWrap: { alignItems: "center", marginTop: S.lg },
  day: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, overflow: "hidden" },
  line: { flexDirection: "row", alignItems: "flex-end", gap: S.sm },
  author: { fontSize: 12, fontWeight: "700", marginBottom: 4, marginLeft: 6 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { backgroundColor: C.accent },
  theirs: { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  text: { color: C.text, fontSize: 15, lineHeight: 20 },
  time: { color: C.textMute, fontSize: 10, marginTop: 4, marginHorizontal: 6 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, paddingHorizontal: S.gutter, paddingTop: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.bg },
  inputWrap: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: "center" },
  input: { maxHeight: 120, color: C.text, fontSize: 15, paddingHorizontal: S.lg, paddingTop: 12, paddingBottom: 12 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
});
