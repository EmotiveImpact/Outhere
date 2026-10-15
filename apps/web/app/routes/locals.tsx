import { useRef } from "react";
import { Bars, Icon, QR, useReducedMotion, useToast } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { ClubCard } from "~/components/club-card";
import { absolute, hostOf, PublicFooter, PublicNav, shareMeta } from "~/components/public";
import type { Route } from "./+types/locals";

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const clubs = await db.clubs();
  return { near: clubs.filter((c) => c.verified).slice(0, 4), publicUrl: config().publicUrl, origin: new URL(request.url).origin };
}

export const meta: Route.MetaFunction = ({ loaderData }) =>
  shareMeta({
    title: "Outhere Locals",
    description: "Hundreds of runners and walkers pass your door every week. Back their club, give them a reason to come in, and see exactly how many do.",
    url: `${loaderData?.publicUrl ?? ""}/locals`,
    image: absolute("/img/lcrew.jpg", loaderData?.origin ?? ""),
    imageAlt: "A run club gathered outside a café at night",
  });

/** What a business pays a month; 80% of it goes to the club. */
const PACKAGES: { name: string; price: number; perks: string[]; hot?: boolean }[] = [
  { name: "Supporter", price: 50, perks: ["Your name and logo on the club page", "A thank-you on the club's results cards", "A monthly count of who saw it"] },
  { name: "Partner", price: 150, hot: true, perks: ["Everything in Supporter", "A perk for members, redeemed in the app at your till", "A count of members who came in", "Your name on Sunday's club derby story"] },
  { name: "Kit sponsor", price: 400, perks: ["Everything in Partner", "Your logo on the club's next kit drop", "Your name on every derby result the club shares"] },
];
const CLUB_SHARE = 0.8;

const STEPS: [string, string][] = [
  ["Pick a club", "See every verified club near your postcode, how big it is and when it runs past."],
  ["Send an offer", "The captain says yes or no. Clubs always choose who backs them."],
  ["Give members a perk", "Free coffee, 10% off, a free class. Members show a code in the app at your till."],
  ["See who came", "Every month you see how many members came in and how many saw your name."],
];

export default function Locals({ loaderData }: Route.ComponentProps) {
  const { near, publicUrl } = loaderData;
  const toast = useToast();
  const reduce = useReducedMotion();
  const nearRef = useRef<HTMLElement>(null);

  return (
    <div className="pub">
      <PublicNav locals links={[["/clubs", "Clubs"], ["/league", "League"]]} action={{ to: "/", label: "Dashboard" }} />
      <header className="chero" style={{ minHeight: "min(84vh,780px)" }}>
        <img src="/img/lcrew.jpg" alt="A run club gathered outside a café at night" />
        <div className="wrap" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
          <div>
            <span className="kick">Outhere Locals · for businesses</span>
            <h1 className="disp">Back the club<br /><span className="b">on your street</span></h1>
            <p className="tl">Hundreds of runners and walkers pass your door every week. Back their club, give them a reason to come in, and see exactly how many do.</p>
            <form
              className="search"
              style={{ maxWidth: 520, marginTop: 26 }}
              onSubmit={(e) => {
                e.preventDefault();
                nearRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
              }}
            >
              <Icon name="pin" />
              <input placeholder="Your postcode, e.g. SE15 4ST" aria-label="Postcode" defaultValue="SE15" />
              <button type="submit" className="btn btn-p">Find clubs near me</button>
            </form>
          </div>
        </div>
      </header>

      <div className="wrap">
        <section className="psec">
          <span className="kick">Pick how you back them</span>
          <h2 className="disp" style={{ marginTop: 12 }}>Three <span className="b">ways in</span></h2>
          <div className="pkgs mt">
            {PACKAGES.map((p) => (
              <div key={p.name} className={`card pkg${p.hot ? " hot" : ""}`}>
                {p.hot && <span className="pill blue" style={{ alignSelf: "flex-start" }}>Most clubs ask for this</span>}
                <div className="lg" style={{ font: "600 28px/1 var(--display)", textTransform: "uppercase" }}>{p.name}</div>
                <div className="pr tab">£{p.price}<small>a month</small></div>
                <ul>{p.perks.map((t) => <li key={t}><Icon name="check" />{t}</li>)}</ul>
                <p className="muted" style={{ fontSize: 12.5, marginTop: "auto" }}>£{Math.round(p.price * CLUB_SHARE)} goes to the club. Cancel any month.</p>
                <button type="button" className={`btn ${p.hot ? "btn-p" : "btn-q"}`} onClick={() => toast("Next you pick a club near you")}>Choose {p.name}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="psec">
          <span className="kick">How it works</span>
          <h2 className="disp" style={{ marginTop: 12 }}>Four <span className="b">steps</span></h2>
          <div className="steps4 mt">
            {STEPS.map(([t, line], i) => (
              <div key={t} className="card"><div className="n">0{i + 1}</div><b>{t}</b><p>{line}</p></div>
            ))}
          </div>
        </section>

        <section className="psec">
          <div className="g g-73">
            <div className="card">
              <div className="hd">
                <div><span className="kick">What you see</span><h3 style={{ marginTop: 8 }}>Rye Lane Coffee, October</h3></div>
                <span className="pill blue">Partner of Peckham Pacers</span>
              </div>
              <div className="g g3" style={{ gap: 10 }}>
                {[["61", "perks redeemed"], ["38", "different members came in"], ["4,212", "people saw your name"]].map(([v, l]) => (
                  <div key={l} style={{ background: "var(--surface-2)", borderRadius: 14, padding: 14 }}>
                    <b className="disp tab" style={{ fontSize: 40 }}>{v}</b>
                    <div className="muted" style={{ fontSize: 12 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt">
                <Bars values={[9, 14, 11, 27]} w={520} h={170} labels={["Week 1", "Week 2", "Week 3", "Derby week"]} hi={3} fmtY={(v) => String(Math.round(v))} label="Perks redeemed each week: 9, 14, 11, then 27 in derby week" />
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Perks redeemed each week. Derby week brings the most people through the door.</p>
            </div>
            <div className="card">
              <span className="kick">The member's side</span>
              <h3 style={{ marginTop: 8 }}>A perk they show at your till</h3>
              <div className="perk mt">
                <div><QR text={`${publicUrl}/locals`} label="Example perk code" /></div>
                <div>
                  <b style={{ fontSize: 15 }}>Free filter coffee</b>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>After any Saturday Peckham Pacers run. Rye Lane Coffee, 2 minutes from the start.</p>
                  <span className="pill blue mt" style={{ display: "inline-flex" }}><Icon name="check" />Valid today</span>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>Each member can use a perk once a day, and a code works only for a few minutes, so counts are real.</p>
            </div>
          </div>
        </section>

        <section className="psec" id="near" ref={nearRef}>
          <div className="sech" style={{ marginTop: 0 }}>
            <h2>Clubs near <span className="b">SE15</span></h2>
            <span className="muted" style={{ fontSize: 13 }}>Verified clubs only</span>
          </div>
          <div className="ccards">{near.map((c) => <ClubCard key={c.id} club={c} />)}</div>
        </section>

        <section className="psec">
          <div className="card" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <span className="av l" style={{ display: "grid", placeItems: "center", background: "rgba(255,77,85,.12)", color: "#ff8a90" }}><Icon name="lock" /></span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <b style={{ fontSize: 15 }}>Who can't back a club</b>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Betting, vapes, alcohol brands and payday lenders. Clubs are full of young people and people trying to get healthier, and we keep it that way.</p>
            </div>
          </div>
        </section>

        <PublicFooter>{hostOf(publicUrl)}/locals · 80% of every sponsorship goes to the club</PublicFooter>
      </div>
    </div>
  );
}
