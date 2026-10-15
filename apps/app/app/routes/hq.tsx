import { useCallback, useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { canSeeClubHq } from "@outhere/core";
import { Bars, Form, Icon, Kpi, QR, useToast } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { CheckinOverlay } from "~/components/checkin";
import type { Route } from "./+types/hq";

export const meta: Route.MetaFunction = () => [{ title: "Club HQ · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  if (!canSeeClubHq(viewer)) throw redirect("/");
  const hq = await db.clubHq(viewer.homeClubId);
  const cfg = config();
  return { hq, joinUrl: `${cfg.publicUrl}/join/${hq.club.slug}`, example: cfg.example };
}

export default function Hq({ loaderData }: Route.ComponentProps) {
  const { hq, joinUrl, example } = loaderData;
  const { club } = hq;
  const toast = useToast();
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(false);
  const closeCheckin = useCallback(() => setCheckin(false), []);

  return (
    <>
      <div className="ph">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <img src={club.crest} alt="" style={{ width: 74, height: 74, borderRadius: 20 }} />
          <div>
            <span className="kick">Club HQ</span>
            <h1 className="disp" style={{ marginTop: 8 }}>{club.nameTop} <span className="b">{club.nameBottom}</span></h1>
          </div>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-q" onClick={() => navigate("/hq/kit")}><Icon name="qr" />Print a poster</button>
          <button type="button" className="btn btn-p" id="ciStart" onClick={() => setCheckin(true)}><Icon name="qr" />Start check-in</button>
        </div>
      </div>

      <div className="g g4">
        {hq.kpis.map((k) => <Kpi key={k.label} kpi={k} />)}
      </div>

      <div className="g g-73 mt">
        <div className="card">
          <div className="hd">
            <div>
              <h3>Run turnout, last {hq.turnout.length} weeks</h3>
              <p className="muted" style={{ fontSize: 12.5 }}>Share of active members who came to at least one club run</p>
            </div>
            <span className="pill blue">Best in {club.borough}</span>
          </div>
          <Bars values={hq.turnout} h={210} labels={hq.turnoutLabels} hi={hq.turnout.length - 1} max={80} fmtY={(v) => `${Math.round(v)}%`} label={`Run turnout each week for the last ${hq.turnout.length} weeks`} />
        </div>
        <div className="card">
          <div className="hd"><h3>Tonight's check-in</h3><span className="pill"><i className="dot" />{hq.checkin.opens}</span></div>
          <div className="qrlive">
            <div className="qrbox"><QR text={joinUrl} label={`Join ${club.name}`} /></div>
            <div>
              <b style={{ fontSize: 15 }}>{hq.checkin.title}</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{hq.checkin.line}</p>
              <button type="button" className="btn btn-p btn-s mt" id="ciStart2" onClick={() => setCheckin(true)}>Open full screen</button>
            </div>
          </div>
        </div>
      </div>

      <div className="g g2 mt">
        <div className="card needs">
          <div className="hd"><h3>Needs you</h3><span className="pill warn">{hq.needs.length}</span></div>
          {hq.needs.map((n) => (
            <div className="row" key={n.title}>
              <span className={`ic${n.tone === "warn" ? " w" : n.tone === "alert" ? " r" : ""}`}><Icon name={n.icon} /></span>
              <div className="t"><b>{n.title}</b><span>{n.line}</span></div>
              {n.href ? (
                <Link className="btn btn-q btn-s" to={n.href}>{n.action}</Link>
              ) : (
                <button type="button" className="btn btn-q btn-s" onClick={() => n.toast && toast(n.toast)}>{n.action}</button>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <div className="hd"><h3>{hq.league}</h3><Link className="btn btn-q btn-s" to="/league">Full table</Link></div>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>Club</th><th className="num">Turnout</th><th className="num">Pts</th><th>Form</th></tr></thead>
              <tbody>
                {hq.table.map((r, i) => (
                  <tr key={r.club.id} className={r.club.id === club.id ? "me" : ""}>
                    <td className="tab muted">{i + 1}</td>
                    <td><span className="who"><img className="crest" src={r.club.crest} alt="" />{r.club.name}</span></td>
                    <td className="num">{r.turnout}%</td>
                    <td className="num"><b>{r.points}</b></td>
                    <td><Form form={r.form} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {checkin && <CheckinOverlay run={hq.checkin} joinUrl={joinUrl} simulate={example} onClose={closeCheckin} />}
    </>
  );
}
