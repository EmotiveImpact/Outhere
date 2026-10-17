// The sheets that sit over the Move map before a run:
// PlanSheet   tap to drop numbered points; distance, time and XP update.
// NameSheet   name and save a route: ideas, numbers, private ends, club.
// PickSheet   routes from where you are by distance; the pick lights up.
// CrewSheet   your club out right now, with Join and Wave.

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bookmark, Lock, MoreHorizontal, Navigation, Pencil, Trash2, Users } from "@/components/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, C, EmptyState, F, GlowButton, PressableScale, R, S, Segment, Skeleton } from "@/components/ui";
import { ROUTE_NAME_IDEAS } from "@/data/seedRuns";
import { Dash, MapSheet, ToggleRow } from "./parts";

const Kick = ({ children }) => <Text style={styles.kick}>{children}</Text>;
const Big = ({ children, size = 30 }) => (
  <Text style={[styles.big, { fontSize: size, lineHeight: size * 1.02 }]} numberOfLines={1} adjustsFontSizeToFit>
    {children}
  </Text>
);

/** .btn.sec beside the main button: a lit square. */
function SquareButton({ icon, label, onPress, disabled }) {
  return <GlowButton variant="quiet" square icon={icon} onPress={onPress} disabled={disabled} accessibilityLabel={label} />;
}

/** .r11rt: a route card, lit blue when it's the pick. */
function RouteCard({ route, on, onPress }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={route.name} scaleTo={0.96} style={styles.rt}>
      <LinearGradient colors={on ? ["rgba(74,134,255,0.26)", "rgba(74,134,255,0.08)"] : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.025)"]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rtEdge, on && styles.rtEdgeOn]} />
      <Text style={styles.rtTag} numberOfLines={1}>
        {route.tag}
      </Text>
      <Text style={styles.rtName} numberOfLines={1}>
        {route.name}
      </Text>
      <Text style={styles.rtNote} numberOfLines={1}>
        {route.note}
      </Text>
    </PressableScale>
  );
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export function PlanSheet({ name, points, distanceM, isRouting, minutes, xp, onSave, onLoop, onClear, onStart, bottomInset }) {
  const [menu, setMenu] = useState(false);
  const has = distanceM > 50;
  return (
    <MapSheet bottomInset={bottomInset}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Kick>New route</Kick>
          <Big>{name}</Big>
        </View>
        <PressableScale onPress={() => setMenu((m) => !m)} accessibilityLabel="More" style={styles.more}>
          <MoreHorizontal size={18} color="#fff" />
        </PressableScale>
      </View>
      {menu ? (
        <PressableScale
          onPress={() => {
            setMenu(false);
            onClear();
          }}
          accessibilityLabel="Clear points"
          style={styles.menuItem}
        >
          <Trash2 size={16} color={C.danger} />
          <Text style={[styles.menuText, { color: C.danger }]}>Clear all points</Text>
        </PressableScale>
      ) : null}
      <Dash
        boxed
        items={[
          { value: has ? `${(distanceM / 1000).toFixed(1)} km` : "0 km", label: "Distance" },
          { value: has ? `${minutes} min` : "--", label: "At your pace" },
          { value: has ? `+${xp}` : "+0", label: "XP to earn" },
        ]}
      />
      {points < 2 ? <Text style={styles.hint}>{points === 0 ? "Tap the map where you want to start." : "Now tap where you want to go next."}</Text> : null}
      <View style={styles.controls}>
        <SquareButton icon={Bookmark} label="Save route" onPress={onSave} disabled={!has || isRouting} />
        <SquareButton icon={Navigation} label="Back to the start" onPress={onLoop} disabled={points < 2} />
        <GlowButton title={isRouting ? "Snapping to paths" : "Start this route"} onPress={onStart} disabled={!has} loading={isRouting} style={{ flex: 1 }} />
      </View>
    </MapSheet>
  );
}

// ── Name and save ────────────────────────────────────────────────────────────

export function NameSheet({ initialName = "", distanceKm, climbM, minutes, clubName, saving, onSave, onRunNow, bottomInset }) {
  const [name, setName] = useState(initialName);
  const [hideEnds, setHideEnds] = useState(true);
  const [share, setShare] = useState(!!clubName);
  const ideas = useMemo(() => ROUTE_NAME_IDEAS.filter((x) => x !== name).slice(0, 3), [name]);
  const values = { name: name.trim(), hideEnds, shareWithClub: !!clubName && share };
  const ok = values.name.length >= 2;
  return (
    <MapSheet bottomInset={bottomInset}>
      <View>
        <Kick>Name this route</Kick>
        <View style={styles.input}>
        <TextInput
          value={name}
          onChangeText={(t) => setName(t.slice(0, 30))}
          placeholder="Morning Loop"
          placeholderTextColor={C.textMute}
          style={styles.inputText}
          maxLength={30}
          accessibilityLabel="Route name"
          returnKeyType="done"
        />
        <Text style={styles.count}>{name.length}/30</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {ideas.map((idea) => (
          <PressableScale key={idea} onPress={() => setName(idea)} accessibilityLabel={`Name it ${idea}`} style={styles.idea}>
            <Text style={styles.ideaText}>{idea}</Text>
          </PressableScale>
        ))}
      </ScrollView>
      <Dash
        items={[
          { value: distanceKm.toFixed(1), label: "km" },
          ...(climbM != null ? [{ value: `${climbM} m`, label: "climb" }] : []),
          { value: `~${minutes}`, label: "minutes" },
        ]}
        size={22}
      />
      <View style={styles.settings}>
        <ToggleRow first icon={Lock} title="Hide the start and end" sub="The first and last 200 m stay private" value={hideEnds} onChange={setHideEnds} />
        {clubName ? (
          <ToggleRow icon={Users} title={`Share with ${clubName}`} sub="It shows up in your club's routes" value={share} onChange={setShare} />
        ) : (
          <ToggleRow icon={Users} title="Share with your club" sub="Join a run club and it shows up in its routes" value={false} onChange={() => {}} disabled />
        )}
      </View>
      <View style={styles.controls}>
        <GlowButton title="Run it now" variant="quiet" onPress={() => onRunNow(values)} disabled={!ok || saving} style={{ flex: 1 }} />
        <GlowButton title="Save route" icon={Bookmark} onPress={() => onSave(values)} disabled={!ok} loading={saving} style={{ flex: 1.5 }} />
      </View>
    </MapSheet>
  );
}

// ── Pick a route ─────────────────────────────────────────────────────────────

export const PICK_KMS = [3, 5, 10];

export function PickSheet({ km, onKm, routes, loading, selected, onSelect, onSave, onStart, onDraw, bottomInset }) {
  const pick = routes?.[selected] || null;
  return (
    <MapSheet bottomInset={bottomInset}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Kick>Pick a route</Kick>
          <Big>From where you are</Big>
        </View>
        <PressableScale onPress={onDraw} accessibilityLabel="Draw your own" style={styles.more}>
          <Pencil size={16} color="#fff" />
        </PressableScale>
      </View>
      <Segment options={PICK_KMS.map((k) => ({ value: k, label: `${k} km` }))} value={km} onChange={onKm} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
        {loading
          ? [0, 1].map((k) => <Skeleton key={k} width={132} height={70} radius={16} />)
          : (routes || []).map((r, i) => <RouteCard key={r.id || `fresh${i}`} route={r} on={i === selected} onPress={() => onSelect(i)} />)}
      </ScrollView>
      <View style={styles.controls}>
        <SquareButton icon={Bookmark} label="Save this route" onPress={onSave} disabled={!pick} />
        <GlowButton title={pick ? `Start ${pick.name}` : "Start"} onPress={() => onStart(pick)} disabled={!pick} style={{ flex: 1 }} />
      </View>
    </MapSheet>
  );
}

// ── Crew live ────────────────────────────────────────────────────────────────

const away = (m) => (m == null ? "" : m >= 1000 ? `${(m / 1000).toFixed(1)} km away` : `${Math.max(50, Math.round(m / 50) * 50)} m away`);

export function CrewSheet({ data, loading, onJoin, onWave, onFindClub, bottomInset }) {
  const [waved, setWaved] = useState({});
  useEffect(() => setWaved({}), [data?.club?.id]);
  if (loading) {
    return (
      <MapSheet bottomInset={bottomInset}>
        <Skeleton width={140} height={14} />
        <Skeleton width={220} height={30} />
        <Skeleton height={140} radius={20} />
      </MapSheet>
    );
  }
  if (!data?.club) {
    return (
      <MapSheet bottomInset={bottomInset}>
        <EmptyState icon={Users} title="No club yet" body="Join a run club and you'll see who's out right now." action="Find your club" onAction={onFindClub} style={{ paddingVertical: S.lg }} />
      </MapSheet>
    );
  }
  const out = data.out || [];
  return (
    <MapSheet bottomInset={bottomInset}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Kick>{data.club.name}</Kick>
          <Big size={28}>{`${data.count} out right now`}</Big>
        </View>
        <View style={{ flexDirection: "row" }}>
          {out.slice(0, 3).map((p, i) => (
            <Avatar key={p.player.id} uri={p.player.avatar} name={p.player.name} size={30} tier={p.player.tier} style={{ marginLeft: i ? -8 : 0 }} />
          ))}
        </View>
      </View>
      {out.length ? (
        <View style={styles.list}>
          {out.map((p, i) => (
            <View key={p.player.id} style={[styles.li, i > 0 && styles.liRule]}>
              <Avatar uri={p.player.avatar} name={p.player.name} size={38} tier={p.player.tier} dot="out" />
              <View style={{ flex: 1 }}>
                <Text style={styles.liName}>{p.player.name}</Text>
                <Text style={styles.liSub} numberOfLines={2}>{`${p.activity} · ${p.km.toFixed(1)} km${p.awayM != null ? ` · ${away(p.awayM)}` : ""}`}</Text>
              </View>
              {i === 0 && p.activity === "Running" ? (
                <GlowButton title="Join" size="sm" onPress={() => onJoin(p)} />
              ) : (
                <GlowButton
                  title={p.waved || waved[p.player.id] ? "Waved" : "Wave"}
                  size="sm"
                  variant="quiet"
                  disabled={p.waved || waved[p.player.id]}
                  onPress={() => {
                    setWaved((w) => ({ ...w, [p.player.id]: true }));
                    onWave(p);
                  }}
                />
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Nobody from your club is out right now. Start one and they'll see you here.</Text>
      )}
    </MapSheet>
  );
}

const LIT_CARD = { backgroundColor: "#14171d", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 30px -18px rgba(0,0,0,0.8)" };

const styles = StyleSheet.create({
  // .kick
  kick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, textTransform: "uppercase", marginTop: 6 },
  headRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  more: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end", paddingHorizontal: 14, height: 38, borderRadius: R.full, ...LIT_CARD },
  menuText: { fontFamily: F.bodySemi, fontSize: 13 },
  hint: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  controls: { flexDirection: "row", gap: 8, alignItems: "center" },
  // .r11name .inp
  input: { flexDirection: "row", alignItems: "center", height: 52, marginTop: 9, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14, boxShadow: "inset 0 0 0 1.5px rgba(79,155,255,0.55), 0 0 18px -4px rgba(79,155,255,0.5)" },
  inputText: { flex: 1, minWidth: 0, color: C.text, fontFamily: F.bodySemi, fontSize: 20, height: 50, outlineStyle: "none" },
  count: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 10.5 },
  // .r11name .sugg span
  idea: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.07)", justifyContent: "center" },
  ideaText: { color: C.textSoft, fontFamily: F.body, fontSize: 11 },
  // .setlist on the sheet
  settings: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, overflow: "hidden" },
  // .r11rt
  rt: { width: 132, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 12, overflow: "hidden" },
  rtEdge: { borderRadius: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  rtEdgeOn: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(130,180,255,0.35)" },
  rtTag: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 0.72, textTransform: "uppercase" },
  rtName: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: 6 },
  rtNote: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 3 },
  // .list, lit
  list: { borderRadius: 20, paddingHorizontal: 16, ...LIT_CARD },
  li: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  liRule: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  liName: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  liSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 3 },
});
