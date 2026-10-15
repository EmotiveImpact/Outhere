import { useEffect, useRef } from 'react';
import { type Move, REEL } from '../content/home';
import { prefersReducedMotion } from '../lib/format';

const M: Record<Move, [string, string]> = {
  push: ['scale(1.04)', 'scale(1.12)'], punch: ['scale(1.18)', 'scale(1.08)'], rush: ['scale(1)', 'scale(1.28)'],
  rise: ['scale(1.1) translateY(2%)', 'scale(1.16) translateY(-2%)'],
  driftL: ['scale(1.1) translateX(2%)', 'scale(1.1) translateX(-2%)'], driftR: ['scale(1.1) translateX(-2%)', 'scale(1.1) translateX(2%)'],
  whipL: ['scale(1.14) translateX(5%)', 'scale(1.1) translateX(-3%)'], whipR: ['scale(1.14) translateX(-5%)', 'scale(1.1) translateX(3%)'],
};
const EASE: Partial<Record<Move, string>> = { push: 'cubic-bezier(.2,.6,.3,1)', rush: 'cubic-bezier(.5,0,.9,.6)', punch: 'cubic-bezier(.1,.9,.2,1)' };

/**
 * Connected night shots cut to a rhythm: a long hold on the hero frame, a burst of quick
 * cuts, then back round. Still for reduced motion; pauses off screen and in background tabs.
 */
export function HeroReel({ watch }: { watch: React.RefObject<HTMLElement> }) {
  const reel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = reel.current;
    if (!root || prefersReducedMotion() || !watch.current) return;
    const imgs = [...root.querySelectorAll('img')];
    const flash = root.querySelector<HTMLElement>('.flash')!;
    const sweep = root.querySelector<HTMLElement>('.sweep')!;
    const cache = REEL.map((s) => { const i = new Image(); i.decoding = 'async'; i.src = '/img/' + s[0]; return i; });
    let i = 0, front = 0, timer = 0, running = false, vis = true;
    const show = () => {
      const s = REEL[i], el = imgs[front ^ 1];
      el.src = cache[i].src;
      el.style.objectPosition = s[3];
      const [a, b] = M[s[2]];
      el.animate([{ transform: a }, { transform: b }], { duration: s[1] + 260, easing: EASE[s[2]] || 'linear', fill: 'both' });
      el.style.opacity = '1';
      imgs[front].style.opacity = '0';
      front ^= 1;
      root.classList.add('on');
      timer = window.setTimeout(() => {
        if (s[4] === 'flash') flash.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.3 }, { opacity: 0 }], { duration: 240, easing: 'ease-out' });
        if (s[4] === 'sweep') sweep.animate([{ transform: 'translateX(-110%) skewX(-18deg)', opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: 'translateX(110%) skewX(-18deg)', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.5,0,.2,1)' });
        i = (i + 1) % REEL.length;
        if (running) show();
      }, s[1]);
    };
    const start = () => { if (running) return; running = true; show(); };
    const stop = () => { running = false; clearTimeout(timer); };
    const ready = Promise.all(cache.slice(0, 5).map((c) => (c.decode ? c.decode().catch(() => {}) : 0)));
    const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis && !document.hidden) ready.then(start); else stop(); }, { threshold: 0.15 });
    io.observe(watch.current);
    const onVis = () => (document.hidden ? stop() : vis && start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [watch]);
  return (
    <div className="reel" ref={reel} aria-hidden="true"><img alt="" /><img alt="" /><i className="flash" /><i className="sweep" /></div>
  );
}
