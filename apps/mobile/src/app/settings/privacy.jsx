// Your privacy: ghost mode up top. Your exact spot and your route starts and
// ends stay hidden by default. Then who sees you, blocked people, a copy of
// your data and closing your account.

import React, { useState } from "react";
import { Platform, Share, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Download, Eye, LocateFixed, Navigation, Trophy, Undo2, UserX } from "lucide-react-native";
import { engine, isRemote, showEngineError, useAccount, useSettings, useUpdateSettings } from "@/data/hooks";
import { C, F, R, S, Skeleton, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { Group, HeroPage, MiniSegment, Note, Row, Toggle, confirmAsk } from "@/components/account/parts";

async function saveCopy(data) {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `outhere-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  await Share.share({ title: "Your Outhere data", message: json });
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { data: settings } = useSettings();
  const { data: account } = useAccount();
  const update = useUpdateSettings();
  const [busy, setBusy] = useState(null);

  const setPrivacy = (patch) => update.mutate({ privacy: patch });
  const p = settings?.privacy;
  const minor = !!account?.isMinor;

  const download = async () => {
    setBusy("export");
    try {
      await saveCopy(await engine.exportMyData());
      toast.success("Your data is ready");
    } catch (e) {
      showEngineError(e);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const yes = await confirmAsk({
      title: "Delete your account?",
      body: isRemote
        ? "Your profile goes straight away and everything else is removed within 30 days. Your clubs keep the steps you gave them, without your name."
        : "Everything on this phone goes for good: your profile, steps, streak, XP and OUT.",
      ok: "Delete",
      danger: true,
    });
    if (!yes) return;
    setBusy("delete");
    try {
      await engine.deleteAccount();
      router.replace("/welcome");
    } catch (e) {
      showEngineError(e);
      setBusy(null);
    }
  };

  return (
    <HeroPage kicker="Settings" top="Your" bottom="privacy" height={210} object={PHOTOS.shield}>
      {!p ? (
        <>
          <Skeleton height={78} radius={R.lg} />
          <Skeleton height={260} radius={R.lg} />
        </>
      ) : (
        <>
          <Group highlight>
            <Row title="Ghost mode" hint="Vanish from the map. Your steps still count." right={<Toggle value={p.ghost} onChange={(ghost) => setPrivacy({ ghost })} label="Ghost mode" />} />
          </Group>

          <Group>
            <Row
              icon={LocateFixed}
              title="Show my spot as"
              hint={p.spotAs === "city" ? "Friends see your city, never your door" : "Friends see your area, never your door"}
              value={p.spotAs === "city" ? "City" : "Area"}
              onPress={() => setPrivacy({ spotAs: p.spotAs === "city" ? "area" : "city" })}
            />
            <Row
              icon={Navigation}
              title="Hide route starts and ends"
              hint="The first and last 200 m stay private"
              right={<Toggle value={p.hideRouteEnds} onChange={(hideRouteEnds) => setPrivacy({ hideRouteEnds })} label="Hide route starts and ends" />}
            />
            <Row icon={UserX} title="Blocked people" value={String(account?.blockedCount ?? 0)} onPress={() => router.push("/settings/blocked")} />
            <Row icon={Download} title="Download my data" value={busy === "export" ? "Getting it" : null} onPress={busy ? undefined : download} chevron />
            <Row icon={Undo2} title={busy === "delete" ? "Deleting" : "Delete my account"} danger onPress={busy ? undefined : remove} chevron={false} />
          </Group>

          <Text style={styles.section}>Who sees you</Text>
          <Group>
            <Row icon={Eye} title="On the map" hint={minor ? "Under 18 mode keeps you to friends and your club" : p.ghost ? "Ghost mode is on, so nobody does right now" : "When you're out"}>
              <MiniSegment
                options={[
                  ...(minor ? [] : [{ value: "everyone", label: "Everyone" }]),
                  { value: "friends", label: "Friends" },
                  { value: "crew", label: "Crew" },
                ]}
                value={p.mapVisibility}
                onChange={(mapVisibility) => setPrivacy({ mapVisibility })}
                style={{ alignSelf: "flex-start", marginTop: 10 }}
              />
            </Row>
            <Row icon={Trophy} title="Show me on leaderboards" hint="Off keeps you out of city and friends rankings" right={<Toggle value={p.showOnLeaderboards} onChange={(v) => setPrivacy({ showOnLeaderboards: v })} label="Show me on leaderboards" />} />
            <Row icon={Eye} title="Show when I'm outside" hint="Lets people see you in Outside now" right={<Toggle value={p.showOutsideStatus} onChange={(v) => setPrivacy({ showOutsideStatus: v })} label="Show when I'm outside" />} />
          </Group>
          <Note>Your steps count for you, your area and your club whatever you choose here.</Note>
        </>
      )}
    </HeroPage>
  );
}

const styles = StyleSheet.create({
  section: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", marginTop: S.sm, marginLeft: 4 },
});
