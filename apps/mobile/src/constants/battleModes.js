// The six ways to battle, shared by the engine, the Supabase adapter and the
// screens. Keys match the database's battle_mode enum.
//
// window modes run for a set time: most steps, days standing, or the best time
// on a saved route. distance modes are timed: your first run of at least the
// distance after the start counts, and the faster time wins.

export const BATTLE_MODES = [
  {
    key: "most_steps",
    name: "Most steps",
    short: "Steps",
    line: "Most counted steps before the clock runs out.",
    kind: "window",
    durations: [2, 6, 24, 72, 168],
    defaultDuration: 24,
    unit: "steps",
  },
  {
    key: "live_race",
    name: "Live race",
    short: "Race",
    line: "Same start, wherever you both are. First to the distance wins.",
    kind: "distance",
    distances: [1000, 3000, 5000],
    defaultDistance: 3000,
    unit: "time",
  },
  {
    key: "blind_time_trial",
    name: "Blind time trial",
    short: "Blind",
    line: "Run it when you like. Both times stay sealed until you've both finished.",
    kind: "distance",
    distances: [3000, 5000, 10000],
    defaultDistance: 5000,
    unit: "time",
  },
  {
    key: "ghost_race",
    name: "Ghost race",
    short: "Ghost",
    line: "Race their best time over the distance, as a ghost beside you.",
    kind: "distance",
    distances: [1000, 3000, 5000],
    defaultDistance: 5000,
    unit: "time",
  },
  {
    key: "last_one_standing",
    name: "Last one standing",
    short: "Standing",
    line: "The daily target goes up 1,000 steps each day. Miss it and you're out.",
    kind: "window",
    durations: [72, 168],
    defaultDuration: 168,
    unit: "days",
  },
  {
    key: "hold_the_route",
    name: "Hold the route",
    short: "Route",
    line: "Fastest time on one saved route owns it. Run it as often as you like.",
    kind: "window",
    durations: [24, 72, 168],
    defaultDuration: 72,
    unit: "time",
  },
];

export const MODE = Object.fromEntries(BATTLE_MODES.map((m) => [m.key, m]));

export const modeOf = (key) => MODE[key] || MODE.most_steps;

// Times are faster-is-better; everything else is more-is-better.
export const lowerWins = (key) => modeOf(key).unit === "time";

// Last one standing: 8,000 steps on the first day, then 1,000 more each day.
export const STANDING_START = 8000;
export const STANDING_STEP = 1000;
export const standingTarget = (dayIndex) => STANDING_START + STANDING_STEP * dayIndex;

// A run counts as a go at the route when it covers nineteen twentieths of it.
export const ROUTE_SHARE = 0.95;

// Blind trials hide both times until both are in.
export const BLIND_START_HOURS = 12;
export const BLIND_FINISH_HOURS = 24;

// Live races open for two hours once both have pressed ready.
export const LIVE_RACE_HOURS = 2;
export const LIVE_RACE_LEAD_MS = 10 * 1000;

export const distanceLabel = (m) => (m >= 1000 ? `${Number((m / 1000).toFixed(m % 1000 ? 1 : 0))} km` : `${m} m`);

export const timeLabel = (sec) => {
  if (sec == null) return "--:--";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
};

// What a side's number reads as, e.g. "12,480 steps", "24:13", "3 days".
export const resultLabel = (key, value) => {
  const unit = modeOf(key).unit;
  if (unit === "time") return timeLabel(value);
  if (value == null) return "0";
  if (unit === "days") return `${value} ${value === 1 ? "day" : "days"}`;
  if (unit === "laps") return `${value} ${value === 1 ? "lap" : "laps"}`;
  return `${Number(value).toLocaleString("en-GB")} steps`;
};
