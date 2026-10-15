// Pieces shared by the run club and club v club screens, in the prototype's
// round eleven finish: crests, the verified tick, faces, chips and tags, the
// club card in Find your run club (.r11club), the next club run card
// (.r11next), the fixture card (.oh-score) and the club panel that sits
// under a club's hero.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronRight, Flame, MapPin, Share2, Swords, Trophy } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlendImage, C, F, FINISH, GlowBackdrop, GlowButton, Grain, IconTile, LiveDot, PressableScale, R, Row, S, Surface, TugBar, splitShadow, useScreenTop } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { useClubBattles, useMyFixture } from "@/data/hooks";
import { clubScoreLabel } from "@/constants/clubModes";

export const RED = C.danger;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pad = (n) => String(n).padStart(2, "0");

export const clock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 'Tonight · 19:00', 'Tomorrow · 09:00', 'Saturday · 09:00'
export const whenLabel = (ms, now = Date.now()) => {
  const d = new Date(ms);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(ms).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  const day =
    days === 0
      ? d.getHours() >= 17
        ? "Tonight"
        : "Today"
      : days === 1
        ? "Tomorrow"
        : days < 7 && days > 1
          ? DAYS[d.getDay()]
          : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${day} · ${clock(ms)}`;
};

// For the middle of a sentence: "tomorrow at 19:00", "Sat at 08:00".
export const startsLabel = (ms, now = Date.now()) => {
  const [day, time] = whenLabel(ms, now).split(" · ");
  return `${/^(Tonight|Today|Tomorrow)$/.test(day) ? day.toLowerCase() : day} at ${time}`;
};

export const kmLabel = (km) => (km == null ? "" : km < 10 ? `${Number(km).toFixed(1)} km` : `${Math.round(km)} km`);

/** A club's crest: rounded square, a faint edge and a long shadow (.r11id img). */
export function ClubCrest({ club, size = 52, radius, style }) {
  const r = radius ?? size * 0.29;
  const src = imageSource(club?.logo) || PHOTOS.crest;
  return (
    <View style={[{ width: size, height: size, borderRadius: r, boxShadow: "0 12px 24px -8px #000" }, style]}>
      <View style={{ flex: 1, borderRadius: r, overflow: "hidden", backgroundColor: "#000" }}>
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }]} />
    </View>
  );
}

/** .r11v: a blue gradient disc with a white tick, glowing. */
export const VerifiedTick = ({ size = 17 }) => (
  <View accessibilityLabel="Verified" style={{ width: size, height: size, borderRadius: size / 2, boxShadow: "0 0 0 2px rgba(0,0,0,0.35), 0 2px 8px rgba(42,106,240,0.55)" }}>
    <LinearGradient colors={["#4a86ff", "#1f55d0"]} style={[StyleSheet.absoluteFill, { borderRadius: size / 2, alignItems: "center", justifyContent: "center" }]}>
      <Check size={size * 0.6} color="#fff" strokeWidth={3.2} />
    </LinearGradient>
  </View>
);

/** Overlapping faces and a line: '31 going' (.r11faces, a size up). */
export function Faces({ people = [], label, size = 30, ring = "#11141a", style }) {
  return (
    <Row gap={10} style={[{ marginTop: 10 }, style]}>
      {people.length ? (
        <View style={{ flexDirection: "row" }}>
          {people.slice(0, 5).map((p, i) => (
            <View key={p.id || i} style={{ width: size, height: size, borderRadius: size / 2, marginLeft: i ? -size * 0.3 : 0, borderWidth: 2, borderColor: ring, backgroundColor: C.surfaceHigh, overflow: "hidden", zIndex: 10 - i }}>
              <Image source={imageSource(p.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ))}
        </View>
      ) : null}
      {label ? (
        <Text style={styles.facesLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Row>
  );
}

/**
 * .oh-chip: a small pill. tone neutral (lit), blue, live (blue with the out
 * now dot), alert (red with a red dot, only for things that stop), glass.
 */
export const Chip = ({ label, tone = "neutral", icon: Icon, style }) => {
  const blue = tone === "blue" || tone === "live";
  const alert = tone === "alert";
  const glass = tone === "glass";
  return (
    <View style={[styles.chip, glass ? styles.chipGlass : blue ? styles.chipBlue : alert ? styles.chipAlert : styles.chipLit, style]}>
      {blue || alert ? null : <LinearGradient colors={glass ? ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.08)"] : ["#191d24", "#12151a"]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />}
      {blue ? <LinearGradient colors={["rgba(61,139,255,0.22)", "rgba(61,139,255,0.08)"]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
      {alert ? <LinearGradient colors={["rgba(255,77,85,0.2)", "rgba(255,77,85,0.08)"]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
      {tone === "live" ? <LiveDot size={7} /> : null}
      {alert ? <View style={styles.alertDot} /> : null}
      {Icon ? (
        <View>
          <Icon size={13} color={blue || glass ? C.accentHi : alert ? "#ffb3b7" : C.accentHi} />
        </View>
      ) : null}
      <Text style={[styles.chipText, alert && { color: "#ffb3b7" }]}>{label}</Text>
    </View>
  );
};

/** .r11tags: the small facts under a club's name. */
export const Tags = ({ items }) => (
  <Row gap={5} style={{ marginTop: 6, flexWrap: "wrap" }}>
    {items.map((t) => (
      <Text key={t} style={styles.tag}>
        {t}
      </Text>
    ))}
  </Row>
);

/** .pill-btn: the small action on a card. ghost is the lit quiet one. */
export const PillButton = ({ title, onPress, ghost = false, disabled, loading, accessibilityLabel, style }) => (
  <GlowButton title={title} onPress={onPress} variant={ghost ? "quiet" : "primary"} size="sm" shine={false} disabled={disabled} loading={loading} accessibilityLabel={accessibilityLabel} style={[{ height: 32, paddingHorizontal: 14 }, style]} />
);

/** A club in Find your run club (.r11club): crest, name and tick, meet times, tags, Join. */
export function ClubCard({ club, onPress, onJoin, joining, ghost = false }) {
  const facts = [club.awayKm != null ? kmLabel(club.awayKm) : null, club.distances, club.paces].filter(Boolean);
  return (
    <Surface onPress={onPress} radius={20} padding={null} style={{ marginBottom: 10 }} contentStyle={styles.club}>
      <ClubCrest club={club} size={48} radius={14} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Row gap={6}>
          <Text style={styles.clubName} numberOfLines={1}>
            {club.name}
          </Text>
          {club.verified ? <VerifiedTick size={15} /> : null}
        </Row>
        <Text style={styles.small} numberOfLines={1}>
          {club.verified ? club.meets || club.meetPlace : "Founding club · not official yet"}
        </Text>
        {facts.length ? <Tags items={facts} /> : null}
      </View>
      {club.isMember ? (
        <Chip label="In" tone="blue" />
      ) : onJoin ? (
        <PillButton title={joining ? "..." : "Join"} ghost={ghost} onPress={onJoin} disabled={joining} accessibilityLabel={`Join ${club.name}`} />
      ) : null}
    </Surface>
  );
}

/** Next club run (.r11next), with faces and a pill to say you're going. */
export function NextRunCard({ run, onPress, action, onAction, ghost, kicker = "Next club run", facesSize = 30, style }) {
  if (!run) return null;
  const live = run.status === "live";
  return (
    <Surface onPress={onPress} radius={20} padding={null} style={[{ marginTop: 12 }, style]} contentStyle={styles.next}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Row gap={6}>
          {live ? <LiveDot size={7} /> : null}
          <Text style={styles.kick}>{live ? "On now" : kicker}</Text>
        </Row>
        <Text style={styles.cardBig} numberOfLines={1}>
          {whenLabel(run.startAt)}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {[run.title, kmLabel(run.km), run.paceGroups?.length > 1 ? `${run.paceGroups.length} pace groups` : run.paceGroups?.[0]].filter(Boolean).join(" · ")}
        </Text>
        <Faces people={run.faces} size={facesSize} label={run.checkedIn ? `You're in · ${run.going} going` : `${run.going} going`} />
      </View>
      {action ? <PillButton title={action} ghost={ghost ?? (run.isGoing || run.checkedIn)} onPress={onAction} /> : <ChevronRight size={18} color={C.textMute} />}
    </Surface>
  );
}

/** This week's league fixture (.oh-score, small): both scores, the tug and who's out. */
export function FixtureCard({ fixture, onPress }) {
  if (!fixture) return null;
  const mineHome = fixture.mySide !== "away";
  const me = mineHome ? fixture.home : fixture.away;
  const them = mineHome ? fixture.away : fixture.home;
  const status = fixture.revealed ? "Full time" : fixture.isDerby ? "Derby live" : "Fixture live";
  const ends = new Date(fixture.revealAt);
  const total = (me.score || 0) + (them.score || 0);
  return (
    <Surface onPress={onPress} radius={22} padding={16} style={{ marginTop: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Chip label={status} tone={fixture.revealed ? "neutral" : "live"} />
        <Text style={styles.small}>{fixture.revealed ? `Week ${fixture.week}` : `Ends ${DAYS[ends.getDay()]} ${clock(fixture.revealAt)}`}</Text>
      </Row>
      <Row style={{ justifyContent: "center", gap: 14, marginTop: 14, alignItems: "flex-end" }}>
        <Text style={[styles.score, styles.scoreBlue]}>{clubScoreLabel("steps", me.score)}</Text>
        <Text style={styles.v}>v</Text>
        <Text style={[styles.score, styles.scoreRed]}>{clubScoreLabel("steps", them.score)}</Text>
      </Row>
      <TugBar share={total ? (me.score || 0) / total : 0.5} height={8} style={{ marginTop: 14 }} />
      <Text style={[styles.small, { textAlign: "center", marginTop: 12 }]}>
        {me.club?.short} v {them.club?.short}
        {fixture.revealed ? "" : ` · ${me.out} of us out right now`}
      </Text>
    </Surface>
  );
}

/** A tappable row in the club panel: a lit icon tile, a kicker, a line and a chevron. */
function PanelRow({ icon, tone = "blue", kicker, title, sub, onPress }) {
  return (
    <Surface onPress={onPress} radius={20} padding={null} style={{ marginTop: 12 }} contentStyle={styles.panelRow}>
      <IconTile icon={icon} tone={tone} size={40} iconSize={18} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.kick}>{kicker}</Text>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <ChevronRight size={18} color={C.textMute} />
    </Surface>
  );
}

/** Small row of the club's open friendlies. */
function FriendliesRow({ club }) {
  const router = useRouter();
  const { data } = useClubBattles(club.verified ? club.id : null);
  const open = (data || []).filter((b) => ["pending", "accepted", "live"].includes(b.status));
  const incoming = open.find((b) => b.hidden || (!b.home && b.status === "pending"));
  if (!open.length && !club.isCaptain) return null;
  const first = incoming || open[0];
  return (
    <PanelRow
      icon={Swords}
      kicker="Club v club"
      title={incoming ? "A challenger club is at the door" : first ? `${first.modeName} v ${first.opponent?.name || "a mystery club"}` : "Challenge a club"}
      sub={incoming ? `${incoming.votes.yes} yes · ${incoming.votes.no} no so far` : first ? (first.status === "live" ? "On now" : whenLabel(first.startAt)) : "Friendlies in six modes, captains only"}
      onPress={() => (first ? router.push(`/clubs/battle/${first.id}`) : router.push(`/clubs/challenge?club=${club.id}`))}
    />
  );
}

/**
 * What a club page adds under its hero: the next club run, this week's
 * fixture, friendlies and the table. Founding clubs get their progress.
 */
export function ClubPanel({ club, onRunAction }) {
  const router = useRouter();
  const fixture = useMyFixture();
  const fx = fixture.data && club.isMember && [fixture.data.home.club?.id, fixture.data.away.club?.id].includes(club.id) ? fixture.data : null;
  return (
    <View>
      <NextRunCard
        run={club.nextRun}
        onPress={() => club.nextRun && router.push(`/clubs/run/${club.nextRun.id}`)}
        action={club.nextRun ? (club.nextRun.checkedIn ? "Checked in" : club.nextRun.isGoing ? "Going" : "I'm in") : null}
        onAction={() => onRunAction?.(club.nextRun)}
      />
      {club.founding ? (
        <PanelRow icon={Flame} tone="gold" kicker="Founding club" title="How close you are to official" sub="Three meetups of six, ten different runners" onPress={() => router.push(`/clubs/founding/${club.id}`)} />
      ) : null}
      {fx ? <FixtureCard fixture={fx} onPress={() => router.push(`/clubs/fixture/${fx.id}`)} /> : null}
      {fx ? (
        <PressableScale onPress={() => router.push(`/stories/share/${fx.id}`)} scaleTo={0.96} style={styles.shareCard} accessibilityLabel="Share the club v club card">
          <LinearGradient colors={["rgba(61,139,255,0.22)", "rgba(61,139,255,0.08)"]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
          <View>
            <Share2 size={14} color={C.accentHi} />
          </View>
          <Text style={styles.shareCardText}>{fx.revealed ? "Share the result card" : "Share the live card"}</Text>
        </PressableScale>
      ) : null}
      {club.verified && club.isMember ? <FriendliesRow club={club} /> : null}
      {club.verified && club.isMember && club.inLeague !== false ? (
        <PanelRow icon={Trophy} tone="gold" kicker="Club league" title={club.record?.pos ? `${ordinal(club.record.pos)} in your group` : "The table"} sub="Six week seasons, groups of seven" onPress={() => router.push("/clubs/league")} />
      ) : null}
      {club.meetPlace ? (
        <Row gap={6} style={{ marginTop: S.lg }}>
          <MapPin size={14} color={C.accentHi} />
          <Text style={styles.meta}>{club.meetPlace}</Text>
        </Row>
      ) : null}
    </View>
  );
}

/** .round.glass: a frosted round button over a photo or a slab. */
export function GlassRound({ icon: Icon, label, onPress, style }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={8} style={[styles.round, style]} accessibilityLabel={label}>
      <View>
        <Icon size={19} color="#fff" />
      </View>
    </PressableScale>
  );
}

const SLAB_EDGE = splitShadow(FINISH.slabEdge);

/**
 * .slab with an object: blue light, a 3D object with its black dropped out
 * (centred, or on the right), grain, a lit lower edge, round controls at the
 * top and the kicker and two-tone headline at the bottom (.slab .hl).
 */
export function ObjectSlab({ height = 318, object, objectSize = 236, objectTop = 24, objectRight, left, right, kicker, top, bottom, size = 44, children }) {
  const insets = useSafeAreaInsets();
  const screenTop = useScreenTop();
  const place = objectRight != null ? { right: objectRight } : { left: "50%", marginLeft: -objectSize / 2 };
  return (
    <View style={{ borderBottomLeftRadius: 34, borderBottomRightRadius: 34, boxShadow: SLAB_EDGE.outer }}>
      <View style={[styles.slab, { height: height + insets.top }]}>
        <GlowBackdrop preset="slab" />
        {object ? <BlendImage source={object} size={objectSize} float glow={objectSize * 1.15} style={[{ position: "absolute", top: insets.top + objectTop }, place]} /> : null}
        <Grain amount={0.06} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 34, borderBottomRightRadius: 34, boxShadow: SLAB_EDGE.inset }]} />
        <Row style={[styles.slabNav, { top: screenTop }]}>
          {left || <View />}
          {right || <View />}
        </Row>
        <View style={styles.hl}>
          {kicker ? <Text style={styles.hlKick}>{kicker}</Text> : null}
          {top ? (
            <Text style={[styles.hlBig, { fontSize: size, lineHeight: size * 0.98 }]} numberOfLines={2} adjustsFontSizeToFit>
              {top}
            </Text>
          ) : null}
          {bottom ? <Text style={[styles.hlBig, styles.hlBlue, { fontSize: size, lineHeight: size * 0.98 }]}>{bottom}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

export const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`;

export const styles = StyleSheet.create({
  shareCard: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", height: 32, paddingHorizontal: 13, borderRadius: R.full, marginTop: 10, boxShadow: "inset 0 1px 0 rgba(130,180,255,0.4), inset 0 0 0 1px rgba(61,139,255,0.25)" },
  shareCardText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 12 },
  facesLabel: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12, flexShrink: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, height: 30, paddingHorizontal: 12, borderRadius: R.full, alignSelf: "flex-start" },
  chipLit: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 22px -14px #000" },
  chipGlass: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.1)" },
  chipBlue: { boxShadow: "inset 0 1px 0 rgba(130,180,255,0.55), inset 0 0 0 1px rgba(61,139,255,0.22), 0 10px 22px -14px #000" },
  chipAlert: { boxShadow: "inset 0 1px 0 rgba(255,139,146,0.5), inset 0 0 0 1px rgba(255,77,85,0.25)" },
  alertDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.alert, boxShadow: "0 0 8px #ff4d55" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  tag: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  club: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12 },
  clubName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, flexShrink: 1 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 3 },
  next: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 15 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  cardBig: { color: C.text, fontFamily: F.display, fontSize: 21, textTransform: "uppercase", letterSpacing: 0.2, marginTop: 5 },
  score: { fontFamily: F.display, fontSize: 36, letterSpacing: 0.3, fontVariant: ["tabular-nums"] },
  scoreBlue: { color: C.accentHi, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  scoreRed: { color: "#ff8b92", textShadowColor: "rgba(255,77,85,0.4)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  v: { color: C.textMute, fontFamily: F.display, fontSize: 18, marginBottom: 7 },
  panelRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 15 },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14.5, marginTop: 4 },
  meta: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  slab: { overflow: "hidden", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, backgroundColor: FINISH.slab.base, justifyContent: "flex-end" },
  slabNav: { position: "absolute", left: 18, right: 18, justifyContent: "space-between" },
  hl: { paddingHorizontal: 18, paddingBottom: 22 },
  hlKick: { color: "#82b4ff", fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 8 },
  hlBig: { color: C.text, fontFamily: F.display, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  hlBlue: { color: "#4b93ff", textShadowColor: "rgba(61,139,255,0.4)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
});
