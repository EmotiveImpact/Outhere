import { useState } from "react";
import { Link } from "react-router";
import type { AuditEntry } from "@outhere/core";
import { ChipPick, useToast } from "@outhere/ui";
import { getData } from "../data";
import { useLoad } from "../load";
import { downloadAudit } from "../util";

/** Saves the whole log as CSV and says so. */
function useExport() {
  const toast = useToast();
  return async () => {
    try {
      downloadAudit(await getData().audit());
      toast("Log exported");
    } catch {
      toast("Couldn't export the log. Try again in a moment.");
    }
  };
}

/*
 * Rows are keyed by position as well as id: the log is append-only and shown
 * newest first, and ids are not guaranteed unique across seeded and new entries.
 */

/** The latest few entries, as on the overview. */
export function AuditCard({ entries }: { entries: AuditEntry[] }) {
  const exportLog = useExport();
  return (
    <div className="card log">
      <div className="hd">
        <h3>Audit log</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <Link className="btn btn-q btn-s" to="/audit">
            See all
          </Link>
          <button className="btn btn-q btn-s" type="button" onClick={exportLog}>
            Export
          </button>
        </div>
      </div>
      {entries.map((e, i) => (
        <div className="row" key={`${i}-${e.id}`}>
          <div className="t">
            <b style={{ fontWeight: 500 }}>
              {e.actor} {e.action} <code>{e.target}</code>
            </b>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {e.at}
          </span>
        </div>
      ))}
    </div>
  );
}

const WHO = ["All", "Staff", "System"] as const;
type Who = (typeof WHO)[number];

/** Every staff and system action, newest first. */
export function AuditLog() {
  const exportLog = useExport();
  const [who, setWho] = useState<Who>("All");
  const { data } = useLoad((db) => db.audit());
  if (!data) return null;
  const rows = data.filter((e) => who === "All" || (who === "System") === (e.actor === "system"));

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Outhere HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>
            Audit <span className="b">log</span>
          </h1>
          <p>Every staff action and every automatic job, newest first. Nothing here can be edited or deleted.</p>
        </div>
        <div className="acts">
          <button className="btn btn-q" type="button" onClick={exportLog}>
            Export
          </button>
        </div>
      </div>
      <div className="card log">
        <div className="hd">
          <h3>
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </h3>
          <ChipPick options={[...WHO]} value={who} onChange={(v) => setWho(v as Who)} />
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={`${i}-${e.id}`}>
                  <td className="tab muted">{e.at}</td>
                  <td>
                    <b>{e.actor}</b>
                  </td>
                  <td>{e.action}</td>
                  <td>
                    <code style={{ font: "500 12px var(--mono)" }}>{e.target}</code>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Nothing logged yet.
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
