import { Link } from "react-router";
import type { PublicProfile } from "@outhere/core";
import { Avatar, Kpi, PeopleProvider, Tick } from "@outhere/ui";
import { absolute, hostOf, PublicFooter, PublicNav, shareMeta } from "~/components/public";

/**
 * Someone's public page at weouthere.app/@handle: what "Copy profile link" on
 * My profile shares. Club pages own /:slug, so the club route hands any slug
 * starting with @ to this page.
 */

export function profileMeta(profile: PublicProfile, publicUrl: string, origin: string) {
  const url = `${publicUrl}/@${profile.handle}`;
  if (!profile.visible) return [{ title: "Private profile · Outhere" }, { name: "robots", content: "noindex" }];
  const p = profile.person;
  return shareMeta({
    title: `${p.name} · Outhere`,
    description: `${p.name} walks and runs for ${[profile.borough, profile.city].filter(Boolean).join(", ")}${profile.club ? ` with ${profile.club.name}` : ""} on Outhere.`,
    url,
    image: absolute(p.photo, origin),
    imageAlt: `${p.name.split(" ")[0]} in running kit`,
  });
}

export function PublicProfilePage({ profile, publicUrl, signedIn }: { profile: PublicProfile; publicUrl: string; signedIn: boolean }) {
  const short = `${hostOf(publicUrl)}/@${profile.handle}`;
  const nav = <PublicNav links={[["/clubs", "Clubs"], ["/league", "League"]]} action={signedIn ? { to: "/", label: "Dashboard" } : { to: "/clubs", label: "Find a club" }} />;

  if (!profile.visible) {
    return (
      <div className="pub">
        {nav}
        <div className="wrap" style={{ paddingTop: 160, paddingBottom: 120 }}>
          <span className="kick">@{profile.handle}</span>
          <h1 className="disp" style={{ fontSize: "clamp(56px,8vw,110px)", marginTop: 12 }}>Private <span className="b">profile</span></h1>
          <p className="muted" style={{ marginTop: 12, maxWidth: "46ch" }}>This person only shows their profile to their own clubs.</p>
          <Link className="btn btn-p mt" to="/clubs">Find a club near you</Link>
        </div>
        <div className="wrap"><PublicFooter>{short}</PublicFooter></div>
      </div>
    );
  }

  const p = profile.person;
  const [first, ...rest] = p.name.split(" ");
  return (
    <div className="pub" key={profile.handle}>
      {nav}
      <header className="chero" style={{ minHeight: "min(78vh,720px)" }}>
        <img src={p.photo} alt={`${first} in running kit`} style={{ objectPosition: "70% 30%" }} />
        <div className="wrap" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
          <div>
            <PeopleProvider people={{ [p.id]: p }}>
              <Avatar id={p.id} className="pf" />
            </PeopleProvider>
            <div className="facts">
              <span className="pill glass"><Tick /> {profile.trust}</span>
              {profile.foundingNumber && <span className="pill glass">Founding 500 · #{profile.foundingNumber}</span>}
              {p.tier !== "free" && <span className="pill blue">{p.tier.toUpperCase()}</span>}
            </div>
            <h1 className="disp">{first}<br /><span className="b">{rest.join(" ")}</span></h1>
            <p className="tl">
              {[profile.borough, profile.city].filter(Boolean).join(", ")}
              {profile.club && <> · {profile.club.role}, <Link to={`/${profile.club.slug}`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{profile.club.name}</Link></>}
              {" "}· level {profile.level} · {profile.streakDays} day streak
            </p>
            <div className="cta">
              {profile.isMe ? (
                <Link className="btn btn-g btn-l" to="/me">Edit on My profile</Link>
              ) : profile.club ? (
                <Link className="btn btn-p btn-l" to={`/join/${profile.club.slug}`}>Run with {first} at {profile.club.name}</Link>
              ) : (
                <Link className="btn btn-p btn-l" to="/clubs">Find a club near you</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="g g4">{profile.stats.map((k) => <Kpi key={k.label} kpi={k} />)}</div>
        <div className="card mt">
          <div className="hd"><h3>Badges</h3><span className="muted" style={{ fontSize: 12 }}>{profile.badgesEarned} of {profile.badgesTotal}</span></div>
          {profile.badges.length > 0 ? (
            <div className="badges">
              {profile.badges.map((b) => <div key={b.label}><img className="obj" src={b.image} alt="" /><span>{b.label}</span></div>)}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No badges yet.</p>
          )}
        </div>
        <PublicFooter>{short} · Walking and running for {profile.borough || profile.city}</PublicFooter>
      </div>
    </div>
  );
}
