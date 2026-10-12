import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, MoreHorizontal, Shield, ShieldMinus, ShieldPlus, UserRound, UserX } from "lucide-react-native";
import { Body, C, Card, F, FadeIn, LiveDot, PressableScale, Row, S, SkeletonList } from "@/components/ui";
import { engine, useEngineMutation } from "@/data/hooks";
import { compactNumber, timeAgo } from "@/utils/format";
import ActionSheet from "./ActionSheet";
import { PlayerAvatar, ROLE_LABEL, playerName } from "./shared";

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

/** Member list. Owners and admins get a menu per member to manage roles. */
export default function CrewMembers({ crew }) {
  const router = useRouter();
  const remove = useEngineMutation(engine.removeCrewMember, { success: "Removed from the crew" });
  const setRole = useEngineMutation(engine.setCrewRole, { success: "Role updated" });
  const [selected, setSelected] = useState(null);

  if (!crew.members) return <SkeletonList count={5} height={64} />;
  const members = [...crew.members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.weekSteps - a.weekSteps);
  const canManage = crew.myRole === "owner" || crew.myRole === "admin";
  const outside = members.filter((m) => m.isOutside).length;

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
        hint: "Can edit the crew and remove members",
        icon: ShieldPlus,
        onPress: () => confirm(`Make ${name} an admin?`, "Admins can edit crew details and remove members.", "Make admin", () => setRole.mutate([crew.id, m.player.id, "admin"])),
      });
    if (crew.myRole === "owner" && m.role === "admin")
      options.push({
        label: "Remove admin role",
        hint: "They stay in the crew as a member",
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
    <View style={{ marginBottom: S.md }}>
      <Row style={{ justifyContent: "space-between", marginBottom: S.md, paddingHorizontal: 4 }}>
        <Text style={styles.count}>
          {members.length} {members.length === 1 ? "member" : "members"}
        </Text>
        {outside ? (
          <Row gap={6}>
            <LiveDot size={7} />
            <Text style={styles.outside}>{outside} outside now</Text>
          </Row>
        ) : null}
      </Row>
      <Card padding={0}>
        {members.map((m, i) => {
          const isMe = m.player.isMe;
          const manageable = canManage && !isMe && m.role !== "owner" && !(crew.myRole === "admin" && m.role === "admin");
          return (
            <FadeIn key={m.player.id} index={i}>
              <PressableScale
                onPress={() => router.push(isMe ? "/(tabs)/profile" : `/player/${m.player.id}`)}
                scaleTo={0.985}
                style={[styles.row, i > 0 && styles.divider]}
              >
                <PlayerAvatar player={m.player} size={44} outside={m.isOutside} />
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <Text style={styles.name} numberOfLines={1}>
                      {playerName(m.player)}
                    </Text>
                    {m.role === "owner" ? <Crown size={14} color={C.textDim} /> : m.role === "admin" ? <Shield size={14} color={C.textDim} /> : null}
                  </Row>
                  <Body dim size={13} numberOfLines={1}>
                    {ROLE_LABEL[m.role]} · {compactNumber(m.weekSteps)} steps this week
                  </Body>
                </View>
                {manageable ? (
                  <PressableScale onPress={() => setSelected(m)} hitSlop={8} scaleTo={0.88} style={styles.more} accessibilityLabel={`Manage ${m.player.username}`}>
                    <MoreHorizontal size={18} color={C.textDim} />
                  </PressableScale>
                ) : null}
              </PressableScale>
            </FadeIn>
          );
        })}
      </Card>
      <ActionSheet
        visible={!!selected}
        title={selected ? selected.player.name || selected.player.username : ""}
        subtitle={selected ? `${ROLE_LABEL[selected.role]} · joined ${timeAgo(selected.joinedAt)}` : ""}
        header={
          selected ? (
            <View style={{ marginBottom: S.sm }}>
              <PlayerAvatar player={selected.player} size={52} />
            </View>
          ) : null
        }
        options={options}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: C.textDim, fontSize: 13, fontFamily: F.displayMedium },
  outside: { color: C.textDim, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  name: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  more: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
