import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, C, F, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

/**
 * Bottom action sheet that works the same on iOS and Android (Android alerts
 * only show three buttons). options: [{ label, icon, destructive, onPress }]
 */
export default function ActionSheet({ visible, title, subtitle, options = [], onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }]}>
        <View style={styles.grabber} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Body dim size={13} style={{ marginTop: 2, marginBottom: S.sm }}>{subtitle}</Body> : null}
        {options.map((o) => {
          const Icon = o.icon;
          const colour = o.destructive ? C.danger : C.text;
          return (
            <Pressable
              key={o.label}
              onPress={() => {
                hapticSelection();
                onClose();
                // Let the sheet close before any follow-up alert opens.
                setTimeout(() => o.onPress?.(), 250);
              }}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.surfaceHigh }]}
            >
              {Icon ? <Icon size={19} color={colour} /> : null}
              <Text style={[styles.optionText, { color: colour }]}>{o.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.gutter, paddingTop: S.sm },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: S.md },
  title: { color: C.text, fontFamily: F.display, fontSize: 20 },
  option: { flexDirection: "row", alignItems: "center", gap: S.md, height: 52, borderRadius: 14, paddingHorizontal: S.sm },
  optionText: { fontSize: 16, fontWeight: "600" },
  cancel: { marginTop: S.sm, height: 50, borderRadius: 99, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  cancelText: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
});
