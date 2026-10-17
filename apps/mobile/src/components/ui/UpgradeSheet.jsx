// Shown whenever an action needs a higher membership. Mounted once at the root
// and opened through useUpgradePrompt (see data/hooks.js).

import React from "react";
import { Modal, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, Crown } from "@/components/ui/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TIER_PERKS } from "@/data/engine";
import { useUpgradePrompt } from "@/data/hooks";
import { Body, Button, C, R, Row, S, Title } from "./index";

export default function UpgradeSheet() {
  const { visible, requiredTier, message, close } = useUpgradePrompt();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const name = requiredTier === "black" ? "Black" : "Pro";
  const perks = (TIER_PERKS[requiredTier] || TIER_PERKS.pro).slice(1, 5);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={close} />
      <View
        style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: R.xl,
          borderTopRightRadius: R.xl,
          borderWidth: 1,
          borderColor: C.border,
          padding: S.xxl,
          paddingBottom: S.xxl + insets.bottom,
        }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: S.lg }}>
          <Crown size={24} color={C.accent} />
        </View>
        <Title size={26}>Unlock with {name}</Title>
        {message ? <Body dim style={{ marginTop: S.sm }}>{message}</Body> : null}
        <View style={{ marginTop: S.xl, gap: S.md }}>
          {perks.map((p) => (
            <Row key={p} gap={S.md}>
              <Check size={18} color={C.accent} />
              <Body>{p}</Body>
            </Row>
          ))}
        </View>
        <Button
          title={`See ${name}`}
          full
          size="lg"
          style={{ marginTop: S.xxl }}
          onPress={() => {
            close();
            router.push("/membership");
          }}
        />
        <Button title="Not now" variant="ghost" full onPress={close} style={{ marginTop: S.sm }} />
      </View>
    </Modal>
  );
}
