import { useEffect, useRef, useState } from 'react';
import { JoinButton } from '../components/Chrome';
import { BoroughSelect, Mist } from '../components/controls';
import { BoroughMap, MapLegend } from '../components/kit';
import { rankOf, useCopy, useSite } from '../components/Site';
import { SITE } from '../content/site';
import { type Borough as B, BOROUGHS, EXAMPLE_CLUBS, initials, OPEN_AT, shortName, slug } from '../lib/boroughs';
import { countTo, fmt } from '../lib/format';

const go = (b: B) => { location.href = `/boroughs/${slug(b)}`; };

export default function Borough({ borough }: { borough: B }) {
  const site = useSite();
  const copy = useCopy();
  const share = useRef<HTMLElement>(null);
  const n = site.stats.boroughs[borough];
  const [deep, setDeep] = useState(n);
  const first = useRef(true);
  useEffect(() => {
    const stop = countTo(first.current ? 0 : deep, n, setDeep, 900);
    first.current = false;
    return stop;
  }, [n]);
  const pct = Math.min(100, (n / OPEN_AT) * 100);
  const clubs = site.live
    ? site.stats.clubs.filter((c) => c.borough === borough).map((c) => c.name)
    : EXAMPLE_CLUBS.filter((c) => c.borough === borough).map((c) => c.name);
  const ranked = [...BOROUGHS].sort((a, c) => site.stats.boroughs[c] - site.stats.boroughs[a]);
  const max = site.stats.boroughs[ranked[0]] || 1;
  const short = shortName(borough);

  return (
    <main>
      <section className="phero on-photo">
        <div className="ph" style={{ backgroundImage: 'url(/img/borough.jpg)', backgroundPosition: 'center 30%' }} aria-hidden="true" />
        <div className="wrap">
          <div className="crumbs mono"><a href="/">Outhere</a><span>/</span><a href="/boroughs">Boroughs</a><span>/</span><span>{borough}</span></div>
          <h1 className="disp"><span style={{ display: 'block' }}>{borough}</span><span className="b" style={{ display: 'block' }}><span className="tab">{fmt(deep)}</span> deep</span></h1>
          <div className="row">
            <p className="lede" style={{ color: 'var(--ink)' }}>{borough} opens on Outhere when 1,000 people are on the list. Every friend you bring gets it there sooner.</p>
            <div className="field" style={{ minWidth: 'min(300px,100%)' }}><label htmlFor="pick" style={{ color: 'var(--ink-soft)' }}>Switch borough</label><BoroughSelect id="pick" value={borough} onChange={go} /></div>
          </div>
        </div>
        <Mist />
      </section>

      <section className="band">
        <div className="wrap">
          <div className="secmark mono"><span>{site.live ? 'Live figures' : 'Example figures for now'}</span><span>Updated just now</span></div>
          <div className="facts" style={{ margin: '0 0 14px' }}>
            <div><b className="tab">{fmt(n)}</b><span>people on the list</span></div>
            <div><b className="tab">{rankOf(site.stats, borough)}/32</b><span>London rank</span></div>
            <div><b className="tab">{clubs.length}</b><span>run clubs claimed</span></div>
            <div><b className="tab">{fmt(Math.max(0, OPEN_AT - n))}</b><span>to go until it opens</span></div>
          </div>
          <div className="card rv" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><span className="kick">Opening progress</span><span className="mono" style={{ color: 'var(--ink-muted)' }}><span className="tab">{Math.round(pct)}</span>% of 1,000</span></div>
            <div className="meter" style={{ height: 14 }}><i style={{ width: pct + '%' }} /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <JoinButton borough={borough}>Join the {short} list</JoinButton>
              <div className="link" style={{ flex: 1, minWidth: 'min(320px,100%)' }}><code ref={share}>{SITE.host}/boroughs/{slug(borough)}</code><button className="btn btn-q" type="button" onClick={() => copy(share.current, 'Borough link copied')}>Copy link</button></div>
            </div>
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="pic photoband rv"><img src="/img/dawn.jpg" alt="A runner on the Thames path in dawn mist" style={{ objectPosition: '30% center' }} loading="lazy" /><span className="mono">Before the city wakes</span><h3>Your borough,<br />your league</h3><p>The early laps, the commute and the long way home all count for <span>{borough}</span>.</p></div>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap grid2">
          <div>
            <div className="kick" style={{ marginBottom: 16 }}>London league</div>
            <h2 className="disp h2" style={{ fontSize: 'clamp(46px,6vw,92px)' }}>32 boroughs.<br /><span className="b">One table.</span></h2>
            <p className="lede" style={{ marginTop: 20 }}>When we launch, every borough plays its own league and the table below becomes live steps. For now it ranks the waitlist. Tap a borough to see it.</p>
            <div className="card rv" style={{ marginTop: 28 }}><BoroughMap selected={borough} onPick={go} /><MapLegend /></div>
            <div className="card rv" style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <span className="kick">Run clubs in {borough}</span>
              <div className="results">
                {clubs.length ? clubs.map((c) => (
                  <div className="club" key={c}><span className="ini">{initials(c)}</span><div className="nm"><b>{c}</b><span>{site.live ? 'Founding club' : 'Example club'}</span></div></div>
                )) : <div className="club"><span className="ini">+</span><div className="nm"><b>No clubs claimed yet</b><span>Be the first club in {borough}</span></div></div>}
              </div>
              <a className="btn btn-q" href="/crews#find" style={{ justifySelf: 'start' }}>Claim your club</a>
            </div>
          </div>
          <div className="lb rv">
            {ranked.map((x, i) => (
              <div className={'lbr' + (x === borough ? ' me' : '')} key={x}>
                <span className="rk">{i + 1}</span>
                <a className="nm" href={`/boroughs/${slug(x)}`}>{x}</a>
                <div className="meter"><i style={{ width: (site.stats.boroughs[x] / max) * 100 + '%' }} /></div>
                <span className="v">{fmt(site.stats.boroughs[x])}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final on-photo">
        <div className="bgp" style={{ backgroundImage: 'url(/img/sun.jpg)', backgroundPosition: '35% center' }} aria-hidden="true" />
        <div className="wrap">
          <div className="kick" style={{ marginBottom: 22 }}>Next up: {borough}</div>
          <h2 className="disp">Bring it<br /><span className="b">into the light</span></h2>
          <p className="lede" style={{ margin: '20px auto 0', color: 'var(--ink)' }}>Every name on the list brings opening day closer. Share the link with the people you run with.</p>
          <div style={{ marginTop: 28 }}><JoinButton borough={borough}>Join the {short} list</JoinButton></div>
        </div>
        <Mist />
      </section>
    </main>
  );
}
