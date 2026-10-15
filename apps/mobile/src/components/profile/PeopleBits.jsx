// Small pieces for lists of people, crews and events: the search field,
// highlighted matches and the Add / Following button.

import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Search, X } from "lucide-react-native";
import { engine, useEngineMutation } from "@/data/hooks";
import { C, F, PressableScale, R, Row, S } from "@/components/ui";
import { PillButton } from "./parts";

/** Text with every case-insensitive match of `query` in blue. */
export function Highlight({ text = "", query = "", style, numberOfLines = 1 }) {
  const q = (query || "").trim().toLowerCase();
  if (!q || !text) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const parts = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at < 0) {
      parts.push({ t: text.slice(i), on: false });
      break;
    }
    if (at > i) parts.push({ t: text.slice(i, at), on: false });
    parts.push({ t: text.slice(at, at + q.length), on: true });
    i = at + q.length;
  }
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, k) => (
        <Text key={k} style={p.on ? { color: C.accent } : undefined}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
}

/** The rounded search field. */
export function SearchField({ value, onChangeText, placeholder = "Search", autoFocus = false, focused = false, style }) {
  return (
    <Row gap={S.sm} style={[styles.field, focused && styles.fieldOn, style]}>
      <Search size={18} color={C.textDim} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMute}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <PressableScale onPress={() => onChangeText("")} accessibilityLabel="Clear">
          <X size={16} color={C.textDim} />
        </PressableScale>
      ) : null}
    </Row>
  );
}

/** Add (follow) or Following (tap to unfollow). */
export function FollowButton({ person, addLabel = "Add" }) {
  const follow = useEngineMutation(engine.follow, { success: () => `You're following ${person.name}` });
  const unfollow = useEngineMutation(engine.unfollow);
  if (person.isMe) return null;
  const busy = follow.isPending || unfollow.isPending;
  return person.isFollowing ? (
    <PillButton title="Following" ghost disabled={busy} onPress={() => unfollow.mutate(person.id)} />
  ) : (
    <PillButton title={addLabel} disabled={busy} onPress={() => follow.mutate(person.id)} />
  );
}

/** A square crew logo, falling back to the accent colour and an initial. */
export function CrewLogo({ crew, size = 52 }) {
  const src = crew.logo || crew.cover;
  return (
    <View style={{ width: size, height: size, borderRadius: R.sm, overflow: "hidden", backgroundColor: crew.accent || C.surfaceHigh, alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ color: "#fff", fontFamily: F.display, fontSize: size * 0.45 }}>{(crew.name || "?").slice(0, 1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: 52, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  fieldOn: { borderColor: C.accent },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15, height: 50, outlineStyle: "none" },
});
