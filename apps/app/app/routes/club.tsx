import { Link, redirect } from "react-router";
import { canSeeClubHq, formatNumber, isValidClubSlug, ordinal, type FormLetter, type Person } from "@outhere/core";
import { Countdown, CountUp, Faces, Form, QR, Tick, usePerson } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { ClubCard } from "~/components/club-card";
import { absolute, hostOf, PublicFooter, PublicNav, shareMeta } from "~/components/public";
import { PublicProfilePage, profileMeta } from "~/components/public-profile";
import type { Route } from "./+types/club";

export async function loader({ request, params }: Route.LoaderArgs) {
  const slug = params.slug.toLowerCase();
  // weouthere.app/@handle is a person, not a club.
  if (slug.startsWith("@")) {
    const db = await getData(request);
    const profile = await db.profile(slug.slice(1));
    if (!profile) throw new Response("Not found", { status: 404 });
    const viewer = await db.viewer().catch(() => null);
    return { kind: "profile" as const, profile, signedIn: !!viewer, publicUrl: config().publicUrl, origin: new URL(request.url).origin };
  }
  if (!isValidClubSlug(slug)) throw new Response("Not found", { status: 404 });
  const db = await getData(request);
  const page = await db.clubPage(slug);
  if (!page) throw new Response("Not found", { status: 404 });
  // One address per club, so shared links and search results agree.
  if (params.slug !== page.club.slug) throw redirect(`/${page.club.slug}`, 301);
  // Signed-out visitors have no viewer; the page is the same for them.
  const viewer = await db.viewer().catch(() => null);
  const captain = !!viewer && canSeeClubHq(viewer) && viewer.homeClubId === page.club.id;
  return { kind: "club" as const, page, captain, publicUrl: config().publicUrl, origin: new URL(request.url).origin };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [{ title: "Not here · Outhere" }];
  if (loaderData.kind === "profile") return profileMeta(loaderData.profile, loaderData.publicUrl, loaderData.origin);
  const { page, publicUrl, origin } = loaderData;
  const c = page.club;
  return shareMeta({
    title: `${c.name} · Outhere`,
    description: `${c.tagline} ${[c.borough, c.city].filter(Boolean).join(", ")} · ${c.nextRun}. Free to join.`,
    url: `${publicUrl}/${c.slug}`,
    image: absolute(c.cover, origin),
    imageAlt: `${c.name} out on a run`,
  });
};

const RESULT: Record<FormLetter, [string, string]> = { w: ["Won", "pill blue"], d: ["Drew", "pill"], l: ["Lost", "pill"] };

function Leader({ personId, role, group, person }: { personId: string; role: string; group: string; person?: Person }) {
  const known = usePerson(personId);
  const p = known.id === personId || !person ? known : person;
  return (
    <div className="leader">
      <img src={p.photo} alt={p.name} />
      <b>{p.name.split(" ")[0]}</b>
      <span>{[role, group].filter(Boolean).join(" · ")}</span>
    </div>
  );
}

export default function SlugPage({ loaderData }: Route.ComponentProps) {
  if (loaderData.kind === "profile") return <PublicProfilePage profile={loaderData.profile} publicUrl={loaderData.publicUrl} signedIn={loaderData.signedIn} />;
  return <ClubPage {...loaderData} />;
}

function ClubPage({ page, captain, publicUrl }: Extract<Route.ComponentProps["loaderData"], { kind: "club" }>) {
  const { club: c, runs, derby, stats, season, leaders, gallery, locals, nearby, founding, reveal } = page;
  const join = `/join/${c.slug}`;
  const short = `${hostOf(publicUrl)}/${c.slug}`;

  return (
    // Keyed by club so the hero and counters start fresh when you open another club.
    <div className="pub" key={c.slug}>
      <PublicNav
        links={[["/clubs", "Clubs"], ["/league", "League"], [c.cityId ? `/clubs?c=${c.cityId}` : "/clubs", c.city || "Cities"]]}
        action={captain ? { to: "/hq", label: "Club HQ" } : { to: "/", label: "Dashboard" }}
      />
      <header className="chero">
        <img src={c.cover} alt={`${c.name} out on a run`} />
        <div className="wrap">
          <div>
            <img className="crestbig" src={c.crest} alt={`${c.name} crest`} />
            <div className="facts">
              {c.verified ? <span className="pill glass"><Tick /> Verified club</span> : <span className="pill warn">Founding club</span>}
              <span className="pill glass">{c.division}{c.position ? ` · ${ordinal(c.position)}` : ""}</span>
              <span className="pill glass">Since {c.since}</span>
            </div>
            <h1 className="disp">{c.nameTop}<br /><span className="b">{c.nameBottom}</span></h1>
            <p className="tl">{c.tagline}</p>
            <div className="facts">
              {[[c.borough, c.city].filter(Boolean).join(", "), c.nextRun, ...c.tags].filter(Boolean).map((t) => <span key={t} className="pill glass">{t}</span>)}
            </div>
            <div className="cta">
              <Link className="btn btn-p btn-l" to={join}>Join {c.name}</Link>
              <Link className="btn btn-g btn-l" to={join}>Come to a run as a guest</Link>
            </div>
          </div>
          <div className="scan">
            <QR text={`${publicUrl}/join/${c.slug}`} label={`QR code to join ${c.name}`} />
            <b>Scan to join</b>
            <small>{short}</small>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="strip">
          <div><b className="tab"><CountUp value={c.members} /></b><span>members</span></div>
          <div>
            <b>{c.position ? ordinal(c.position) : founding ? `${founding.meetups} of ${founding.needed}` : "Founding"}</b>
            <span>{c.position ? [c.division, c.city].filter(Boolean).join(", ") : "meetups to go official"}</span>
          </div>
          <div><b>{stats.turnout}</b><span>came to a club run this week</span></div>
          <div><b>{stats.raised}</b><span>raised for the club this season</span></div>
        </div>

        {runs.length > 0 && (
          <section className="psec">
            <span className="kick">Come and run</span>
            <h2 className="disp" style={{ marginTop: 12 }}>Next <span className="b">runs</span></h2>
            <div className="runs">
              {runs.map((r) => (
                <div key={r.id} className="card run">
                  <div className="top2">
                    <div className="datebox"><span>{r.day}</span><b>{r.date}</b></div>
                    <div><h3>{r.title}</h3><div className="meta">{r.time} · {r.place}</div></div>
                  </div>
                  <div className="meta">{r.detail}</div>
                  <div className="ft">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Faces ids={r.goingIds} />
                      <span className="muted" style={{ fontSize: 12.5 }}>{r.going} going</span>
                    </div>
                    <Link className="btn btn-q btn-s" to={join}>I'll come</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="psec">
          <div className="g g-73" style={{ alignItems: "stretch" }}>
            <div className="slab" style={{ minHeight: 380 }}>
              <img className="bg" src="/_app/img/derby.jpg" alt="" />
              <span className="pill glass" style={{ alignSelf: "flex-start" }}><i className="dot pulse" />Derby this week</span>
              <h2 className="disp" style={{ fontSize: "clamp(44px,5vw,72px)", marginTop: 12 }}>{c.nameTop} <span className="b">v</span> {derby.opponent}</h2>
              <div className="score">
                <div><div className="who2">{c.nameTop}</div><div className="n tab">{formatNumber(derby.us)}</div></div>
                <div className="vs">VS</div>
                <div className="r"><div className="who2">{derby.opponent}</div><div className="n tab">{formatNumber(derby.them)}</div></div>
              </div>
              <span className="clock mt" style={{ display: "block" }}>REVEAL SUN 20:00 · <Countdown to={reveal.at} /></span>
            </div>
            <div className="card">
              <span className="kick">Season so far</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
                <b className="disp" style={{ fontSize: 64 }}>{season.points}</b>
                <span className="muted">points</span>
              </div>
              <Form form={season.form} />
              {season.results.map((r) => (
                <div key={r.opponent} className="row">
                  <div className="t"><b>v {r.opponent}</b></div>
                  <span className="tab">{r.us} <span className="muted">· {r.them}</span></span>
                  <span className={RESULT[r.result][1]}>{RESULT[r.result][0]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {leaders.length > 0 && (
          <section className="psec">
            <span className="kick">The people</span>
            <h2 className="disp" style={{ marginTop: 12 }}>Run <span className="b">leaders</span></h2>
            <div className="leaders">{leaders.map((l) => <Leader key={l.personId} {...l} />)}</div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Only members who chose a public profile appear here. Nobody's home or route is ever shown.</p>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="psec">
            <h2 className="disp">On the <span className="b">road</span></h2>
            <div className="gal">{gallery.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}</div>
          </section>
        )}

        <section className="psec">
          <span className="kick">Backed by the area</span>
          <h2 className="disp" style={{ marginTop: 12 }}>Our <span className="b">locals</span></h2>
          {locals.length > 0 && (
            <div className="spons">
              {locals.map((s) => (
                <div key={s.name} className="card spon">
                  <div className="lg">{s.name}<small>{s.kind.toUpperCase()}</small></div>
                  <p>{s.perk}</p>
                </div>
              ))}
            </div>
          )}
          <div className="card mt fundbar">
            <img className="obj" src="/_app/img/3d-stack.jpg" alt="" style={{ width: 90 }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: 16 }}>Every member who goes Pro through the club pays into its fund, and local businesses back it too.</b>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>This season that paid for a first aid course, head torches for the night group and food on derby day.</p>
            </div>
            <Link className="btn btn-q" to="/locals">Back this club as a business</Link>
          </div>
        </section>

        <section className="psec">
          <div className="sech" style={{ marginTop: 0 }}>
            <h2>More clubs in <span className="b">{c.city || "your city"}</span></h2>
            <Link className="btn btn-q btn-s" to={c.cityId ? `/clubs?c=${c.cityId}` : "/clubs"}>All clubs</Link>
          </div>
          <div className="ccards">{nearby.map((n) => <ClubCard key={n.id} club={n} />)}</div>
        </section>

        <PublicFooter>{short} · Free for every club, forever</PublicFooter>
      </div>

      <div className="joinbar">
        <Link className="btn btn-p" to={join}>Join the club</Link>
        <Link className="btn btn-q" to={join}>Try a run</Link>
      </div>
    </div>
  );
}
