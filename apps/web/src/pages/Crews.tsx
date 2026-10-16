import { useEffect, useMemo, useRef, useState } from 'react';
import { slugify } from '@outhere/core';
import { JoinButton } from '../components/Chrome';
import { Choice, Honeypot, Mist, PlacePicker } from '../components/controls';
import { cityRank, rankOf, useCopy, useSite } from '../components/Site';
import { SITE } from '../content/site';
import { claimClub, placeCount } from '../lib/api';
import { initials, shortName } from '../lib/boroughs';
import { cityById, DEFAULT_PLACE, ELSEWHERE, EXAMPLE_CLUBS, type Place, placeLabel, theRegion } from '../lib/places';
import { prefersReducedMotion, titleCase, validEmail } from '../lib/format';
import { placeError, ROLES, SIZES } from '../lib/validate';

type Club = { name: string; place: Place; members?: number; claimed: boolean };
// The member app serves club pages at weouthere.app/<slug> with the same rule.
const clubSlug = (n: string) => slugify(n).slice(0, 40);
const H2 = { fontSize: 'clamp(40px,4.6vw,64px)' };

/** Where a newly claimed club stands: its borough, launch city or region. */
function Standing({ place, stats }: { place: Place; stats: ReturnType<typeof useSite>['stats'] }) {
  if (place.city === 'london') return <div><b>{rankOf(stats, place.borough)}/32</b><span>{shortName(place.borough)} rank</span></div>;
  if (place.city === ELSEWHERE) return <div><b>{placeCount(stats, place).toLocaleString('en-GB')}</b><span>in {theRegion(place.region)}</span></div>;
  return <div><b>{cityRank(stats, place.city)}/10</b><span>{cityById(place.city)!.name} rank</span></div>;
}

export default function Crews() {
  const site = useSite();
  const copy = useCopy();
  const [q, setQ] = useState('');
  const [mine, setMine] = useState<Club | null>(null);
  const [form, setForm] = useState({ club: '', place: DEFAULT_PLACE as Place, size: '20 to 50' as (typeof SIZES)[number], role: 'Captain' as (typeof ROLES)[number], email: '', social: '' });
  const [hp, setHp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ club: string; place: Place; email: string; role: string; founding: number } | null>(null);
  const claimRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const pre = new URLSearchParams(location.search).get('q');
    if (pre) setQ(pre);
  }, []);

  const clubs: Club[] = useMemo(() => {
    const base: Club[] = site.live ? site.stats.clubs.map((c) => ({ ...c, claimed: true })) : EXAMPLE_CLUBS.filter((c) => c.listed !== false);
    return mine ? [...base, mine] : base;
  }, [site.live, site.stats.clubs, mine]);

  const needle = q.trim().toLowerCase();
  const results = clubs.filter((c) => !needle || c.name.toLowerCase().includes(needle) || placeLabel(c.place).toLowerCase().includes(needle)).slice(0, 5);

  const pick = (name: string, place: Place) => {
    setForm((f) => ({ ...f, club: name, place }));
    if (innerWidth < 980) claimRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setTimeout(() => emailRef.current?.focus(), prefersReducedMotion() ? 0 : 500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    const club = form.club.trim();
    if (!club) { setErr('Pick your club from the list, or type its name.'); nameRef.current?.focus(); return; }
    const place = form.place.city === ELSEWHERE ? { ...form.place, town: form.place.town.trim() } : form.place;
    const bad = placeError(place);
    if (bad) { setErr(bad); return; }
    if (!validEmail(form.email)) { setErr('Enter the club email, like hello@yourclub.co.uk.'); emailRef.current?.focus(); return; }
    setErr('');
    setBusy(true);
    try {
      const r = await claimClub({ ...form, club, place, email: form.email.trim() });
      setDone({ club, place, email: form.email.trim(), role: form.role, founding: r.founding });
      setMine({ name: club, place, claimed: true });
      site.toast('Claim received');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const claimed = done ? Math.max(done.founding, site.stats.clubsClaimed) : site.stats.clubsClaimed;
  const board = (site.live
    ? clubs.filter((c) => c.claimed).map((c, i) => ({ name: c.name, where: placeLabel(c.place), v: 0, label: `#${i + 1}` }))
    : clubs.filter((c) => c.claimed).map((c) => ({ name: c.name, where: placeLabel(c.place), v: (c.members ?? 0) * 6400 + ((c.name.length * 977) % 9000), label: '' }))
  ).sort((a, b) => b.v - a.v);
  const max = board[0]?.v || 1;

  return (
    <main>
      <section className="phero on-photo">
        <div className="ph" style={{ backgroundImage: 'url(/img/club.jpg)', backgroundPosition: '60% center' }} aria-hidden="true" />
        <div className="wrap">
          <div className="crumbs mono"><a href="/">Outhere</a><span>/</span><span>Crews</span></div>
          <h1 className="disp"><span className="streak" style={{ display: 'block' }}>Your run club</span><span className="streak b" style={{ display: 'block' }}>is your crew</span></h1>
          <div className="row">
            <p className="lede" style={{ color: 'var(--ink)' }}>Every crew on Outhere is a real run club. Captains claim their club's official crew, members join it, and every step they take counts for the club, the area and the city.</p>
            <a className="btn btn-p" href="#find">Find your club</a>
          </div>
        </div>
        <Mist />
      </section>

      <section className="band">
        <div className="wrap">
          <div className="head">
            <div><div className="kick" style={{ marginBottom: 16 }}>How it works</div><h2 className="disp h2">Claim it.<br /><span className="b">Build it. Play.</span></h2></div>
            <p className="lede">One official crew per club, run by the people who already run it. No copycats, no rival pages with your name on.</p>
          </div>
          <div className="grid3">
            <div className="card rv"><span className="stepn">01</span><h3>Claim</h3><p>A captain or organiser finds the club and proves they run it with the club's email or its social account. We check every claim by hand during the founding window.</p></div>
            <div className="card rv"><span className="stepn">02</span><h3>Build</h3><p>Invite members with one link, add co-captains, and post your weekly runs. Members who join through the club get the crew badge on their ring.</p></div>
            <div className="card rv"><span className="stepn">03</span><h3>Play</h3><p>Every member's steps count for the club all week, not just on club nights. Climb your local league, then take on rival clubs across the UK.</p></div>
          </div>
        </div>
      </section>

      <section className="band" id="find" style={{ paddingTop: 0 }}>
        <div className="wrap grid2">
          <div className="card rv" style={{ display: 'grid', gap: 18 }}>
            <span className="kick">Find your club</span>
            <h2 className="disp" style={H2}>Is your club<br /><span className="b">on Outhere yet?</span></h2>
            <div className="field"><label htmlFor="q">Run club name or place</label><input id="q" placeholder="Peckham, Ancoats, Glasgow" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="results" aria-live="polite">
              {results.length ? results.map((c) => (
                <div className="club" key={c.name}>
                  <span className="ini">{initials(c.name)}</span>
                  <div className="nm"><b>{c.name}</b><span>{placeLabel(c.place)}{c.members ? ` · ${c.members} members` : ''}</span></div>
                  {c.claimed ? <span className="tag done">Claimed</span> : <button className="btn btn-p" type="button" onClick={() => pick(c.name, c.place)}>Claim</button>}
                </div>
              )) : (
                <div className="club">
                  <span className="ini">+</span>
                  <div className="nm"><b>{needle ? `No club called "${q.trim()}" yet` : 'No clubs claimed yet'}</b><span>Add it and claim it as captain</span></div>
                  <button className="btn btn-p" type="button" onClick={() => pick(titleCase(q.trim()), form.place)}>Add club</button>
                </div>
              )}
            </div>
            <p className="small" style={{ margin: 0 }}>{site.live ? 'Clubs appear here once we have checked their claim.' : 'Example clubs for now. Real clubs are added as captains claim them.'}</p>
          </div>

          <div className="card rv" id="claim" ref={claimRef} style={{ display: 'grid', gap: 18 }}>
            {done ? (
              <>
                <span className="kick">Claim received</span>
                <h2 className="disp" style={H2}>{done.club}<br /><span className="b">Founding #{done.founding}</span></h2>
                <p className="lede">We will confirm with {done.email} that you are the club's {done.role.toLowerCase()}. Once it is confirmed you get a link to invite members before launch.</p>
                <div className="stats3">
                  <div><b>#{done.founding}</b><span>of 500</span></div>
                  <Standing place={done.place} stats={site.stats} />
                  <div><b>{Math.max(0, 500 - done.founding)}</b><span>places left</span></div>
                </div>
                <div className="field"><label>Member invite link</label><div className="link"><code ref={linkRef}>{SITE.host}/{clubSlug(done.club)}</code><button className="btn btn-p" type="button" onClick={() => copy(linkRef.current, 'Club link copied')}>Copy link</button></div></div>
              </>
            ) : (
              <>
                <span className="kick">Claim a club</span>
                <h2 className="disp" style={H2}>{form.club ? <>Claim<br /><span className="b">{form.club}</span></> : <>Pick a club<br /><span className="b">to claim it</span></>}</h2>
                <form noValidate style={{ display: 'grid', gap: 16 }} onSubmit={submit}>
                  <div className="field"><label htmlFor="cName">Club name</label><input id="cName" ref={nameRef} placeholder="Choose from the list or type it" maxLength={40} value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} /></div>
                  <PlacePicker id="c" cityLabel="Where the club runs" value={form.place} onChange={(p) => setForm({ ...form, place: p })} />
                  <div className="field"><label htmlFor="cSize">Regular members</label>
                    <select id="cSize" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value as (typeof SIZES)[number] })}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select>
                  </div>
                  <div className="field"><label>Your role</label><Choice options={ROLES} value={form.role} onChange={(r) => setForm({ ...form, role: r })} label="Your role" /></div>
                  <div className="field"><label htmlFor="cEmail">Club email</label><input id="cEmail" ref={emailRef} type="email" placeholder="hello@yourclub.co.uk" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="field"><label htmlFor="cSocial">Club Instagram or Strava (optional)</label><input id="cSocial" placeholder="@yourclub" maxLength={60} value={form.social} onChange={(e) => setForm({ ...form, social: e.target.value })} /></div>
                  <Honeypot value={hp} onChange={setHp} />
                  <p className="err" role="alert">{err}</p>
                  <button className="btn btn-p" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Sending…' : 'Claim this club'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="band" id="captains" style={{ paddingTop: 0 }}>
        <div className="wrap grid2" style={{ alignItems: 'stretch' }}>
          <div className="pic rv" style={{ minHeight: 560 }}><img src="/img/captain.jpg" alt="A run club captain on the South Bank with his club warming up behind him" loading="lazy" /><span className="mono">For captains</span><h3>Run the club,<br />not a spreadsheet</h3><p>Everything a captain needs lives in the club's crew: members, runs, goals and who needs a nudge.</p></div>
          <div className="card rv dash" aria-label="Example captain view">
            <div className="top"><img src="/img/club.jpg" alt="" loading="lazy" /><div><b>Bermondsey Night Runners</b><span>Southwark · Founding crew #42 · example</span></div></div>
            <div className="tiles"><div><b className="tab">46</b><span>members</span></div><div><b className="tab">312k</b><span>steps this week</span></div><div><b className="tab">2/41</b><span>in Southwark</span></div></div>
            <div className="field"><label>Crew goal: 400k steps this week</label><div className="meter"><i style={{ width: '78%' }} /></div></div>
            <span className="kick" style={{ marginTop: 6 }}>This week's runs</span>
            <div className="runrow"><div>Tuesday social 5k<br /><span>Railway arches, 7pm</span></div><span className="tag">28 going</span></div>
            <div className="runrow"><div>Thursday hills<br /><span>One Tree Hill, 6:30pm</span></div><span className="tag">17 going</span></div>
            <div className="runrow"><div>Sunday long run<br /><span>Thames Path, 9am</span></div><span className="tag">31 going</span></div>
            <span className="kick" style={{ marginTop: 6 }}>Next battle</span>
            <div className="runrow"><div>vs Peckham Pacers<br /><span>Saturday to Friday</span></div><span className="tag" style={{ background: 'rgba(255,77,85,.14)', color: '#ff8b95' }}>Rival</span></div>
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="pic photoband rv"><img src="/img/tealclub.jpg" alt="A London run club passing Big Ben in the blue hour" style={{ objectPosition: '45% center' }} loading="lazy" /><span className="mono">Club nights · blue hour</span><h3>Every run<br />counts for the club</h3><p>Club night or a lone lap before work, every member's steps land in the club's total.</p></div>
        </div>
      </section>

      <section className="band" id="founding" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="head">
            <div><div className="kick" style={{ marginBottom: 16 }}>Founding 500{site.live ? '' : ' · example figures'}</div><h2 className="disp h2">The first 500<br /><span className="b">clubs in the UK</span></h2></div>
            <div style={{ display: 'grid', gap: 10, minWidth: 'min(340px,100%)' }}>
              <span className="mono" style={{ color: 'var(--ink-muted)' }}><span className="tab">{claimed}</span> of 500 claimed</span>
              <div className="meter"><i style={{ width: Math.min(100, claimed / 5) + '%' }} /></div>
            </div>
          </div>
          <div className="grid2" style={{ alignItems: 'center' }}>
            <div className="lb rv">
              {board.length ? board.map((r, i) => (
                <div className={'lbr' + (r.name === mine?.name ? ' me' : '')} key={r.name}>
                  <span className="rk">{i + 1}</span>
                  <div className="nm">{r.name}<br /><span className="small" style={{ margin: 0 }}>{r.where}</span></div>
                  <div className="meter"><i style={{ width: (site.live ? 100 : (r.v / max) * 100) + '%' }} /></div>
                  <span className="v">{r.label || (r.v ? (r.v / 1000).toFixed(0) + 'k' : 'New')}</span>
                </div>
              )) : <p className="small" style={{ margin: 0 }}>The first checked clubs appear here.</p>}
            </div>
            <div className="card rv" style={{ textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center' }}>
              <img src="/img/crest.jpg" alt="The founding crest" style={{ width: 220, mixBlendMode: 'lighten' }} loading="lazy" />
              <h3>Founding crest</h3>
              <p style={{ maxWidth: '40ch' }}>Founding clubs keep the crest on their crew for good, start their local league with a head start, and get first say on club features.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final on-photo">
        <div className="bgp" style={{ backgroundImage: 'url(/img/bridge.jpg)', backgroundPosition: 'center 55%' }} aria-hidden="true" />
        <div className="wrap">
          <div className="kick" style={{ marginBottom: 22 }}>Not in a club yet?</div>
          <h2 className="disp">Join one<br /><span className="b">near you</span></h2>
          <p className="lede" style={{ margin: '20px auto 0', color: 'var(--ink)' }}>Join the waitlist and tell us where you move. We will match you with clubs that run near you when we open.</p>
          <div style={{ marginTop: 28 }}><JoinButton /></div>
        </div>
        <Mist />
      </section>
    </main>
  );
}
