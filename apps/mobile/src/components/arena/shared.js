// Shared bits for the Arena, battles and player screens.

import { useEffect, useState } from "react";
import { compactNumber, formatKm, formatNumber } from "@/utils/format";

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

export const metricUnit = (metric) => (metric === "distance" ? "km" : metric === "xp" ? "XP" : metric === "streak" ? "days" : "steps");

export const durationLabel = (hours) => (hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours}h`);

// Matches the engine's battle settlement (engine.settleBattles).
export const BATTLE_PRIZES = { win: { xp: 150, out: 15 }, other: { xp: 25, out: 0 } };

export const battlePrize = (result) => (result === "won" ? BATTLE_PRIZES.win : result ? BATTLE_PRIZES.other : null);

export const playerName = (p) => (p?.isMe ? "You" : p?.name || p?.username || "Player");

// Podium colours for the top three.
export const MEDAL = { 1: "#FFD700", 2: "#C9CED6", 3: "#D08A4E" };

// Score for a battle side, e.g. "12,480" or "8.42".
export const formatScore = (metric, v) => (metric === "distance" ? Number(v || 0).toFixed(Number(v) >= 100 ? 0 : 1) : formatNumber(v));

// My own colour in battles and rankings: plain white, so green stays for actions.
export const ME = "#ffffff";

// Fallback colour for a rival with no colour of their own.
export const RIVAL = "#9B5CFF";
export const rivalColour = (player) => (player?.color && player.color.toLowerCase() !== "#00ff7f" ? player.color : RIVAL);
