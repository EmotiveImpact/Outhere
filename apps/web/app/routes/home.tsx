import { useState } from "react";
import { Link } from "react-router";
import { formatNumber, type BoroughMetric } from "@outhere/core";
import { Avatar, Bars, BoroughMap, Countdown, DateBox, Faces, Icon, Seg, useLiveScore, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import { RevealOverlay } from "~/components/reveal";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [{ title: "Home · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const [home, steps, clubs] = await Promise.all([db.home(), db.boroughs("steps"), db.boroughs("clubs")]);
  return { home, maps: { steps, clubs } };
}

function Activity({ personId, html, ago }: { personId: string; html: string; ago: string }) {
  return (
    <div className="row">
      <Avatar id={personId} />
      <div className="t"><b dangerouslySetInnerHTML={{ __html: html }} /></div>
      <time>{ago}</time>
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { home, maps } = loaderData;
  const { derby, callup, nextRun } = home;
  const toast = useToast();
  const { act } = useAct();
  const [metric, setMetric] = useState<BoroughMetric>("steps");
  const [reveal, setReveal] = useState(false);
  const L = useLiveScore(derby.home.score, 9);
  const R = useLiveScore(derby.away.score, 8);
  const total = L + R;

  return (
    <>
      <section className="slab" style={{ minHeight: 420 }}>
        <img className="bg" src="/img/derby.jpg" alt="Peckham Pacers and Brixton Sunrise lined up on a wet street at night" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill glass"><i className="dot pulse" />Club derby · live</span>
          <span className="pill glass">{derby.division} · {derby.week}</span>
        </div>
        <h1 className="disp" style={{ fontSize: "clamp(52px,7vw,104px)", marginTop: 16 }}>
          {derby.home.short} <span className="b">v</span><br />{derby.away.short}
        </h1>
        <div className="score">
          <div>
            <div className="who2"><img className="av s" src={derby.home.crest} alt="" />{derby.home.name}</div>
            <div className="n tab" id="dL">{formatNumber(L)}</div>
          </div>
          <div className="vs">VS</div>
          <div className="r">
            <div className="who2">{derby.away.name}<img className="av s" src={derby.away.crest} alt="" /></div>
            <div className="n tab" id="dR">{formatNumber(R)}</div>
          </div>
        </div>
        <div style={{ maxWidth: 640, marginTop: 14 }}>
          <div className="bar">
            <i className="us" style={{ width: `${((L / total) * 99).toFixed(1)}%` }} />
            <i className="them" style={{ width: `${((R / total) * 99).toFixed(1)}%` }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <span className="clock">REVEAL SUN 20:00 · <Countdown to={home.reveal.at} /></span>
          <button type="button" className="btn btn-g btn-s" onClick={() => setReveal(true)}><Icon name="spark" />Preview Sunday's reveal</button>
        </div>
      </section>

      <div className="g g3 mt">
        <div className="callup">
          <img src="/img/hill.jpg" alt="" />
          <div>
            <span className="pill blue">You've been called up</span>
            <h3 className="disp" style={{ fontSize: 38, marginTop: 14 }}>{callup.match.split(" v ")[0]} v<br />{callup.match.split(" v ")[1]}</h3>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{callup.league}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div><div className="mono muted">Squad no.</div><div className="no">#{callup.squadNumber}</div></div>
            <div style={{ textAlign: "right" }}><div className="mono muted">Your average</div><div className="disp tab" style={{ fontSize: 34 }}>{formatNumber(callup.average)}</div></div>
          </div>
        </div>
        <div className="card">
          <div className="hd"><h3>Your week</h3><span className="pill blue">{formatNumber(home.weekCounted)} counted</span></div>
          <Bars values={home.week} w={380} h={190} labels={["M", "T", "W", "T", "F", "S", "S"]} hi={5} max={16000} cap={10000} fmtY={(v) => `${Math.round(v / 1000)}k`} label="Steps each day this week" />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Full rate to 10k a day, half rate to 20k.</p>
        </div>
        <div className="card">
          <div className="hd"><h3>Next club run</h3><Link className="btn btn-q btn-s" to="/peckhampacers">Club page</Link></div>
          <div className="nextrun">
            <DateBox day={nextRun.day} date={nextRun.date} />
            <div>
              <h3>{nextRun.title}, all paces</h3>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{nextRun.time} {nextRun.place}. Three groups, back marker on each.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 10 }}>
            <Faces ids={nextRun.goingIds} more={nextRun.going - nextRun.goingIds.length} />
            <button
              type="button"
              id="rsvp"
              className={`btn btn-s ${nextRun.imGoing ? "btn-q" : "btn-p"}`}
              aria-pressed={nextRun.imGoing}
              onClick={() => {
                act({ intent: "rsvp", runId: nextRun.id, going: !nextRun.imGoing });
                if (!nextRun.imGoing) toast("See you Tuesday. Your run leader is Zain.");
              }}
            >
              {nextRun.imGoing ? "Going ✓" : "I'm going"}
            </button>
          </div>
        </div>
      </div>

      <div className="g g-73 mt">
        <div className="card">
          <div className="hd">
            <div><span className="kick">Borough league</span><h3 style={{ marginTop: 8 }}>{home.boroughLine}</h3></div>
            <Seg id="bm" options={[["steps", "Steps a day"], ["clubs", "Clubs"]] as const} value={metric} onChange={setMetric} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 22, alignItems: "center" }} className="bwrap">
            <BoroughMap stats={maps[metric]} metric={metric} home="Southwark" />
            <div>
              <table>
                <tbody>
                  {home.boroughTable.map((r, i) => (
                    <tr key={r.name} className={r.me ? "me" : ""}>
                      <td className="tab muted">{i + 1}</td>
                      <td><b>{r.name}</b></td>
                      <td className="num">{formatNumber(r.steps)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Every walker counts for their borough, in a club or not.</p>
            </div>
          </div>
        </div>
        <div className="card feed">
          <div className="hd"><h3>From your club</h3><span className="pill">Peckham Pacers</span></div>
          {home.clubActivity.map((a) => <Activity key={a.html} {...a} />)}
        </div>
      </div>
      {reveal && <RevealOverlay onClose={() => setReveal(false)} away={{ name: derby.away.name, crest: derby.away.crest, score: 12826 }} />}
    </>
  );
}
