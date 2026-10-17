import { useState } from 'react';
import { Honeypot, Mist, PlacePicker } from '../components/controls';
import { useSite } from '../components/Site';
import { SITE } from '../content/site';
import { requestBlack } from '../lib/api';
import { validEmail } from '../lib/format';
import { ELSEWHERE, type Place } from '../lib/places';
import { placeError } from '../lib/validate';

const H2 = { fontSize: 'clamp(40px,4.6vw,64px)' };

export default function Black() {
  const site = useSite();
  const [f, setF] = useState({ name: '', place: { city: 'london', borough: 'Hackney' } as Place, email: '', code: '', why: '' });
  const [hp, setHp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const taken = site.stats.blackTaken;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    if (!f.name.trim()) { setErr('Add your name so we know who to look out for.'); document.getElementById('bName')?.focus(); return; }
    const place = f.place.city === ELSEWHERE ? { ...f.place, town: f.place.town.trim() } : f.place;
    const bad = placeError(place);
    if (bad) { setErr(bad); return; }
    if (!validEmail(f.email)) { setErr('Enter an email address like name@example.com.'); document.getElementById('bEmail')?.focus(); return; }
    setErr('');
    setBusy(true);
    try {
      await requestBlack({ ...f, place, name: f.name.trim(), email: f.email.trim(), code: f.code.trim(), why: f.why.trim() });
      setSent(true);
      site.toast('Request sent');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <section className="phero on-photo">
        <div className="ph" style={{ backgroundImage: 'url(/img/roof.jpg)', backgroundPosition: 'center 40%' }} aria-hidden="true" />
        <div className="wrap">
          <div className="crumbs mono"><a href="/">Outhere</a><span>/</span><span>Black</span></div>
          <span className="mark k" style={{ alignSelf: 'flex-start', justifySelf: 'start' }}>BLACK</span>
          <h1 className="disp"><span className="streak" style={{ display: 'block' }}>By</span><span className="streak" style={{ display: 'block' }}>invitation</span></h1>
          <div className="row">
            <p className="lede" style={{ color: 'var(--ink)' }}>A small membership for the people who move their city. Its own nights, its own drops and a ring everyone notices. Members invite members, and a few places open to the waitlist each month.</p>
            <a className="btn btn-gm" href="#request">Request an invite</a>
          </div>
        </div>
        <Mist />
      </section>

      <section className="band" id="perks">
        <div className="wrap">
          <div className="head">
            <div><div className="kick" style={{ marginBottom: 16 }}>What Black gets you</div><h2 className="disp h2">Everything in Pro,<br />then the good bits</h2></div>
            <p className="lede">Black includes every Pro feature. These are the things only Black members get.</p>
          </div>
          <div className="grid3">
            <article className="pic rv"><img src="/img/roof.jpg" alt="Members chatting on a rooftop above London at night" style={{ objectPosition: '45% center' }} loading="lazy" /><span className="mono">Monthly</span><h3>Members' nights</h3><p>Rooftop runs, late track sessions and dinners in every launch city, for Black members and one guest.</p></article>
            <article className="pic rv"><img src="/img/jacket.jpg" alt="A gunmetal running jacket hanging in a dark room" loading="lazy" /><span className="mono">Every drop</span><h3>First access</h3><p>Black members shop every drop 48 hours before anyone else, and some pieces are made only for them.</p></article>
            <article className="pic rv" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center', background: 'radial-gradient(60% 50% at 50% 40%,#2a2f37,#0a0b0d 75%)' }}>
              <span className="mono">Always on</span>
              <div className="ringbig" style={{ marginBottom: 26 }}><img src="/img/black.jpg" alt="" loading="lazy" /></div>
              <h3>The ring</h3>
              <p style={{ margin: '0 auto' }}>A gunmetal ring with light travelling round it, on your photo everywhere in the app.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="band" id="invites" style={{ paddingTop: 0 }}>
        <div className="wrap grid2" style={{ alignItems: 'stretch' }}>
          <div className="card gm-panel rv" style={{ display: 'grid', gap: 22 }}>
            <span className="kick" style={{ color: 'var(--gm3)' }}>How invites work</span>
            <div className="feat" style={{ margin: 0 }}>
              <div><span className="mono" style={{ color: 'var(--ink)' }}>Nominated</span><p>Every Black member can invite two people a season.</p></div>
              <div><span className="mono" style={{ color: 'var(--ink)' }}>Earned</span><p>Keep a six week streak on Pro and you can request a place.</p></div>
              <div><span className="mono" style={{ color: 'var(--ink)' }}>Waitlist</span><p>A few places open to the waitlist each month, reviewed by hand.</p></div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--ink-muted)' }}><span className="tab">{taken.toLocaleString('en-GB')}</span> of 1,000 founding places taken{site.live ? '' : ' · example figure'}</span>
              <div className="meter gm"><i style={{ width: Math.min(100, taken / 10) + '%' }} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <b style={{ font: '600 56px/1 var(--display)' }}>{SITE.prices.black.m}</b>
              <span style={{ color: 'var(--ink-muted)' }}>a month, or {SITE.prices.black.y} a year.</span>
            </div>
          </div>
          <div className="card rv" id="request" style={{ display: 'grid', gap: 16 }}>
            {sent ? (
              <>
                <span className="kick">Request received</span>
                <h2 className="disp" style={H2}>Thanks,<br />{f.name.trim().split(' ')[0]}</h2>
                <p className="lede">{f.code ? 'Your invite code goes to the member who shared it to confirm. ' : ''}We review requests on the first of every month and reply to {f.email.trim()} either way.</p>
                <div className="ringbig" style={{ width: 120, height: 120, margin: '10px 0' }}><img src="/img/black.jpg" alt="" /></div>
                <a className="btn btn-q" href="/#membership" style={{ justifySelf: 'start' }}>Compare memberships</a>
              </>
            ) : (
              <>
                <span className="kick">Request an invite</span>
                <h2 className="disp" style={H2}>Tell us<br />who you are</h2>
                <form noValidate style={{ display: 'grid', gap: 16 }} onSubmit={submit}>
                  <div className="field"><label htmlFor="bName">Name</label><input id="bName" autoComplete="name" placeholder="Your name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                  <PlacePicker id="b" value={f.place} onChange={(p) => setF({ ...f, place: p })} />
                  <div className="field"><label htmlFor="bEmail">Email</label><input id="bEmail" type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                  <div className="field"><label htmlFor="bCode">Invite code (optional)</label><input id="bCode" placeholder="From a Black member" maxLength={24} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
                  <div className="field"><label htmlFor="bWhy">How do you move your city?</label><textarea id="bWhy" placeholder="Your club, your routes, what you'd bring to a members' night" maxLength={1000} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} /></div>
                  <Honeypot value={hp} onChange={setHp} />
                  <p className="err" role="alert">{err}</p>
                  <button className="btn btn-gm" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Sending…' : 'Send my request'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="blackband rv" style={{ margin: '0 auto clamp(84px,11vw,160px)', maxWidth: 1320, width: 'calc(100% - 32px)' }}>
        <figure><img src="/img/black.jpg" alt="A Black member standing still as commuters blur past" loading="lazy" /></figure>
        <div className="copy">
          <span className="mark k" style={{ alignSelf: 'flex-start' }}>BLACK</span>
          <h2 className="disp" style={{ fontSize: 'clamp(46px,5.6vw,84px)' }}>Stand still<br />while the city<br />rushes past</h2>
          <p className="lede">Black is quiet on purpose. No badges to grind for, no leaderboard of members. Just the people who are out there most, in one place.</p>
        </div>
        <Mist />
      </section>

      <section className="final on-photo">
        <div className="bgp" style={{ backgroundImage: 'url(/img/heath.jpg)', backgroundPosition: 'center 35%' }} aria-hidden="true" />
        <div className="wrap">
          <div className="kick" style={{ marginBottom: 22 }}>Earned at first light</div>
          <h2 className="disp">Keep<br /><span className="b">showing up</span></h2>
          <p className="lede" style={{ margin: '20px auto 0', color: 'var(--ink)' }}>The most consistent people on Outhere earn a place in Black. Every early start counts towards yours.</p>
          <div style={{ marginTop: 28 }}><a className="btn btn-p" href="#request">Request an invite</a></div>
        </div>
        <Mist />
      </section>
    </main>
  );
}
