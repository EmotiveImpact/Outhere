import { getData } from "~/data.server";
import type { Route } from "./+types/calendar-ics";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar as an iCalendar feed, so phones can subscribe to it and pick
 * up changes on their own. Times are UK local time (Europe/London).
 * Phones fetch this without cookies, so once real accounts are live the URL
 * needs a private per-person token (see the Supabase data source notes).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const cal = await db.calendar();
  const month = MONTHS.indexOf(cal.monthName) + 1;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Outhere//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Outhere",
    "X-WR-TIMEZONE:Europe/London",
  ];
  for (const e of cal.events.filter((x) => x.scope === "mine" || x.global)) {
    const day = `${cal.year}${pad(month)}${pad(e.date)}`;
    const timed = /^\d\d:\d\d$/.test(e.time);
    lines.push("BEGIN:VEVENT", `UID:${e.id}-${day}@weouthere.app`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.where)}`);
    if (timed) {
      const [h, m] = e.time.split(":");
      lines.push(`DTSTART;TZID=Europe/London:${day}T${h}${m}00`, "DURATION:PT1H");
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
