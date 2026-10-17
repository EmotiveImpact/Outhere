// Live sharing: the people you trust can follow your spot while you're out,
// and get a text if you stop moving for ten minutes. Contacts, the two
// automatic settings and the switch to start or stop sharing now. The slab
// shows you on your last route on the night map, like the prototype.

import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronsRight, Clock, Link2, Navigation, Plus } from "@/components/ui/icons";
import { Avatar, C, F, FadeIn, GlowButton, PressableScale, Segment, Skeleton } from "@/components/ui";
import { engine, useEngineMutation, useProfile, useRunHistory, useSafety } from "@/data/hooks";
import { PHOTOS } from "@/constants/photos";
import { RecChip, RoundGlass, ToggleRow } from "@/components/move/parts";
import { LitCard, Slab } from "@/components/move/RunBits";

const MODES = [
  { value: "live", label: "Live spot" },
  { value: "alerts", label: "Alerts only" },
];

const subFor = (c, sharing) =>
  c.mode === "live" ? (sharing ? "Watching now · sees your live spot" : "Sees your live spot when you share") : "Gets an alert if you stop";

function AddContact({ onDone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("live");
  const add = useEngineMutation(engine.addTrustedContact, { success: (c) => `${c.name} added`, onSuccess: onDone });
  return (
    <View style={styles.form}>
      <TextInput value={name} onChangeText={setName} placeholder="Their name" placeholderTextColor={C.textMute} maxLength={40} style={styles.input} autoFocus autoCapitalize="words" />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" placeholderTextColor={C.textMute} keyboardType="phone-pad" maxLength={20} style={styles.input} />
      <Segment options={MODES} value={mode} onChange={setMode} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlowButton title="Cancel" variant="quiet" onPress={onDone} style={{ flex: 1 }} />
        <GlowButton title="Add contact" onPress={() => add.mutate({ name, phone, mode })} loading={add.isPending} disabled={!name.trim() || phone.replace(/\D/g, "").length < 7} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

export default function Safety() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending } = useSafety();
  const { data: profile } = useProfile();
  const lastRoute = (useRunHistory("year").data?.runs || []).find((r) => r.route?.length > 1)?.route;
  const [adding, setAdding] = useState(false);

  const settings = useEngineMutation(engine.updateSafety, { silent: false });
  const modeChange = useEngineMutation(engine.updateTrustedContact);
  const remove = useEngineMutation(engine.removeTrustedContact, { success: "Contact removed" });
  const start = useEngineMutation(engine.startLiveShare, { success: "Sharing live", onError: (e) => e?.code === "NO_CONTACTS" && setAdding(true) });
  const stop = useEngineMutation(engine.stopLiveShare, { success: "Stopped sharing" });

  const back = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/move"));
  const contacts = data?.contacts || [];
  const sharing = !!data?.share;
  const watcher = contacts.find((c) => c.mode === "live") || contacts[0];

  const [top, bottom] = sharing && watcher ? [`${watcher.name} can`, "see you"] : contacts.length ? ["Share your", "live spot"] : ["Run with", "backup"];

  const manage = (c) =>
    Alert.alert(c.name, c.phone, [
      { text: "Remove", style: "destructive", onPress: () => remove.mutate(c.id) },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Slab
          route={lastRoute}
          face={{ uri: profile?.avatar, name: profile?.name, tier: profile?.tier, size: 44 }}
          object={PHOTOS.shield}
          height={290}
          size={42}
          kicker="Safety"
          top={top}
          bottom={bottom} left={<RoundGlass icon={ChevronLeft} label="Back" onPress={back} />} right={sharing && data.share.link ? <RoundGlass icon={Link2} label="Share your live link" onPress={() => Share.share({ message: `Follow my run live: ${data.share.link}` }).catch(() => {})} /> : null} />
        {sharing ? (
          <View style={[styles.chip, { top: insets.top + 8 }]} pointerEvents="none">
            <RecChip>Sharing live</RecChip>
          </View>
        ) : null}

        <View style={styles.body}>
          {isPending ? (
            <Skeleton height={180} radius={20} />
          ) : (
            <FadeIn>
              <LitCard style={styles.box}>
                {contacts.map((c, i) => (
                  <PressableScale key={c.id} onPress={() => manage(c)} scaleTo={0.99} accessibilityLabel={`${c.name}, ${subFor(c, sharing)}`} style={[styles.row, i > 0 && styles.rule]}>
                    <Avatar name={c.name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{c.name}</Text>
                      <Text style={styles.sub}>{subFor(c, sharing)}</Text>
                    </View>
                    <PressableScale
                      onPress={() => modeChange.mutate([c.id, { mode: c.mode === "live" ? "alerts" : "live" }])}
                      hitSlop={10}
                      accessibilityLabel={c.mode === "live" ? `Switch ${c.name} to alerts only` : `Let ${c.name} see your live spot`}
                    >
                      <Text style={[styles.mode, c.mode === "live" && { color: C.accentHi }]}>{c.mode === "live" ? "Live" : "Alerts"}</Text>
                    </PressableScale>
                  </PressableScale>
                ))}
                {adding ? (
                  <View style={contacts.length ? styles.rule : null}>
                    <AddContact onDone={() => setAdding(false)} />
                  </View>
                ) : (
                  <PressableScale onPress={() => setAdding(true)} scaleTo={0.99} accessibilityLabel="Add a trusted contact" style={[styles.row, contacts.length > 0 && styles.rule]}>
                    <Plus size={18} color={C.textDim} />
                    <Text style={[styles.name, { flex: 1 }]}>Add a trusted contact</Text>
                    <ChevronsRight size={14} color={C.textDim} />
                  </PressableScale>
                )}
              </LitCard>
            </FadeIn>
          )}

          <FadeIn index={1}>
            <LitCard style={styles.toggles}>
              <ToggleRow first icon={Navigation} title="Share on every night run" sub="Starts when you start, ends when you finish" value={!!data?.nightAuto} onChange={(v) => settings.mutate({ nightAuto: v })} />
              <ToggleRow icon={Clock} title="Check on me after 10 min still" sub="Then texts your contacts" value={data ? data.checkIn : true} onChange={(v) => settings.mutate({ checkIn: v })} />
            </LitCard>
          </FadeIn>

          <FadeIn index={2}>
            {sharing ? (
              <GlowButton title="Stop sharing" variant="quiet" onPress={() => stop.mutate()} loading={stop.isPending} full style={{ height: 46 }} textStyle={styles.stopText} />
            ) : (
              <GlowButton title="Start sharing now" onPress={() => (contacts.length ? start.mutate({}) : setAdding(true))} loading={start.isPending} full />
            )}
            <Text style={styles.note}>
              {sharing
                ? "Your live spot shows to Live contacts until you stop or finish."
                : "Only the people here see your spot, and only while you're sharing. Nothing shows on the public map."}
            </Text>
          </FadeIn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  chip: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  // .body.nt
  body: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  // .setlist
  box: { paddingHorizontal: 14 },
  toggles: {},
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rule: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  name: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2 },
  mode: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12 },
  form: { gap: 10, paddingVertical: 14 },
  input: { height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", color: C.text, fontFamily: F.body, fontSize: 15, paddingHorizontal: 14 },
  // .btn.sec in red: red stops
  stopText: { color: "#ff5d6c" },
  note: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 17, textAlign: "center", marginTop: 12, paddingHorizontal: 12 },
});
