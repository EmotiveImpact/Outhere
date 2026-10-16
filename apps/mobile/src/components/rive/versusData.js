// What the 1v1 card (rive/versus) shows for a battle: which intro opens it,
// the words and numbers it binds, each side's photo and, once the battle is
// over, the result. Plain functions over the data layer's battle and player
// views, so both players (native and web) and the tests share them.

import { imageSource } from "@/components/ui/Cover";
import { distanceLabel } from "@/constants/battleModes";
import { startOfWeek } from "@/data/time";
import { fighterPhoto, hasPack } from "@/utils/fighter";
import { formatNumber } from "@/utils/format";
import { SHADOW_RUNNERS } from "./assets";

// How long each intro runs before the card is up (rive/versus/README.md).
export const INTRO_MS = { strike: 1700, tape: 3200, cinematic: 3900, letsRun: 4100 };

// A stake at or over this is a big one and gets the tale of the tape. The
// create screen starts every challenge at 50, so a lower line would put
// nearly every battle on the tape and the strike would hardly show.
export const BIG_STAKE = 100;

const DAY_MS = 86_400_000;

const firstName = (p, fallback) => (p?.name || fallback).split(" ")[0];
const placeOf = (p) => p?.area || p?.city || "";

/** 11400 as "11.4k", 950 as "950". */
export const stepsShort = (n) => {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(v);
};

/** A grudge match: three or more meetings and never more than one win apart. */
export const isGrudge = (h2h) => (h2h?.played || 0) >= 3 && Math.abs((h2h.mine || 0) - (h2h.theirs || 0)) <= 1;

/**
 * Which intro opens the card. Let's Run for event battles, the cinematic for
 * the big ones (a club derby, the top of a leaderboard, a grudge match), the
 * tale of the tape for a rematch, someone you've met before or a big stake,
 * and the seam strike for everything else.
 */
export function pickIntro(battle, h2h) {
  if (!battle) return "strike";
  if (battle.eventId || battle.isEvent) return "letsRun";
  if (battle.isDerby || battle.isTopOfLeaderboard || isGrudge(h2h)) return "cinematic";
  if (battle.rematchOf || (h2h?.played || 0) > 0 || (battle.stakeOut || 0) >= BIG_STAKE) return "tape";
  return "strike";
}

/** The top bar's rule: "24h · most steps", "Fastest 5 km · 5 km". */
export function ruleFor(battle) {
  if (battle.mode === "most_steps") {
    const goal = battle.metric === "distance" ? "km" : battle.metric === "minutes" ? "minutes" : "steps";
    return `${clockFor(battle.durationHours)} · most ${goal}`;
  }
  return `${battle.modeName || "Battle"}${battle.distanceM ? ` · ${distanceLabel(battle.distanceM)}` : ""}`;
}

/** The clock tile: "24h", "3d". */
export const clockFor = (hours) => {
  const h = Number(hours) || 24;
  return h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
};

/** Steps a day this week so far, from a player view with weekSteps. */
export function stepsADay(player, now = Date.now()) {
  if (player?.weekSteps == null) return null;
  const days = Math.max(1, Math.ceil((now - startOfWeek(new Date(now)).getTime()) / DAY_MS));
  return Math.round(player.weekSteps / days);
}

const bars = (a, b) => {
  const top = Math.max(a, b);
  return top > 0 ? [a / top, b / top] : [0, 0];
};

/**
 * The tale of the tape's five rows from the two player views (usePlayer:
 * weekSteps, todaySteps, streak, xp) and the head to head. Each row has the
 * label, both numbers as shown and each side's bar as a share of the bigger.
 */
export function tapeRows({ you, them, h2h, now = Date.now() }) {
  const rows = [
    ["STEPS A DAY", stepsADay(you, now) || 0, stepsADay(them, now) || 0, stepsShort],
    ["TODAY", you?.todaySteps || 0, them?.todaySteps || 0, stepsShort],
    ["DAY STREAK", you?.streak || 0, them?.streak || 0, (n) => String(n)],
    ["XP", you?.xp || 0, them?.xp || 0, stepsShort],
    ["HEAD TO HEAD", h2h?.mine || 0, h2h?.theirs || 0, (n) => String(n)],
  ];
  return rows.map(([label, a, b, show]) => {
    const [youBar, themBar] = bars(a, b);
    return { label, you: show(a), them: show(b), youBar, themBar };
  });
}

const lineFor = (player, stats, now) => {
  const place = placeOf(player).toUpperCase();
  const perDay = stepsADay(stats, now);
  return [place, perDay ? `${stepsShort(perDay).toUpperCase()} STEPS A DAY` : null].filter(Boolean).join(" · ");
};

/**
 * The card's photo for one side: their Fighter Pack VS shot, else their own
 * photo, else the shadow runner for the figure they chose. The male shadow
 * runners are already in the file, so for those this returns null and the
 * card keeps its own.
 */
export function cardPhoto(player, side) {
  const { source, isSilhouette } = fighterPhoto(player, side === "you" ? "vs" : "vsMirror");
  if (!isSilhouette) return source;
  const figure = player?.runner === "either" ? player?.runnerFigure : player?.runner;
  if (figure !== "woman") return null;
  return side === "you" ? SHADOW_RUNNERS.womanYou : SHADOW_RUNNERS.womanThem;
}

/**
 * Everything the card binds before it plays. stats is { you, them } from
 * usePlayer, only needed for the tape and the cinematic lines.
 */
export function versusCard({ battle, me, opp, h2h, stats = {}, intro = pickIntro(battle, h2h), now = Date.now() }) {
  const stake = battle.stakeOut || 0;
  const strings = {
    youName: firstName(me, "You"),
    youCity: placeOf(me),
    themName: firstName(opp, "Rival"),
    themCity: placeOf(opp),
    title: `1V1${battle.rematchOf ? " · REMATCH" : battle.isSurprise ? " · MYSTERY" : ""}`,
    rule: ruleFor(battle),
    stake: formatNumber(stake),
    prize: formatNumber(stake * 2 || 15),
    clock: clockFor(battle.durationHours),
    youLine: lineFor(me, stats.you, now),
    themLine: lineFor(opp, stats.them, now),
  };
  const numbers = {};
  if (intro === "tape") {
    tapeRows({ you: stats.you, them: stats.them, h2h, now }).forEach((row, i) => {
      const n = i + 1;
      strings[`tape${n}Label`] = row.label;
      strings[`tape${n}You`] = row.you;
      strings[`tape${n}Them`] = row.them;
      numbers[`tape${n}YouBar`] = row.youBar;
      numbers[`tape${n}ThemBar`] = row.themBar;
    });
  }
  return {
    intro,
    strings,
    numbers,
    booleans: { youHasPack: hasPack(me) },
    photos: { youPhoto: cardPhoto(me, "you"), themPhoto: cardPhoto(opp, "them") },
  };
}

/**
 * The result, from your side, once a battle is over: "win" or "lose" (a draw
 * has none), whether it's a knockout (in a most-steps battle the winner has
 * at least double the loser's count), each side's result shot (the winner's
 * win pose, the loser's respect pose, else their card photo) and the prize.
 */
export function versusResult(battle) {
  if (battle?.status !== "complete" || (battle.result !== "won" && battle.result !== "lost")) return null;
  const won = battle.result === "won";
  const mine = Number(battle.me?.value) || 0;
  const theirs = Number(battle.opponent?.value) || 0;
  const [top, bottom] = won ? [mine, theirs] : [theirs, mine];
  const ko = battle.mode === "most_steps" && top > 0 && top >= bottom * 2;
  const shot = (player, side, pose) => imageSource(player?.fighter?.[pose]) || cardPhoto(player, side);
  return {
    outcome: won ? "win" : "lose",
    ko,
    youResult: shot(battle.me?.player, "you", won ? "win" : "respect"),
    themResult: shot(battle.opponent?.player, "them", won ? "respect" : "win"),
    prize: won && battle.prize?.out ? formatNumber(battle.prize.out) : null,
  };
}
