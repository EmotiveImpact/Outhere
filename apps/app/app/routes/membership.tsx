import { useEffect, useState } from "react";
import { formatPounds, priceSplit } from "@outhere/core";
import { Icon, Seg, useToast } from "@outhere/ui";
import { useSearchParams } from "react-router";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/membership";

export const meta: Route.MetaFunction = () => [{ title: "Membership · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  const [plans, chat] = await Promise.all([db.plans(), db.chat(viewer.homeClubId)]);
  return { plans, tier: viewer.tier, club: { name: chat.club.name, crest: chat.club.crest, id: chat.club.id } };
}

export default function Membership({ loaderData }: Route.ComponentProps) {
  const { plans, tier, club } = loaderData;
  const toast = useToast();
  const { act, result, state } = useAct<{ url?: string }>();
  const [yearly, setYearly] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const pro = plans.find((p) => p.tier === "pro");
  const split = priceSplit(pro?.monthly ?? 5.99, "pro", "web");

  // Stripe hands back a checkout page; until Stripe is set up, say what would happen.
  useEffect(() => {
    if (state !== "idle" || !result || !asked) return;
    if (result.ok && result.url) window.location.assign(result.url);
    else toast(result.error === "CHECKOUT_NOT_SET_UP" ? `Checkout opens for ${asked}` : "Checkout didn't open. Try again in a moment.");
    setAsked(null);
  }, [state, result, asked, toast]);

  // Back from Stripe. The ring changes once Stripe tells the server, usually within seconds.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("joined") !== "1") return;
    toast(`Welcome in. ${club.name} gets its share every month you stay.`);
    setParams((p) => { p.delete("joined"); return p; }, { replace: true, preventScrollReset: true });
  }, [params, setParams, toast, club.name]);

  return (
    <>
      <section className="slab prohero" style={{ minHeight: 340 }}>
        <img className="bg" src="/_app/img/black.jpg" alt="A runner in black kit under city lights" style={{ objectPosition: "50% 30%" }} />
        <span className="kick">Membership</span>
        <h1 className="disp" style={{ fontSize: "clamp(54px,7vw,104px)", marginTop: 12 }}>Go <span className="b">further</span></h1>
        <p style={{ color: "#dfe5ee", maxWidth: "52ch", marginTop: 12 }}>Playing is free and always will be. Pro and Black add the extras, and part of what you pay goes straight to your club.</p>
      </section>
      <div className="probar">
        <Seg id="proseg" options={[["m", "Monthly"], ["y", "Yearly · 2 months free"]] as const} value={yearly ? "y" : "m"} onChange={(v) => setYearly(v === "y")} />
        <div className="proclub">
          <img src={club.crest} alt="" /><span>Backing <b>{club.name}</b></span>
          <button type="button" className="btn btn-q btn-s" onClick={() => toast("You can back any club you're a member of")}>Change</button>
        </div>
      </div>
      <div className="g g3 plans" id="proplans">
        {plans.map((p) => {
          // A plan with no yearly price stays monthly when the yearly switch is on.
          const byYear = yearly && p.yearly !== null;
          const price = byYear ? (p.yearly ?? 0) : p.monthly;
          const mine = p.tier === tier;
          return (
            <div key={p.tier} className={`card plan${p.popular ? " hot" : ""}`}>
              {p.popular && <span className="pill blue plan-tag">Most picked</span>}
              <div className="mono dim">{p.name}</div>
              <div className="plan-p"><b className="tab">{p.monthly ? formatPounds(price) : "£0"}</b><span>{p.monthly ? (byYear ? "a year" : yearly ? "a month, monthly only for now" : "a month") : "forever"}</span></div>
              <p className="muted">{p.line}</p>
              <ul>{p.features.map((f) => <li key={f}><Icon name="check" />{f}</li>)}</ul>
              <button
                type="button"
                className={`btn ${p.popular ? "btn-p" : "btn-q"}`}
                disabled={mine && p.tier !== "free"}
                onClick={() => {
                  if (p.tier === "free") {
                    toast(mine ? "You're on Free. Nice." : "You can drop to Free from your account settings at any time");
                    return;
                  }
                  setAsked(`${p.name} at ${formatPounds(price)}`);
                  act({ intent: "checkout", tier: p.tier, yearly: byYear, clubId: club.id });
                }}
              >
                {mine ? "Your plan" : p.tier === "free" ? "Drop to Free" : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <div className="g g2 mt">
        <div className="card">
          <div className="hd"><h3>Where your {formatPounds(pro?.monthly ?? 5.99)} goes</h3><span className="muted" style={{ fontSize: 12 }}>Pro, monthly, joined on the web</span></div>
          <div className="pgo">
            <div className="pg-vat"><span>VAT</span><b className="tab">{formatPounds(split.vat)}</b></div>
            <div className="pg-fee"><span>Fees</span><b className="tab">{formatPounds(split.fees)}</b></div>
            <div className="pg-club"><span>{club.name}</span><b className="tab">{formatPounds(split.club)}</b></div>
            <div className="pg-oh"><span>Outhere</span><b className="tab">{formatPounds(split.outhere)}</b></div>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Join here rather than in the app and your club gets twice as much, because the app stores take a bigger cut.</p>
        </div>
        <div className="card">
          <div className="hd"><h3>Good to know</h3></div>
          {[
            ["Cancel any time", "Two taps, no phone calls, no guilt trip."],
            ["Your club stays free", "Nobody ever pays to belong to a club."],
            ["Pause in winter", "Injured or busy? Pause for up to three months and keep your streak safe."],
          ].map(([t, d]) => (
            <div key={t} className="row"><span className="np-ic"><Icon name="check" /></span><div className="t"><b>{t}</b><span>{d}</span></div></div>
          ))}
        </div>
      </div>
    </>
  );
}
