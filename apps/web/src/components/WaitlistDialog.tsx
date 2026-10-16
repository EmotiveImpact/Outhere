import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { joinWaitlist, placeCount } from '../lib/api';
import { shortName, slug } from '../lib/boroughs';
import { fmt, validEmail } from '../lib/format';
import { cityById, ELSEWHERE, type Place, TEAM_AT, theRegion } from '../lib/places';
import { MOVES, placeError } from '../lib/validate';
import { SITE } from '../content/site';
import { Choice, Honeypot, PlacePicker } from './controls';
import { Close } from './icons';
import { cityRank, type OpenOpts, rankOf, useCopy, useSite } from './Site';

const EMAIL_ERR = 'Enter an email address like name@example.com.';
const Prog = ({ n }: { n: number }) => (
  <div className="prog" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</div>
);

export function WaitlistDialog({ open, onOpenChange, opts, defaultPlace }: {
  open: boolean; onOpenChange: (o: boolean) => void; opts: OpenOpts; defaultPlace: Place;
}) {
  const site = useSite();
  const copy = useCopy();
  const invite = !!opts.invite;
  const [step, setStep] = useState(opts.step ?? 1);
  const [email, setEmail] = useState(opts.email ?? '');
  const [err, setErr] = useState(opts.error ?? '');
  const [place, setPlace] = useState<Place>(opts.place ?? defaultPlace);
  const [move, setMove] = useState<(typeof MOVES)[number]>('Walk');
  const [club, setClub] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(site.me && step === 3 ? { position: site.me.position, code: site.me.code, place: site.me.place } : null);
  const body = useRef<HTMLDivElement>(null);
  const inv = useRef<HTMLElement>(null);

  useEffect(() => {
    const f = body.current?.querySelector<HTMLElement>('input:not([tabindex="-1"]),select,button.btn');
    const t = setTimeout(() => f?.focus(), 60);
    return () => clearTimeout(t);
  }, [step]);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setErr(EMAIL_ERR);
    setErr('');
    setStep(2);
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    const where = place.city === ELSEWHERE ? { ...place, town: place.town.trim() } : place;
    const bad = placeError(where);
    if (bad) return setErr(bad);
    setBusy(true);
    setErr('');
    try {
      const r = await joinWaitlist({ email, place: where, move, club: club.trim(), ref: site.ref, invite });
      site.bump(where);
      site.setMe({ email, place: where, position: r.position, code: r.code });
      setResult({ position: r.position, code: r.code, place: where });
      setStep(3);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const p = result?.place ?? place;
  const pc = placeCount(site.stats, p);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal">
          <Dialog.Content className="dlg" aria-describedby={undefined}>
            <Dialog.Close className="close" aria-label="Close"><Close /></Dialog.Close>
            <div className={'top' + (invite ? ' k' : '')} />
            <div className="body" ref={body}>
              {step === 1 && (
                <>
                  <Prog n={1} />
                  <Dialog.Title asChild>
                    <h3>{invite ? <>Request a<br /><span className="b">Black invite</span></> : <>Join the<br /><span className="b">waitlist</span></>}</h3>
                  </Dialog.Title>
                  <p>{invite ? 'Black opens a few places to the waitlist each month. Tell us who you are and we will be in touch.' : 'Outhere launches across the UK. Be first in on day one. It takes ten seconds.'}</p>
                  <form onSubmit={submitEmail} noValidate style={{ display: 'grid', gap: 14 }}>
                    <div className="field">
                      <label htmlFor="mEmail">Email</label>
                      <input id="mEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" aria-invalid={!!err} aria-describedby="mErr" />
                    </div>
                    <p className="err" id="mErr" role="alert">{err}</p>
                    <button className="btn btn-p" type="submit">Continue</button>
                  </form>
                </>
              )}
              {step === 2 && (
                <>
                  <Prog n={2} />
                  <Dialog.Title asChild><h3>Where do<br /><span className="b">you move?</span></h3></Dialog.Title>
                  <p>Launch nights run in ten cities. Everywhere else plays for its region until {TEAM_AT} people there are active.</p>
                  <form onSubmit={submitDetails} noValidate style={{ display: 'grid', gap: 16 }}>
                    <PlacePicker id="m" value={place} onChange={setPlace} />
                    <div className="field"><label id="mMove">You mostly</label><Choice options={MOVES} value={move} onChange={setMove} label="You mostly" /></div>
                    <div className="field"><label htmlFor="mCrew">Run club (optional)</label><input id="mCrew" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Your club's name" maxLength={60} /></div>
                    <Honeypot value={hp} onChange={setHp} />
                    {err && <p className="err" role="alert">{err}</p>}
                    <button className="btn btn-p" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : invite ? 'Send my request' : 'Save my place'}</button>
                    <p className="small" style={{ margin: 0 }}>We only email you about Outhere. <a href="/privacy">Privacy notice</a>.</p>
                  </form>
                </>
              )}
              {step === 3 && result && (
                <>
                  <Prog n={3} />
                  <span className="kick">{invite ? 'Request received' : 'You are on the list'}</span>
                  <Dialog.Title asChild><div className="pos">#{fmt(result.position)}</div></Dialog.Title>
                  <p>{invite ? `We review Black requests every month. You also hold place #${fmt(result.position)} on the UK waitlist.` : `Your place in the UK queue. ${standing(p, pc, site.stats)}`}</p>
                  <div className="stats3">{tiles(p, pc, site.stats)}</div>
                  <div className="field">
                    <label>Move up 100 places for every friend who joins</label>
                    <div className="link"><code ref={inv}>{SITE.host}/i/{result.code}</code><button className="btn btn-p" type="button" onClick={() => copy(inv.current, 'Invite link copied')}>Copy link</button></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.city === 'london' && <a className="btn btn-q" href={`/boroughs/${slug(p.borough)}`}>See {shortName(p.borough)}</a>}
                    <Dialog.Close className="btn btn-q" type="button">Done</Dialog.Close>
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type S = ReturnType<typeof useSite>['stats'];

/** One line on where you stand, for a London borough, a launch city or a town elsewhere. */
function standing(p: Place, n: number, stats: S): string {
  if (p.city === 'london') return `${p.borough} is ${fmt(n)} deep and ranks ${rankOf(stats, p.borough)} of 32 London boroughs.`;
  if (p.city === ELSEWHERE) return `${p.town} plays for ${theRegion(p.region)} until ${TEAM_AT} people there are active, and ${fmt(n)} people across ${theRegion(p.region)} are on the list so far.`;
  return `${cityById(p.city)!.name} is ${fmt(n)} deep and ranks ${cityRank(stats, p.city)} of 10 launch cities.`;
}

function tiles(p: Place, n: number, stats: S) {
  if (p.city === 'london') return <><div><b>{fmt(n)}</b><span>in {shortName(p.borough)}</span></div><div><b>{rankOf(stats, p.borough)}/32</b><span>borough rank</span></div><div><b>100</b><span>places per invite</span></div></>;
  if (p.city === ELSEWHERE) return <><div><b>{fmt(n)}</b><span>in {theRegion(p.region)}</span></div><div><b>{TEAM_AT}</b><span>for a {p.town} team</span></div><div><b>100</b><span>places per invite</span></div></>;
  return <><div><b>{fmt(n)}</b><span>in {cityById(p.city)!.name}</span></div><div><b>{cityRank(stats, p.city)}/10</b><span>city rank</span></div><div><b>100</b><span>places per invite</span></div></>;
}

/** The inline email box: a valid email skips straight to step two of the dialog. */
export function WaitlistForm({ id }: { id?: string }) {
  const { openWaitlist } = useSite();
  const [v, setV] = useState('');
  return (
    <form className="wl" noValidate onSubmit={(e) => {
      e.preventDefault();
      const email = v.trim();
      if (!validEmail(email)) openWaitlist({ step: 1, email, error: email ? EMAIL_ERR : '' });
      else openWaitlist({ step: 2, email });
    }}>
      <label htmlFor={id} className="sr-only">Email</label>
      <input id={id} type="email" placeholder="Your email" autoComplete="email" value={v} onChange={(e) => setV(e.target.value)} aria-label={id ? undefined : 'Email address'} />
      <button className="btn btn-p" type="submit">Join the waitlist</button>
    </form>
  );
}
