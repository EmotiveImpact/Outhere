// Crew settings: who can join, the weekly crew goal, who can post in the
// chat, and who's an admin. Owners and admins change things and Save; the
// owner changes the crest. Everyone can invite people or leave.

import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, ChevronsRight, DoorOpen, Inbox, Lock, MessageSquare, ShieldMinus, ShieldPlus, Trash2, Trophy, UserPlus, UserRound, UserX } from "lucide-react-native";
import { Body, Button, C, Card, EmptyState, F, Header, PressableScale, Row, S, Screen, Skeleton } from "@/components/ui";
import { engine, useBlocked, useCrew, useEngineMutation, useJoinRequests } from "@/data/hooks";
import ActionSheet from "@/components/crew/ActionSheet";
import { pickPhoto } from "@/components/crew/pickPhoto";
import { CrewLogo, PlayerAvatar, ROLE_LABEL, codeLabel, playerName, shareInvite, useCrewFocus } from "@/components/crew/shared";

const JOIN = [
  { value: "public", label: "Anyone", hint: "People join straight away" },
  { value: "request", label: "Ask first", hint: "Admins say yes or no to each request" },
  { value: "invite", label: "Invite only", hint: "Only people with the crew code" },
];
const CHAT = [
  { value: "everyone", label: "Everyone", hint: "Every member can post" },
  { value: "admins", label: "Admins only", hint: "Members read and react" },
];
const GOALS = [50, 100, 200, 300, 500, 750, 1000];
const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

const joinedLabel = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Joined ${d.toLocaleDateString("en-GB", sameYear ? { month: "long" } : { month: "long", year: "numeric" })}`;
};

const confirm = (title, body, action, onPress, destructive = false) => {
  if (Platform.OS === "web") return onPress();
  Alert.alert(title, body, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: destructive ? "destructive" : "default", onPress },
  ]);
};

function SettingRow({ icon: Icon, label, value, onPress, first, disabled }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.985} style={[styles.row, !first && styles.divider]} accessibilityLabel={`${label}: ${value}`}>
      <Icon size={18} color={C.textDim} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {!disabled ? <ChevronsRight size={16} color={C.textMute} /> : null}
    </PressableScale>
  );
}

export default function CrewSettingsScreen() {
  const { crewId } = useLocalSearchParams();
  const id = String(crewId || "");
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const { data: crew, isPending, isError } = useCrew(id);
  const staff = crew?.myRole === "owner" || crew?.myRole === "admin";
  const owner = crew?.myRole === "owner";
  const requests = useJoinRequests(id, !!staff);
  const blocked = useBlocked();
  const [form, setForm] = useState(null);
  const [picker, setPicker] = useState(null);
  const [member, setMember] = useState(null);

  useEffect(() => {
    if (crew && !form) setForm({ name: crew.name, privacy: crew.privacy, weeklyGoalKm: crew.weeklyGoalKm || 100, chatPolicy: crew.chatPolicy || "everyone", logo: null });
  }, [crew, form]);

  const save = useEngineMutation(engine.updateCrew, { success: "Crew settings saved", onSuccess: () => setForm(null) });
  const setRole = useEngineMutation(engine.setCrewRole, { success: "Role updated" });
  const remove = useEngineMutation(engine.removeCrewMember, { success: "Removed from the crew" });
  const unblock = useEngineMutation(engine.unblockPlayer, { success: "Unblocked" });
  const gone = () => {
    focus(null);
    router.dismissTo("/(tabs)/club");
  };
  const leave = useEngineMutation(engine.leaveCrew, { success: () => `You left ${crew?.name || "the crew"}`, onSuccess: gone });
  const destroy = useEngineMutation(engine.deleteCrew, { success: () => `${crew?.name || "The crew"} deleted`, onSuccess: gone });

  if (isPending || (crew && !form)) {
    return (
      <Screen header={<Header back title="Crew settings" />}>
        <Skeleton height={90} radius={20} />
        <Skeleton height={150} radius={20} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }
  if (isError || !crew || !crew.isMember) {
    return (
      <Screen header={<Header back title="Crew settings" />}>
        <EmptyState title="Not your crew" body="Crew settings are for its members." action="Back to Crew" onAction={() => router.dismissTo("/(tabs)/club")} />
      </Screen>
    );
  }

  const dirty =
    form.name.trim() !== crew.name || form.privacy !== crew.privacy || form.weeklyGoalKm !== (crew.weeklyGoalKm || 100) || form.chatPolicy !== (crew.chatPolicy || "everyone") || !!form.logo;
  const submit = () => {
    if (form.name.trim().length < 3) return;
    const patch = {};
    if (form.name.trim() !== crew.name) patch.name = form.name.trim();
    if (form.privacy !== crew.privacy) patch.privacy = form.privacy;
    if (form.weeklyGoalKm !== crew.weeklyGoalKm) patch.weeklyGoalKm = form.weeklyGoalKm;
    if (form.chatPolicy !== (crew.chatPolicy || "everyone")) patch.chatPolicy = form.chatPolicy;
    if (form.logo) patch.logo = form.logo;
    save.mutate([crew.id, patch]);
  };
  const crest = async () => {
    const p = await pickPhoto({ aspect: [1, 1] });
    if (p) setForm((f) => ({ ...f, logo: p.uri }));
  };

  const members = [...(crew.members || [])].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.joinedAt || 0) - (b.joinedAt || 0));
  const admins = members.filter((m) => m.role !== "member").length;
  const asks = requests.data?.length || 0;
  const pickers = {
    privacy: { title: "Who can join", list: JOIN },
    chatPolicy: { title: "Who can post in the chat", list: CHAT },
    weeklyGoalKm: { title: "Weekly crew goal", list: GOALS.map((g) => ({ value: g, label: `${g.toLocaleString("en-GB")} km`, hint: `${Math.round((g / 7) * 10) / 10} km a day as a crew` })) },
  };
  const open = picker ? pickers[picker] : null;

  const memberOptions = [];
  if (member) {
    const name = member.player.name || member.player.username;
    memberOptions.push({ label: "View profile", icon: UserRound, onPress: () => router.push(`/player/${member.player.id}`) });
    if (owner && member.role === "member")
      memberOptions.push({ label: "Make admin", hint: "Can change settings, answer requests and remove members", icon: ShieldPlus, onPress: () => setRole.mutate([crew.id, member.player.id, "admin"]) });
    if (owner && member.role === "admin") memberOptions.push({ label: "Make a member again", icon: ShieldMinus, onPress: () => setRole.mutate([crew.id, member.player.id, "member"]) });
    if (member.role !== "owner" && (owner || member.role === "member"))
      memberOptions.push({
        label: "Remove from crew",
        icon: UserX,
        destructive: true,
        onPress: () => confirm(`Remove ${name}?`, "They can come back with the crew code.", "Remove", () => remove.mutate([crew.id, member.player.id]), true),
      });
  }

  return (
    <Screen
      header={
        <Header
          back
          title="Crew settings"
          right={
            staff ? (
              <Pressable onPress={submit} disabled={!dirty || save.isPending} hitSlop={10} accessibilityRole="button" accessibilityLabel="Save">
                <Text style={[styles.save, (!dirty || save.isPending) && { color: C.textMute }]}>{save.isPending ? "Saving" : "Save"}</Text>
              </Pressable>
            ) : null
          }
        />
      }
    >
      <Row gap={S.lg} style={{ marginBottom: S.lg }}>
        <View>
          {form.logo ? <CrewLogo crew={{ ...crew, logo: form.logo }} size={84} radius={22} ring={false} /> : <CrewLogo crew={crew} size={84} radius={22} ring={false} />}
          {owner ? (
            <PressableScale onPress={crest} scaleTo={0.88} style={styles.camera} accessibilityLabel="Change the crest">
              <Camera size={16} color="#fff" />
            </PressableScale>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          {staff ? (
            <TextInput value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} maxLength={32} style={styles.name} accessibilityLabel="Crew name" />
          ) : (
            <Text style={styles.name}>{crew.name}</Text>
          )}
          <Body dim size={13}>
            {crew.inviteCode ? `Code ${codeLabel(crew.inviteCode)} · ` : ""}
            {crew.memberCount} members
          </Body>
        </View>
      </Row>

      <Card padding={0}>
        <SettingRow first icon={Lock} label="Who can join" value={JOIN.find((j) => j.value === form.privacy)?.label || "Anyone"} onPress={() => setPicker("privacy")} disabled={!staff} />
        <SettingRow icon={Trophy} label="Weekly crew goal" value={`${form.weeklyGoalKm.toLocaleString("en-GB")} km`} onPress={() => setPicker("weeklyGoalKm")} disabled={!staff} />
        <SettingRow icon={MessageSquare} label="Chat" value={CHAT.find((c) => c.value === form.chatPolicy)?.label || "Everyone"} onPress={() => setPicker("chatPolicy")} disabled={!staff} />
        {staff ? <SettingRow icon={Inbox} label="Join requests" value={asks ? `${asks} waiting` : "None"} onPress={() => router.push(`/crew/requests/${crew.id}`)} /> : null}
      </Card>

      <Row style={{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }}>
        <Text style={styles.h}>Members and roles</Text>
        <Body dim size={13}>
          {admins} {admins === 1 ? "admin" : "admins"}
        </Body>
      </Row>
      <Card padding={0}>
        {members.map((m, i) => {
          const me = m.player.isMe;
          const manageable = staff && !me && m.role !== "owner" && (owner || m.role === "member");
          return (
            <PressableScale
              key={m.player.id}
              onPress={() => (manageable ? setMember(m) : router.push(me ? "/(tabs)/profile" : `/player/${m.player.id}`))}
              scaleTo={0.985}
              style={[styles.member, i > 0 && styles.divider]}
            >
              <PlayerAvatar player={m.player} size={40} outside={m.isOutside} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {me ? m.player.name || "You" : playerName(m.player)}
                </Text>
                <Body dim size={12}>
                  {me ? "You" : joinedLabel(m.joinedAt)}
                </Body>
              </View>
              {m.role === "owner" ? (
                <View style={[styles.role, { backgroundColor: C.accent }]}>
                  <Text style={[styles.roleText, { color: "#fff" }]}>Owner</Text>
                </View>
              ) : m.role === "admin" ? (
                <View style={styles.role}>
                  <Text style={styles.roleText}>Admin</Text>
                </View>
              ) : (
                <Row gap={2}>
                  <Text style={[styles.roleText, { color: C.textDim }]}>{ROLE_LABEL.member}</Text>
                  {manageable ? <ChevronsRight size={15} color={C.textMute} /> : null}
                </Row>
              )}
            </PressableScale>
          );
        })}
      </Card>

      {blocked.data?.length ? (
        <>
          <Text style={[styles.h, { marginTop: S.xxl, marginBottom: S.md }]}>Blocked</Text>
          <Card padding={0}>
            {blocked.data.map((p, i) => (
              <Row key={p.id} gap={S.md} style={[styles.member, i > 0 && styles.divider]}>
                <PlayerAvatar player={p} size={36} />
                <Text style={[styles.memberName, { flex: 1 }]}>{playerName(p)}</Text>
                <Button title="Unblock" size="sm" variant="secondary" onPress={() => unblock.mutate(p.id)} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <Button title="Invite people" icon={UserPlus} variant="secondary" full onPress={() => shareInvite(crew)} style={{ marginTop: S.xxl }} />
      <Button
        title="Leave crew"
        icon={DoorOpen}
        variant="ghost"
        full
        loading={leave.isPending}
        onPress={() =>
          confirm(
            `Leave ${crew.name}?`,
            owner ? (crew.memberCount > 1 ? "Ownership passes to an admin, or the longest standing member." : "You're the only member, so the crew goes too.") : "You can come back with the crew code.",
            "Leave",
            () => leave.mutate(crew.id),
            true,
          )
        }
        style={{ marginTop: S.sm }}
      />
      {owner ? (
        <Button
          title="Delete crew"
          icon={Trash2}
          variant="danger"
          full
          loading={destroy.isPending}
          onPress={() => confirm(`Delete ${crew.name}?`, "The crew, its chat and its feed go for good.", "Delete crew", () => destroy.mutate(crew.id), true)}
          style={{ marginTop: S.sm }}
        />
      ) : null}

      <ActionSheet
        visible={!!open}
        title={open?.title}
        options={(open?.list || []).map((o) => ({ label: o.label, hint: o.value === form[picker] ? `${o.hint} · chosen` : o.hint, onPress: () => setForm((f) => ({ ...f, [picker]: o.value })) }))}
        onClose={() => setPicker(null)}
      />
      <ActionSheet
        visible={!!member}
        title={member ? member.player.name || member.player.username : ""}
        subtitle={member ? `${ROLE_LABEL[member.role]} · ${joinedLabel(member.joinedAt).toLowerCase()}` : ""}
        options={memberOptions}
        onClose={() => setMember(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  save: { color: C.accent, fontFamily: F.bodySemi, fontSize: 16 },
  camera: { position: "absolute", right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: C.bg },
  name: { color: C.text, fontFamily: F.display, fontSize: 30, textTransform: "uppercase", padding: 0, outlineStyle: "none" },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, height: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rowLabel: { flex: 1, color: C.text, fontFamily: F.bodyMedium, fontSize: 15 },
  rowValue: { color: C.textDim, fontFamily: F.body, fontSize: 14 },
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  member: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  memberName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  role: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  roleText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
