import { useEffect, useRef, useState } from 'react';
import { InviteButton, JoinButton } from '../components/Chrome';
import { Choice, Mist } from '../components/controls';
import { HeroReel } from '../components/HeroReel';
import { Arrow, Tick } from '../components/icons';
import { BoroughMap, Faq, ListCount, MapLegend, PillTabs, TabPanel, Tip } from '../components/kit';
import { rankOf, useSite } from '../components/Site';
import { COMPARE, FAQ } from '../content/home';
import { SITE } from '../content/site';
import { type Borough, DEFAULT_BOROUGH, OPEN_AT, shortName, slug } from '../lib/boroughs';
import { countTo, fmt, prefersReducedMotion } from '../lib/format';
import { WaitlistForm } from '../components/WaitlistDialog';

const MANIFESTO = 'London has nine million people and most nights they stay in. Outhere gives every walk a reason. Your steps go to your crew, your crew plays for your borough, and your borough plays for';

function Hero() {
  const top = useRef<HTMLElement>(null);
  return (
    <section className="hero on-photo" id="top" ref={top}>
      <div className="ph" aria-hidden="true" />
      <HeroReel watch={top} />
      <div className="corner l mono" aria-hidden="true"><span>London first</span><span>51.5072° N, 0.1276° W</span></div>
      <div className="corner r mono" aria-hidden="true"><span>Season 0</span><span>Pre-launch</span></div>
      <div className="wrap">
        <h1 className="disp"><span className="streak">Every step</span><span className="streak b">counts</span></h1>
        <div className="sub">
          <p className="lede">Outhere turns your walks and runs into points for your crew, your borough and your city. London first, then the whole country.</p>
          <div>
            <WaitlistForm id="heroEmail" />
            <ListCount />
          </div>
        </div>
        <div className="tags mono"><span>Free to join</span><span>Crews of 2 to 50</span><span>1v1 battles</span><span>Borough leagues</span><span>City vs city</span></div>
      </div>
      <Mist />
    </section>
  );
}

/** The manifesto lights up word by word as you scroll through it. */
function Manifesto() {
  const p = useRef<HTMLParagraphElement>(null);
  const words = MANIFESTO.split(' ');
  const [lit, setLit] = useState(words.length + 1);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const upd = () => {
      const r = p.current!.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      setLit(Math.round(t * (words.length + 1)));
    };
    upd();
    addEventListener('scroll', upd, { passive: true });
    return () => removeEventListener('scroll', upd);
  }, [words.length]);
  return (
    <section className="band" id="why">
      <div className="wrap">
        <div className="secmark mono"><span>Why Outhere</span><span>London, 2026</span></div>
        <div className="mani">
          <figure className="rv"><img src="/img/face.jpg" alt="A woman mid-run at night, breath in the cold air" /><figcaption className="mono"><span>Amara, Southwark</span><span>6.2 km</span></figcaption></figure>
          <p className="words" ref={p}>
            {words.map((w, i) => <span key={i} className={i < lit ? 'lit' : undefined}>{w}{' '}</span>)}
            <span className={'bl' + (words.length < lit ? ' lit' : '')}>London.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function How() {
  return (
    <section className="band" id="how" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="head">
          <div><div className="kick" style={{ marginBottom: 16 }}>How it works</div><h2 className="disp h2">Three steps<br /><span className="b">to the top</span></h2></div>
          <p className="lede">No kit, no plan, no gym. Phone in pocket, and the city does the rest.</p>
        </div>
        <div className="steps">
          <article className="step rv"><img src="/img/lone.jpg" alt="" style={{ objectPosition: 'center 50%' }} loading="lazy" /><span className="n mono">Step 01</span><h3>Get out</h3><p>Walk, run or commute. The school run counts, and so does a 10k. Every step lands in your total.</p></article>
          <article className="step rv"><img src="/img/crew.jpg" alt="" loading="lazy" /><span className="n mono">Step 02</span><h3>Join a crew</h3><p>Your mates, your club or your office, from 2 to 50 people. Your steps become their steps.</p></article>
          <article className="step rv"><img src="/img/battle.jpg" alt="" style={{ objectPosition: '30% center' }} loading="lazy" /><span className="n mono">Step 03</span><h3>Take ground</h3><p>Battle anyone 1v1, climb your borough league and get called up when London plays another city.</p></article>
        </div>
      </div>
    </section>
  );
}

const STAKES = ['50', '100', '250'] as const;
const clock = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

/** An example 1v1: both scores tick up live, and you can change the stake or add a walk home. */
function Battle() {
  const { toast } = useSite();
  const [me, setMe] = useState(8412);
  const [them, setThem] = useState(7930);
  const [stake, setStake] = useState<(typeof STAKES)[number]>('100');
  const [left, setLeft] = useState(4 * 3600 + 12 * 60 + 9);
  const meRef = useRef(me);
  meRef.current = me;
  useEffect(() => {
    const a = setInterval(() => { setThem((t) => t + Math.round(Math.random() * 24)); setMe((m) => m + Math.round(Math.random() * 18)); }, 2400);
    const b = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);
  const t = me + them;
  return (
    <section className="battle on-photo" id="battles">
      <div className="bgp" aria-hidden="true" />
      <div className="wrap grid">
        <div>
          <div className="kick" style={{ marginBottom: 16 }}>1v1 battles</div>
          <h2 className="disp h2">Pick a rival.<br /><span className="b">Out-walk them.</span></h2>
          <p className="lede" style={{ marginTop: 22 }}>Challenge anyone to a day, a weekend or a week. Put OUT on it if you fancy. Whoever moves more takes the pot.</p>
        </div>
        <div className="vs rv" aria-label="Example battle">
          <div className="vs-top"><span className="chip"><i className="dot live" />Both out now</span><span className="mono" style={{ color: 'var(--ink-muted)' }}>Ends in <span className="tab">{clock(left)}</span></span></div>
          <div className="players">
            <div><div className="av pro"><img src="/img/face.jpg" alt="" style={{ objectPosition: 'center 30%' }} loading="lazy" /></div><div className="pname">Amara</div><div className="psub">Southwark · Pro</div></div>
            <div className="vsword">VS</div>
            <div><div className="av opp"><img src="/img/black.jpg" alt="" style={{ objectPosition: 'center 22%' }} loading="lazy" /></div><div className="pname">Kemi</div><div className="psub">Hackney · Black</div></div>
          </div>
          <div className="score"><div>{fmt(me)}</div><div>{fmt(them)}</div></div>
          <div className="bar"><i className="me" style={{ width: (me / t) * 99 + '%' }} /><i className="them" style={{ width: (them / t) * 99 + '%' }} /></div>
          <div className="vs-row">
            <span className="mono">Stake</span>
            <Choice className="seg" label="Stake" options={STAKES} value={stake} onChange={setStake} render={(s) => `${s} OUT`} />
          </div>
          <div className="vs-row"><span className="mono">Winner takes</span><span className="pot"><span>{fmt(+stake * 2)}</span> OUT</span></div>
          <button className="btn btn-p" type="button" onClick={() => { countTo(meRef.current, meRef.current + 1640, setMe); toast('Walk home added: +1,640 steps'); }}>Add a walk home <Arrow /></button>
        </div>
      </div>
      <Mist />
    </section>
  );
}

const CITIES = {
  Manchester: { img: '/img/manc.jpg', alt: 'Manchester street at night', r: 3.98e6, pos: 'center' },
  Birmingham: { img: '/img/birmingham.jpg', alt: 'A runner stretching by a Birmingham canal at night', r: 4.36e6, pos: 'center 40%' },
};
type City = keyof typeof CITIES;
const mil = (v: number) => (v / 1e6).toFixed(2) + 'M';

function Cities() {
  const [opp, setOpp] = useState<City>('Manchester');
  const [img, setImg] = useState<City>('Manchester');
  const [fade, setFade] = useState(false);
  const [cl, setCl] = useState(4.21e6);
  const [cr, setCr] = useState(3.98e6);
  const crRef = useRef(cr);
  crRef.current = cr;
  useEffect(() => {
    const t = setInterval(() => { setCl((v) => v + Math.random() * 900); setCr((v) => v + Math.random() * 850); }, 2000);
    return () => clearInterval(t);
  }, []);
  const pick = (c: City) => {
    setOpp(c);
    setFade(true);
    setTimeout(() => { setImg(c); setFade(false); }, 250);
    countTo(crRef.current, CITIES[c].r, setCr, 700);
  };
  const t = cl + cr;
  const ci = CITIES[img];
  return (
    <section className="band" id="cities">
      <div className="wrap">
        <div className="head">
          <div><div className="kick" style={{ marginBottom: 16 }}>City vs city · example match</div><h2 className="disp h2">Your borough.<br /><span className="b">Your city.</span></h2></div>
          <p className="lede">Every week, 500 Londoners are drawn at random to play for the city. Keep moving and you might be one of them.</p>
        </div>
        <div className="versus rv">
          <div className="side l"><img src="/img/hill.jpg" alt="London skyline at night with walkers on the ridge" style={{ objectPosition: '30% center' }} loading="lazy" /><div className="mono">Squad of 500</div><div className="city">London</div><div className="big tab">{mil(cl)}</div><div className="mono">steps today</div></div>
          <div className="side r"><img src={ci.img} alt={ci.alt} style={{ objectPosition: ci.pos, opacity: fade ? 0 : 1 }} loading="lazy" /><div className="mono">Squad of 500</div><div className="city">{opp}</div><div className="big tab">{mil(cr)}</div><div className="mono">steps today</div></div>
          <div className="vsbadge">VS</div>
        </div>
        <div className="citybar"><div className="bar"><i className="me" style={{ width: (cl / t) * 99 + '%' }} /><i className="them" style={{ width: (cr / t) * 99 + '%' }} /></div></div>
        <div className="cityctl">
          <span className="chip"><i className="dot live" />Live · day 4 of 7</span>
          <Choice className="seg" label="Opponent" options={Object.keys(CITIES) as City[]} value={opp} onChange={pick} />
        </div>
        <div className="facts">
          <div><b className="tab">32</b><span>London boroughs, each with its own league</span></div>
          <div><b className="tab">500</b><span>Londoners called up each week</span></div>
          <div><b className="tab">6</b><span>weeks in a season, then the National Cup</span></div>
          <div><b className="tab">+10%</b><span>bonus when your city turns out</span></div>
        </div>
      </div>
    </section>
  );
}

function LondonMap() {
  const { stats, me, live } = useSite();
  const [b, setB] = useState<Borough>(DEFAULT_BOROUGH);
  useEffect(() => { if (me) setB(me.borough); }, [me]);
  const v = stats.boroughs[b];
  return (
    <section className="band" id="map" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="head">
          <div><div className="kick" style={{ marginBottom: 16 }}>32 boroughs{live ? '' : ' · example figures'}</div><h2 className="disp h2">London,<br /><span className="b">lit by the list</span></h2></div>
          <p className="lede">Every borough glows brighter as its waitlist grows. At 1,000 names it opens. Tap one to see how close it is.</p>
        </div>
        <div className="mapwrap">
          <div><BoroughMap selected={b} onPick={setB} /><MapLegend /></div>
          <div className="card mapcard rv" aria-live="polite">
            <span className="kick">Rank {rankOf(stats, b)} of 32</span>
            <h3>{b}</h3>
            <div className="stat"><span>On the list</span><b className="tab">{fmt(v)}</b></div>
            <div className="meter"><i style={{ width: Math.min(100, (v / OPEN_AT) * 100) + '%' }} /></div>
            <div className="stat"><span>To go until it opens</span><b className="tab">{fmt(Math.max(0, OPEN_AT - v))}</b></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <JoinButton borough={b}>Join the {shortName(b)} list</JoinButton>
              <a className="btn btn-q" href={`/boroughs/${slug(b)}`}>See the borough</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const BILLING = ['Monthly', 'Yearly · save 30%'] as const;
const Li = ({ children }: { children: React.ReactNode }) => <li><Tick />{children}</li>;
const cell = (c: string | boolean) =>
  c === true ? <span className="v on"><Tick w={2} label="Included" /></span>
  : c === false ? <span className="v no"><span aria-label="Not included">–</span></span>
  : <span className="v">{c}</span>;

function Membership() {
  const [bill, setBill] = useState<(typeof BILLING)[number]>('Monthly');
  const y = bill !== 'Monthly';
  const { pro, black } = SITE.prices;
  return (
    <section className="band" id="membership" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="head">
          <div><div className="kick" style={{ marginBottom: 16 }}>Membership</div><h2 className="disp h2">Free to play.<br /><span className="b">Built to go further.</span></h2></div>
          <Choice className="seg" label="Billing" options={BILLING} value={bill} onChange={setBill} />
        </div>
        <div className="tiers">
          <article className="tier rv">
            <div className="obj"><img src="/img/coin.jpg" alt="" loading="lazy" /></div>
            <div className="tname"><h3>Free</h3></div>
            <div className="price"><b>£0</b><span>forever</span></div>
            <div className="note">Everything you need to start</div>
            <ul><Li>Every step counted, every day</Li><Li>One crew and your borough league</Li><Li>Three 1v1 battles a week</Li><Li>A shot at the city squad</Li></ul>
            <JoinButton className="btn btn-q" />
          </article>
          <article className="tier pro rv">
            <div className="obj"><img src="/img/procard.jpg" alt="" loading="lazy" /></div>
            <div className="tname"><h3>Pro</h3><span className="mark p">PRO</span></div>
            <div className="price"><b className="tab">{y ? pro.y : pro.m}</b><span>{y ? 'a year' : 'a month'}</span></div>
            <div className="note">{y ? pro.yNote : 'Cancel any time'}</div>
            <ul><Li>Unlimited crews and battles</Li><Li>Full stats, routes and streak history</Li><Li>Double OUT on season rewards</Li><Li>The blue Pro ring on your photo</Li></ul>
            <JoinButton />
          </article>
          <article className="tier black rv">
            <div className="obj"><img src="/img/blackcard.jpg" alt="" loading="lazy" /></div>
            <div className="tname"><h3>Black</h3><span className="mark k">BLACK</span></div>
            <div className="price"><b className="tab">{y ? black.y : black.m}</b><span>{y ? 'a year' : 'a month'}</span></div>
            <div className="note">By invitation only</div>
            <ul><Li>Everything in Pro</Li><Li>Members' nights across London</Li><Li>First access to every drop</Li><Li>The gunmetal Black ring</Li></ul>
            <InviteButton />
          </article>
        </div>
        <p className="small">Prices are placeholders until launch.</p>

        <div className="compare rv">
          <PillTabs label="Feature groups" tabs={COMPARE.map(([k, l]) => [k, l] as [string, string])} head={<h3 className="disp">Compare<br />every feature</h3>}>
            {COMPARE.map(([k, , rows]) => (
              <TabPanel key={k} value={k} className="cmp">
                <div className="row h" aria-hidden="true"><span>Feature</span><span className="v">Free</span><span className="v">Pro</span><span className="v">Black</span></div>
                {rows.map(([f, tip, a, b, c]) => (
                  <div className="row" key={f}>
                    <span className="f">{f}<Tip text={tip} label={f} /></span>
                    {cell(a)}{cell(b)}{cell(c)}
                  </div>
                ))}
              </TabPanel>
            ))}
          </PillTabs>
        </div>

        <div className="blackband rv">
          <figure><img src="/img/black.jpg" alt="A woman in a gunmetal jacket standing still as commuters blur past" loading="lazy" /></figure>
          <div className="copy">
            <div className="ring"><img src="/img/black.jpg" alt="" loading="lazy" /></div>
            <span className="mark k" style={{ alignSelf: 'flex-start' }}>BLACK</span>
            <h2 className="disp" style={{ fontSize: 'clamp(46px,5.6vw,84px)' }}>Stand still<br />while London<br />rushes past</h2>
            <p className="lede">Black is for people who move the city. A small membership with its own nights, its own drops and a ring everyone notices. Members invite members, and a few places open to the waitlist each month.</p>
            <div><InviteButton /></div>
          </div>
          <Mist />
        </div>
      </div>
    </section>
  );
}

function CrewsTeaser() {
  const { stats, live } = useSite();
  const [q, setQ] = useState('');
  return (
    <section className="band" id="crews" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="head">
          <div><div className="kick" style={{ marginBottom: 16 }}>Run clubs · Founding 500</div><h2 className="disp h2">Your run club<br /><span className="b">is your crew</span></h2></div>
          <p className="lede">Crews on Outhere are real run clubs. Captains claim their club, members join it, and every step they take counts for the club. The first 500 clubs get a founding crest for life.</p>
        </div>
        <div className="crews">
          <figure className="rv"><img src="/img/club.jpg" alt="A run club setting off together under a railway bridge at night" style={{ objectPosition: '60% center' }} loading="lazy" /><div className="crest"><img src="/img/crest.jpg" alt="Founding crest" loading="lazy" /></div></figure>
          <div className="panel rv">
            <span className="kick">Find your club</span>
            <form noValidate style={{ display: 'grid', gap: 14 }} onSubmit={(e) => { e.preventDefault(); location.href = '/crews' + (q.trim() ? `?q=${encodeURIComponent(q.trim())}#find` : ''); }}>
              <div className="field"><label htmlFor="clubQ">Run club name</label><input id="clubQ" placeholder="Try Bermondsey or Peckham" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="btn btn-p" type="submit">Find my club</button>
            </form>
            <div className="feat" style={{ margin: '4px 0 0' }}>
              <div><span className="mono">Claim</span><p>Captains and organisers claim the club's official crew.</p></div>
              <div><span className="mono">Build</span><p>Invite members, post your weekly runs and set crew goals.</p></div>
              <div><span className="mono">Play</span><p>Climb your borough league and take on rival clubs.</p></div>
            </div>
            <span className="mono" style={{ color: 'var(--ink-muted)' }}><span className="tab">{stats.clubsClaimed}</span> of 500 founding places claimed{live ? '' : ' · example figure'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppSection() {
  const arc = useRef<SVGCircleElement>(null);
  const [steps, setSteps] = useState(8412);
  useEffect(() => {
    if (prefersReducedMotion() || !arc.current) return;
    setSteps(0);
    let stop = () => {};
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); stop = countTo(0, 8412, setSteps, 1600); } });
    io.observe(arc.current);
    return () => { io.disconnect(); stop(); };
  }, []);
  return (
    <section className="band" id="app" style={{ paddingTop: 0 }}>
      <div className="wrap appgrid">
        <div className="stage rv">
          <img src="/img/phone.jpg" alt="" loading="lazy" />
          <div className="phone" role="img" aria-label="The Outhere app home screen">
            <div className="scr">
              <span className="isl" />
              <span className="gk">TUESDAY · 13 DAY STREAK</span>
              <div className="gn">Evening,<br /><span>Amara</span></div>
              <div className="ringw">
                <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#1b1f26" strokeWidth="7" /><circle ref={arc} cx="50" cy="50" r="43" fill="none" stroke="#3d8bff" strokeWidth="7" strokeLinecap="round" strokeDasharray="270.2" strokeDashoffset={270.2 * (1 - steps / 10000)} /></svg>
                <div className="c"><div><b>{fmt(steps)}</b><small>of 10,000 steps</small></div></div>
              </div>
              <div className="mini"><img src="/img/crew.jpg" alt="" loading="lazy" /><div><b>Peckham Night Walkers</b><span>2nd in Southwark</span></div><em>+412</em></div>
              <div className="mini"><img src="/img/hill.jpg" alt="" style={{ objectPosition: '30% center' }} loading="lazy" /><div><b>London vs Manchester</b><span>You're in the squad</span></div><em>LIVE</em></div>
            </div>
          </div>
        </div>
        <div>
          <div className="kick" style={{ marginBottom: 16 }}>The app</div>
          <h2 className="disp h2">Phone in<br /><span className="b">pocket</span></h2>
          <div className="feat">
            <div><span className="mono">Counts</span><p>Steps come straight from your phone or watch. No starting and stopping, nothing to log.</p></div>
            <div><span className="mono">Plays</span><p>Battles, crew goals and the weekly city draw, all on one calm home screen.</p></div>
            <div><span className="mono">Pays</span><p>Earn OUT for every streak and win, then spend it on drops and members' nights.</p></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <JoinButton>Get early access</JoinButton>
            {SITE.appDemoUrl && <a className="btn btn-q" href={SITE.appDemoUrl} target="_blank" rel="noopener">See the app demo</a>}
          </div>
          <p className="small">iPhone and Android, launching in London first.</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // Highlight the nav link for the section in view.
  useEffect(() => {
    const so = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      document.querySelectorAll('.nav ul a').forEach((a) => a.classList.toggle('act', a.getAttribute('href') === '/#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['how', 'membership'].forEach((id) => { const el = document.getElementById(id); if (el) so.observe(el); });
    return () => so.disconnect();
  }, []);
  return (
    <main>
      <Hero />
      <Manifesto />
      <How />
      <Battle />
      <Cities />
      <LondonMap />
      <Membership />
      <CrewsTeaser />
      <AppSection />
      <section className="band" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap faqwrap">
          <div><div className="kick" style={{ marginBottom: 16 }}>Questions</div><h2 className="disp h2">Good<br /><span className="b">questions</span></h2><p className="lede">The things people ask before they join.</p></div>
          <Faq items={FAQ} />
        </div>
      </section>
      <section className="final on-photo" id="join">
        <div className="bgp" aria-hidden="true" />
        <div className="wrap">
          <div className="kick" style={{ marginBottom: 22 }}>London first</div>
          <h2 className="disp">See you<br /><span className="b">out there</span></h2>
          <WaitlistForm id="endEmail" />
          <ListCount />
        </div>
        <Mist />
      </section>
    </main>
  );
}
