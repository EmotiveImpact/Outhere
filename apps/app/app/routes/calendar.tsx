import { useEffect, useState } from "react";
import type { CalendarEvent, CalendarScope } from "@outhere/core";
import { Icon, Seg, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import type { Route } from "./+types/calendar";

export const meta: Route.MetaFunction = () => [{ title: "Calendar · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  return { cal: await db.calendar(), feed: new URL("/calendar.ics", request.url).toString() };
}

type View = "week" | "month";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "Mine" is what you're in; "My clubs" adds your clubs; "All of <city>" adds the rest of your city. Big UK-wide moments always show. */
const shows = (scope: CalendarScope) => (e: CalendarEvent) =>
  scope === "city" || e.scope === "mine" || !!e.global || (scope === "club" && e.scope === "club");

function read(key: string) {
  try { return localStorage.getItem(`oh_${key}`); } catch { return null; }
}
function save(key: string, v: string) {
  try { localStorage.setItem(`oh_${key}`, v); } catch { /* private mode */ }
}

function Tag({ e, club, city }: { e: CalendarEvent; club: string; city: string }) {
  if (e.global) return <span className="tag"><Icon name="spark" />Across the UK</span>;
  if (e.kind === "going") return <span className="tag"><Icon name="check" />Going</span>;
  if (e.kind === "done") return <span className="tag"><Icon name="check" />You ran it</span>;
  if (e.kind === "battle") return <span className="tag"><Icon name="trophy" />Battle</span>;
  if (e.scope === "club") return <span className="tag">{club}</span>;
  if (e.scope === "city") return <span className="tag">{city ? `Across ${city}` : "Near you"}</span>;
  return null;
}

function EventButton({ e, club, city }: { e: CalendarEvent; club: string; city: string }) {
  const toast = useToast();
  return (
    <button type="button" className={`cev s-${e.scope}${e.global ? " glob" : ""}`} onClick={() => toast(`${e.title} · ${e.time} · ${e.where}`)}>
      <span className="tm tab">{e.time}</span><b>{e.title}</b><span className="wh">{e.where}</span><Tag e={e} club={club} city={city} />
    </button>
  );
}

export default function Calendar({ loaderData }: Route.ComponentProps) {
  const { cal, feed } = loaderData;
  const toast = useToast();
  const [scope, setScope] = useState<CalendarScope>("mine");
  const [view, setView] = useState<View>("month");
  const [sel, setSel] = useState(cal.today + 1);

  useEffect(() => {
    const s = read("calscope");
    const v = read("calview");
    if (s === "mine" || s === "club" || s === "city") setScope(s);
    if (v === "week" || v === "month") setView(v);
  }, []);

  const weekday = (date: number) => (cal.leadingBlanks + date - 1) % 7;
  const events = cal.events.filter(shows(scope));
  const week = Array.from({ length: 7 }, (_, i) => cal.weekStart + i);
  const weekEvents = events.filter((e) => e.date >= cal.weekStart && e.date < cal.weekStart + 7);
  const nextDay = weekEvents.find((e) => e.kind === "going")?.date;
  const month = view === "month";
  const selEvents = events.filter((e) => e.date === sel);
  const wd = WEEKDAYS[weekday(sel)];
  const subscribe = feed.replace(/^https?:/, "webcal:");

  return (
    <>
      <div className="ph">
        <div>
          <div className="kick">Calendar</div>
          <h1 className="disp" id="caltitle">Your <span className="b">{month ? "month" : "week"}</span></h1>
          <p>Runs you're going to, your battles and challenges, and the big moments in {cal.city || "your city"} and across the UK, all in one place.</p>
        </div>
        <div className="acts">
          <a className="btn btn-q" id="calsub" href={subscribe} onClick={() => toast("Subscribed. Your Outhere plans now show in your phone calendar.")}>
            <Icon name="cal" />Add to my phone calendar
          </a>
        </div>
      </div>
      <div className="calbar">
        <Seg id="calseg" options={[["mine", "Mine"], ["club", "My clubs"], ["city", cal.city ? `All of ${cal.city}` : "Near me"]] as const} value={scope} onChange={(s) => { setScope(s); save("calscope", s); }} />
        <Seg id="calview" options={[["week", "Week"], ["month", "Month"]] as const} value={view} onChange={(v) => { setView(v); save("calview", v); }} />
        <span className="muted tab" id="calc">{month ? `${events.length} things in ${cal.monthName}` : `${weekEvents.length} things this week`}</span>
        <span className="sp" />
        <div className="calnav">
          <button type="button" className="iconbtn" aria-label={month ? "Last month" : "Last week"} onClick={() => toast("Last week: 4 runs and a 23 day streak")}><Icon name="chev" /></button>
          <b id="calrange">{month ? cal.monthName : `${cal.weekStart} to ${cal.weekStart + 6} ${cal.monthName}`}</b>
          <button type="button" className="iconbtn" aria-label={month ? "Next month" : "Next week"} onClick={() => toast("Next week: Winter Night Run sign-ups open")}><Icon name="chev" /></button>
        </div>
      </div>

      <div className="calw" id="calw" hidden={month}>
        {week.map((date, i) => {
          const ev = weekEvents.filter((e) => e.date === date);
          const next = date === nextDay;
          return (
            <div key={date} className={`cday2${next ? " today" : ""}`}>
              <div className="cdh"><span>{DAYS[i]}</span><b className="tab">{date}</b>{next && <i>Next</i>}</div>
              <div className="cdl">{ev.length ? ev.map((e) => <EventButton key={e.id} e={e} club={cal.clubName} city={cal.city} />) : <span className="cfree">Free</span>}</div>
            </div>
          );
        })}
      </div>

      <div className="calmg" id="calm" hidden={!month}>
        <div className="mgrid">
          <div className="mhd">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mcells" id="mcells">
            {Array.from({ length: Math.ceil((cal.leadingBlanks + cal.daysInMonth) / 7) * 7 }, (_, i) => {
              const n = i - cal.leadingBlanks + 1;
              const inMonth = n >= 1 && n <= cal.daysInMonth;
              const label = inMonth ? n : n < 1 ? 30 + n : n - cal.daysInMonth;
              const de = inMonth ? events.filter((e) => e.date === n) : [];
              const cls = `mc${inMonth ? "" : " out"}${inMonth && n < cal.today ? " past" : ""}${n === cal.today ? " today" : ""}${inMonth && n === sel ? " sel" : ""}`;
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  tabIndex={inMonth ? 0 : -1}
                  aria-label={inMonth ? `${WEEKDAYS[i % 7]} ${n} ${cal.monthName}, ${de.length} things` : ""}
                  onClick={inMonth ? () => {
                    setSel(n);
                    if (window.innerWidth < 900) document.getElementById("mday")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  } : undefined}
                >
                  <span className="mn tab">{label}</span>
                  <span className="mevs">
                    {de.slice(0, 3).map((e) => (
                      <span key={e.id} className={`mev s-${e.scope}${e.global ? " glob" : ""}${e.kind === "done" ? " done" : ""}`}><i className="tab">{e.time === "All week" ? "" : e.time}</i>{e.title}</span>
                    ))}
                    {de.length > 3 && <span className="more">+{de.length - 3} more</span>}
                  </span>
                  <span className="mdots">{de.slice(0, 4).map((e) => <i key={e.id} className={`s-${e.scope}${e.global ? " glob" : ""}`} />)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="card mday" id="mday">
          <div className="mono dim">{sel === cal.today ? "Today" : sel === cal.today + 1 ? "Tomorrow" : wd}</div>
          <h3 className="mdh">{wd} {sel} {cal.monthName}</h3>
          <div className="cdl">
            {selEvents.length ? selEvents.map((e) => <EventButton key={e.id} e={e} club={cal.clubName} city={cal.city} />) : <p className="muted" style={{ fontSize: 13 }}>Nothing on. A good day for a walk.</p>}
          </div>
        </aside>
      </div>

      <div className="g g2 mt calg">
        <div>
          <div className="card">
            <div className="hd"><h3>Big moments coming up</h3></div>
            {cal.bigMoments.map((r) => (
              <div key={r.title} className="row">
                <img src={r.image} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} />
                <div className="t"><b>{r.title}</b><span>{r.date} · {r.line}</span></div>
                <button type="button" className="btn btn-q btn-s" onClick={() => toast("Added to your calendar")}>Add</button>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Big city-wide moments land in your calendar on their own. Everything else is your choice.</p>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="hd"><h3>On your phone</h3><span className="pill blue"><Icon name="check" />Synced</span></div>
            <p className="muted" style={{ fontSize: 13 }}>Your Outhere calendar shows up in Google, Apple or Outlook next to everything else. When a run moves or gets cancelled, it updates by itself.</p>
            <div className="calapps">
              <a className="btn btn-q btn-s" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(subscribe)}`} target="_blank" rel="noreferrer">Google</a>
              <a className="btn btn-q btn-s" href={subscribe}>Apple</a>
              <a className="btn btn-q btn-s" href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}&name=Outhere`} target="_blank" rel="noreferrer">Outlook</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
