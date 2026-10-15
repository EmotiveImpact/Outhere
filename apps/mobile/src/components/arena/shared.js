// Shared bits for the Arena, battles and player screens.

import { useEffect, useState } from "react";
import { compactNumber, formatKm, formatNumber } from "@/utils/format";
import { distanceLabel, modeOf, timeLabel } from "@/constants/battleModes";

// Re-renders every `ms` so countdowns stay live.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const METRICS = [
  { value: "steps", label: "Steps" },
  { value: "distance", label: "Distance" },
  { value: "xp", label: "XP" },
  { value: "streak", label: "Streak" },
];

// Full value with unit, e.g. "12,400 steps", "8.4 km", "1,200 XP", "9 days".
export const metricValue = (metric, value) => {
  if (metric === "time") return value == null ? "no time" : timeLabel(value);
  if (metric === "days") return `${formatNumber(value || 0)} ${value === 1 ? "day" : "days"}`;
  if (metric === "laps") return `${formatNumber(value || 0)} ${value === 1 ? "lap" : "laps"}`;
  if (metric === "distance") return formatKm(value, "km", value >= 100 ? 0 : 1);
  if (metric === "xp") return `${formatNumber(value)} XP`;
  if (metric === "streak") return `${formatNumber(value)} ${value === 1 ? "day" : "days"}`;
  return `${formatNumber(value)} steps`;
};

// Short number for tight spaces, e.g. "12.4k", "8.4".
export const metricShort = (metric, value) => {
  if (metric === "distance") return Number(value || 0).toFixed(value >= 100 ? 0 : 1);
  return compactNumber(value);
};

export const metricUnit = (metric) =>
  ({ distance: "km", xp: "XP", streak: "days", days: "days standing", laps: "laps", time: "time" })[metric] || "steps";

export const durationLabel = (hours) => (hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours}h`);

// Matches the engine's battle settlement (engine.settleBattles).
export const BATTLE_PRIZES = { win: { xp: 150, out: 15 }, other: { xp: 25, out: 0 } };

export const battlePrize = (result) => (result === "won" ? BATTLE_PRIZES.win : result ? BATTLE_PRIZES.other : null);

export const playerName = (p) => (p?.isMe ? "You" : p?.name || p?.username || "Player");

// Podium colours for the top three.
export const MEDAL = { 1: "#FFD700", 2: "#C9CED6", 3: "#D08A4E" };

// Score for a battle side, e.g. "12,480" or "8.42".
export const formatScore = (metric, v) => {
  if (metric === "time") return v == null ? "--:--" : timeLabel(v);
  return metric === "distance" ? Number(v || 0).toFixed(Number(v) >= 100 ? 0 : 1) : formatNumber(v || 0);
};

// In a 1v1 you are blue and the other side is red, always.
export const ME = "#3d8bff";
export const RIVAL = "#ff4d55";
export const rivalColour = () => RIVAL;

// "24h · Most steps", "5 km · Blind time trial", "7 days · Last one standing".
export const battleFormat = (b) => {
  const mode = modeOf(b?.mode);
  const size = mode.kind === "distance" ? distanceLabel(b?.distanceM || mode.defaultDistance) : durationLabel(b?.durationHours || mode.defaultDuration);
  return `${size} · ${b?.mode && b.mode !== "most_steps" ? mode.name : b?.metric === "distance" ? "Distance" : "Most steps"}`;
};

// One line on where a live battle stands, in the mode's own words.
export const standingLine = (b, rivalName) => {
  if (b.phase === "lobby") return b.readyMe ? `You're on the line. Waiting for ${rivalName}.` : `${rivalName} ${b.readyThem ? "is ready" : "isn't ready yet"}. Press ready when you are.`;
  if (b.mode === "blind_time_trial" && b.sealed) return b.myTimeIn ? `Your time is in. ${rivalName}'s is sealed until they run.` : `Run ${distanceLabel(b.distanceM)} when you like. Times stay sealed.`;
  if (b.timed) {
    if (!b.myTimeIn && !b.theirTimeIn) return `First run of ${distanceLabel(b.distanceM)} counts.`;
    if (!b.myTimeIn) return `${rivalName} set ${timeLabel(b.opponent.value)}. Your run is next.`;
    if (!b.theirTimeIn) return `You set ${timeLabel(b.me.value)}. Waiting on ${rivalName}.`;
  }
  const gap = Math.abs((b.me.value || 0) - (b.opponent.value || 0));
  const unit = b.metric === "time" ? "" : ` ${metricUnit(b.metric)}`;
  const amount = b.metric === "time" ? `${timeLabel(gap)}` : formatScore(b.metric, gap);
  if (b.leader === "me") return `You're ahead by ${amount}${unit}`;
  if (b.leader) return `${rivalName} is ahead by ${amount}${unit}`;
  return "Dead level. Get moving.";
};
