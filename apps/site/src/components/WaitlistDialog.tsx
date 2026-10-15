import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { joinWaitlist } from '../lib/api';
import { type Borough, shortName, slug } from '../lib/boroughs';
import { fmt, validEmail } from '../lib/format';
import { MOVES } from '../lib/validate';
import { SITE } from '../content/site';
import { BoroughSelect, Choice, Honeypot } from './controls';
import { Close } from './icons';
import { type OpenOpts, rankOf, useCopy, useSite } from './Site';

const EMAIL_ERR = 'Enter an email address like name@example.com.';
const Prog = ({ n }: { n: number }) => (
  <div className="prog" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</div>
);

export function WaitlistDialog({ open, onOpenChange, opts, defaultBorough }: {
  open: boolean; onOpenChange: (o: boolean) => void; opts: OpenOpts; defaultBorough: Borough;
}) {
  const site = useSite();
  const copy = useCopy();
  const invite = !!opts.invite;
  const [step, setStep] = useState(opts.step ?? 1);
  const [email, setEmail] = useState(opts.email ?? '');
  const [err, setErr] = useState(opts.error ?? '');
  const [borough, setBorough] = useState<Borough>(opts.borough ?? defaultBorough);
  const [move, setMove] = useState<(typeof MOVES)[number]>('Walk');
  const [club, setClub] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(site.me && step === 3 ? { position: site.me.position, code: site.me.code, borough: site.me.borough } : null);
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
    setBusy(true);
    setErr('');
    try {
      const r = await joinWaitlist({ email, borough, move, club: club.trim(), ref: site.ref, invite });
      site.bump(borough);
      site.setMe({ email, borough, position: r.position, code: r.code });
      setResult({ position: r.position, code: r.code, borough });
      setStep(3);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const b = result?.borough ?? borough;
  const bc = site.stats.boroughs[b];

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
                  <p>{invite ? 'Black opens a few places to the waitlist each month. Tell us who you are and we will be in touch.' : 'Be first in when Outhere launches in London. It takes ten seconds.'}</p>
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
                  <p>We open borough by borough, so this decides when you get in.</p>
                  <form onSubmit={submitDetails} noValidate style={{ display: 'grid', gap: 16 }}>
                    <div className="field"><label htmlFor="mBorough">Your borough</label><BoroughSelect id="mBorough" value={borough} onChange={setBorough} /></div>
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
                  <p>
                    {invite
                      ? `We review Black requests every month. You also hold place #${fmt(result.position)} on the London waitlist.`
                      : `Your place in the London queue. ${b} is ${fmt(bc)} deep and ranks ${rankOf(site.stats, b)} of 32 boroughs.`}
                  </p>
                  <div className="stats3">
                    <div><b>{fmt(bc)}</b><span>in {shortName(b)}</span></div>
                    <div><b>{rankOf(site.stats, b)}/32</b><span>borough rank</span></div>
                    <div><b>100</b><span>places per invite</span></div>
                  </div>
                  <div className="field">
                    <label>Move up 100 places for every friend who joins</label>
                    <div className="link"><code ref={inv}>{SITE.host}/i/{result.code}</code><button className="btn btn-p" type="button" onClick={() => copy(inv.current, 'Invite link copied')}>Copy link</button></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a className="btn btn-q" href={`/boroughs/${slug(b)}`}>See {shortName(b)}</a>
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
