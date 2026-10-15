import { useState } from "react";
import { Link, redirect } from "react-router";
import { canSeeClubHq, clubShare, firstName, formatPounds, KIT_CLUB_SHARE, SPONSOR_CLUB_SHARE, type LocalOffer } from "@outhere/core";
import { CountUp, Icon, usePerson, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/hq-fund";

export const meta: Route.MetaFunction = () => [{ title: "Club fund · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  if (!canSeeClubHq(viewer)) throw redirect("/");
  return { fund: await db.fund(viewer.homeClubId) };
}

/** Whole pounds without the pence: £1, £120, 50p, £5.99. */
const money = (n: number) => formatPounds(n).replace(/\.00$/, "");
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function HqFund({ loaderData }: Route.ComponentProps) {
  const { fund } = loaderData;
  const { club, split } = fund;
  const toast = useToast();
  const { act } = useAct();
  const treasurer = usePerson(fund.treasurerId);
  const [decided, setDecided] = useState<Record<string, LocalOffer["status"]>>({});

  const web = clubShare("pro", "web");
  const app = clubShare("pro", "app");
  const proCut = web / split.proPrice;
  const sponsorCut = split.sponsor.monthly * SPONSOR_CLUB_SHARE;
  const teeCut = split.kit.teePrice * KIT_CLUB_SHARE;
  const kitRaised = split.kit.sold * teeCut;

  const respond = (o: LocalOffer, accept: boolean) => {
    setDecided((d) => ({ ...d, [o.id]: accept ? "accepted" : "declined" }));
    act({ intent: "offer", clubId: club.id, offerId: o.id, accept });
    toast(accept ? `${o.business} accepted. They're on your club page from tomorrow.` : "Declined politely");
  };

  return (
    <>
      <section className="slab fundhero" style={{ minHeight: 380 }}>
        <img className="bg" src="/img/clubrun.jpg" alt="The club gathered under a railway arch after a run" />
        <img className="obj" src="/img/3d-stack.jpg" alt="" style={{ position: "absolute", right: "4%", top: "50%", transform: "translateY(-50%)", width: "min(300px,34%)", zIndex: -1, opacity: 0.95 }} />
        <span className="kick">Club fund · since September</span>
        <div className="v tab" style={{ marginTop: 12 }}><CountUp value={fund.total} prefix="£" /></div>
        <p style={{ color: "#dfe5ee", maxWidth: "50ch", marginTop: 12 }}>The club fund is {club.name}{club.name.endsWith("s") ? "'" : "'s"} share of the money that moves through Outhere. Spend it on the club however you like. Members can see every penny.</p>
        <div className="acts mt">
          <button type="button" className="btn btn-p" onClick={() => toast(`Payout of £${fund.total} sent for approval to ${firstName(treasurer.name)}, your treasurer`)}>Pay out to the club</button>
          <button type="button" className="btn btn-g" onClick={() => toast("Your fund is now shown on the club page")}>Show on club page</button>
        </div>
      </section>

      <div className="sech"><h2>How the fund <span className="b">fills up</span></h2><span className="muted" style={{ fontSize: 13 }}>Every payment is split. The blue part is yours.</span></div>
      <div className="split">
        <div className="s">
          <div className="nm">Pro members</div>
          <div className="who3">A member pays {money(split.proPrice)} a month. The club gets {money(web)} of it when they sign up through your link on the web, or {money(app)} in the app.</div>
          <div className="bar2"><span className="cl" style={{ width: pct(proCut) }}>{money(web)}</span><span className="oh" style={{ width: pct(1 - proCut) }}>Outhere, VAT and fees</span></div>
          <p><b style={{ color: "var(--ink)" }}>{fund.proMembers} of your members</b> are on Pro, {fund.proViaLink} of them through your link, so that's <b style={{ color: "var(--ink)" }}>{money(fund.proMonthly)} a month</b> without anyone lifting a finger.</p>
        </div>
        <div className="s">
          <div className="nm">Local sponsors</div>
          <div className="who3">A business near you pays £50 to £400 a month to back the club. The club gets {pct(SPONSOR_CLUB_SHARE)}.</div>
          <div className="bar2"><span className="cl" style={{ width: pct(SPONSOR_CLUB_SHARE) }}>Club {pct(SPONSOR_CLUB_SHARE)}</span><span className="oh" style={{ width: pct(1 - SPONSOR_CLUB_SHARE) }}>{pct(1 - SPONSOR_CLUB_SHARE)}</span></div>
          <p><b style={{ color: "var(--ink)" }}>{split.sponsor.name}</b> pays {money(split.sponsor.monthly)} a month. <b style={{ color: "var(--ink)" }}>{money(sponsorCut)}</b> of it is yours.</p>
        </div>
        <div className="s">
          <div className="nm">Club kit</div>
          <div className="who3">Your crest on a {money(split.kit.teePrice)} tee, made to order. The club gets {pct(KIT_CLUB_SHARE)} of every sale.</div>
          <div className="bar2"><span className="cl" style={{ width: pct(KIT_CLUB_SHARE) }}>{pct(KIT_CLUB_SHARE)}</span><span className="mk" style={{ width: pct(split.kit.makingShare) }}>Making</span><span className="oh" style={{ width: pct(1 - KIT_CLUB_SHARE - split.kit.makingShare) }}>Outhere</span></div>
          <p>The autumn drop sold <b style={{ color: "var(--ink)" }}>{split.kit.sold} tees</b>, which put <b style={{ color: "var(--ink)" }}>{money(kitRaised)}</b> in the fund.</p>
        </div>
      </div>

      <div className="g g-73 mt">
        <div className="card">
          <div className="hd"><h3>Money in</h3><span className="muted" style={{ fontSize: 12 }}>Since 1 September</span></div>
          <div className="flow">
            {fund.income.map((r) => (
              <div className="fl" key={r.title}>
                <span className="av" style={{ display: "grid", placeItems: "center", background: "rgba(79,155,255,.14)", color: "var(--blue-hi)" }}><Icon name={r.icon} /></span>
                <div className="t"><b>{r.title}</b><span>{r.line}</span></div>
                <div className={`amt tab${r.pending ? " muted" : ""}`}>{r.amount}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="hd"><h3>Where it went</h3><span className="muted" style={{ fontSize: 12 }}>Members see this</span></div>
          {fund.spend.map((r) => (
            <div className="row" key={r.title}><div className="t"><b>{r.title}</b></div><b className="tab">{r.amount}</b></div>
          ))}
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Payouts go to the club's bank account and need two officers to approve.</p>
        </div>
      </div>

      <div className="sech"><h2>Local businesses <span className="b">want in</span></h2><Link className="btn btn-q btn-s" to="/locals">How Outhere Locals works</Link></div>
      <div className="g g3">
        {fund.offers.map((o) => {
          const status = decided[o.id] ?? o.status;
          return (
            <div className="card offer" key={o.id}>
              <div className="lg">{o.business}</div>
              <span className="muted" style={{ fontSize: 12.5 }}>{o.kind}</span>
              <span className="pill blue" style={{ alignSelf: "flex-start" }}>{o.tier}</span>
              <p style={{ fontSize: 14 }}>{o.line}</p>
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                {status === "open" ? (
                  <>
                    <button type="button" className="btn btn-p btn-s" onClick={() => respond(o, true)}>Accept</button>
                    <button type="button" className="btn btn-q btn-s" onClick={() => respond(o, false)}>Not for us</button>
                  </>
                ) : status === "accepted" ? (
                  <span className="pill blue"><Icon name="check" />Accepted · on your page from tomorrow</span>
                ) : (
                  <span className="pill">Declined</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
