import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Icon, Logo } from "@outhere/ui";
import { resetData, supabase, WEB_URL } from "./data";

/*
 * Staff sign in for Outhere HQ. On example data there is nothing to sign in
 * to and HQ opens straight away. On the real project, HQ only renders once
 * someone is signed in; whether they are staff is then the database's call,
 * and the Shell shows "Staff only" to anyone who is not.
 */

type Gate = { state: "checking" } | { state: "out"; error: string | null } | { state: "in"; userId: string };

/** Magic link errors come back on the URL. Read them once, then tidy the address bar. */
function takeUrlError(): string | null {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const failed = url.searchParams.get("error") ?? hash.get("error");
  for (const key of ["code", "error", "error_code", "error_description"]) url.searchParams.delete(key);
  if (hash.has("error") || hash.has("access_token")) url.hash = "";
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url.href);
  return failed ? "That link has run out or was already used. Send yourself a new one." : null;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>(supabase ? { state: "checking" } : { state: "in", userId: "example" });

  useEffect(() => {
    if (!supabase) return;
    // Fires once with the stored (or just exchanged) session, then on every sign in, out or refresh.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") resetData();
      if (event === "INITIAL_SESSION") {
        const error = takeUrlError();
        setGate(session ? { state: "in", userId: session.user.id } : { state: "out", error });
        return;
      }
      setGate((g) => (session ? (g.state === "in" && g.userId === session.user.id ? g : { state: "in", userId: session.user.id }) : { state: "out", error: null }));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (gate.state === "checking") return null;
  if (gate.state === "out") return <StaffSignIn error={gate.error} />;
  // A new person means fresh reads everywhere, so remount HQ for them.
  return <div key={gate.userId} style={{ display: "contents" }}>{children}</div>;
}

/** Signs out of HQ on this browser. Does nothing on example data. */
export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Quiet about whether an address is staff: these all read as "link sent". */
const SILENT = new Set(["otp_disabled", "signup_disabled", "user_not_found", "email_address_not_authorized"]);

function StaffSignIn({ error: urlError }: { error: string | null }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(urlError);

  useEffect(() => {
    document.title = "Sign in · Outhere HQ";
  }, []);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const address = (sent ?? email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("That doesn't look like an email address.");
    if (!supabase) return;
    setSending(true);
    setError(null);
    const { error: failed } = await supabase.auth.signInWithOtp({
      email: address,
      // HQ never makes accounts: staff sign in with the account they already have.
      options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: false },
    });
    setSending(false);
    if (failed && !SILENT.has(failed.code ?? "")) {
      return setError(failed.status === 429 ? "Too many links asked for. Wait a minute and try again." : "We couldn't send the link just now. Try again in a minute.");
    }
    setSent(address);
  }

  return (
    <main className="page" style={{ maxWidth: 520, margin: "80px auto", padding: 24 }}>
      <span className="logo" style={{ fontSize: 18 }}>
        <Logo />
        OUTHERE <em>HQ</em>
      </span>
      <span className="kick" style={{ display: "block", marginTop: 40 }}>
        Staff sign in
      </span>
      {sent ? (
        <>
          <h1 className="disp" style={{ fontSize: 64, marginTop: 12 }}>
            Link <span className="b">sent</span>
          </h1>
          <p className="muted" style={{ marginTop: 12 }}>
            If <b>{sent}</b> belongs to Outhere staff, a sign in link is on its way. Open it in this browser.
          </p>
          {error && <ErrorLine text={error} />}
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button className="btn btn-q" type="button" disabled={sending} onClick={() => void send()}>
              {sending ? "Sending..." : "Send it again"}
            </button>
            <button className="btn btn-q" type="button" onClick={() => setSent(null)}>
              Use another email
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="disp" style={{ fontSize: 64, marginTop: 12 }}>
            Outhere <span className="b">HQ</span>
          </h1>
          <p className="muted" style={{ marginTop: 12 }}>
            Staff only. We'll email you a link, no password. Every action here is logged.
          </p>
          <form onSubmit={(e) => void send(e)} style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                className="input"
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@outhere.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <ErrorLine text={error} />}
            <button className="btn btn-p" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Email me a link"}
            </button>
          </form>
        </>
      )}
      <a className="muted" href={`${WEB_URL}/`} style={{ display: "inline-block", marginTop: 28, fontSize: 13 }}>
        Back to the app
      </a>
    </main>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p role="alert" style={{ fontSize: 13, color: "#ff9ba0", margin: 0 }}>
      <Icon name="x" /> {text}
    </p>
  );
}
