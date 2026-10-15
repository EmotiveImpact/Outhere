import { useEffect, useState } from "react";
import { Link } from "react-router";
import { isValidClubSlug, type PaceGroup } from "@outhere/core";
import { Icon, Toggle, useToast } from "@outhere/ui";
import { config, getData, usingExampleData } from "~/data.server";
import { useAct } from "~/hooks";
import { absolute, shareMeta } from "~/components/public";
import type { Route } from "./+types/join";

export async function loader({ request, params }: Route.LoaderArgs) {
  const slug = params.slug.toLowerCase();
  if (!isValidClubSlug(slug)) throw new Response("Not found", { status: 404 });
  const db = await getData(request);
  const page = await db.clubPage(slug);
  if (!page) throw new Response("Not found", { status: 404 });
  // Example data is always signed in as Kemi. Real visitors sign in by email link first.
  const viewer = usingExampleData() ? null : await db.viewer().catch(() => null);
  const signIn: "example" | "in" | "out" = usingExampleData() ? "example" : viewer ? "in" : "out";
  // Back from the email link: carry on to picking a pace.
  const resume = signIn === "in" && new URL(request.url).searchParams.get("signed") === "1";
  return { club: page.club, run: page.runs[0] ?? null, signIn, resume, publicUrl: config().publicUrl, origin: new URL(request.url).origin };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [{ title: "Not here · Outhere" }];
  const { club: c, publicUrl, origin } = loaderData;
  return shareMeta({
    title: `Join ${c.name}`,
    description: `${c.tagline} ${c.borough} · ${c.nextRun}. Free to join.`,
    url: `${publicUrl}/join/${c.slug}`,
    image: absolute(c.cover, origin),
    imageAlt: `${c.name} out on a run`,
  });
};

const PACES: [PaceGroup, string][] = [["Walk", "Walking group"], ["Easy", "7 min/km or slower"], ["Steady", "5:30 to 7 min/km"], ["Fast", "Under 5:30"]];
const DAYS: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday", SUN: "Sunday" };

export default function Join({ loaderData }: Route.ComponentProps) {
  const { club: c, run, signIn, resume } = loaderData;
  const toast = useToast();
  const { act, result } = useAct();
  const [step, setStep] = useState(resume ? 1 : 0);
  const [pace, setPace] = useState<PaceGroup>("Steady");
  const [come, setCome] = useState(true);
  const day = run ? (DAYS[run.day] ?? run.day) : "";
  // "Tue 19:00 · Rye Lane" reads as "Rye Lane, 19:00".
  const where = `${c.nextRun.split(" · ")[1] ?? run?.place ?? ""}, ${c.nextRun.split(" ")[1] ?? run?.time ?? ""}`;

  // Opening another club's join link starts from the top.
  useEffect(() => setStep(resume ? 1 : 0), [c.slug, resume]);

  useEffect(() => {
    if (result && !result.ok) {
      toast("That didn't go through. Try again in a moment.");
      setStep(1);
    }
  }, [result, toast]);

  const steps = (
    <div className="jsteps">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
  );

  return (
    <div className="joinpg">
      <img className="bg" src={c.cover} alt="" />
      <div className="joinlay">
        <div className="why">
          <Link className="btn btn-g btn-s" to={`/${c.slug}`}><span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><Icon name="arrow" /></span>Back to the club page</Link>
          <span className="kick" style={{ display: "block", marginTop: 28 }}>What a scan opens</span>
          <h1 className="disp" style={{ fontSize: "clamp(48px,5vw,76px)", marginTop: 12 }}>Lamppost to <span className="b">start line</span></h1>
          <ol className="note3">
            <li><b>No app needed to say yes.</b> The code opens the club's page in the phone's browser, with one tap sign in.</li>
            <li><b>Pick a pace and a run.</b> The run leader sees who's coming and which group they'll be in.</li>
            <li><b>Turn up, scan the run's code.</b> That check-in counts for the club's turnout, and the app is offered after, when it means something.</li>
          </ol>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 22 }}>Try it: point your phone at the code on the club page.</p>
        </div>
        <div className="phone">
          <div className="isl" />
          <div className="scr" id="jscr">
            {step === 0 && (
              <div className="jstep" key="s0">
                <div className="jhero"><img src={c.cover} alt="" /></div>
                <div className="jbody">
                  <img src={c.crest} alt="" style={{ width: 58, height: 58, borderRadius: 16, boxShadow: "0 10px 30px -6px #000" }} />
                  <span className="kick" style={{ marginTop: 16 }}>You're invited to run with</span>
                  <h2 className="disp" style={{ marginTop: 8 }}>{c.nameTop}<br /><span className="b">{c.nameBottom}</span></h2>
                  {run && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: 12, borderRadius: 16, background: "var(--surface)" }}>
                      <div className="datebox" style={{ width: 48, padding: "6px 0" }}><span>{run.day}</span><b style={{ fontSize: 24 }}>{run.date}</b></div>
                      <div style={{ fontSize: 13 }}><b>{where}</b><div className="muted">{run.going} going · all paces</div></div>
                    </div>
                  )}
                  <div className="sso" style={{ marginTop: 18 }}>
                    {signIn === "example" ? (
                      <>
                        <button type="button" className="btn btn-w" onClick={() => setStep(1)}>Continue with Apple</button>
                        <button type="button" className="btn btn-q" onClick={() => setStep(1)}>Continue with Google</button>
                        <button type="button" className="btn btn-q" onClick={() => setStep(1)}>Use my phone number</button>
                      </>
                    ) : signIn === "in" ? (
                      <button type="button" className="btn btn-w" onClick={() => setStep(1)}>Continue</button>
                    ) : (
                      <Link className="btn btn-w" to={`/signin?next=${encodeURIComponent(`/join/${c.slug}?signed=1`)}`}>Continue with email</Link>
                    )}
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="jstep" key="s1">
                {steps}
                <div className="jbody" style={{ marginTop: 20 }}>
                  <span className="kick">Step 2 of 3</span>
                  <h2 className="disp" style={{ marginTop: 10 }}>What's your <span className="b">pace?</span></h2>
                  <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>So the run leader can put you in the right group. You can change it any time.</p>
                  <div className="pace" role="group" aria-label="Pace">
                    {PACES.map(([k, line]) => (
                      <button key={k} type="button" aria-pressed={k === pace} onClick={() => setPace(k)}><b>{k}</b><span>{line}</span></button>
                    ))}
                  </div>
                  {run && (
                    <div className="row" style={{ marginTop: 18, border: 0, padding: 14, background: "var(--surface)", borderRadius: 16 }}>
                      <div className="t"><b>Come to {day}'s run</b><span>{run.title}, {run.time}</span></div>
                      <Toggle on={come} onChange={setCome} label={`Come to ${day}'s run`} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-p btn-l"
                    style={{ marginTop: "auto" }}
                    onClick={() => {
                      act({ intent: "club-join", slug: c.slug, pace, runId: come && run ? run.id : null });
                      setStep(2);
                    }}
                  >
                    Join {c.name}
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="jstep" key="s2">
                {steps}
                <div className="jbody" style={{ marginTop: 20, textAlign: "center", alignItems: "center" }}>
                  <img className="obj" src="/_app/img/verified.jpg" alt="" style={{ width: 190, marginTop: 6 }} />
                  <h2 className="disp" style={{ fontSize: 64, marginTop: 4 }}>You're <span className="b">in</span></h2>
                  <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 10 }}>
                    {run && come
                      ? `See you ${day} at ${run.time} ${run.place}. Look for the blue flag. You're in the ${pace.toLowerCase()} group.`
                      : `You're in the ${pace.toLowerCase()} group. Pick a run on the club page whenever you're ready.`}
                  </p>
                  <div style={{ display: "grid", gap: 8, width: "100%", marginTop: "auto" }}>
                    {run && come && <button type="button" className="btn btn-q" onClick={() => toast("Added to your calendar")}><Icon name="cal" />Add to calendar</button>}
                    <button type="button" className="btn btn-p btn-l" onClick={() => toast("Opens the App Store or Google Play")}>Get the app to count your steps</button>
                    <button type="button" className="btn btn-s" style={{ color: "var(--ink-muted)" }} onClick={() => setStep(0)}>Start again</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
