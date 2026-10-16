// What the watch, widget and lock screen previews show, read from the same
// hooks the app uses. Anything that isn't there yet (no run going, no battle
// on, no club) comes back null, and each preview falls back to the
// prototype's example for that one thing.

import { useEffect, useState } from "react";
import {
  useBattles,
  useEmotes,
  useEvents,
  useMyCrews,
  useMyFixture,
  useMysteryOffer,
  useMysterySettings,
  useOutsideNow,
  useProfile,
  useRoutes,
  useRuns,
} from "@/data/hooks";
import { navigate, stepsFor } from "@/data/runMath";
import { EMOTE_BY_ID } from "@/constants/emotes";
import { useStepStatus } from "@/hooks/useStepSync";
import { MOVE_SESSION_PHASE as PHASE, sessionSeconds, useMoveStore } from "@/store/useMoveStore";
import { paceFor, rewardsFor } from "@/components/move/geo";
import { countdown, formatNumber } from "@/utils/format";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n) => String(n).padStart(2, "0");

/** "6:36", or "06:36" with `padHour`. */
export const clock = (d, padHour = false) => `${padHour ? pad(d.getHours()) : d.getHours()}:${pad(d.getMinutes())}`;
/** "Thursday 15 October" */
export const longDate = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "Wed 15" */
export const shortDate = (d) => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()}`;
/** "7pm", "7:30pm" */
export const hourLabel = (ms) => {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${h}${d.getMinutes() ? `:${pad(d.getMinutes())}` : ""}${d.getHours() < 12 ? "am" : "pm"}`;
};

const dayStart = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Tonight 19:30", "Tomorrow 09:00", "Sat 09:00" */
export const whenLabel = (ms, now = Date.now()) => {
  const d = new Date(ms);
  const days = Math.round((dayStart(ms) - dayStart(now)) / 86400000);
  const at = clock(d, true);
  if (days <= 0) return `${d.getHours() >= 17 ? "Tonight" : "Today"} ${at}`;
  if (days === 1) return `Tomorrow ${at}`;
  return `${DAYS[d.getDay()].slice(0, 3)} ${at}`;
};

/** The clock on the lock screen and the watch, ticking each few seconds. */
export function useNow(ms = 5000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// The run being recorded on Move right now, or null when there isn't one.
function useLiveRun(tier) {
  const phase = useMoveStore((s) => s.sessionPhase);
  const distanceM = useMoveStore((s) => s.distanceM);
  const liveSteps = useMoveStore((s) => s.steps);
  const activeRoute = useMoveStore((s) => s.activeRoute);
  const lastPoint = useMoveStore((s) => s.lastPoint);
  const live = phase === PHASE.ACTIVE || phase === PHASE.PAUSED;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [live]);
  if (!live) return null;
  const seconds = sessionSeconds(useMoveStore.getState());
  const km = distanceM / 1000;
  const goalKm = activeRoute?.distanceKm ? Math.round(activeRoute.distanceKm * 10) / 10 : 5;
  const nav = activeRoute && lastPoint ? navigate(activeRoute.path, lastPoint, { turns: activeRoute.turns, cum: activeRoute.cum }) : null;
  return {
    paused: phase === PHASE.PAUSED,
    km,
    seconds,
    pace: paceFor(km, seconds),
    steps: liveSteps || stepsFor(km),
    ...rewardsFor(km, tier),
    goalKm,
    routeName: activeRoute?.name || null,
    nextTurn: nav?.next ? { dir: nav.next.dir, metres: nav.next.inM, label: nav.next.label } : null,
  };
}

export function usePreviewData() {
  const now = useNow();
  const { data: profile } = useProfile();
  const { liveSteps } = useStepStatus();
  const { data: outside } = useOutsideNow(profile?.city);
  const { data: battles } = useBattles("active");
  const { data: crews } = useMyCrews();
  const { data: fx } = useMyFixture();
  const { data: events } = useEvents(profile?.city);
  const { data: emotes } = useEmotes();
  const { data: offer } = useMysteryOffer();
  const { data: mystery } = useMysterySettings();
  const { data: runs } = useRuns(1);
  const { data: routes } = useRoutes("mine");
  const run = useLiveRun(profile?.tier);

  // A head to head on steps that is live now.
  const b = (battles || []).find((x) => x.phase === "live" && x.metric === "steps" && !x.timed && x.me?.value != null && x.opponent?.value != null);
  const battle = b
    ? {
        rival: b.opponent.player?.name || "Your rival",
        mine: b.me.value,
        theirs: b.opponent.value,
        diff: b.me.value - b.opponent.value,
        endsIn: b.endAt ? countdown(b.endAt, now.getTime()) : null,
      }
    : null;

  const c = crews?.[0] || null;
  const crew = c ? { name: c.nextRun?.club?.short || c.name.split(" ")[0], weekKm: c.weekKm, goalKm: c.weeklyGoalKm } : null;
  const r = c?.nextRun || null;
  const clubRun = r
    ? {
        club: r.club?.name || c.name,
        logo: r.club?.logo || c.logo,
        where: `${String(r.place || "").split(",")[0]} · ${hourLabel(r.startAt)}`,
        line: r.checkedIn ? "You're checked in" : r.status === "live" || r.checkInOpen ? `${r.here} here so far` : `${r.going} going`,
      }
    : null;

  let fixture = null;
  if (fx?.mySide) {
    const mine = fx[fx.mySide];
    const other = fx[fx.mySide === "home" ? "away" : "home"];
    const lift = fx.myLift;
    fixture = {
      label: fx.isDerby ? "Derby" : `Week ${fx.week}`,
      endsIn: fx.revealAt ? countdown(fx.revealAt, now.getTime()) : null,
      us: { name: mine.club.short || mine.club.name, score: mine.score, out: mine.out ?? 0, squad: mine.squad || 25, logo: mine.club.logo, full: mine.club.name },
      them: { name: other.club.short || other.club.name, score: other.score },
      line: lift > 0 ? `You added +${lift} to the average` : lift < 0 ? `${formatNumber(Math.abs(lift))} short of the average` : "Right on the squad average",
    };
  }

  const upcoming = (events || []).filter((e) => e.status !== "ended");
  const ev = upcoming.find((e) => e.isGoing) || upcoming[0] || null;
  const event = ev ? { title: ev.title, when: whenLabel(ev.startAt, now.getTime()), going: ev.isGoing, count: ev.rsvpCount } : null;

  const tray = (emotes?.items || []).filter((e) => e.owned && e.inTray).slice(0, 3).map((e) => EMOTE_BY_ID[e.id]?.art).filter(Boolean);

  const level = profile?.level?.level ?? profile?.level ?? null;
  const gap = mystery?.levelGap ?? 3;
  const challenger =
    offer && offer.status === "open"
      ? { low: offer.levelLow, high: offer.levelHigh, stake: offer.stakeOut }
      : level
        ? { low: Math.max(1, level - gap), high: level + gap, stake: (profile.out || 0) >= 100 ? 100 : (profile.out || 0) >= 50 ? 50 : 0 }
        : null;

  const last = runs?.[0] || null;
  const lastRun = last ? { km: last.distanceKm, seconds: last.durationSec, ...rewardsFor(last.distanceKm, profile?.tier) } : null;

  const route = routes?.[0] ? { name: routes[0].name, km: routes[0].distanceKm } : null;
  const active = useMoveStore((s) => s.activeRoute);

  return {
    ready: !!profile,
    now,
    tier: profile?.tier || "free",
    steps: Math.max(profile?.today?.steps || 0, liveSteps || 0),
    goal: profile?.dailyGoal || 10000,
    streak: profile?.streak ?? 0,
    city: profile?.city || null,
    outNow: outside?.count ?? null,
    battle,
    crew,
    clubRun,
    fixture,
    event,
    emotes: tray.length === 3 ? tray : null,
    challenger,
    run,
    lastRun,
    route: active ? { name: active.name, km: active.distanceKm } : route,
  };
}
