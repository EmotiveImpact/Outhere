import { useCallback, useEffect, useState } from "react";
import { redirect } from "react-router";
import { canSeeClubHq, firstName } from "@outhere/core";
import { Avatar, Bars, Icon, Seg, usePeople, useToast } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { CheckinOverlay } from "~/components/checkin";
import { useAct } from "~/hooks";
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
  const [adding, setAdding] = useState(false);
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
          <button type="button" className="btn btn-q" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Icon name="plus" />Add a run</button>
          <button type="button" className="btn btn-p" id="ciStart" onClick={() => setCheckin(true)}><Icon name="qr" />Start check-in</button>
        </div>
      </div>

      {adding && <AddRun clubId={week.club.id} onDone={() => setAdding(false)} />}

      <div className="sched">
        {week.days.map((d) => (
          <div key={d.day} className={`day${d.today ? " today" : ""}`}>
            <h4>{d.day}<b>{d.date}</b></h4>
            {d.runs.map((e) => (
              <button key={e.time + e.title} type="button" className={`ev${e.walk ? " walk" : ""}`} onClick={() => toast(`${e.title}, ${e.time} · ${e.line}`)}>
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

/** Today in the UK as YYYY-MM-DD, for the date picker's lower bound. */
const ukToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

function AddRun({ clubId, onDone }: { clubId: string; onDone: () => void }) {
  const toast = useToast();
  const { act, result, state } = useAct();
  const [kind, setKind] = useState<"run" | "walk">("run");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(ukToday);
  const [time, setTime] = useState("19:00");
  const [place, setPlace] = useState("");
  const [detail, setDetail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent || state !== "idle" || !result) return;
    setSent(false);
    if (result.ok) {
      toast(`Added. It's on the club page and members can say they're coming.`);
      onDone();
    } else {
      toast(result.error === "BAD_TIME" ? "Pick a day and time that haven't passed yet." : "That didn't go through. Try again in a moment.");
    }
  }, [sent, state, result, toast, onDone]);

  return (
    <form
      className="card mt pkform"
      style={{ maxWidth: 560 }}
      onSubmit={(e) => {
        e.preventDefault();
        act({ intent: "run-create", run: { clubId, date, time, title, place, detail, walk: kind === "walk" } });
        setSent(true);
      }}
    >
      <div className="hd"><h3>Add a run</h3></div>
      <label className="pkl">What</label>
      <Seg options={[["run", "Run"], ["walk", "Walk"]] as const} value={kind} onChange={setKind} />
      <label className="pkl" htmlFor="arn">Call it something</label>
      <input className="pkin" id="arn" placeholder={kind === "walk" ? "Buggy walk" : "Rye Lane 5k"} maxLength={48} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="pkl" htmlFor="ard">Day</label>
          <input className="pkin" id="ard" type="date" required min={ukToday()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="pkl" htmlFor="art">Time</label>
          <input className="pkin" id="art" type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <label className="pkl" htmlFor="arp">Meet at</label>
      <input className="pkin" id="arp" required placeholder="A park gate, a café, a station" maxLength={60} value={place} onChange={(e) => setPlace(e.target.value)} />
      <label className="pkl" htmlFor="arx">Anything to know</label>
      <input className="pkin" id="arx" placeholder="All paces · three groups" maxLength={80} value={detail} onChange={(e) => setDetail(e.target.value)} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-p" disabled={state !== "idle"}><Icon name="plus" />Add it</button>
        <button type="button" className="btn btn-q" onClick={onDone}>Cancel</button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Meet somewhere public, never at someone's home.</p>
    </form>
  );
}
