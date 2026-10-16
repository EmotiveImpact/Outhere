import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { formatNumber, ordinal } from "@outhere/core";
import { BoroughMap, CityPicker, Countdown, Form, Seg, Tick, useLiveScore, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import type { Route } from "./+types/league";

export const meta: Route.MetaFunction = () => [{ title: "League · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const db = await getData(request);
  const [viewer, cities] = await Promise.all([db.viewer(), db.cities()]);
  const c = url.searchParams.get("c");
  const cityId = cities.some((x) => x.id === c) ? c! : viewer.cityId;
  const [league, boroughs] = await Promise.all([db.league(cityId), db.boroughs("steps", cityId)]);
  const t = url.searchParams.get("tab");
  const tab: Tab = t === "clubs" || t === "boroughs" ? t : "cities";
  return { league, boroughs, cities, tab, home: league.city.id === viewer.cityId ? viewer.borough : "" };
}

type Tab = "cities" | "clubs" | "boroughs";
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** The live head to head at the top of each tab. */
function Slab({ img, alt, pill, title, left, right, L, R, children }: { img: string; alt: string; pill: string; title: React.ReactNode; left: string; right: string; L: number; R: number; children?: React.ReactNode }) {
  const total = L + R;
  return (
    <section className="slab">
      <img className="bg" src={img} alt={alt} />
      <span className="pill glass" style={{ alignSelf: "flex-start" }}><i className="dot pulse" />{pill}</span>
      <h2 className="disp" style={{ fontSize: "clamp(46px,6vw,88px)", marginTop: 14 }}>{title}</h2>
      <div className="score">
        <div><div className="who2">{left}</div><div className="n tab" id="lL">{formatNumber(L)}</div></div>
        <div className="vs">VS</div>
        <div className="r"><div className="who2">{right}</div><div className="n tab" id="lR">{formatNumber(R)}</div></div>
      </div>
      <div style={{ maxWidth: 640, marginTop: 14 }}>
        <div className="bar">
          <i className="us" style={{ width: `${((L / total) * 99).toFixed(1)}%` }} />
          <i className="them" style={{ width: `${((R / total) * 99).toFixed(1)}%` }} />
        </div>
      </div>
      {children}
    </section>
  );
}

export default function League({ loaderData }: Route.ComponentProps) {
  const { league, boroughs, cities, home } = loaderData;
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTabState] = useState<Tab>(loaderData.tab);
  const setTab = (t: Tab) => {
    setTabState(t);
    const next = new URLSearchParams(params);
    if (t === "cities") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const setCity = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("c", id);
    setParams(next, { preventScrollReset: true });
  };
  const city = league.city;
  const areas = `${city.areaWord}s`;
  const [div, setDiv] = useState(league.divisions[0]?.name ?? "Premier");
  const m = league.match;
  const d = league.derby;
  const cL = useLiveScore(m.homeScore, 4);
  const cR = useLiveScore(m.awayScore, 3);
  const dL = useLiveScore(d.home.score, 9);
  const dR = useLiveScore(d.away.score, 8);
  const rows = league.divisions.find((x) => x.name === div)?.rows ?? [];
  const ranked = [...boroughs].sort((a, b) => b.value - a.value);
  const clock = (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
      <span className="clock">REVEAL SUN 20:00 · <Countdown to={league.reveal.at} /></span>
      <button type="button" className="btn btn-g btn-s" onClick={() => toast(`Draw seed ${league.reveal.seed}. Anyone can re-run it to check the squads.`)}>How the draw works</button>
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">{league.season}</span>
          <h1 className="disp" style={{ marginTop: 12 }}>The <span className="b">league</span></h1>
          <p>Cities across the UK, their clubs and their {areas}. Squads drawn at random every Friday, results revealed together on Sunday at 20:00.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {tab !== "cities" && <CityPicker id="lcity" cities={cities} value={city.id} onChange={setCity} />}
          <Seg id="lseg" options={[["cities", "Cities"], ["clubs", "Clubs"], ["boroughs", cap(areas)]] as const} value={tab} onChange={setTab} />
        </div>
      </div>

      {tab === "cities" && (
        <>
          <Slab
            img="/_app/img/hill.jpg"
            alt="Runners above a city skyline at dusk"
            pill={`${m.division} · live · day ${m.dayOfWeek} of 7`}
            title={<>{m.home} <span className="b">v</span> {m.away}</>}
            left={`${m.home} · ${m.homeTurnout}% turnout`}
            right={`${m.away} · ${m.awayTurnout}%`}
            L={cL}
            R={cR}
          >
            {clock}
          </Slab>
          <div className="g g-73 mt">
            <div className="card">
              <div className="hd">
                <h3>{div} table</h3>
                <div className="chips" role="group">
                  {league.divisions.map((x) => (
                    <button key={x.name} type="button" aria-pressed={x.name === div} onClick={() => setDiv(x.name)}>{x.name}</button>
                  ))}
                </div>
              </div>
              <div className="tw">
                <table>
                  <thead><tr><th>#</th><th>City</th><th className="num">Eligible</th><th className="num">Pts</th><th>Form</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.city} className={r.me ? "me" : ""}>
                        <td className="tab muted">{i + 1}</td>
                        <td><span className="who">{r.image ? <img className="crest" src={r.image} alt="" /> : null}{r.city}{r.region && <span className="tag-region">Region</span>}</span></td>
                        <td className="num">{formatNumber(r.eligible)}</td>
                        <td className="num"><b>{r.points}</b></td>
                        <td><Form form={r.form} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="g" style={{ alignContent: "start" }}>
              {league.rising.city && (
              <div className="card" style={{ overflow: "hidden" }}>
                <img className="obj" src="/_app/img/3d-podium.jpg" alt="" style={{ position: "absolute", right: -20, top: -10, width: 170, opacity: 0.9 }} />
                <span className="kick">Rising towns</span>
                <h3 style={{ marginTop: 10, maxWidth: "16ch" }}>{league.rising.city} needs {league.rising.needed - league.rising.eligible} more to play as itself</h3>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6, maxWidth: "30ch" }}>Until then its walkers play for {league.rising.region || "their region"}.</p>
                <div className="meter" style={{ margin: "16px 0 8px" }}><i style={{ width: `${Math.round((league.rising.eligible / league.rising.needed) * 100)}%` }} /></div>
                <div className="muted tab" style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>{league.rising.eligible} eligible</span><span>{league.rising.needed} needed</span>
                </div>
                <button
                  type="button"
                  className="btn btn-p btn-s mt"
                  onClick={() => {
                    const link = `weouthere.app/clubs?c=${league.rising.cityId}`;
                    navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
                    toast(`Link copied: ${link}`);
                  }}
                >
                  Share {league.rising.city}'s link
                </button>
              </div>
              )}
              <div className="card">
                <span className="kick">{city.name} club league</span>
                {!league.clubTable.length && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>No verified clubs in {city.name} yet.</p>}
                {league.clubTable.slice(0, 5).map((r, i) => (
                  <Link key={r.club.id} className="row" to={`/${r.club.slug}`}>
                    <span className="tab muted" style={{ width: 14 }}>{i + 1}</span>
                    <img className="crest" src={r.club.crest} alt="" />
                    <div className="t"><b>{r.club.name}</b><span>{r.club.borough}</span></div>
                    <Form form={r.form} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "clubs" && (
        <>
          <Slab
            img="/_app/img/derby.jpg"
            alt="Two club squads lined up on a wet street at night"
            pill={`${home ? "" : "Your club's derby · "}${d.division} · live · ${d.week}`}
            title={<>{d.home.short} <span className="b">v</span> {d.away.short}</>}
            left={d.home.name}
            right={d.away.name}
            L={dL}
            R={dR}
          >
            {clock}
          </Slab>
          <div className="g g-73 mt">
            <div className="card">
              <div className="hd"><h3>Clubs in {city.name}</h3><span className="muted" style={{ fontSize: 12.5 }}>Verified clubs only</span></div>
              {!league.clubTable.length && <p className="muted" style={{ fontSize: 13 }}>No verified clubs in {city.name} yet. A founding club goes official after three meetups.</p>}
              <div className="tw">
                <table>
                  <thead><tr><th>#</th><th>Club</th><th>Division</th><th>{cap(city.areaWord)}</th><th className="num">Pts</th><th>Form</th></tr></thead>
                  <tbody>
                    {league.clubTable.map((r, i) => (
                      <tr key={r.club.id} className={r.me ? "me" : ""}>
                        <td className="tab muted">{i + 1}</td>
                        <td><Link className="who" to={`/${r.club.slug}`}><img className="crest" src={r.club.crest} alt="" />{r.club.name}{r.club.verified && <Tick />}</Link></td>
                        <td className="muted">{r.club.division}</td>
                        <td className="muted">{r.club.borough}</td>
                        <td className="num"><b>{r.points}</b></td>
                        <td><Form form={r.form} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card" style={{ alignSelf: "start" }}>
              <span className="kick">How club weeks work</span>
              <h3 style={{ marginTop: 10 }}>Every member's steps count</h3>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Each week your club is drawn against another of a similar size. Average counted steps per active member decide it, so a small club can beat a big one.</p>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Win 3, draw 1. Six weeks a season, and the top two go up.</p>
            </div>
          </div>
        </>
      )}

      {tab === "boroughs" && (
        <div className="g g-73">
          {city.hasMap && (
          <div className="card">
            <div className="hd"><h3>Steps a day, by {city.areaWord}</h3>{home && ranked.some((b) => b.name === home) && <span className="pill blue">{home} is {ordinal(ranked.findIndex((b) => b.name === home) + 1)}</span>}</div>
            <BoroughMap stats={boroughs} metric="steps" home={home || undefined} />
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Every walker counts for their {city.areaWord}, in a club or not. Brighter means more steps a day per person.</p>
          </div>
          )}
          <div className="card">
            <div className="hd"><h3>{ranked.length ? `All ${ranked.length} ${areas} in ${city.name}` : `${cap(areas)} in ${city.name}`}</h3></div>
            {!ranked.length && <p className="muted" style={{ fontSize: 13 }}>No {areas} set up for {city.name} yet.</p>}
            <div className="tw">
              <table>
                <tbody>
                  {ranked.map((b, i) => (
                    <tr key={b.name} className={b.name === home ? "me" : ""}>
                      <td className="tab muted">{i + 1}</td>
                      <td><b>{b.name}</b></td>
                      <td className="num">{formatNumber(b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!city.hasMap && (
            <div className="card" style={{ alignSelf: "start" }}>
              <span className="kick">How areas work</span>
              <h3 style={{ marginTop: 10 }}>Every walker counts</h3>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Everyone in {city.name} walks and runs for their {city.areaWord}, in a club or not. The table is average steps a day per person, so a small area can top it.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
