import { Link, useNavigation, useSearchParams } from "react-router";
import { formatNumber, type BoroughStat, type City, type Club, type ClubFilter, type ClubSort } from "@outhere/core";
import { BoroughMap, CityPicker, Icon, Seg, Tick, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import type { Route } from "./+types/clubs";

export const meta: Route.MetaFunction = () => [
  { title: "Find clubs · Outhere" },
  { name: "description", content: "Every verified run and walk club in the UK, by city. Turn up as a guest and join when it feels right." },
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
  const [viewer, cities] = await Promise.all([db.viewer(), db.cities()]);
  // ?c=uk shows clubs anywhere; no c means the viewer's own city.
  const c = url.searchParams.get("c");
  const city = c === "uk" ? null : (cities.find((x) => x.id === (c ?? viewer.cityId)) ?? null);
  const cityId = city?.id ?? null;
  const [list, all, map] = await Promise.all([
    db.clubs({ city: cityId, q, borough, filters, sort }),
    db.clubs({ city: cityId }),
    city ? db.boroughs("clubs", city.id) : Promise.resolve([] as BoroughStat[]),
  ]);
  return {
    list, total: all.length, map, cities, city, q, borough, filters, sort,
    home: { cityId: viewer.cityId, borough: viewer.borough },
    ukClubs: cities.reduce((n, x) => n + x.clubs, 0),
  };
}

/** Areas of a city without a tile map, or cities when looking at the whole UK. */
function PlaceList({ items, picked, onPick }: { items: { key: string; name: string; n: number }[]; picked: string | null; onPick: (key: string | null) => void }) {
  return (
    <div className="arealist">
      {items.map((x) => (
        <button key={x.key} type="button" aria-pressed={x.key === picked} onClick={() => onPick(x.key === picked ? null : x.key)}>
          <b>{x.name}</b><span>{x.n}</span>
        </button>
      ))}
    </div>
  );
}

function placesCard(city: City | null) {
  if (!city) return { title: "Clubs by city", hint: "Pick a city" };
  return { title: `Clubs by ${city.areaWord}`, hint: city.hasMap ? `Tap a ${city.areaWord}` : `Pick an ${city.areaWord}` };
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
        <div className="meta">{[c.borough, c.city].filter(Boolean).join(", ")} · {formatNumber(c.members)} members</div>
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
  const { list, total, map, cities, city, q, borough, filters, sort, home, ukClubs } = loaderData;
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const busy = useNavigation().state === "loading";

  function update(fn: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    fn(next);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  const setBorough = (b: string | null) => update((p) => (b ? p.set("b", b) : p.delete("b")));
  const setCity = (id: string) =>
    update((p) => {
      p.delete("b");
      if (id === home.cityId) p.delete("c");
      else p.set("c", id);
    });
  const card = placesCard(city);
  const homeCity = cities.find((x) => x.id === home.cityId);
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
    <>{city ? <>{city.name} </> : <>All </>}<span className="b">clubs</span></>
  ) : (
    <>{list.length} <span className="b">clubs</span></>
  );

  return (
    <>
      <section className="slab" style={{ minHeight: 360 }}>
        <img className="bg" src="/_app/img/clubfind.jpg" alt="A run club heading into the mist at dawn" />
        <span className="kick">{city ? `${formatNumber(city.clubs)} clubs in ${city.name}` : `${formatNumber(ukClubs)} clubs across the UK`}</span>
        <h1 className="disp" style={{ fontSize: "clamp(56px,8vw,118px)", marginTop: 12 }}>Find your<br /><span className="b">people</span></h1>
        <p style={{ color: "#dfe5ee", maxWidth: "46ch", marginTop: 12 }}>Every verified club in the UK has its own page. Find one near you, turn up as a guest, and join when it feels right.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 20 }}>
          <CityPicker id="cpick" cities={cities} value={city?.id ?? "uk"} onChange={(id) => (id === "uk" ? update((p) => { p.delete("b"); p.set("c", "uk"); }) : setCity(id))} allUk />
        </div>
        <form className="search" style={{ maxWidth: 620, marginTop: 12 }} onSubmit={(e) => e.preventDefault()} role="search">
          <Icon name="search" />
          <input id="q" placeholder={city ? `Search a club, ${city.areaWord === "area" ? "an area" : "a borough"} or a park` : "Search a club, a city or a park"} aria-label="Search clubs" defaultValue={q} onChange={(e) => update((p) => (e.target.value ? p.set("q", e.target.value) : p.delete("q")))} />
          <button
            type="button"
            className="btn btn-p"
            id="nearme"
            onClick={() => {
              update((p) => {
                p.delete("c");
                if (home.borough) p.set("b", home.borough);
                else p.delete("b");
              });
              toast(`Showing clubs in ${home.borough || homeCity?.name || "your city"}`);
            }}
          >
            <Icon name="pin" />Near me
          </button>
        </form>
      </section>
      <div className="g g-37 mt">
        <div className="card">
          <div className="hd"><h3>{card.title}</h3><span className="muted" style={{ fontSize: 12 }}>{card.hint}</span></div>
          {city?.hasMap ? (
            <>
              <BoroughMap id="cmap" stats={map} metric="clubs" home={city.id === home.cityId ? home.borough : undefined} picked={borough} onPick={setBorough} />
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Brighter means more clubs. Quiet {city.areaWord}s are where founding clubs make the most noise.</p>
            </>
          ) : city ? (
            map.length ? (
              <PlaceList items={[...map].sort((a, b) => b.value - a.value).map((b) => ({ key: b.name, name: b.name, n: b.value }))} picked={borough} onPick={setBorough} />
            ) : (
              <p className="muted" style={{ fontSize: 13 }}>No clubs in {city.name} yet. Start a founding club and it'll be the first.</p>
            )
          ) : (
            <PlaceList items={cities.filter((x) => x.clubs > 0).map((x) => ({ key: x.id, name: x.name, n: x.clubs }))} picked={null} onPick={(id) => id && setCity(id)} />
          )}
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
