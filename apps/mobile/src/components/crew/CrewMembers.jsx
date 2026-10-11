import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, MoreHorizontal, Shield, ShieldMinus, ShieldPlus, UserRound, UserX } from "lucide-react-native";
import { Avatar, Body, C, Card, Loading, S } from "@/components/ui";
import { engine, useEngineMutation } from "@/data/hooks";
import { compactNumber, timeAgo } from "@/utils/format";
import ActionSheet from "./ActionSheet";
import { ROLE_LABEL } from "./shared";

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

/** Member list. Owners and admins get a menu per member to manage roles. */
export default function CrewMembers({ crew }) {
  const router = useRouter();
  const remove = useEngineMutation(engine.removeCrewMember);
  const setRole = useEngineMutation(engine.setCrewRole);
  const [selected, setSelected] = useState(null);

  if (!crew.members) return <Loading />;
  const members = [...crew.members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.weekSteps - a.weekSteps);
  const canManage = crew.myRole === "owner" || crew.myRole === "admin";
  const accent = crew.accent || C.accent;

  const confirm = (title, body, action, onPress, destructive = false) =>
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      { text: action, style: destructive ? "destructive" : "default", onPress },
    ]);

  const options = [];
  if (selected) {
    const m = selected;
    const name = m.player.name || m.player.username;
    if (crew.myRole === "owner" && m.role === "member")
      options.push({
        label: "Make admin",
        icon: ShieldPlus,
        onPress: () => confirm(`Make ${name} an admin?`, "Admins can edit crew details and remove members.", "Make admin", () => setRole.mutate([crew.id, m.player.id, "admin"])),
      });
    if (crew.myRole === "owner" && m.role === "admin")
      options.push({
        label: "Remove admin role",
        icon: ShieldMinus,
        onPress: () => confirm(`Demote ${name}?`, "They stay in the crew as a member.", "Demote", () => setRole.mutate([crew.id, m.player.id, "member"])),
      });
    options.push({ label: "View profile", icon: UserRound, onPress: () => router.push(`/player/${m.player.id}`) });
    options.push({
      label: "Remove from crew",
      icon: UserX,
      destructive: true,
      onPress: () =>
        confirm(`Remove ${name}?`, "They can rejoin later if the crew is public or they have the code.", "Remove", () => remove.mutate([crew.id, m.player.id]), true),
    });
  }

  return (
    <Card padding={0} style={{ marginBottom: S.md }}>
      {members.map((m, i) => {
        const isMe = m.player.isMe;
        const manageable = canManage && !isMe && m.role !== "owner" && !(crew.myRole === "admin" && m.role === "admin");
        return (
          <Pressable
            key={m.player.id}
            onPress={() => router.push(isMe ? "/(tabs)/profile" : `/player/${m.player.id}`)}
            style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.6 }]}
          >
            <Avatar uri={m.player.avatar} name={m.player.name || m.player.username} size={42} outside={m.isOutside} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {isMe ? "You" : m.player.name || m.player.username}
                </Text>
                {m.role === "owner" ? <Crown size={14} color={C.gold} /> : m.role === "admin" ? <Shield size={14} color={accent} /> : null}
              </View>
              <Body mute size={12}>
                {ROLE_LABEL[m.role]} · {compactNumber(m.weekSteps)} steps this week{m.isOutside ? " · outside now" : ""}
              </Body>
            </View>
            {manageable ? (
              <Pressable onPress={() => setSelected(m)} hitSlop={10} style={styles.more} accessibilityLabel={`Manage ${m.player.username}`}>
                <MoreHorizontal size={18} color={C.textDim} />
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}
      <ActionSheet
        visible={!!selected}
        title={selected ? selected.player.name || selected.player.username : ""}
        subtitle={selected ? `${ROLE_LABEL[selected.role]} · joined ${timeAgo(selected.joinedAt)}` : ""}
        options={options}
        onClose={() => setSelected(null)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  name: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  more: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
});
