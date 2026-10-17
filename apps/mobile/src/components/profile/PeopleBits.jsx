// Small pieces for lists of people, crews and events: the search field,
// highlighted matches and the Add / Following button.

import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Search, X } from "@/components/ui/icons";
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
      <View>
        <Search size={16} color={C.textDim} />
      </View>
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

/** Add (follow) or Following (tap to unfollow). small: the little pill under a person tile. */
export function FollowButton({ person, addLabel = "Add", small = false }) {
  const follow = useEngineMutation(engine.follow, { success: () => `You're following ${person.name}` });
  const unfollow = useEngineMutation(engine.unfollow);
  if (person.isMe) return null;
  const busy = follow.isPending || unfollow.isPending;
  return person.isFollowing ? (
    <PillButton title="Following" ghost disabled={busy} onPress={() => unfollow.mutate(person.id)} style={small ? styles.small : null} textStyle={small ? styles.smallText : null} />
  ) : (
    <PillButton title={addLabel} disabled={busy} onPress={() => follow.mutate(person.id)} style={small ? styles.small : null} textStyle={small ? styles.smallText : null} />
  );
}

/** A square crew logo, falling back to a dark tile with the initial in the crew's colour. */
export function CrewLogo({ crew, size = 52 }) {
  const src = crew.logo || crew.cover;
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), overflow: "hidden", backgroundColor: "#11151c", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
      {src ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ color: crew.accent || C.accentHi, fontFamily: F.display, fontSize: size * 0.45 }}>{(crew.name || "?").slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // .search: the recessed field, 48 tall, lit along its top edge
  field: { height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: "#14171d", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  fieldOn: { boxShadow: "inset 0 0 0 1px rgba(61,139,255,0.7), 0 0 18px -6px rgba(61,139,255,0.6)" },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13.5, height: 46, outlineStyle: "none" },
  small: { height: 24, paddingHorizontal: 13 },
  smallText: { fontSize: 11 },
});
