// The emote set. Two come with every account; the rest are earned by wins,
// streaks, season drops and derby wins, or come with Black. Ids match
// public.emotes in the database, which owns who has what and the tray.

import { PHOTOS } from "./photos";

export const TRAY_SIZE = 5;

export const EMOTES = [
  { id: "flame", label: "On fire", how: "3 day streak", source: "streak", stat: "bestStreak", target: 3, art: PHOTOS.emoteFlame },
  { id: "fist", label: "Respect", how: "Everyone starts with it", source: "starter", art: PHOTOS.emoteFist },
  { id: "snail", label: "Too slow", how: "Everyone starts with it", source: "starter", art: PHOTOS.emoteSnail },
  { id: "bolt", label: "Speed", how: "Win a battle", source: "win", stat: "wins", target: 1, art: PHOTOS.emoteBolt },
  { id: "wings", label: "Flying", how: "Win 3 in a row", source: "win", stat: "winRun", target: 3, art: PHOTOS.emoteWings, line: "You won 3 battles in a row." },
  { id: "watch", label: "Clock's ticking", how: "Season drop", source: "drop", stat: "squadCalls", target: 1, art: PHOTOS.emoteWatch, line: "This season's drop, for playing in a league fixture." },
  { id: "crown", label: "Champion", how: "Black members", source: "club", stat: "derbyWins", target: 1, art: PHOTOS.emoteCrown, line: "For Black members and derby winners." },
  { id: "inferno", label: "Inferno", how: "30 day streak", source: "streak", stat: "bestStreak", target: 30, art: PHOTOS.emoteFlame, style: "black", line: "Thirty days in a row." },
];

export const EMOTE_BY_ID = Object.fromEntries(EMOTES.map((e) => [e.id, e]));
export const STARTER_EMOTES = EMOTES.filter((e) => e.source === "starter").map((e) => e.id);

// The line under a fresh emote: what you did, from the rule.
export const emoteLine = (e) => e.line || (e.source === "streak" ? `You kept a ${e.target} day streak.` : e.source === "win" ? "You won a battle." : "Yours to use.");
