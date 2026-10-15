/**
 * London time helpers. The database stores timestamptz and treats a "day" as
 * the Europe/London calendar day, so every label the UI shows is worked out
 * in London time, whatever the server's own zone is.
 */

const TZ = "Europe/London";
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface LondonParts {
  /** YYYY-MM-DD */
  date: string;
  year: number;
  /** 1 to 12 */
  month: number;
  day: number;
  hh: string;
  mm: string;
  /** Monday is 0. */
  weekday: number;
}

export function london(at: Date | string): LondonParts {
  const d = typeof at === "string" ? new Date(at) : at;
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, year, month, day, hh: p.hour ?? "00", mm: p.minute ?? "00", weekday: weekdayOf(date) };
}

/** Monday is 0, for a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** The Monday of the week holding this date. */
export const mondayOf = (date: string): string => addDays(date, -weekdayOf(date));

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The instant London's day starts, as an ISO string, for timestamptz filters. */
export function londonMidnight(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const shown = london(new Date(guess));
  // London is UTC or one hour ahead, so midnight there is at or before midnight UTC.
  const ahead = shown.date === date ? Number(shown.hh) * 60 + Number(shown.mm) : 0;
  return new Date(guess - ahead * 60_000).toISOString();
}

export const hhmm = (iso: string): string => {
  const p = london(iso);
  return `${p.hh}:${p.mm}`;
};

/** "TUE" for date boxes. */
export const dayCaps = (iso: string): string => (SHORT_DAYS[london(iso).weekday] ?? "").toUpperCase();

export const shortDay = (date: string): string => SHORT_DAYS[weekdayOf(date)] ?? "";

/** "Sun 26 Oct" */
export function dateLabel(iso: string): string {
  const p = london(iso);
  return `${SHORT_DAYS[p.weekday] ?? ""} ${p.day} ${(MONTHS[p.month - 1] ?? "").slice(0, 3)}`;
}

/** "2m", "5h", "3d", "6w" since the given time. */
export function ago(iso: string, now: Date): string {
  const s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 7))}w`;
}

/** "Today 19:15", "Tomorrow 12:30", "Thursday 07:00" or "Sun 26 Oct 09:00". */
export function whenLabel(iso: string, now: Date): string {
  const t = london(iso).date;
  const today = london(now).date;
  const diff = Math.round((Date.parse(`${t}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  const time = hhmm(iso);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff > 1 && diff < 7) return `${WEEKDAYS[weekdayOf(t)] ?? ""} ${time}`;
  return `${dateLabel(iso)} ${time}`;
}

/** Separator label in chat: "Today", "Yesterday", a weekday, or "12 Oct". */
export function chatDay(iso: string, now: Date): string {
  const t = london(iso).date;
  const today = london(now).date;
  if (t === today) return "Today";
  if (t === addDays(today, -1)) return "Yesterday";
  if (t > addDays(today, -7)) return WEEKDAYS[weekdayOf(t)] ?? t;
  const p = london(iso);
  return `${p.day} ${(MONTHS[p.month - 1] ?? "").slice(0, 3)}`;
}

/** "Ends Friday 23:59" style countdown target. */
export const endsLabel = (iso: string): string => `Ends ${WEEKDAYS[london(iso).weekday] ?? ""} ${hhmm(iso)}`;

/** Seconds as "24:18" or "1:25:07". */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`;
}
