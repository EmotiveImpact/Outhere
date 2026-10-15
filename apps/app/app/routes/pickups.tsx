import { useState } from "react";
import { firstName, type Pickup, type PickupType } from "@outhere/core";
import { Avatar, ChipPick, Icon, Seg, usePeople, usePerson, useReducedMotion, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/pickups";

export const meta: Route.MetaFunction = () => [{ title: "Pick-ups · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const [pickups, viewer] = await Promise.all([db.pickups(), db.viewer()]);
  return { pickups, viewerId: viewer.id };
}

type Filter = "all" | PickupType;
const WHEN = ["In 30 min", "Tonight", "Tomorrow", "Weekend"];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Turns the "When" chip into the time line a pick-up card shows. */
function whenLine(pick: string): string {
  if (pick === "In 30 min") return `Today ${hhmm(new Date(Date.now() + 30 * 60000))}`;
  if (pick === "Tonight") return "Tonight 19:00";
  if (pick === "Tomorrow") return "Tomorrow 18:30";
  return "Saturday 09:00";
}

function PickupCard({ p, viewerId }: { p: Pickup; viewerId: string }) {
  const toast = useToast();
  const { act } = useAct();
  const host = usePerson(p.hostId);
  const people = usePeople();
  const open = p.openRace || p.openBattle;
  const n = p.goingIds.length + (p.imIn ? 1 : 0);
  const full = !!p.capacity && n >= p.capacity && !p.imIn;
  const parts = p.when.split(" ");
  const time = parts.slice(-1)[0];
  const day = parts.slice(0, -1).join(" ");

  function toggle() {
    act({ intent: "pickup-going", id: p.id, going: !p.imIn });
    if (p.imIn) toast("You've left. They'll be told.");
    else if (p.openBattle) toast("You're in. Every step until midnight counts.");
    else if (p.openRace) toast(`You're in. Be at ${p.at} five minutes early.`);
    else toast(`You're in. ${p.hostId ? firstName(host.name) : "They"} has been told you're coming.`);
  }

  return (
    <article className={`card pk${open ? " pkr" : ""}`}>
      <div className="pk-when"><b className="tab">{time}</b><span>{day}</span>{p.soon && <em>{p.soon}</em>}</div>
      <div className="pk-body">
        <div className="pk-top">
          {open ? (
            <span className={`pill ${p.openBattle ? "red" : "blue"}`}><Icon name="bolt" />{p.openBattle ? "Open battle" : "Open race"}</span>
          ) : (
            <>
              {p.hostId && <Avatar id={p.hostId} size="s" />}
              <span className="muted" style={{ fontSize: 12.5 }}>{p.hostId === viewerId ? "You're" : `${firstName(host.name)} is`} {p.type === "walk" ? "walking" : "running"}</span>
            </>
          )}
          {p.locals && <span className="pill">Outhere Locals · free coffee</span>}
        </div>
        <h3>{p.title}</h3>
        <div className="pk-meta">
          <span><Icon name="pin" />{p.at}</span>
          <span><Icon name={p.type === "walk" ? "walk" : "pulse"} />{p.pace}</span>
        </div>
        <div className="pk-ft">
          <div className="faces">
            {p.goingIds.slice(0, 4).map((k) => <img key={k} src={people[k]?.avatar} alt="" />)}
            {p.imIn && p.hostId !== viewerId && <img src={people[viewerId]?.avatar} alt="" />}
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>{n} going{p.capacity ? ` of ${p.capacity}` : ""}</span>
          <span className="sp" />
          <button type="button" className={`btn btn-s ${p.imIn ? "btn-q" : "btn-p"}`} disabled={full} onClick={toggle}>
            {p.imIn ? <><Icon name="check" />You're in</> : full ? "Full" : p.openBattle ? "Join the battle" : "Join"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Pickups({ loaderData }: Route.ComponentProps) {
  const { pickups, viewerId } = loaderData;
  const toast = useToast();
  const reduce = useReducedMotion();
  const { act } = useAct();
  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState<PickupType>("run");
  const [title, setTitle] = useState("");
  const [at, setAt] = useState("");
  const [when, setWhen] = useState(WHEN[0]!);
  const [vis, setVis] = useState("Anyone nearby");
  const shown = pickups.list.filter((p) => filter === "all" || p.type === filter);

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Pick-ups</span>
          <h1 className="disp" style={{ marginTop: 12 }}>Jump <span className="b">in</span></h1>
          <p>Open runs, walks and races near you that anyone can join. Heading out anyway? Post one and see who turns up.</p>
        </div>
        <a className="btn btn-p" href="#pkpost"><Icon name="plus" />Post a pick-up</a>
      </div>
      <div className="g pkgrid">
        <div>
          <div className="pkbar">
            <Seg id="pkseg" options={[["all", "All"], ["run", "Runs"], ["walk", "Walks"], ["race", "Races"]] as const} value={filter} onChange={setFilter} />
            <span className="muted" style={{ fontSize: 12.5 }}><Icon name="pin" />Near {pickups.area} · {pickups.radiusKm}km</span>
          </div>
          <div className="g" id="pklist">
            {shown.length ? shown.map((p) => <PickupCard key={p.id} p={p} viewerId={viewerId} />) : <p className="muted">Nothing like that nearby yet. Post one.</p>}
          </div>
        </div>
        <aside className="pkside">
          <div className="card pkmapc">
            <div className="hd"><h3>Out near you</h3><span className="pill blue"><i className="dot pulse" />{pickups.outNearby} out now</span></div>
            <svg className="pkmap" viewBox="0 0 300 200" aria-label={`Map of pick-ups near ${pickups.area}`}>
              <path className="pk-park" d="M34 40c30-14 70-10 84 8s-6 44-38 48-62-10-62-28 4-22 16-28z" />
              <path className="pk-park" d="M180 112c26-10 64-4 76 14s-6 38-36 40-58-8-58-26 6-22 18-28z" />
              <path className="pk-rd" d="M0 120C70 110 120 130 170 100S260 60 300 70" />
              <path className="pk-rd" d="M140 0c-6 50 4 100-10 200" />
              <path className="pk-rd t" d="M0 70c60 10 110-4 160 10s90 40 140 36" />
              <g className="pk-pin"><circle cx="78" cy="62" r="7" /><text x="78" y="44">Burgess Park</text></g>
              <g className="pk-pin r"><circle cx="214" cy="134" r="7" /><text x="214" y="116">Peckham Rye</text></g>
              <g className="pk-pin"><circle cx="120" cy="160" r="7" /><text x="120" y="186">Rye Lane</text></g>
              <circle className="pk-me" cx="150" cy="104" r="5" />
            </svg>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Pick-ups only ever meet at public places. Nobody sees where you live or where your runs start and end.</p>
          </div>
          <form
            className="card mt pkform"
            id="pkpost"
            onSubmit={(e) => {
              e.preventDefault();
              act({ intent: "pickup-post", type, title, at, when: whenLine(when), visibility: vis });
              setTitle("");
              setAt("");
              setFilter("all");
              toast("Posted. People near you can see it now.");
              window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
            }}
          >
            <div className="hd"><h3>Post a pick-up</h3></div>
            <label className="pkl">What</label>
            <Seg id="pkt" options={[["run", "Run"], ["walk", "Walk"], ["race", "Race"]] as const} value={type} onChange={setType} />
            <label className="pkl" htmlFor="pkn">Call it something</label>
            <input className="pkin" id="pkn" placeholder="Easy 5k after work" maxLength={48} value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="pkl" htmlFor="pkat">Meet at</label>
            <input className="pkin" id="pkat" placeholder="A park gate, a café, a station" maxLength={48} value={at} onChange={(e) => setAt(e.target.value)} />
            <label className="pkl">When</label>
            <ChipPick id="pkw" options={WHEN} value={when} onChange={setWhen} />
            <label className="pkl">Who can see it</label>
            <ChipPick id="pkv" options={["Anyone nearby", pickups.clubName, "People I follow"]} value={vis} onChange={setVis} />
            <button className="btn btn-p mt" style={{ width: "100%" }}><Icon name="send" />Post it</button>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Under 18s only see pick-ups from their own club.</p>
          </form>
        </aside>
      </div>
    </>
  );
}
