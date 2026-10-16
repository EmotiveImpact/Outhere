// Date helpers. Everything in the data layer keys days by the user's local
// calendar day (YYYY-MM-DD), never the UTC day.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");

export const dayKey = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Local midnight of the given day key or date.
export const startOfDay = (d = new Date()) => {
  if (typeof d === "string") {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (d, n) => {
  const date = startOfDay(d);
  date.setDate(date.getDate() + n);
  return date;
};

export const dayKeyOffset = (n, from = new Date()) => dayKey(addDays(from, n));

// Monday-based week start, as people in the UK expect.
export const startOfWeek = (d = new Date()) => {
  const date = startOfDay(d);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return date;
};

export const daysBetween = (a, b) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);

export const iso = (d) => new Date(d).toISOString();
