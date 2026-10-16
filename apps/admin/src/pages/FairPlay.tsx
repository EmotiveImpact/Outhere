import { useState } from "react";
import type { FairPlayFlag } from "@outhere/core";
import { ChipPick, CityPicker, Kpi, Spark, useToast } from "@outhere/ui";
import { useAct, useLoad } from "../load";

const FILTERS = ["All", "High", "In a live squad"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Whether the walker is in a squad that is playing this week, so their OUT is
 * on hold. Flags only exist for walkers who are drawn, so a flag without the
 * field counts as live.
 */
const inLiveSquad = (f: FairPlayFlag): boolean => (f as FairPlayFlag & { liveSquad?: boolean }).liveSquad ?? true;

const FADE_MS = 300;

export function FairPlay() {
  const act = useAct();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("All");
  const [city, setCity] = useState("uk");
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const { data } = useLoad(async (db) => {
    const [fair, cities] = await Promise.all([db.fairPlay(), db.cities()]);
    return { ...fair, cities };
  });
  if (!data) return null;

  const cityName = data.cities.find((c) => c.id === city)?.name;
  const cities = data.cities.filter((c) => data.flags.some((f) => f.city === c.name));
  const rows = data.flags
    .filter((f) => !cityName || f.city === cityName)
    .filter((f) => (filter === "High" ? f.severity === "High" : filter === "In a live squad" ? inLiveSquad(f) : true));

  /** Fades the row out like the mockup, then writes and reloads. */
  const decide = (id: string, write: "clear" | "remove", message: string) => {
    if (leaving.has(id)) return;
    setLeaving((s) => new Set(s).add(id));
    toast(message);
    setTimeout(() => {
      void act((db) => (write === "clear" ? db.clearFlag(id) : db.removeFromSquad(id))).then(() =>
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      );
    }, FADE_MS);
  };

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Outhere HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>
            Fair <span className="b">play</span>
          </h1>
          <p>
            Flags come from step patterns, phone sensors and trust level. Nobody loses anything automatically: OUT waits 24 hours and a person makes the call.
          </p>
        </div>
      </div>
      <div className="g g4">
        {data.kpis.map((k) => (
          <Kpi key={k.label} kpi={k} />
        ))}
      </div>
      <div className="card mt">
        <div className="hd">
          <h3>Open flags</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {cities.length > 1 && <CityPicker id="fcity" cities={cities} value={city} onChange={setCity} allUk="All cities" />}
            <ChipPick options={[...FILTERS]} value={filter} onChange={(v) => setFilter(v as Filter)} />
          </div>
        </div>
        <div className="tw">
          <table className="flag">
            <thead>
              <tr>
                <th>Walker</th>
                <th>City</th>
                <th>Why</th>
                <th>Steps, last 14 days</th>
                <th>Trust</th>
                <th />
              </tr>
            </thead>
            <tbody id="ftb">
              {rows.map((f) => {
                const colour = f.severity === "High" ? "#ff4d55" : "#f2b441";
                return (
                  <tr key={f.id} data-flag={f.id} style={{ transition: `opacity ${FADE_MS}ms`, opacity: leaving.has(f.id) ? 0 : 1 }}>
                    <td>
                      <code style={{ font: "500 12px var(--mono)" }}>user {f.user}</code>
                    </td>
                    <td className="muted">{f.city}</td>
                    <td>
                      <span className={`pill ${f.severity === "High" ? "red" : "warn"}`}>{f.severity}</span> <span style={{ marginLeft: 6 }}>{f.reason}</span>
                    </td>
                    <td style={{ color: colour }}>
                      <Spark values={f.steps} w={110} h={28} colour={colour} />
                    </td>
                    <td>{f.trust}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-q btn-s" type="button" disabled={leaving.has(f.id)} onClick={() => decide(f.id, "clear", "Flag cleared. OUT released.")}>
                          Clear
                        </button>
                        <button
                          className="btn btn-q btn-s"
                          type="button"
                          disabled={leaving.has(f.id)}
                          onClick={() => decide(f.id, "remove", "Removed from this week's squad. The walker is told why and can appeal.")}
                        >
                          Remove from squad
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    {data.flags.length === 0 ? "No open flags. Every OUT on hold has been decided." : "No flags match this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
