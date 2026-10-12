import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Body, C, F, PressableScale, S, Sheet } from "@/components/ui";

/**
 * List of actions in the kit bottom sheet. Works the same on iOS and Android
 * (Android alerts only show three buttons).
 * options: [{ label, hint, icon, destructive, onPress }]
 */
export default function ActionSheet({ visible, title, subtitle, header, options = [], onClose }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {header}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? (
        <Body dim size={13} style={{ marginTop: 2 }}>
          {subtitle}
        </Body>
      ) : null}
      <View style={{ marginTop: S.md, gap: 6 }}>
        {options.map((o) => {
          const Icon = o.icon;
          const colour = o.destructive ? C.danger : C.text;
          return (
            <PressableScale
              key={o.label}
              scaleTo={0.98}
              onPress={() => {
                onClose();
                // Let the sheet close before any follow-up alert or screen opens.
                setTimeout(() => o.onPress?.(), 250);
              }}
              style={styles.option}
            >
              {Icon ? (
                <View style={[styles.icon, o.destructive && { backgroundColor: C.dangerDim }]}>
                  <Icon size={18} color={colour} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: colour }]}>{o.label}</Text>
                {o.hint ? <Text style={styles.hint}>{o.hint}</Text> : null}
              </View>
              {!o.destructive ? <ChevronRight size={16} color={C.textMute} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: S.xs },
  option: { flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 60, borderRadius: 18, paddingHorizontal: S.md, backgroundColor: C.surfaceHigh },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#26262b", alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 16, fontWeight: "600" },
  hint: { color: C.textMute, fontSize: 12, marginTop: 2 },
});
