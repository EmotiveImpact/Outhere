import { Link, useNavigation, useSearchParams } from "react-router";
import { formatNumber, type Club, type ClubFilter, type ClubSort } from "@outhere/core";
import { BoroughMap, Icon, Seg, Tick, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import type { Route } from "./+types/clubs";

export const meta: Route.MetaFunction = () => [
  { title: "Find clubs · Outhere" },
  { name: "description", content: "Every verified run and walk club in London, by borough. Turn up as a guest and join when it feels right." },
];

const FILTERS: ClubFilter[] = ["morn", "eve", "night", "wkd", "beg", "walk", "women"];
const SORTS: ClubSort[] = ["closest", "biggest", "newest"];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const borough = url.searchParams.get("b");
  const filters = url.searchParams.getAll("f").filter((f): f is ClubFilter => (FILTERS as string[]).includes(f));
  const sortParam = url.searchParams.get("s");
  const sort: ClubSort = (SORTS as string[]).includes(sortParam ?? "") ? (sortParam as ClubSort) : "closest";
  const db = await getData(request);
  const [list, all, map, viewer] = await Promise.all([db.clubs({ q, borough, filters, sort }), db.clubs(), db.boroughs("clubs"), db.viewer()]);
  return { list, total: all.length, inLondon: map.reduce((n, b) => n + b.value, 0), map, home: viewer.borough, q, borough, filters, sort };
}

function ClubCard({ c }: { c: Club }) {
  return (
    <Link className="cc" to={`/${c.slug}`}>
      <div className="im">
        <img src={c.cover} alt="" loading="lazy" />
        {c.founding ? <span className="pill warn">Founding club</span> : <span className="pill glass">{c.division}</span>}
      </div>
      <div className="bd">
        <img className="cr" src={c.crest} alt="" />
        <h3>{c.name}{c.verified && <Tick />}</h3>
        <div className="meta">{c.borough} · {formatNumber(c.members)} members</div>
        <div className="nx"><Icon name="clock" />{c.nextRun}</div>
        <div className="tg">{c.tags.map((t) => <span key={t}>{t}</span>)}</div>
      </div>
    </Link>
  );
}

function FilterChip({ k, on, toggle, children }: { k: ClubFilter; on: boolean; toggle: (k: ClubFilter) => void; children: React.ReactNode }) {
  return <button type="button" data-t={k} aria-pressed={on} onClick={() => toggle(k)}>{children}</button>;
}

export default function Clubs({ loaderData }: Route.ComponentProps) {
  const { list, total, inLondon, map, home, q, borough, filters, sort } = loaderData;
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const busy = useNavigation().state === "loading";

  function update(fn: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    fn(next);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  const setBorough = (b: string | null) => update((p) => (b ? p.set("b", b) : p.delete("b")));
  const toggle = (k: ClubFilter) =>
    update((p) => {
      const cur = p.getAll("f");
      p.delete("f");
      (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]).forEach((f) => p.append("f", f));
    });
  const has = (k: ClubFilter) => filters.includes(k);

  const heading = borough ? (
    <>{borough} <span className="b">· {list.length}</span></>
  ) : list.length === total ? (
    <>All <span className="b">clubs</span></>
  ) : (
    <>{list.length} <span className="b">clubs</span></>
  );

  return (
    <>
      <section className="slab" style={{ minHeight: 360 }}>
        <img className="bg" src="/_app/img/clubfind.jpg" alt="A run club heading into the mist at dawn" />
        <span className="kick">{inLondon} clubs across 32 boroughs</span>
        <h1 className="disp" style={{ fontSize: "clamp(56px,8vw,118px)", marginTop: 12 }}>Find your<br /><span className="b">people</span></h1>
        <p style={{ color: "#dfe5ee", maxWidth: "46ch", marginTop: 12 }}>Every verified club in London has its own page. Find one near you, turn up as a guest, and join when it feels right.</p>
        <form className="search" style={{ maxWidth: 620, marginTop: 20 }} onSubmit={(e) => e.preventDefault()} role="search">
          <Icon name="search" />
          <input id="q" placeholder="Search a club, a borough or a park" aria-label="Search clubs" defaultValue={q} onChange={(e) => update((p) => (e.target.value ? p.set("q", e.target.value) : p.delete("q")))} />
          <button
            type="button"
            className="btn btn-p"
            id="nearme"
            onClick={() => {
              setBorough(home);
              toast(`Showing clubs in ${home}`);
            }}
          >
            <Icon name="pin" />Near me
          </button>
        </form>
      </section>
      <div className="g g-37 mt">
        <div className="card">
          <div className="hd"><h3>Clubs by borough</h3><span className="muted" style={{ fontSize: 12 }}>Tap a borough</span></div>
          <BoroughMap id="cmap" stats={map} metric="clubs" home={home} picked={borough} onPick={setBorough} />
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Brighter means more clubs. Quiet boroughs are where founding clubs make the most noise.</p>
        </div>
        <div className="card">
          <div className="hd">
            <h3>What are you after?</h3>
            <button
              type="button"
              className="btn btn-q btn-s"
              id="clr"
              onClick={() => {
                const input = document.getElementById("q") as HTMLInputElement | null;
                if (input) input.value = "";
                setParams(sort === "closest" ? {} : { s: sort }, { replace: true, preventScrollReset: true });
              }}
            >
              Clear
            </button>
          </div>
          <div className="field">
            <label>When</label>
            <div className="chips" data-f="when">
              <FilterChip k="morn" on={has("morn")} toggle={toggle}><Icon name="sun" /> Mornings</FilterChip>
              <FilterChip k="eve" on={has("eve")} toggle={toggle}>Evenings</FilterChip>
              <FilterChip k="night" on={has("night")} toggle={toggle}><Icon name="moon" /> Late nights</FilterChip>
              <FilterChip k="wkd" on={has("wkd")} toggle={toggle}>Weekends</FilterChip>
            </div>
          </div>
          <div className="field mt">
            <label>Who for</label>
            <div className="chips" data-f="who">
              <FilterChip k="beg" on={has("beg")} toggle={toggle}>Beginners welcome</FilterChip>
              <FilterChip k="walk" on={has("walk")} toggle={toggle}><Icon name="walk" /> Walking</FilterChip>
              <FilterChip k="women" on={has("women")} toggle={toggle}>Women-led</FilterChip>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, padding: 14, borderRadius: 16, background: "var(--surface-2)" }}>
            <img src="/_app/img/3d-pin.jpg" alt="" className="obj" style={{ width: 64, borderRadius: 12 }} />
            <div>
              <b style={{ fontSize: 14 }}>Every club page has a QR code</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Seen a poster on a lamppost? Point your camera at it and you're on that club's page.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="sech">
        <h2 id="ccount">{heading}</h2>
        <Seg options={[["closest", "Closest"], ["biggest", "Biggest"], ["newest", "Newest"]] as const} value={sort} onChange={(s) => update((p) => (s === "closest" ? p.delete("s") : p.set("s", s)))} />
      </div>
      <div className="ccards" id="cgrid" aria-busy={busy}>
        {list.map((c) => <ClubCard key={c.id} c={c} />)}
        <div className="cc found">
          <img className="obj" src="/_app/img/founding.jpg" alt="" />
          <h3 style={{ font: "600 26px/1 var(--display)", textTransform: "uppercase" }}>No club near you?</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Start a founding club. Three meetups, six people at each, and it's official.</p>
          <button type="button" className="btn btn-p btn-s" style={{ marginTop: 14, alignSelf: "flex-start" }} onClick={() => toast("Founding club form opens in the app")}>Start one</button>
        </div>
      </div>
    </>
  );
}
