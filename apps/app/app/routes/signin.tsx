import { data, Form, Link, redirect, useNavigation } from "react-router";
import { Icon, Logo } from "@outhere/ui";
import { usingExampleData } from "~/data.server";
import { safeNext, session, siteUrl } from "~/supabase.server";
import type { Route } from "./+types/signin";

export const meta: Route.MetaFunction = () => [{ title: "Sign in · Outhere" }];

const ERRORS: Record<string, string> = {
  link: "That link has run out or was already used. Send yourself a new one.",
  email: "That doesn't look like an email address.",
  failed: "We couldn't send the link just now. Try again in a minute.",
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  if (usingExampleData()) return { example: true, next, error: null };
  // Already signed in: carry on to where they were going.
  if ((await session(request)).userId) throw redirect(next);
  const error = url.searchParams.get("error");
  return { example: false, next, error: error ? (ERRORS[error] ?? ERRORS.failed!) : null };
}

export async function action({ request }: Route.ActionArgs) {
  if (usingExampleData()) return data({ sent: null, error: null }, { status: 400 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(form.get("next") ?? "/"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return data({ sent: null, error: ERRORS.email! }, { status: 400 });
  const { client } = await session(request);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl(request)}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return data({ sent: null, error: ERRORS.failed! }, { status: 400 });
  return { sent: email, error: null };
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps) {
  const { example, next } = loaderData;
  const sending = useNavigation().state === "submitting";
  const sent = actionData?.sent ?? null;
  const error = actionData?.error ?? loaderData.error;

  return (
    <div className="joinpg">
      <img className="bg" src="/_app/img/dawn.jpg" alt="" />
      <div className="joinlay">
        <div className="why">
          <Link className="logo" to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, letterSpacing: ".08em" }}>
            <Logo />
            OUTHERE
          </Link>
          <span className="kick" style={{ display: "block", marginTop: 28 }}>Signing in</span>
          <h1 className="disp" style={{ fontSize: "clamp(48px,5vw,76px)", marginTop: 12 }}>No password <span className="b">to forget</span></h1>
          <ol className="note3">
            <li><b>Type your email.</b> The one you use in the Outhere app, if you have it.</li>
            <li><b>Open the link we send.</b> On this phone or computer, in the next hour.</li>
            <li><b>You're back where you were.</b> Your club, your battles, your city.</li>
          </ol>
        </div>
        <div className="phone">
          <div className="isl" />
          <div className="scr">
            <div className="jstep">
              <div className="jhero"><img src="/_app/img/clubrun.jpg" alt="" /></div>
              <div className="jbody">
                {example ? (
                  <>
                    <span className="kick">Example data</span>
                    <h2 className="disp" style={{ marginTop: 8 }}>Nothing to <span className="b">sign in to</span></h2>
                    <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
                      This copy of Outhere runs on example data, so you're already in as Kemi. Real sign in turns on once the Supabase project is connected.
                    </p>
                    <div className="sso">
                      <Link className="btn btn-p btn-l" to="/">Go to the app</Link>
                    </div>
                  </>
                ) : sent ? (
                  <>
                    <span className="kick">Check your email</span>
                    <h2 className="disp" style={{ marginTop: 8 }}>Link <span className="b">sent</span></h2>
                    <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 10 }}>
                      We sent a sign in link to <b>{sent}</b>. Open it on this device to carry on.
                    </p>
                    <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Nothing there? Check spam, or send it again.</p>
                    <Form method="post" className="sso">
                      <input type="hidden" name="email" value={sent} />
                      <input type="hidden" name="next" value={next} />
                      <button className="btn btn-q" type="submit" disabled={sending}>{sending ? "Sending..." : "Send it again"}</button>
                    </Form>
                  </>
                ) : (
                  <>
                    <span className="kick">Welcome back</span>
                    <h2 className="disp" style={{ marginTop: 8 }}>Sign <span className="b">in</span></h2>
                    <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>We'll email you a link. Tap it and you're in.</p>
                    <Form method="post" className="sso" style={{ gap: 12 }}>
                      <input type="hidden" name="next" value={next} />
                      <div className="field">
                        <label htmlFor="email">Email</label>
                        <input className="input" id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
                      </div>
                      {error && (
                        <p role="alert" style={{ fontSize: 13, color: "#ff9ba0", margin: 0 }}>
                          <Icon name="x" /> {error}
                        </p>
                      )}
                      <button className="btn btn-p btn-l" type="submit" disabled={sending}>{sending ? "Sending..." : "Email me a link"}</button>
                      <p className="muted" style={{ fontSize: 12.5, margin: 0, textAlign: "center" }}>New to Outhere? The same link makes your account.</p>
                    </Form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
