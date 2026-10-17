// The crew chat. Messages, photos, routes you can join straight from the
// chat, run cards and battle cards from the + button, reactions (hold a
// message), who's typing, and a composer that rides above the keyboard.
// Opening the chat marks it read, which clears the badge on the tab.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Flag, Flame, Heart, ImagePlus, Lock, Plus, Route as RouteIcon, Send, Swords, ThumbsUp, Timer, Zap } from "@/components/ui/icons";
import { Body, C, EmptyState, F, PressableScale, Row, S, Sheet, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { engine, useBattles, useCrewChat, useCrewTyping, useEngineMutation, usePlayer, useRuns } from "@/data/hooks";
import { dateLabel, formatKm, formatPace, timeAgo } from "@/utils/format";
import ReportSheet from "./ReportSheet";
import RouteArt from "./RouteArt";
import { PlayerAvatar, playerName } from "./shared";
import { pickPhoto } from "./pickPhoto";

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const GROUP_MS = 5 * 60 * 1000;

export const REACTIONS = [
  { key: "flame", icon: Flame, label: "Fire" },
  { key: "heart", icon: Heart, label: "Love" },
  { key: "fist", icon: ThumbsUp, label: "Respect" },
  { key: "bolt", icon: Zap, label: "Fast" },
];
const REACTION = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

const clock12 = (ms) => {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};
export const startLabel = (ms) => {
  if (!ms) return "";
  const today = new Date();
  const tomorrow = new Date(Date.now() + 864e5);
  if (sameDay(ms, today)) return clock12(ms);
  if (sameDay(ms, tomorrow)) return `Tomorrow ${clock12(ms)}`;
  return `${new Date(ms).toLocaleDateString("en-GB", { weekday: "short" })} ${clock12(ms)}`;
};

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

function Reactions({ msg, onReact, mine }) {
  if (!msg.reactions?.length) return null;
  return (
    <Row gap={6} style={[{ marginTop: 6, flexWrap: "wrap" }, mine && { justifyContent: "flex-end" }]}>
      {msg.reactions.map((r) => {
        const Icon = REACTION[r.emoji]?.icon || Flame;
        return (
          <PressableScale key={r.emoji} onPress={() => onReact(msg, r.emoji)} scaleTo={0.9} style={[styles.reaction, r.mine && styles.reactionMine]} accessibilityLabel={`${REACTION[r.emoji]?.label || r.emoji}, ${r.count}${r.mine ? ", yours" : ""}`}>
            <Icon size={13} color={r.mine ? C.accentHi : C.textSoft} fill={r.emoji === "heart" && r.mine ? C.accentHi : "transparent"} />
            <Text style={[styles.reactionText, r.mine && { color: C.accentHi }]}>{r.count}</Text>
          </PressableScale>
        );
      })}
    </Row>
  );
}

function RouteCard({ msg, crewId }) {
  const join = useEngineMutation(engine.toggleChatRun, { success: (r) => (r.going ? `You're in for ${r.title || "the run"}` : null) });
  const d = msg.data || {};
  return (
    <View style={styles.card}>
      <RouteArt points={d.route} seed={msg.id} height={92} radius={0} />
      <Row gap={S.md} style={{ padding: S.md }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {d.title || "A route"}
          </Text>
          <Body dim size={12} numberOfLines={1}>
            {[d.km ? `${Number(d.km).toFixed(1)} km` : null, startLabel(d.startAt), msg.going ? `${msg.going} going` : null].filter(Boolean).join(" · ")}
          </Body>
        </View>
        <PressableScale onPress={() => join.mutate([crewId, msg.id])} disabled={join.isPending} scaleTo={0.92} style={[styles.join, msg.imGoing && styles.joined]} accessibilityLabel={msg.imGoing ? "Not going any more" : `Join ${d.title || "the run"}`}>
          <Text style={[styles.joinText, msg.imGoing && { color: C.textSoft }]}>{msg.imGoing ? "Going" : "Join"}</Text>
        </PressableScale>
      </Row>
    </View>
  );
}

function RunCard({ msg }) {
  const d = msg.data || {};
  return (
    <View style={styles.card}>
      {d.route?.length > 1 ? <RouteArt points={d.route} seed={msg.id} height={80} radius={0} /> : null}
      <View style={{ padding: S.md }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {d.title || "A run"}
        </Text>
        <Body dim size={12}>
          {[d.km ? `${Number(d.km).toFixed(1)} km` : null, d.paceSec ? `${formatPace(d.paceSec)} /km` : null, d.minutes ? `${d.minutes} min` : null].filter(Boolean).join(" · ")}
        </Body>
      </View>
    </View>
  );
}

function BattleCard({ msg }) {
  const d = msg.data || {};
  const rival = usePlayer(d.rivalId);
  const who = msg.isMine ? "You" : playerName(msg.author).split(" ")[0];
  const verb = d.draw ? "drew with" : d.won ? "beat" : "lost to";
  return (
    <View style={styles.battle}>
      <Row gap={0}>
        <PlayerAvatar player={msg.author} size={26} />
        <PlayerAvatar player={rival.data || { name: d.rivalName }} size={26} style={{ marginLeft: -6 }} />
      </Row>
      <Text style={styles.battleText} numberOfLines={1}>
        {who} {verb} {d.rivalName || "a rival"}
        {d.out ? <Text style={{ color: C.accentHi }}>{` · +${d.out} OUT`}</Text> : null}
      </Text>
    </View>
  );
}

function Message({ item, crewId, fresh, onHold, onReact }) {
  const router = useRouter();
  const { msg, prev, next } = item;
  const newDay = !prev || !sameDay(prev.at, msg.at);
  const groupedAbove = !newDay && prev && prev.authorId === msg.authorId && prev.kind === "text" && msg.at - prev.at < GROUP_MS;
  const groupedBelow = next && next.authorId === msg.authorId && next.kind === "text" && msg.kind === "text" && sameDay(next.at, msg.at) && next.at - msg.at < GROUP_MS;
  const mine = msg.isMine;
  const dayRow = newDay ? (
    <View style={styles.dayWrap}>
      <Text style={styles.day}>{sameDay(msg.at, Date.now()) ? "Today" : dateLabel(msg.at)}</Text>
    </View>
  ) : null;

  if (msg.kind === "battle") {
    return (
      <Animated.View entering={fresh ? FadeInDown.springify().damping(18) : undefined}>
        {dayRow}
        <Pressable onLongPress={() => onHold(msg)} style={{ alignItems: "center", marginTop: S.md }}>
          <BattleCard msg={msg} />
          <Reactions msg={msg} onReact={onReact} />
        </Pressable>
      </Animated.View>
    );
  }

  const corners = mine
    ? { borderTopRightRadius: groupedAbove ? 6 : 20, borderBottomRightRadius: groupedBelow ? 6 : 20 }
    : { borderTopLeftRadius: groupedAbove ? 6 : 20, borderBottomLeftRadius: groupedBelow ? 6 : 20 };

  let body;
  if (msg.kind === "route") body = <RouteCard msg={msg} crewId={crewId} />;
  else if (msg.kind === "run") body = <RunCard msg={msg} />;
  else if (msg.kind === "photo")
    body = (
      <View style={styles.card}>
        {msg.photo ? <Image source={msg.photo} style={styles.photo} contentFit="cover" transition={150} accessibilityLabel={msg.text || "Photo"} /> : null}
        {msg.text ? (
          <Text style={[styles.text, { padding: S.md, paddingTop: S.sm }]} numberOfLines={3}>
            {msg.text}
          </Text>
        ) : null}
      </View>
    );
  else
    body = (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, corners]}>
        <Text style={[styles.text, mine && { color: "#fff" }]}>{msg.text}</Text>
      </View>
    );

  return (
    <Animated.View entering={fresh ? FadeInDown.springify().damping(18) : undefined}>
      {dayRow}
      <View style={[styles.line, mine && { justifyContent: "flex-end" }, { marginTop: groupedAbove ? 3 : S.md }]}>
        {!mine ? (
          groupedBelow ? (
            <View style={{ width: 30 }} />
          ) : (
            <PressableScale onPress={() => msg.author && router.push(`/player/${msg.author.id}`)} scaleTo={0.9} accessibilityLabel={`Open ${playerName(msg.author)}`}>
              <PlayerAvatar player={msg.author} size={30} />
            </PressableScale>
          )
        ) : null}
        <Pressable onLongPress={() => onHold(msg)} delayLongPress={300} style={{ maxWidth: msg.kind === "text" ? "76%" : "74%", width: msg.kind === "text" ? undefined : "74%", alignItems: mine ? "flex-end" : "flex-start" }}>
          {!mine && !groupedAbove ? <Text style={styles.author}>{playerName(msg.author).split(" ")[0]}</Text> : null}
          {body}
          <Reactions msg={msg} onReact={onReact} mine={mine} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function Dots() {
  const a = useSharedValue(0.3);
  useEffect(() => {
    a.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
  }, [a]);
  const s1 = useAnimatedStyle(() => ({ opacity: a.value }));
  const b = useSharedValue(0.3);
  useEffect(() => {
    b.value = withDelay(200, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false));
  }, [b]);
  const s2 = useAnimatedStyle(() => ({ opacity: b.value }));
  return (
    <Row gap={4} style={styles.dots}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s1]} />
    </Row>
  );
}

function Typing({ crewId }) {
  const typing = useCrewTyping(crewId);
  const p = typing.data?.player;
  if (!p) return null;
  return (
    <Animated.View entering={FadeIn} style={styles.typing}>
      <PlayerAvatar player={p} size={22} />
      <Dots />
      <Text style={styles.typingText}>{playerName(p).split(" ")[0]} is typing</Text>
    </Animated.View>
  );
}

/** The + tray: a photo, a route to run together, your last run or a battle. */
function Tray({ crew, visible, onClose }) {
  const [step, setStep] = useState("menu");
  const runs = useRuns(10);
  const battles = useBattles("complete");
  useEffect(() => {
    if (visible) setStep("menu");
  }, [visible]);
  const share = useEngineMutation(engine.shareToCrewChat, { success: "Shared in the chat", onSuccess: onClose });
  const list = runs.data || [];
  const done = (battles.data || []).slice(0, 6);
  const last = list[0];

  const photo = async () => {
    const p = await pickPhoto({ camera: false });
    if (p) share.mutate([crew.id, { kind: "photo", photoUri: p.uri }]);
  };

  const options = [
    { key: "photo", icon: ImagePlus, label: "Photo", hint: "From your camera roll", onPress: photo },
    { key: "route", icon: RouteIcon, label: "Route", hint: "A run to do together, tomorrow morning", onPress: () => setStep("route") },
    { key: "run", icon: Timer, label: "Last run", hint: last ? `${last.title || "Run"} · ${formatKm(last.distanceKm)}` : "Finish a run first", disabled: !last, onPress: () => share.mutate([crew.id, { kind: "run", runId: last.id }]) },
    { key: "battle", icon: Swords, label: "Battle", hint: done.length ? "A battle you've finished" : "Finish a battle first", disabled: !done.length, onPress: () => setStep("battle") },
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      {step === "menu" ? (
        <>
          <Text style={styles.trayTitle}>Share with the crew</Text>
          {[options.slice(0, 2), options.slice(2)].map((pair, r) => (
            <Row key={r} gap={S.md} style={{ marginTop: S.md, alignItems: "stretch" }}>
              {pair.map((o) => (
                <PressableScale key={o.key} disabled={o.disabled || share.isPending} onPress={o.onPress} scaleTo={0.96} style={[styles.trayItem, o.disabled && { opacity: 0.45 }]} accessibilityLabel={o.label}>
                  <View style={styles.trayIcon}>
                    <o.icon size={20} color={C.accentHi} />
                  </View>
                  <Text style={styles.trayLabel}>{o.label}</Text>
                  <Body dim size={12} numberOfLines={2}>
                    {o.hint}
                  </Body>
                </PressableScale>
              ))}
            </Row>
          ))}
        </>
      ) : null}
      {step === "route" ? (
        <>
          <Text style={styles.trayTitle}>Pick a route</Text>
          <Body dim size={13}>The crew can join it from the chat.</Body>
          <View style={{ marginTop: S.md }}>
            {list.filter((r) => r.route?.length > 1).slice(0, 5).map((r) => (
              <PressableScale key={r.id} onPress={() => share.mutate([crew.id, { kind: "route", runId: r.id }])} scaleTo={0.98} style={styles.pickRow}>
                <RouteArt points={r.route.map((pt) => (Array.isArray(pt) ? pt : [pt.latitude ?? pt.lat, pt.longitude ?? pt.lng]))} seed={r.id} height={44} radius={10} style={{ width: 64 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title || "Run"}</Text>
                  <Body dim size={12}>
                    {formatKm(r.distanceKm)} · {timeAgo(r.startedAt)}
                  </Body>
                </View>
              </PressableScale>
            ))}
            {!list.some((r) => r.route?.length > 1) ? <Body dim>None of your runs have a route yet.</Body> : null}
          </View>
        </>
      ) : null}
      {step === "battle" ? (
        <>
          <Text style={styles.trayTitle}>Pick a battle</Text>
          <View style={{ marginTop: S.md }}>
            {done.map((b) => (
              <PressableScale key={b.id} onPress={() => share.mutate([crew.id, { kind: "battle", battleId: b.id }])} scaleTo={0.98} style={styles.pickRow}>
                <PlayerAvatar player={b.opponent.player} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {b.result === "won" ? "You beat" : b.result === "lost" ? "You lost to" : "You drew with"} {playerName(b.opponent.player).split(" ")[0]}
                  </Text>
                  <Body dim size={12}>
                    {b.modeName}
                    {b.endAt ? ` · ${timeAgo(b.endAt)}` : ""}
                  </Body>
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function ReactSheet({ msg, onClose, onReact, onReport }) {
  return (
    <Sheet visible={!!msg} onClose={onClose}>
      <Text style={styles.trayTitle}>React</Text>
      <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
        {REACTIONS.map((r) => {
          const on = msg?.reactions?.some((x) => x.emoji === r.key && x.mine);
          return (
            <PressableScale
              key={r.key}
              onPress={() => {
                onReact(msg, r.key);
                onClose();
              }}
              scaleTo={0.88}
              style={[styles.reactBig, on && { backgroundColor: C.accentDim, borderColor: C.accent }]}
              accessibilityLabel={r.label}
            >
              <r.icon size={26} color={on ? C.accentHi : C.text} />
            </PressableScale>
          );
        })}
      </Row>
      {msg && !msg.isMine ? (
        <PressableScale
          onPress={() => {
            onClose();
            setTimeout(() => onReport(msg), 250);
          }}
          style={styles.reportRow}
          accessibilityLabel="Report message"
        >
          <Flag size={17} color={C.danger} />
          <Text style={{ color: C.danger, fontFamily: F.bodySemi, fontSize: 15 }}>Report message</Text>
        </PressableScale>
      ) : null}
    </Sheet>
  );
}

function ChatSkeleton() {
  return (
    <View style={{ flex: 1, justifyContent: "flex-end", padding: S.gutter, gap: S.md }}>
      {[180, 140, 220].map((w, i) => (
        <View key={i} style={{ flexDirection: "row", gap: S.sm, alignItems: "flex-end", alignSelf: i === 1 ? "flex-end" : "flex-start" }}>
          {i !== 1 ? <Skeleton width={30} height={30} radius={15} /> : null}
          <Skeleton width={w} height={40} radius={20} />
        </View>
      ))}
    </View>
  );
}

export default function CrewChat({ crew }) {
  const messages = useCrewChat(crew.id);
  const [text, setText] = useState("");
  const [tray, setTray] = useState(false);
  const [holding, setHolding] = useState(null);
  const [report, setReport] = useState(null);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const send = useEngineMutation(engine.sendCrewMessage, { onSuccess: () => setText("") });
  const react = useEngineMutation(engine.reactToMessage, { silent: true });
  const mountedAt = useRef(Date.now()).current;
  const wrapRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const measure = () => wrapRef.current?.measureInWindow((_x, y) => setOffset(y || 0));
  const staff = crew.myRole === "owner" || crew.myRole === "admin";
  const locked = crew.chatPolicy === "admins" && !staff;

  // Reading the chat clears its unread count.
  const qc = useQueryClient();
  const newest = messages.data?.[messages.data.length - 1]?.id;
  useEffect(() => {
    if (!newest) return;
    engine
      .markCrewRead(crew.id)
      .then(() => qc.invalidateQueries({ queryKey: ["engine", "crewUnread", crew.id] }))
      .catch(() => {});
  }, [crew.id, newest, qc]);

  const items = useMemo(() => {
    const list = messages.data || [];
    return list.map((m, i) => ({ msg: m, prev: list[i - 1], next: list[i + 1] })).reverse();
  }, [messages.data]);

  const ready = !!text.trim() && !send.isPending;
  const submit = () => ready && send.mutate([crew.id, text.trim()]);
  const onReact = (msg, emoji) => react.mutate([crew.id, msg.id, emoji]);
  // The tab bar floats over the bottom of the screen; the composer sits above it.
  const bottomPad = Platform.OS === "ios" && keyboard ? S.sm : insets.bottom + TAB_BAR_SPACE - 16;

  return (
    <View ref={wrapRef} onLayout={measure} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={offset}>
        {messages.isPending ? (
          <ChatSkeleton />
        ) : items.length === 0 ? (
          <Pressable style={{ flex: 1, justifyContent: "center" }} onPress={Keyboard.dismiss}>
            <EmptyState title="Quiet in here" body={`Kick it off. Say hello to ${crew.name}, or share a route from the +.`} />
          </Pressable>
        ) : (
          <FlatList
            data={items}
            inverted
            keyExtractor={(it) => it.msg.id}
            renderItem={({ item }) => <Message item={item} crewId={crew.id} fresh={item.msg.at > mountedAt} onHold={setHolding} onReact={onReact} />}
            ListHeaderComponent={<Typing crewId={crew.id} />}
            contentContainerStyle={{ paddingHorizontal: S.gutter, paddingVertical: S.md }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          />
        )}
        <View style={[styles.composer, { paddingBottom: bottomPad }]}>
          {locked ? (
            <Row gap={S.sm} style={styles.locked}>
              <Lock size={15} color={C.textDim} />
              <Body dim size={13}>
                Only crew admins post here. You can still react.
              </Body>
            </Row>
          ) : (
            <>
              <PressableScale onPress={() => setTray(true)} scaleTo={0.88} style={styles.plus} accessibilityLabel="Share a photo, route, run or battle">
                <Plus size={22} color={C.text} />
              </PressableScale>
              <View style={styles.inputWrap}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Message the crew"
                  placeholderTextColor={C.textMute}
                  multiline
                  numberOfLines={1}
                  maxLength={1000}
                  style={styles.input}
                  accessibilityLabel="Message the crew"
                />
              </View>
              <PressableScale onPress={submit} disabled={!ready} scaleTo={0.88} accessibilityLabel="Send message" style={[styles.send, { backgroundColor: ready ? C.accent : C.surfaceHigh }]}>
                <Send size={18} color={ready ? "#fff" : C.textMute} />
              </PressableScale>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <Tray crew={crew} visible={tray} onClose={() => setTray(false)} />
      <ReactSheet msg={holding} onClose={() => setHolding(null)} onReact={onReact} onReport={(m) => setReport({ crewId: crew.id, targetType: "message", targetId: m.id, author: m.author })} />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  dayWrap: { alignItems: "center", marginTop: S.lg },
  day: { color: C.textMute, fontSize: 12, fontFamily: F.bodySemi },
  line: { flexDirection: "row", alignItems: "flex-end", gap: S.sm },
  author: { color: C.textDim, fontSize: 12, fontFamily: F.bodySemi, marginBottom: 4, marginLeft: 6 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { backgroundColor: C.accent },
  theirs: { backgroundColor: C.surfaceHigh },
  text: { color: C.text, fontSize: 15, lineHeight: 20, fontFamily: F.body },
  card: { width: "100%", borderRadius: 18, overflow: "hidden", backgroundColor: C.surfaceHigh },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  photo: { width: "100%", aspectRatio: 1.3, backgroundColor: C.surface },
  join: { height: 32, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  joined: { backgroundColor: C.surface },
  joinText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  reactionMine: { borderColor: C.accent, backgroundColor: C.accentDim },
  reactionText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12 },
  battle: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 40, paddingLeft: 6, paddingRight: 14, borderRadius: 20, backgroundColor: "#132036", borderWidth: 1, borderColor: "rgba(61,139,255,0.3)", maxWidth: "92%" },
  battleText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, flexShrink: 1 },
  typing: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  dots: { height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: C.surfaceHigh },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textDim },
  typingText: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, paddingHorizontal: S.gutter, paddingTop: S.sm, backgroundColor: C.bg },
  plus: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" },
  inputWrap: { flex: 1, minHeight: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)", justifyContent: "center" },
  input: { maxHeight: 120, color: C.text, fontSize: 14, lineHeight: 19, fontFamily: F.body, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, outlineStyle: "none" },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  locked: { flex: 1, height: 46, paddingHorizontal: S.lg, borderRadius: 23, backgroundColor: C.surface },
  trayTitle: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase", marginTop: S.xs },
  trayItem: { flex: 1, padding: S.md, borderRadius: 16, backgroundColor: C.surfaceHigh, gap: 4 },
  trayIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  trayLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.sm, borderRadius: 14, backgroundColor: C.surfaceHigh, marginBottom: S.sm },
  reactBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  reportRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xl, height: 44 },
});
