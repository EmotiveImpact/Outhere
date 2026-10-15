import * as Accordion from '@radix-ui/react-accordion';
import * as Popover from '@radix-ui/react-popover';
import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Borough, MAP } from '../lib/boroughs';
import { fmt, prefersReducedMotion } from '../lib/format';
import { useSite } from './Site';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** The little "i" next to a feature: hover on a mouse, tap on a phone, focus on a keyboard. */
export function Tip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const pointer = useRef('');
  const openedAt = useRef(0);
  const show = (v: boolean) => { if (v) openedAt.current = Date.now(); setOpen(v); };
  useEffect(() => {
    if (!open) return;
    const close = () => { if (Date.now() - openedAt.current > 300) setOpen(false); };
    addEventListener('scroll', close, { passive: true });
    return () => removeEventListener('scroll', close);
  }, [open]);
  const mouse = (e: React.PointerEvent) => e.pointerType === 'mouse';
  return (
    <Popover.Root open={open} onOpenChange={show}>
      <Popover.Trigger className="tip" aria-label={`About ${label}`}
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        onPointerEnter={(e) => mouse(e) && show(true)}
        onPointerLeave={(e) => mouse(e) && show(false)}
        // A mouse click keeps the hover tip open rather than toggling it shut.
        onClick={(e) => { if (pointer.current === 'mouse' && open) e.preventDefault(); pointer.current = ''; }}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && show(true)}
        onBlur={() => show(false)}>i</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="tippop rdx" side="top" sideOffset={10} collisionPadding={12} role="tooltip"
          onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>{text}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** FAQ accordion: one open at a time, collapsible, arrow keys between questions. */
export function Faq({ items }: { items: [string, React.ReactNode][] }) {
  const [open, setOpen] = useState('');
  return (
    <Accordion.Root type="single" collapsible value={open} onValueChange={setOpen} className="acc">
      {items.map(([q, a], i) => (
        <Accordion.Item key={i} value={'q' + i} className={'it' + (open === 'q' + i ? ' open' : '')}>
          <Accordion.Header asChild><h3 style={{ margin: 0 }}><Accordion.Trigger>{q}<span className="pm" aria-hidden="true" /></Accordion.Trigger></h3></Accordion.Header>
          <Accordion.Content className="pnl"><div><p>{a}</p></div></Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

/** Pill tabs with a springy thumb that slides under the selected tab. */
export function PillTabs({ tabs, label, head, children }: { tabs: [string, string][]; label: string; head: React.ReactNode; children: React.ReactNode }) {
  const [value, setValue] = useState(tabs[0][0]);
  const list = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ w: number; x: number } | null>(null);
  useIso(() => {
    const place = () => {
      const t = list.current?.querySelector<HTMLElement>('[data-state=active]');
      if (t) setThumb({ w: t.offsetWidth, x: t.offsetLeft });
    };
    place();
    addEventListener('resize', place);
    document.fonts?.ready.then(place);
    return () => removeEventListener('resize', place);
  }, [value]);
  return (
    <Tabs.Root value={value} onValueChange={setValue}>
      <div className="cmp-head">
        {head}
        <Tabs.List className="tabs" aria-label={label} ref={list}>
          <span className="thumb" aria-hidden="true" style={thumb ? { width: thumb.w, transform: `translateX(${thumb.x}px)` } : { opacity: 0 }} />
          {tabs.map(([v, l]) => <Tabs.Trigger key={v} value={v}>{l}</Tabs.Trigger>)}
        </Tabs.List>
      </div>
      {children}
    </Tabs.Root>
  );
}

export const TabPanel = Tabs.Content;

/** London tile map: 32 boroughs on a 9 by 6 grid, each lit by the size of its waitlist. */
export function BoroughMap({ selected, onPick }: { selected?: Borough; onPick: (b: Borough) => void }) {
  const { stats, me } = useSite();
  const el = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'hidden' | 'in' | 'done'>('done');
  const vals = Object.values(stats.boroughs);
  const max = Math.max(...vals), min = Math.min(...vals);
  useEffect(() => {
    if (prefersReducedMotion() || !el.current) return;
    if (el.current.getBoundingClientRect().top < innerHeight * 0.75) return;
    setPhase('hidden');
    let t = 0;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); setPhase('in'); t = window.setTimeout(() => setPhase('done'), 1400); }
    }, { threshold: 0.25 });
    io.observe(el.current);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
  return (
    <div className="bmap" ref={el} role="group" aria-label="Map of London boroughs">
      {MAP.map(([c, r, n, k]) => {
        const v = stats.boroughs[n];
        const a = 0.06 + 0.94 * Math.pow((v - min) / (max - min || 1), 1.5);
        return (
          <button key={n} type="button" data-lit={a > 0.45 ? 1 : 0} className={n === me?.borough ? 'me' : undefined} aria-pressed={n === selected} aria-label={`${n}, ${fmt(v)} on the list`}
            onClick={() => onPick(n)}
            style={{ gridColumn: c + 1, gridRow: r + 1, ['--lit' as string]: a.toFixed(2), ...(phase === 'hidden' ? { opacity: 0, transform: 'scale(.8)' } : phase === 'in' ? { transitionDelay: `${(c + r) * 55}ms` } : {}) }}>
            {k}
          </button>
        );
      })}
    </div>
  );
}

export const MapLegend = () => <div className="maplegend"><span>Quiet</span><i /><span>Ready to open</span></div>;

/** "4,213 Londoners on the list", gently ticking up while the figures are examples. */
export function ListCount() {
  const { stats, ready, live } = useSite();
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    if (live) return;
    const t = setInterval(() => { if (Math.random() < 0.5) setExtra((x) => x + 1); }, 5200);
    return () => clearInterval(t);
  }, [live]);
  if (!ready) return null;
  return <div className="count"><i className="dot" /><span><b className="tab">{fmt(stats.total + extra)}</b> Londoners on the list</span></div>;
}
