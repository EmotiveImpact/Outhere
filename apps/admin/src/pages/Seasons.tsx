import { Countdown, Toggle, useToast } from "@outhere/ui";
import { useAct, useLoad } from "../load";
import { signature } from "../util";

export function Seasons() {
  const toast = useToast();
  const act = useAct();
  const { data } = useLoad(async (db) => {
    const [view, viewer] = await Promise.all([db.seasons(), db.viewer()]);
    return { ...view, me: signature(viewer) };
  });
  if (!data) return null;

  const weeks = Array.from({ length: data.weeks }, (_, i) => i + 1);

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Outhere HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>
            Seasons and <span className="b">draws</span>
          </h1>
          <p>Squads are drawn at random from eligible walkers every Friday at 18:00. The seed is published, so anyone can check a draw was fair.</p>
        </div>
        <div className="acts">
          <button className="btn btn-q" type="button" onClick={() => toast("Dry run: 14 cities, 212 clubs, 0 problems")}>
            Dry run next draw
          </button>
        </div>
      </div>
      <div className="g g-73">
        <div className="card">
          <div className="hd">
            <h3>{data.season}</h3>
            <span className="pill blue">
              Week {data.currentWeek} of {data.weeks}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.weeks},1fr)`, gap: 6 }}>
            {weeks.map((w) => {
              const done = w < data.currentWeek;
              const live = w === data.currentWeek;
              return (
                <div
                  key={w}
                  style={{
                    borderRadius: 12,
                    padding: "12px 10px",
                    background: done ? "rgba(79,155,255,.14)" : live ? "linear-gradient(180deg,#3a7bff,#2a6af0)" : "var(--surface-2)",
                    textAlign: "center",
                  }}
                >
                  <b className="disp" style={{ fontSize: 28 }}>
                    W{w}
                  </b>
                  <div style={{ fontSize: 11, color: live ? "#fff" : "var(--ink-muted)" }}>{done ? "Done" : live ? "Live" : "To come"}</div>
                </div>
              );
            })}
          </div>
          <div className="tw mt">
            <table>
              <thead>
                <tr>
                  <th>Draw</th>
                  <th>When</th>
                  <th>Seed</th>
                  <th className="num">Squads</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.draws.map((d) => (
                  <tr key={d.week}>
                    <td>
                      <b>{d.week}</b>
                    </td>
                    <td>{d.at}</td>
                    <td>
                      <code style={{ font: "500 12px var(--mono)" }}>{d.seed}</code>
                    </td>
                    <td className="num">{d.squads}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-q btn-s" type="button" onClick={() => toast(`Re-ran ${d.week}: identical squads`)}>
                        Re-run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <img className="obj" src="/_app/img/3d-dial.jpg" alt="" style={{ width: 150, margin: "-6px auto 0", display: "block" }} />
          <h3 style={{ textAlign: "center", marginTop: 4 }}>Sunday reveal</h3>
          <div className="disp tab" style={{ textAlign: "center", fontSize: 44, marginTop: 8 }}>
            <Countdown to={data.reveal.at} />
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: 12.5, marginTop: 8 }}>
            {data.revealHeld ? "Held. Nothing unlocks until staff release it." : "Every result unlocks at 20:00 for everyone at once."}
          </p>
          <div className="row mt">
            <div className="t">
              <b>Hold the reveal</b>
              <span>Only if scores are wrong. Needs two staff.</span>
            </div>
            <Toggle
              on={data.revealHeld}
              label="Hold the reveal"
              onChange={(held) =>
                act((db) => db.setRevealHeld(held), held ? `Sunday reveal held. Logged as ${data.me}` : `Sunday reveal released. Logged as ${data.me}`)
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
