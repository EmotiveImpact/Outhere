// Full screen 3, 2, 1 before a session starts. Each number punches in big
// and fades out, with a ring that bursts behind it.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnimatePresence, MotiText, MotiView } from "moti";
import { C, F, Label, R, S } from "@/components/ui";

export default function Countdown({ count, label, onCancel }) {
  return (
    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "timing", duration: 200 }} style={styles.wrap}>
      <Label style={{ color: C.accent, letterSpacing: 2 }}>{label}</Label>
      <View style={styles.stage}>
        <AnimatePresence>
          {count ? (
            <MotiView
              key={`ring-${count}`}
              from={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "timing", duration: 900 }}
              style={styles.ring}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {count ? (
            <MotiText
              key={`n-${count}`}
              from={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", damping: 13, stiffness: 180 }}
              exitTransition={{ type: "timing", duration: 220 }}
              style={styles.count}
            >
              {count}
            </MotiText>
          ) : null}
        </AnimatePresence>
      </View>
      <Text style={styles.hint}>Phone in pocket. Go.</Text>
      <Pressable onPress={onCancel} hitSlop={12} style={styles.cancel} accessibilityRole="button" accessibilityLabel="Cancel">
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </MotiView>
  );
}

const SIZE = 240;

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,8,7,0.985)", alignItems: "center", justifyContent: "center" },
  stage: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", marginVertical: S.lg },
  ring: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3, borderColor: C.accent },
  count: { position: "absolute", color: C.accent, fontFamily: F.display, fontSize: 180, lineHeight: 196, letterSpacing: -4, textShadowColor: "rgba(0,255,127,0.5)", textShadowRadius: 30 },
  hint: { color: C.textDim, fontSize: 15 },
  cancel: { marginTop: S.xxl, minWidth: 140, height: 48, alignItems: "center", justifyContent: "center", borderRadius: R.full, borderWidth: 1, borderColor: C.borderStrong },
  cancelText: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
});
