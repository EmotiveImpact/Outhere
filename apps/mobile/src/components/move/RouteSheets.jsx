// The sheets that sit over the Move map before a run:
// PlanSheet   tap to drop numbered points; distance, time and XP update.
// NameSheet   name and save a route: ideas, numbers, private ends, club.
// PickSheet   routes from where you are by distance; the pick lights up.
// CrewSheet   your club out right now, with Join and Wave.

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bookmark, Lock, MoreHorizontal, Navigation, Pencil, Trash2, Users } from "lucide-react-native";
import { Avatar, Button, C, EmptyState, F, PressableScale, R, S, Segment, Skeleton } from "@/components/ui";
import { ROUTE_NAME_IDEAS } from "@/data/seedRuns";
import { Dash, MapSheet, ToggleRow } from "./parts";

const Kick = ({ children }) => <Text style={styles.kick}>{children}</Text>;
const Big = ({ children, size = 34 }) => (
  <Text style={[styles.big, { fontSize: size, lineHeight: size * 1.02 }]} numberOfLines={1} adjustsFontSizeToFit>
    {children}
  </Text>
);

function SquareButton({ icon: Icon, label, onPress, disabled }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} style={[styles.square, disabled && { opacity: 0.4 }]}>
      <Icon size={19} color="#fff" />
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
          <MoreHorizontal size={20} color="#fff" />
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
        size={22}
      />
      {points < 2 ? <Text style={styles.hint}>{points === 0 ? "Tap the map where you want to start." : "Now tap where you want to go next."}</Text> : null}
      <View style={styles.controls}>
        <SquareButton icon={Bookmark} label="Save route" onPress={onSave} disabled={!has || isRouting} />
        <SquareButton icon={Navigation} label="Back to the start" onPress={onLoop} disabled={points < 2} />
        <Button title={isRouting ? "Snapping to paths" : "Start this route"} onPress={onStart} disabled={!has} loading={isRouting} style={{ flex: 1, height: 56 }} />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
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
        size={24}
      />
      <View style={styles.settings}>
        <ToggleRow first icon={Lock} title="Hide the start and end" sub="The first and last 200 m stay private" value={hideEnds} onChange={setHideEnds} />
        {clubName ? <ToggleRow icon={Users} title={`Share with ${clubName}`} sub="It shows up in your club's routes" value={share} onChange={setShare} /> : null}
      </View>
      <View style={styles.controls}>
        <Button title="Run it now" variant="secondary" onPress={() => onRunNow(values)} disabled={!ok || saving} style={{ flex: 1, height: 56 }} />
        <Button title="Save route" icon={Bookmark} onPress={() => onSave(values)} disabled={!ok} loading={saving} style={{ flex: 1.5, height: 56 }} />
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
          <Big size={32}>From where you are</Big>
        </View>
        <PressableScale onPress={onDraw} accessibilityLabel="Draw your own" style={styles.more}>
          <Pencil size={18} color="#fff" />
        </PressableScale>
      </View>
      <Segment options={PICK_KMS.map((k) => ({ value: k, label: `${k} km` }))} value={km} onChange={onKm} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: S.lg }} style={{ marginHorizontal: -S.lg, paddingLeft: S.lg }}>
        {loading
          ? [0, 1].map((k) => <Skeleton key={k} width={170} height={86} radius={18} />)
          : (routes || []).map((r, i) => (
              <PressableScale key={r.id || `fresh${i}`} onPress={() => onSelect(i)} accessibilityLabel={r.name} style={[styles.rt, i === selected && styles.rtOn]}>
                <Text style={styles.rtTag} numberOfLines={1}>
                  {r.tag}
                </Text>
                <Text style={styles.rtName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.rtNote} numberOfLines={1}>
                  {r.note}
                </Text>
              </PressableScale>
            ))}
      </ScrollView>
      <View style={styles.controls}>
        <SquareButton icon={Bookmark} label="Save this route" onPress={onSave} disabled={!pick} />
        <Button title={pick ? `Start ${pick.name}` : "Start"} onPress={() => onStart(pick)} disabled={!pick} style={{ flex: 1, height: 56 }} />
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
          <Big size={30}>{`${data.count} out right now`}</Big>
        </View>
        <View style={{ flexDirection: "row" }}>
          {out.slice(0, 3).map((p, i) => (
            <Avatar key={p.player.id} uri={p.player.avatar} name={p.player.name} size={34} tier={p.player.tier} style={{ marginLeft: i ? -10 : 0 }} />
          ))}
        </View>
      </View>
      {out.length ? (
        <View style={styles.list}>
          {out.map((p, i) => (
            <View key={p.player.id} style={[styles.li, i > 0 && styles.liRule]}>
              <Avatar uri={p.player.avatar} name={p.player.name} size={40} tier={p.player.tier} dot="out" />
              <View style={{ flex: 1 }}>
                <Text style={styles.liName}>{p.player.name}</Text>
                <Text style={styles.liSub} numberOfLines={2}>{`${p.activity} · ${p.km.toFixed(1)} km${p.awayM != null ? ` · ${away(p.awayM)}` : ""}`}</Text>
              </View>
              {i === 0 && p.activity === "Running" ? (
                <Button title="Join" size="sm" onPress={() => onJoin(p)} />
              ) : (
                <Button
                  title={p.waved || waved[p.player.id] ? "Waved" : "Wave"}
                  size="sm"
                  variant="secondary"
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

const styles = StyleSheet.create({
  kick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, textTransform: "uppercase", marginTop: 6 },
  headRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end", paddingHorizontal: 14, height: 38, borderRadius: R.full, backgroundColor: C.surface },
  menuText: { fontFamily: F.bodySemi, fontSize: 13.5 },
  hint: { color: C.textDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 19 },
  controls: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 2 },
  square: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  input: { flexDirection: "row", alignItems: "center", height: 60, borderRadius: 18, borderWidth: 1.5, borderColor: C.accent, backgroundColor: C.surface, paddingHorizontal: S.lg },
  inputText: { flex: 1, minWidth: 0, color: C.text, fontFamily: F.bodySemi, fontSize: 22, height: 58, outlineStyle: "none" },
  count: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  idea: { height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.surfaceHigh, justifyContent: "center" },
  ideaText: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 13 },
  settings: { backgroundColor: C.surface, borderRadius: 18, overflow: "hidden" },
  rt: { width: 170, borderRadius: 18, backgroundColor: C.surface, padding: 14, borderWidth: 1, borderColor: "transparent" },
  rtOn: { backgroundColor: "rgba(61,139,255,0.16)", borderColor: "rgba(61,139,255,0.5)" },
  rtTag: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase" },
  rtName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15.5, marginTop: 6 },
  rtNote: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 3 },
  list: { backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: S.lg },
  li: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md },
  liRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  liName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15.5 },
  liSub: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
});

