import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_STATS, EMPTY_STATS, fetchStats, LIVE, type Stats } from '../lib/api';
import { type Borough, BOROUGHS, DEFAULT_BOROUGH } from '../lib/boroughs';
import { local } from '../lib/format';
import { WaitlistDialog } from './WaitlistDialog';

export type Me = { email: string; borough: Borough; position: number; code: string };
export type OpenOpts = { step?: 1 | 2 | 3; borough?: Borough; invite?: boolean; email?: string; error?: string };

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
  bump: (b: Borough) => void;
};

const Ctx = createContext<Site | null>(null);
export const useSite = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSite outside SiteProvider');
  return c;
};

export const rankOf = (stats: Stats, b: Borough) => [...BOROUGHS].sort((x, y) => stats.boroughs[y] - stats.boroughs[x]).indexOf(b) + 1;

export function SiteProvider({ children, defaultBorough = DEFAULT_BOROUGH }: { children: React.ReactNode; defaultBorough?: Borough }) {
  const [stats, setStats] = useState<Stats>(LIVE ? EMPTY_STATS : DEMO_STATS);
  const [ready, setReady] = useState(!LIVE);
  const [me, setMeState] = useState<Me | null>(null);
  const [ref, setRef] = useState('');
  const [dlg, setDlg] = useState<(OpenOpts & { open: boolean; key: number }) | null>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; key: number } | null>(null);
  const tt = useRef<number>();

  useEffect(() => {
    setMeState(local.get<Me>('me'));
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
  const bump = useCallback((b: Borough) => setStats((s) => ({ ...s, total: s.total + 1, boroughs: { ...s.boroughs, [b]: s.boroughs[b] + 1 } })), []);
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
          defaultBorough={me?.borough || defaultBorough}
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
