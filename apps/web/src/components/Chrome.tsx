import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { SITE } from '../content/site';
import { fmt, prefersReducedMotion } from '../lib/format';
import { type Place } from '../lib/places';
import { Close, SOCIAL } from './icons';
import { Logo } from './Logo';
import { useSite } from './Site';
import { WaitlistForm } from './WaitlistDialog';

export type PageKey = 'home' | 'crews' | 'borough' | 'black' | 'privacy' | 'notfound';

const LINKS: [string, string, string][] = [
  ['How it works', '/#how', 'how'],
  ['Crews', '/crews', 'crews'],
  ['Cities', '/#map', 'borough'],
  ['Black', '/black', 'black'],
  ['Membership', '/#membership', 'membership'],
];

/** Any "Join the waitlist" button. In the nav it shows your place once you have joined. */
export function JoinButton({ children = 'Join the waitlist', place, className = 'btn btn-p', showPlace, id }: {
  children?: React.ReactNode; place?: Place; className?: string; showPlace?: boolean; id?: string;
}) {
  const { me, openWaitlist } = useSite();
  const placed = showPlace && me;
  return (
    <button id={id} type="button" className={className} onClick={() => (placed ? openWaitlist({ step: 3 }) : openWaitlist({ place }))}>
      {placed ? `#${fmt(me.position)} on the list` : children}
    </button>
  );
}

export const InviteButton = ({ children = 'Request an invite' }: { children?: React.ReactNode }) => {
  const { openWaitlist } = useSite();
  return <button type="button" className="btn btn-gm" onClick={() => openWaitlist({ invite: true })}>{children}</button>;
};

export function Nav({ page, active }: { page: PageKey; active?: string }) {
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  useEffect(() => {
    const f = () => setSolid(scrollY > 60);
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);
  const cur = active ?? page;

  // Drag the menu sheet down to dismiss it.
  const onTouchStart = (e: React.TouchEvent) => { drag.current = { y: e.touches[0].clientY, dy: 0 }; sheet.current?.classList.add('dragging'); };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onTouchEnd = () => {
    const el = sheet.current;
    if (!el || !drag.current) return;
    el.classList.remove('dragging');
    if (drag.current.dy > 110) {
      el.style.transform = 'translateY(100%)';
      setTimeout(() => setMenu(false), 320);
    } else el.style.transform = '';
    drag.current = null;
  };

  return (
    <>
      <header className={'nav' + (solid ? ' solid' : '')} id="nav">
        <Logo />
        <ul>
          {LINKS.map(([label, href, k]) => (
            <li key={k}><a href={href} className={k === cur ? 'act' : undefined} aria-current={k === page ? 'page' : undefined}>{label}</a></li>
          ))}
        </ul>
        <JoinButton showPlace />
        <Dialog.Root open={menu} onOpenChange={setMenu}>
          <Dialog.Trigger className="burger" aria-label="Open menu"><span /></Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Content className="sheet" ref={sheet} aria-describedby={undefined} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <Dialog.Title className="sr-only">Menu</Dialog.Title>
              <span className="grab" aria-hidden="true" />
              <Dialog.Close className="burger x" style={{ display: 'inline-flex' }} aria-label="Close menu"><Close /></Dialog.Close>
              {LINKS.map(([label, href, k]) => <a key={k} className="l" href={href} onClick={() => setMenu(false)}>{label}</a>)}
              <span onClickCapture={() => setMenu(false)} style={{ display: 'contents' }}><JoinButton showPlace /></span>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
    </>
  );
}

const FCOLS: [string, [string, string][]][] = [
  ['Outhere', [['How it works', '/#how'], ['1v1 battles', '/#battles'], ['City vs city', '/#cities'], ['Membership', '/#membership'], ['The app', '/#app']]],
  ['Across the UK', [['Ten launch cities', '/#map'], ['Towns and regions', '/#map'], ['London boroughs', '/boroughs'], ['Hackney', '/boroughs/hackney'], ['Southwark', '/boroughs/southwark']]],
  ['Run clubs', [['Claim your club', '/crews#find'], ['For captains', '/crews#captains'], ['Founding 500', '/crews#founding'], ['Find a club near you', '/crews#find']]],
  ['Black', [['Request an invite', '/black#request'], ['How invites work', '/black#invites'], ["Members' nights", '/black#perks']]],
  ['Company', [['About', '/#why'], ['Press kit', ''], ['Careers', ''], ['Contact', '']]],
  ['Legal', [['Privacy notice', '/privacy'], ['Terms', ''], ['Cookies', '']]],
];

export function Footer() {
  const { toast } = useSite();
  return (
    <footer>
      <div className="wrap">
        <div className="ftop">
          <div className="fbrand">
            <Logo style={{ justifySelf: 'start' }} />
            <p>Every step counts for your crew, your area and your city. Anyone in the UK can join on day one.</p>
            <WaitlistForm />
            <div className="stores">
              <span className="store"><b>App Store</b><small>Coming soon</small></span>
              <span className="store"><b>Google Play</b><small>Coming soon</small></span>
            </div>
          </div>
          <nav className="fcols" aria-label="Footer">
            {FCOLS.map(([h, links]) => (
              <div className="fcol" key={h}>
                <h4 className="mono">{h}</h4>
                {links.map(([l, href]) => href ? <a key={l} href={href}>{l}</a> : <span key={l} className="soon">{l}<em>Soon</em></span>)}
              </div>
            ))}
          </nav>
        </div>
        <div className="fsocial">
          {SOCIAL.map(([n, icon]) => {
            const svg = <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>;
            const href = SITE.social[n];
            return href
              ? <a key={n} className="soc" href={href} target="_blank" rel="noopener noreferrer">{svg}{n}</a>
              : <button key={n} type="button" className="soc" onClick={() => toast(`${n} comes at launch`)}>{svg}{n}</button>;
          })}
          {Object.values(SITE.social).some((v) => !v) && <span className="mono fnote">Handles go live at launch</span>}
        </div>
        <p className="fmark" aria-hidden="true">Outhere</p>
        <div className="fgrid mono">
          <span>© 2026 Outhere · Made in London</span>
          <span>Launch nights in ten UK cities</span>
          <button type="button" className="totop mono" onClick={() => scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}>Back to top ↑</button>
        </div>
      </div>
    </footer>
  );
}

/** Film grain over the whole site: a small noise tile drawn once on a canvas. */
export function Grain() {
  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const x = c.getContext('2d');
    if (!x) return;
    const d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
  }, []);
  return <div className="grain" aria-hidden="true" />;
}

/** Elements below the fold rise gently into place; anything already on screen stays put. */
export function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.rv')];
    if (prefersReducedMotion()) { els.forEach((el) => el.classList.add('in')); return; }
    const ro = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.remove('wait'); e.target.classList.add('in'); ro.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el, i) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('wait');
        el.style.transitionDelay = (i % 3) * 60 + 'ms';
        ro.observe(el);
      } else el.classList.add('in');
    });
    return () => ro.disconnect();
  }, []);
}

/** A new page opens at the top; a link to a section lands on that section. */
export function useLanding() {
  useEffect(() => {
    try { history.scrollRestoration = 'manual'; } catch { /* old browsers */ }
    const land = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const t = id && document.getElementById(id);
      if (t) t.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
      else scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    };
    land();
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) land(); };
    addEventListener('load', land);
    addEventListener('pageshow', onShow);
    return () => { removeEventListener('load', land); removeEventListener('pageshow', onShow); };
  }, []);
}
