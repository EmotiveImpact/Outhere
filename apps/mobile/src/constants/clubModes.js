// Club v club. League fixtures are always steps, so every club size plays
// fair; captains can also call friendlies in these modes. Shared by the local
// engine, the server mapping and the screens.

export const CLUB_MODES = [
  {
    key: "steps",
    name: "Steps",
    short: "Steps",
    tag: "FIXTURE",
    line: "Equal squads, counted steps, run turnout worth up to 20%. The league game, as a friendly.",
    hours: 72,
    unit: "steps",
  },
  {
    key: "live_race",
    name: "Club live race",
    short: "Live race",
    tag: "LIVE",
    line: "Both clubs run in the same hour, anywhere. Most kilometres in 60 minutes wins.",
    hours: 1,
    unit: "km",
  },
  {
    key: "relay",
    name: "Relay",
    short: "Relay",
    tag: "RELAY",
    line: "Ten legs of 1 km by ten different runners. Fastest total wins.",
    hours: 2,
    unit: "time",
  },
  {
    key: "blind_time_trial",
    name: "Blind time trial",
    short: "Blind trial",
    tag: "SEALED",
    line: "The squad runs a 5 km this week. Average times stay sealed until the end.",
    hours: 168,
    unit: "time",
  },
  {
    key: "turnout_night",
    name: "Turnout night",
    short: "Turnout",
    tag: "TURNOUT",
    line: "Same night, both clubs. Most members out, as a share of the club, wins.",
    hours: 4,
    unit: "share",
  },
  {
    key: "turf_war",
    name: "Turf war",
    short: "Turf war",
    tag: "TURF",
    line: "Own the fastest time on a route and it goes your club's colour. Most routes wins.",
    hours: 168,
    unit: "routes",
    soon: true,
  },
];

export const CLUB_MODE = Object.fromEntries(CLUB_MODES.map((m) => [m.key, m]));
export const clubModeOf = (key) => CLUB_MODE[key] || CLUB_MODE.steps;
export const clubLowerWins = (key) => clubModeOf(key).unit === "time";

// Turnout lifts a club's step score by up to a fifth; a city's by a tenth.
export const CLUB_TURNOUT_WEIGHT = 5;
export const SQUAD_MAX = 25;
export const RELAY_LEGS = 10;
export const FOUNDING_MEETUPS = 3;
export const FOUNDING_PEOPLE = 10;
export const FOUNDING_TURNOUT = 6;
export const SEASON_WEEKS = 6;

const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
};

// A side's score as people read it.
export const clubScoreLabel = (mode, value) => {
  if (value == null) return "–";
  const unit = clubModeOf(mode).unit;
  if (unit === "time") return mmss(value);
  if (unit === "km") return `${(value / 1000).toFixed(1)} km`;
  if (unit === "share") return `${Math.round(value)}%`;
  return Math.round(value).toLocaleString("en-GB");
};

// Share of the bar the home side holds, 0 to 1.
export const clubTugShare = (mode, mine, theirs) => {
  if (mine == null && theirs == null) return 0.5;
  if (mine == null) return 0.1;
  if (theirs == null) return 0.9;
  const total = mine + theirs;
  if (!total) return 0.5;
  const share = clubLowerWins(mode) ? theirs / total : mine / total;
  return Math.max(0.05, Math.min(0.95, share));
};
