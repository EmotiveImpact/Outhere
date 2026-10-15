// The Crew tab's sub tabs: plain words on a hairline, the open one white with
// a blue underline. A count badge sits on any tab that has something new.

import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, F, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

export default function UnderlineTabs({ options, value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.badge ? `${o.label}, ${o.badge} new` : o.label}
              onPress={() => {
                if (active) return;
                hapticSelection();
                onChange(o.value);
              }}
              style={styles.item}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
                  {o.label}
                </Text>
                {o.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{o.badge > 9 ? "9+" : o.badge}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.line, active && styles.lineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, marginHorizontal: S.gutter },
  row: { gap: 14 },
  item: { paddingTop: S.md },
  text: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 14 },
  textActive: { color: C.text },
  line: { height: 2, marginTop: 9, borderRadius: 1, backgroundColor: "transparent" },
  lineActive: { backgroundColor: C.accent },
  badge: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  badgeText: { color: C.accentText, fontFamily: F.bodySemi, fontSize: 10 },
});
