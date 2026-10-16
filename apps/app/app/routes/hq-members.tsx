import { useEffect, useRef, useState } from "react";
import { redirect, useNavigate } from "react-router";
import { canSeeClubHq, formatNumber, type JoinRequest } from "@outhere/core";
import { Avatar, ChipPick, Icon, Spark, usePeople, useReducedMotion, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/hq-members";

export const meta: Route.MetaFunction = () => [{ title: "Members · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  if (!canSeeClubHq(viewer)) throw redirect("/");
  return { view: await db.members(viewer.homeClubId) };
}

const FILTERS = ["Everyone", "Run leaders", "Not seen in 30 days"];

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function HqMembers({ loaderData }: Route.ComponentProps) {
  const { view } = loaderData;
  const { club } = view;
  const people = usePeople();
  const toast = useToast();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { act } = useAct();
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState(FILTERS[0]!);
  const [q, setQ] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const name = (id: string) => people[id]?.name ?? "Someone";
  const waiting = view.requests.filter((r) => !leaving.has(r.id)).length;

  const decide = (r: JoinRequest, approve: boolean) => {
    if (leaving.has(r.id)) return;
    setLeaving((s) => new Set(s).add(r.id));
    const nm = name(r.personId);
    toast(approve ? `${nm} is now a ${club.name.replace(/s$/, "")}` : `Declined. ${nm} can still come as a guest.`);
    timers.current.push(setTimeout(() => act({ intent: "join-decide", clubId: club.id, requestId: r.id, approve }), reduce ? 0 : 300));
  };

  const exportCsv = () => {
    const rows = [["Name", "Role"], ...view.members.map((m) => [name(m.personId), m.role])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${club.slug}-members.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("CSV downloaded (names and roles only)");
  };

  const needle = q.trim().toLowerCase();
  const shown = view.members.filter(
    (m) =>
      m.role !== "Guest" &&
      (filter !== "Run leaders" || m.role === "Run leader") &&
      (filter !== "Not seen in 30 days" || m.daysSinceRun > 30) &&
      (!needle || name(m.personId).toLowerCase().includes(needle)),
  );

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Club HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>{formatNumber(club.members)} <span className="b">members</span></h1>
          <p>Guests can come to two runs before they ask to join. Anyone with a hidden profile shows only as a first name here.</p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-q" onClick={exportCsv}><Icon name="down" />Export</button>
          <button type="button" className="btn btn-p" onClick={() => navigate("/hq/kit")}><Icon name="plus" />Invite people</button>
        </div>
      </div>

      <div className="card" style={{ borderColor: "rgba(79,155,255,.35)" }}>
        <div className="hd"><h3>Asking to join</h3><span className="pill blue" id="reqn">{waiting ? `${waiting} waiting` : "All done"}</span></div>
        <div className="g g3" id="reqs">
          {view.requests.map((r) => {
            const out = leaving.has(r.id);
            return (
              <div
                key={r.id}
                className="card flat rq"
                style={{ transition: "opacity .3s,transform .3s", ...(out ? { opacity: 0, transform: "scale(.96)", pointerEvents: "none" } : {}) }}
                aria-hidden={out || undefined}
              >
                <div className="rq-top">
                  <Avatar id={r.personId} size="l" />
                  <div className="rq-tx">
                    <b>{name(r.personId)}</b>
                    <div className="muted">{r.runs} runs as a guest · {r.pace} group</div>
                    <div className="muted">{r.foundVia}</div>
                  </div>
                </div>
                <div className="rq-acts">
                  <button type="button" className="btn btn-q btn-s" onClick={() => decide(r, false)}>Decline</button>
                  <button type="button" className="btn btn-p btn-s" onClick={() => decide(r, true)}>Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt">
        <div className="hd">
          <ChipPick options={FILTERS} value={filter} onChange={setFilter} />
          <div className="search" style={{ padding: "0 4px 0 12px", borderRadius: 12 }}>
            <Icon name="search" />
            <input placeholder="Search members" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "8px 0", fontSize: 13.5 }} />
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Pace group</th><th className="num">Runs this month</th><th>Trust</th><th>Last 8 weeks</th></tr></thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.personId}>
                  <td><span className="who"><Avatar id={m.personId} size="s" /><b>{name(m.personId)}</b></span></td>
                  <td>{m.role === "Member" ? <span className="muted">Member</span> : <span className="pill blue">{m.role}</span>}</td>
                  <td>{m.pace}</td>
                  <td className="num">{m.runsThisMonth}</td>
                  <td><span className="pill">{m.trust}</span></td>
                  <td style={{ color: "var(--blue)" }}><Spark values={m.weekly} w={100} h={24} /></td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={6} className="muted">{needle ? `Nobody called "${q.trim()}" here.` : filter === "Not seen in 30 days" ? "Everyone has been out in the last 30 days." : "Nobody here yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
