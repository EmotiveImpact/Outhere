// Drop shop pieces: the size row, the delivery address card and the sheet
// that edits it, the order timeline and an order row.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Check, Crosshair, Package } from "lucide-react-native";
import { Button, C, F, imageSource, PressableScale, R, Row, S, Sheet } from "@/components/ui";
import { addressProblem, formatAddress, ORDER_FLOW, ORDER_LABELS } from "@/data/outsideShared";
import { formatNumber } from "@/utils/format";

export function SizeRow({ sizes, soldOut = [], value, onChange }) {
  if (!sizes?.length) return null;
  return (
    <Row gap={S.sm} style={{ flexWrap: "wrap" }}>
      {sizes.map((sz) => {
        const gone = soldOut.includes(sz);
        const on = value === sz;
        return (
          <PressableScale
            key={sz}
            disabled={gone}
            onPress={() => onChange(sz)}
            scaleTo={0.94}
            style={[styles.size, on && styles.sizeOn, gone && styles.sizeGone]}
            accessibilityLabel={gone ? `${sz}, sold out` : `Size ${sz}`}
          >
            <Text style={[styles.sizeText, on && { color: "#fff" }, gone && styles.sizeTextGone]}>{sz}</Text>
          </PressableScale>
        );
      })}
    </Row>
  );
}

export function AddressCard({ address, onChange }) {
  return (
    <PressableScale onPress={onChange} scaleTo={0.98} style={styles.card}>
      <View style={styles.pin}>
        <Crosshair size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        {address ? (
          <>
            <Text style={styles.name}>{address.name}</Text>
            <Text style={styles.addr}>{formatAddress(address)}</Text>
          </>
        ) : (
          <Text style={styles.name}>Add a delivery address</Text>
        )}
      </View>
      <Text style={styles.link}>{address ? "Change" : "Add"}</Text>
    </PressableScale>
  );
}

const FIELDS = [
  { key: "name", label: "Full name", auto: "name" },
  { key: "line1", label: "Address line 1", auto: "address-line1" },
  { key: "line2", label: "Address line 2 (optional)", auto: "address-line2" },
  { key: "town", label: "Town or city", auto: "address-level2" },
  { key: "postcode", label: "Postcode", auto: "postal-code", caps: "characters" },
];

export function AddressSheet({ visible, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {});
  const [error, setError] = useState(null);
  useEffect(() => {
    if (visible) {
      setForm(initial || {});
      setError(null);
    }
  }, [visible, initial]);
  const save = () => {
    const problem = addressProblem(form);
    if (problem) return setError(problem);
    onSave(form);
  };
  return (
    <Sheet visible={visible} onClose={onClose} scroll>
      <Text style={styles.sheetTitle}>Where's it going?</Text>
      {FIELDS.map((f) => (
        <TextInput
          key={f.key}
          value={form[f.key] || ""}
          onChangeText={(v) => setForm((x) => ({ ...x, [f.key]: v }))}
          placeholder={f.label}
          placeholderTextColor={C.textMute}
          autoComplete={f.auto}
          autoCapitalize={f.caps || "words"}
          style={styles.input}
          accessibilityLabel={f.label}
        />
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Use this address" size="lg" full onPress={save} style={{ marginTop: S.md }} />
    </Sheet>
  );
}

const stamp = (ms) => {
  const d = new Date(ms);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "");
  return same ? `Today, ${time}` : `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
};

export function OrderTimeline({ order }) {
  const done = new Map((order.history || []).map((h) => [h.status, h.at]));
  const steps = order.status === "cancelled" ? ["claimed", "cancelled"] : ORDER_FLOW;
  const current = order.status;
  return (
    <View style={styles.timeline}>
      {steps.map((st, i) => {
        const at = done.get(st);
        const reached = !!at || st === current;
        const isNow = st === current;
        const nextReached = i < steps.length - 1 && (done.has(steps[i + 1]) || steps[i + 1] === current);
        return (
          <View key={st} style={styles.step}>
            <View style={{ alignItems: "center", width: 22 }}>
              <View style={[styles.node, reached && styles.nodeOn, isNow && styles.nodeNow]} />
              {i < steps.length - 1 ? <View style={[styles.line, nextReached && { backgroundColor: C.accent }]} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 16 : 0 }}>
              <Text style={[styles.stepTitle, !reached && { color: C.textDim }]}>{ORDER_LABELS[st]}</Text>
              {at ? <Text style={styles.stepWhen}>{stamp(at)}</Text> : st === "out_for_delivery" && order.arrivesOn && !reached ? <Text style={styles.stepWhen}>{new Date(order.arrivesOn).toLocaleDateString("en-GB", { weekday: "long" })}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function OrderItem({ order, onPress }) {
  const body = (
    <>
      <View style={styles.thumb}>{order.image ? <Image source={imageSource(order.image)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Package size={20} color={C.textDim} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {order.title}
        </Text>
        <Text style={styles.addr} numberOfLines={1}>
          {[order.size ? `UK ${order.size}` : null, `paid ${formatNumber(order.outSpent)} OUT`].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {onPress ? (
        <Row gap={4}>
          {order.status === "delivered" ? <Check size={14} color={C.accent} /> : null}
          <Text style={styles.link}>{ORDER_LABELS[order.status]}</Text>
        </Row>
      ) : null}
    </>
  );
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.card}>
      {body}
    </PressableScale>
  ) : (
    <View style={styles.card}>{body}</View>
  );
}

const styles = StyleSheet.create({
  size: { minWidth: 56, flexGrow: 1, height: 50, borderRadius: 14, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  sizeOn: { backgroundColor: C.accent, borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  sizeGone: { opacity: 0.4 },
  sizeText: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  sizeTextGone: { textDecorationLine: "line-through", color: C.textDim },
  card: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  pin: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center" },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  addr: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 2, lineHeight: 18 },
  link: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 24, marginBottom: S.lg },
  input: { height: 50, borderRadius: R.md, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.lg, fontFamily: F.body, fontSize: 15, marginBottom: S.sm },
  error: { color: C.danger || "#ff4d55", fontFamily: F.body, fontSize: 13, marginTop: 4 },
  timeline: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  step: { flexDirection: "row", gap: S.md },
  node: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: C.textMute, backgroundColor: C.surface, marginTop: 3 },
  nodeOn: { backgroundColor: C.accent, borderColor: C.accent },
  nodeNow: { width: 18, height: 18, borderRadius: 9, marginTop: 1, borderWidth: 4, borderColor: "rgba(61,139,255,0.35)" },
  line: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 2, marginBottom: -3 },
  stepTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  stepWhen: { color: C.textSoft, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  thumb: { width: 52, height: 52, borderRadius: 10, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
});
