import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addTo, DEMO_STATS, EMPTY_STATS, fetchStats, LIVE, type Stats } from '../lib/api';
import { type Borough, BOROUGHS, isBorough } from '../lib/boroughs';
import { CITIES, type CityId, DEFAULT_PLACE, type Place, readPlace } from '../lib/places';
import { local } from '../lib/format';
import { WaitlistDialog } from './WaitlistDialog';

export type Me = { email: string; place: Place; position: number; code: string };
export type OpenOpts = { step?: 1 | 2 | 3; place?: Place; invite?: boolean; email?: string; error?: string };

/** Your place on the list as this browser saved it. Older saves only held a London borough. */
function readMe(v: unknown): Me | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const place = readPlace(o.place) ?? (isBorough(o.borough) ? { city: 'london' as const, borough: o.borough } : null);
  if (!place || typeof o.email !== 'string' || typeof o.position !== 'number' || typeof o.code !== 'string') return null;
  return { email: o.email, place, position: o.position, code: o.code };
}

type Site = {
  stats: Stats;
  /** True once real figures have loaded (always true for the example figures). */
  ready: boolean;
  live: boolean;
  me: Me | null;
  setMe: (m: Me) => void;
  ref: string;
  openWaitlist: (o?: OpenOpts) => void;
  toast: (msg: string) => void;
  bump: (p: Place) => void;
};

const Ctx = createContext<Site | null>(null);
export const useSite = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSite outside SiteProvider');
  return c;
};

export const rankOf = (stats: Stats, b: Borough) => [...BOROUGHS].sort((x, y) => stats.boroughs[y] - stats.boroughs[x]).indexOf(b) + 1;
export const cityRank = (stats: Stats, c: CityId) => CITIES.map((x) => x.id).sort((x, y) => stats.cities[y] - stats.cities[x]).indexOf(c) + 1;

export function SiteProvider({ children, defaultPlace = DEFAULT_PLACE }: { children: React.ReactNode; defaultPlace?: Place }) {
  const [stats, setStats] = useState<Stats>(LIVE ? EMPTY_STATS : DEMO_STATS);
  const [ready, setReady] = useState(!LIVE);
  const [me, setMeState] = useState<Me | null>(null);
  const [ref, setRef] = useState('');
  const [dlg, setDlg] = useState<(OpenOpts & { open: boolean; key: number }) | null>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; key: number } | null>(null);
  const tt = useRef<number | undefined>(undefined);

  useEffect(() => {
    setMeState(readMe(local.get('me')));
    // Invite links arrive as /i/CODE (rewritten to the home page) or ?ref=CODE.
    const m = location.pathname.match(/^\/i\/([A-Za-z0-9]{1,24})\/?$/);
    const q = new URLSearchParams(location.search).get('ref');
    const code = (m?.[1] || q || '').toUpperCase();
    if (code) {
      local.set('ref', code);
      history.replaceState(null, '', '/' + location.hash);
    }
    setRef(code || local.get<string>('ref') || '');
    if (LIVE) {
      fetchStats().then((s) => { setStats(s); setReady(true); }).catch(() => setReady(false));
    } else {
      const t = local.get<number>('demo_total');
      const c = local.get<number>('demo_claimed');
      if (t || c) setStats((s) => ({ ...s, total: t ?? s.total, clubsClaimed: c ?? s.clubsClaimed }));
    }
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg({ msg, key: Date.now() });
    clearTimeout(tt.current);
    tt.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const setMe = useCallback((m: Me) => { local.set('me', m); setMeState(m); }, []);
  const bump = useCallback((p: Place) => setStats((s) => addTo(s, p)), []);
  const openWaitlist = useCallback((o: OpenOpts = {}) => setDlg({ ...o, open: true, key: Date.now() }), []);

  const value = useMemo<Site>(() => ({ stats, ready, live: LIVE, me, setMe, ref, openWaitlist, toast, bump }), [stats, ready, me, setMe, ref, openWaitlist, toast, bump]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {dlg && (
        <WaitlistDialog
          key={dlg.key}
          open={dlg.open}
          onOpenChange={(open) => setDlg((d) => (d ? { ...d, open } : d))}
          opts={dlg}
          defaultPlace={me?.place || defaultPlace}
        />
      )}
      {toastMsg && <div className="toast" role="status" key={toastMsg.key}>{toastMsg.msg}</div>}
    </Ctx.Provider>
  );
}

/** Copy a link, falling back to selecting it when the clipboard is blocked. */
export function useCopy() {
  const { toast } = useSite();
  return (el: HTMLElement | null, msg = 'Link copied') => {
    if (!el) return;
    const text = el.textContent || '';
    const select = () => { getSelection()?.selectAllChildren(el); toast('Link selected, press copy'); };
    if (navigator.clipboard) navigator.clipboard.writeText('https://' + text).then(() => toast(msg)).catch(select);
    else select();
  };
}
