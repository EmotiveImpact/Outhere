// Size picker and reservation sheet for the drop detail screen.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { Button, C, Cover, F, PressableScale, R, Row, S, Sheet } from "@/components/ui";
import { dateLabel, timeLabel } from "@/utils/format";
import { priceLabel } from "./shared";
import { dropAccent } from "./DropCard";

function SizeChip({ label, active, onPress }) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (active) pop.value = withSequence(withSpring(1.12, { damping: 8, stiffness: 400 }), withSpring(1, { damping: 12, stiffness: 300 }));
  }, [active, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <PressableScale onPress={onPress} scaleTo={0.88} accessibilityLabel={`Size ${label}`}>
      <Animated.View style={[styles.size, active && styles.sizeActive, style]}>
        <Text style={[styles.sizeText, active && { color: C.bg }]}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}

export function SizePicker({ sizes, value, onChange }) {
  return (
    <Row gap={S.sm} style={{ flexWrap: "wrap" }}>
      {sizes.map((s) => (
        <SizeChip key={s} label={s} active={s === value} onPress={() => onChange(s)} />
      ))}
    </Row>
  );
}

/** Confirmation sheet shown straight after a reservation. */
export function ReservedSheet({ visible, onClose, drop }) {
  const r = drop?.reservation;
  return (
    <Sheet visible={visible && !!r} onClose={onClose}>
      {r ? (
        <View style={{ paddingTop: S.md }}>
          <Text style={styles.title}>{"It's yours"}</Text>
          <Text style={styles.body}>{"Checkout isn't live in the app yet, so we're holding it for you. We'll message you when payment opens."}</Text>

          <Row gap={S.md} style={styles.product}>
            <Cover source={drop.image} seed={drop.id} accent={dropAccent(drop)} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {drop.title}
              </Text>
              <Text style={styles.productSub}>{`Size ${r.size}, ${priceLabel(drop.priceGbp)}`}</Text>
              <Text style={styles.productSub}>{`Held ${dateLabel(r.at)} at ${timeLabel(r.at)}`}</Text>
            </View>
          </Row>

          <View style={styles.ref}>
            <Text style={styles.productSub}>Your reference</Text>
            <Text style={styles.refText} selectable>
              {r.ref}
            </Text>
          </View>
          <Button full size="lg" title="Sorted" onPress={onClose} style={{ marginTop: S.xl }} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  size: { minWidth: 60, height: 52, paddingHorizontal: 16, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  sizeActive: { backgroundColor: C.text, borderColor: C.text },
  sizeText: { color: C.text, fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  title: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.5 },
  body: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: S.sm },
  product: { marginTop: S.xl, paddingVertical: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  thumb: { width: 64, height: 64, borderRadius: R.md },
  productTitle: { color: C.text, fontFamily: F.display, fontSize: 17 },
  productSub: { color: C.textDim, fontSize: 13, marginTop: 2 },
  ref: { marginTop: S.lg },
  refText: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: 3, marginTop: 4 },
});
