import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Area, Countdown, Icon, Kpi, Seg, useToast } from "@outhere/ui";
import { useLoad } from "../load";
import { AuditCard } from "./AuditLog";

const ICON: CSSProperties = { display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--blue-hi)" };
const ICON_ALERT: CSSProperties = { ...ICON, background: "rgba(255,77,85,.12)", color: "#ff8a90" };

export function Overview() {
  const toast = useToast();
  const [range, setRange] = useState<"30" | "season">("30");
  const { data } = useLoad((db) => db.adminOverview());
  if (!data) return null;

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Outhere HQ · staff only · every action is logged</span>
          <h1 className="disp" style={{ marginTop: 12 }}>
            Running <span className="b">Outhere</span>
          </h1>
        </div>
        <div className="acts">
          <span className="pill">
            <i className="dot pulse" />
            All systems normal
          </span>
        </div>
      </div>

      <div className="g g4">
        {data.kpis.map((k) => (
          <Kpi key={k.label} kpi={k} />
        ))}
      </div>

      <div className="g g-73 mt">
        <div className="card">
          <div className="hd">
            <h3>People moving each day</h3>
            <Seg options={[["30", "30 days"], ["season", "Season"]] as const} value={range} onChange={setRange} />
          </div>
          <Area values={data.daily} labels={data.dailyLabels} label="People moving each day" />
        </div>
        <div className="card">
          <div className="hd">
            <h3>This weekend</h3>
            <Link className="btn btn-q btn-s" to="/seasons">
              Open
            </Link>
          </div>
          {data.weekend.map((w) => (
            <div className="row" key={w.title}>
              <span className={`dot${w.state === "running" ? " pulse" : ""}`} style={w.state === "waiting" ? { background: "var(--ink-dim)" } : undefined} />
              <div className="t">
                <b>{w.title}</b>
                <span>
                  {w.line}
                  {/reveal/i.test(w.title) && (
                    <>
                      {" · "}
                      <Countdown to={data.reveal.at} />
                    </>
                  )}
                </span>
              </div>
              {w.state === "done" && (
                <span className="pill blue">
                  <Icon name="check" />
                </span>
              )}
            </div>
          ))}
          <div className="health mt">
            {data.health.map((h) => (
              <div key={h.label}>
                <b>{h.value}</b>
                <span>{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="g g2 mt">
        <div className="card">
          <div className="hd">
            <h3>Waiting for you</h3>
          </div>
          {data.waiting.map((w) => {
            const inner = (
              <>
                <span className="av" style={w.tone === "alert" ? ICON_ALERT : ICON}>
                  <Icon name={w.icon} />
                </span>
                <div className="t">
                  <b>{w.title}</b>
                  <span>{w.line}</span>
                </div>
              </>
            );
            return w.href ? (
              <Link className="row" to={w.href} key={w.title}>
                {inner}
                <Icon name="chev" />
              </Link>
            ) : (
              <div className="row" key={w.title}>
                {inner}
                {w.action && (
                  <button className="btn btn-q btn-s" type="button" onClick={() => w.toast && toast(w.toast)}>
                    {w.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <AuditCard entries={data.audit} />
      </div>
    </>
  );
}
