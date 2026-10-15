// The 24 badges. Ids match public.badges in the database (the first seven
// come from the web gaps migration, the rest from the profile migration), and
// the server awards them; the local engine applies the same rules.
//
// Each badge is reached when a stat crosses its target, so the app can draw a
// progress bar for the ones still to win. Stats, for both engines:
//   runs, longestRunKm, monthKm, nightRun, earlyRun, bestDaySteps, totalSteps,
//   bestStreak, founding, wins, winRun, clubs, eventCheckins, derbyWins,
//   squadCalls, referrals

import { PHOTOS } from "./photos";

const ART = {
  owl: require("../../assets/images/oh/badges/owl.jpg"),
  stack: require("../../assets/images/oh/badges/stack.jpg"),
  bars: require("../../assets/images/oh/badges/bars.jpg"),
  card: require("../../assets/images/oh/badges/card.jpg"),
};

export const BADGES = [
  { id: "first_run", label: "First run", description: "Saved your first run.", todo: "Save a run", stat: "runs", target: 1, art: PHOTOS.shoe },
  { id: "ten_k_club", label: "10k club", description: "10,000 steps in a day.", stat: "bestDaySteps", target: 10000, art: PHOTOS.medal },
  { id: "night_owl", label: "Night owl", description: "A run started after 10pm.", todo: "Run after 10pm", stat: "nightRun", target: 1, art: ART.owl },
  { id: "streak_7", label: "7 day streak", description: "Seven days in a row with 3,000 steps or more.", stat: "bestStreak", target: 7, art: PHOTOS.flame },
  { id: "streak_30", label: "30 day streak", description: "Thirty days in a row with 3,000 steps or more.", stat: "bestStreak", target: 30, art: PHOTOS.shield },
  { id: "marathon_month", label: "Marathon month", description: "Ran 42.2 km in one calendar month.", stat: "monthKm", target: 42.2, art: ART.stack },
  { id: "founding_member", label: "Founding member", description: "One of the Founding 500.", todo: "Founding 500", stat: "founding", target: 1, art: PHOTOS.founding },
  { id: "early_bird", label: "Early bird", description: "A run started before 7am.", todo: "Run before 7am", stat: "earlyRun", target: 1, art: PHOTOS.dial },
  { id: "ten_k_run", label: "10K run", description: "One run of 10 km or more.", stat: "longestRunKm", target: 10, art: PHOTOS.pin },
  { id: "half_marathon", label: "Half marathon", description: "One run of 21.1 km or more.", stat: "longestRunKm", target: 21.1, art: PHOTOS.laurel },
  { id: "runs_25", label: "25 runs", description: "Saved 25 runs.", stat: "runs", target: 25, art: ART.bars },
  { id: "steps_20k", label: "20k day", description: "20,000 steps in a day.", stat: "bestDaySteps", target: 20000, art: PHOTOS.bolt },
  { id: "million_steps", label: "Million steps", description: "A million steps since you joined.", stat: "totalSteps", target: 1000000, art: PHOTOS.coin },
  { id: "streak_14", label: "14 day streak", description: "Two weeks in a row with 3,000 steps or more.", stat: "bestStreak", target: 14, art: PHOTOS.token },
  { id: "streak_100", label: "100 day streak", description: "A hundred days in a row.", stat: "bestStreak", target: 100, art: PHOTOS.crown },
  { id: "first_win", label: "First win", description: "Won a battle.", todo: "Win a battle", stat: "wins", target: 1, art: PHOTOS.trophy },
  { id: "wins_10", label: "10 wins", description: "Won 10 battles.", stat: "wins", target: 10, art: PHOTOS.podium },
  { id: "win_streak_3", label: "Hat-trick", description: "Won 3 battles in a row.", stat: "winRun", target: 3, art: PHOTOS.badge },
  { id: "club_member", label: "Club member", description: "Joined a run club.", todo: "Join a club", stat: "clubs", target: 1, art: PHOTOS.crest },
  { id: "link_up", label: "Link-up", description: "Checked in at an event or club run.", todo: "Check in once", stat: "eventCheckins", target: 1, art: PHOTOS.ticket },
  { id: "regular", label: "Regular", description: "Checked in at 3 events or club runs.", stat: "eventCheckins", target: 3, art: PHOTOS.verified },
  { id: "derby_day", label: "Derby day", description: "Your club won a club v club.", todo: "Win a derby", stat: "derbyWins", target: 1, art: PHOTOS.ukmap },
  { id: "squad_called", label: "Called up", description: "Picked for your club's league squad.", todo: "Get picked", stat: "squadCalls", target: 1, art: ART.card },
  { id: "bring_three", label: "Bring three", description: "Three friends you invited walked their first 10k.", stat: "referrals", target: 3, art: PHOTOS.gift },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
export const badgeArt = (id) => BADGE_BY_ID[id]?.art || PHOTOS.badge;

// '31 km to go', '2 of 3', '6,240 of 10,000'
export const badgeToGo = (badge, value) => {
  const left = Math.max(0, badge.target - (value || 0));
  if (badge.stat === "monthKm" || badge.stat === "longestRunKm") return `${Math.round(left * 10) / 10} km to go`;
  if (badge.target === 1) return badge.todo || badge.description;
  if (badge.target >= 1000) return `${Math.round(left).toLocaleString("en-GB")} to go`;
  return `${Math.min(badge.target, Math.floor(value || 0))} of ${badge.target}`;
};

// Turns stats and earned dates into the list the screens show.
export const badgeList = (stats = {}, earnedAt = {}) =>
  BADGES.map((b, i) => {
    const value = Number(stats[b.stat]) || 0;
    const earned = !!earnedAt[b.id] || value >= b.target;
    return {
      id: b.id,
      label: b.label,
      description: b.description,
      sort: i,
      earned,
      earnedAt: earnedAt[b.id] || null,
      value,
      target: b.target,
      progress: earned ? 1 : Math.max(0, Math.min(1, value / b.target)),
      toGo: earned ? "Earned" : badgeToGo(b, value),
    };
  });
