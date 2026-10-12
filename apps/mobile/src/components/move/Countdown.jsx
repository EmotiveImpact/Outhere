// Full screen 3, 2, 1 before a session starts. Each number punches in big
// and fades out, with a faint ring easing out behind it.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnimatePresence, MotiText, MotiView } from "moti";
import { C, F, R, S } from "@/components/ui";

export default function Countdown({ count, label, onCancel }) {
  return (
    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "timing", duration: 200 }} style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stage}>
        <AnimatePresence>
          {count ? (
            <MotiView
              key={`ring-${count}`}
              from={{ scale: 0.7, opacity: 0.35 }}
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
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.98)", alignItems: "center", justifyContent: "center" },
  label: { color: C.textDim, fontSize: 15 },
  stage: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", marginVertical: S.lg },
  ring: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, borderColor: C.borderStrong },
  count: { position: "absolute", color: C.text, fontFamily: F.display, fontSize: 180, lineHeight: 196, letterSpacing: -4 },
  hint: { color: C.textDim, fontSize: 15 },
  cancel: { marginTop: S.xxl, minWidth: 140, height: 48, alignItems: "center", justifyContent: "center", borderRadius: R.full, backgroundColor: C.surface },
  cancelText: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
});
