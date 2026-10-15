import { useCallback, useState } from "react";
import { redirect } from "react-router";
import { canSeeClubHq, firstName } from "@outhere/core";
import { Avatar, Bars, Icon, usePeople, useToast } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { CheckinOverlay } from "~/components/checkin";
import type { Route } from "./+types/hq-runs";

export const meta: Route.MetaFunction = () => [{ title: "Runs and check-in · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  if (!canSeeClubHq(viewer)) throw redirect("/");
  const week = await db.runsWeek(viewer.homeClubId);
  const cfg = config();
  return { week, joinUrl: `${cfg.publicUrl}/join/${week.club.slug}`, example: cfg.example };
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/** "Hannah, Tobi and Priya" */
const listNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? ""));

export default function HqRuns({ loaderData }: Route.ComponentProps) {
  const { week, joinUrl, example } = loaderData;
  const toast = useToast();
  const people = usePeople();
  const [checkin, setCheckin] = useState(false);
  const closeCheckin = useCallback(() => setCheckin(false), []);
  const { focus } = week;
  const asked = listNames(focus.askIds.map((id) => firstName(people[id]?.name ?? "")));
  const open = focus.crew.some((c) => !c.confirmed);

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Club HQ · {week.weekOf}</span>
          <h1 className="disp" style={{ marginTop: 12 }}>Runs and <span className="b">check-in</span></h1>
          <p>Check-ins are what earn the turnout bonus, so every run gets a live code that only works on the spot.</p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-q" onClick={() => toast("New run: pick a day, a route and a run leader")}><Icon name="plus" />Add a run</button>
          <button type="button" className="btn btn-p" id="ciStart" onClick={() => setCheckin(true)}><Icon name="qr" />Start check-in</button>
        </div>
      </div>

      <div className="sched">
        {week.days.map((d) => (
          <div key={d.day} className={`day${d.today ? " today" : ""}`}>
            <h4>{d.day}<b>{d.date}</b></h4>
            {d.runs.map((e) => (
              <button key={e.time + e.title} type="button" className={`ev${e.walk ? " walk" : ""}`} onClick={() => toast(`${e.title}: run leader, back marker and route are set`)}>
                <b>{e.time} {e.title}</b>
                <span>{e.line}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="g g2 mt">
        <div className="card">
          <div className="hd"><h3>{focus.title}</h3><span className={`pill ${open ? "warn" : "blue"}`}>{focus.badge}</span></div>
          {focus.crew.map((c) => (
            <div className="row" key={c.title}>
              {c.personId ? (
                <Avatar id={c.personId} />
              ) : (
                <span className="av" style={{ display: "grid", placeItems: "center", background: "var(--surface-2)" }}><Icon name="plus" /></span>
              )}
              <div className="t"><b>{c.title}</b><span>{c.line}</span></div>
              {c.confirmed ? (
                <span className="pill blue">Confirmed</span>
              ) : (
                <button type="button" className="btn btn-q btn-s" onClick={() => toast(`Asked ${asked}`)}>Ask {WORDS[focus.askIds.length] ?? focus.askIds.length} people</button>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <div className="hd"><h3>Last {week.lastRuns.length} runs</h3><span className="muted" style={{ fontSize: 12 }}>Checked in</span></div>
          <Bars values={week.lastRuns.map((r) => r.checkedIn)} w={420} h={190} labels={week.lastRuns.map((r) => r.label)} hi={week.lastRuns.length - 1} fmtY={(v) => String(Math.round(v))} label={`People checked in at the last ${week.lastRuns.length} runs`} />
        </div>
      </div>

      {checkin && <CheckinOverlay run={week.checkin} joinUrl={joinUrl} simulate={example} onClose={closeCheckin} />}
    </>
  );
}
