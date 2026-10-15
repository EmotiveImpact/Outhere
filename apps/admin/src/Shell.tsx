import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { canSeeStaff, type IconName } from "@outhere/core";
import { Icon, Logo, ToastProvider } from "@outhere/ui";
import { DataProvider, useLoad } from "./load";
import { usingSupabase, APP_URL } from "./data";
import { signOut } from "./Auth";
import { pageTitle } from "./util";

type NavItem = { to: string; label: string; icon: IconName; count?: number };

const PAGES: Record<string, string> = {
  "/": "Overview",
  "/verify": "Club verification",
  "/fair-play": "Fair play",
  "/seasons": "Seasons and draws",
  "/audit": "Audit log",
};

export function Shell() {
  return (
    <DataProvider>
      <ToastProvider>
        <Frame />
      </ToastProvider>
    </DataProvider>
  );
}

function Frame() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data, error } = useLoad(async (db) => {
    const viewer = await db.viewer();
    if (!canSeeStaff(viewer)) return { viewer, counts: null };
    const [verifications, fair] = await Promise.all([db.verifications(), db.fairPlay()]);
    return { viewer, counts: { verify: verifications.filter((v) => !v.verified).length, flags: fair.flags.length } };
  });

  const page = PAGES[pathname] ?? "Overview";
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.title = pageTitle(page);
  }, [page]);

  if (error) return <Locked />;
  if (!data) return null;
  if (!data.counts) return <Locked />;

  const { viewer, counts } = data;
  const staff: NavItem[] = [
    { to: "/", label: "Overview", icon: "pulse" },
    { to: "/verify", label: "Club verification", icon: "shield", count: counts.verify },
    { to: "/fair-play", label: "Fair play", icon: "flag", count: counts.flags },
    { to: "/seasons", label: "Seasons and draws", icon: "dice" },
    { to: "/audit", label: "Audit log", icon: "log" },
  ];

  return (
    <div className={`shell${open ? " open" : ""}`} id="shell">
      <aside className="side" id="side" aria-label="Main">
        <Link className="logo" to="/">
          <Logo />
          OUTHERE <em>HQ</em>
        </Link>
        <div className="nsec">
          <div className="nlab">
            <Icon name="lock" />
            Outhere HQ<span className="lock">STAFF</span>
          </div>
          <nav className="nav">
            {staff.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.to === "/"}>
                <Icon name={it.icon} />
                {it.label}
                {!!it.count && <span className="ct">{it.count}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="grow" />
        <nav className="nav" style={{ marginBottom: 10 }}>
          <a href={`${APP_URL}/`}>
            <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}>
              <Icon name="arrow" />
            </span>
            Back to the app
          </a>
          {usingSupabase && (
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                void signOut();
              }}
            >
              <Icon name="lock" />
              Sign out
            </a>
          )}
        </nav>
        <button className="me-btn" type="button" onClick={() => (window.location.href = `${APP_URL}/me`)}>
          <img src={viewer.avatar} alt="" />
          <span>
            <b>{viewer.name}</b>
            <small>{viewer.roles.includes("captain") ? "Captain and Outhere staff" : "Outhere staff"}</small>
          </span>
        </button>
      </aside>
      <div className="scrim" id="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="top">
          <button className="burger" id="burger" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="crumb">
            <span className="hidem2">Outhere HQ</span>
            <Icon name="chev" />
            <b>{page}</b>
          </div>
          <div className="sp" />
          <span className="pill">
            <i className="dot pulse" />
            All systems normal
          </span>
        </header>
        <main className="page" id="page" key={pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** What anyone without the staff role sees instead of HQ. */
function Locked() {
  useEffect(() => {
    document.title = "Staff only · Outhere HQ";
  }, []);
  return (
    <main className="page" style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <span className="logo" style={{ fontSize: 18 }}>
        <Logo />
        OUTHERE <em>HQ</em>
      </span>
      <span className="kick" style={{ display: "block", marginTop: 40 }}>
        Locked
      </span>
      <h1 className="disp" style={{ fontSize: 72, marginTop: 12 }}>
        Outhere <span className="b">HQ</span>
      </h1>
      <p className="muted" style={{ marginTop: 12 }}>
        Staff only. Every action here is logged.
      </p>
      <a className="btn btn-p mt" href={`${APP_URL}/`}>
        Back to the app
      </a>
      {usingSupabase && (
        <button className="btn btn-q mt" type="button" style={{ marginLeft: 10 }} onClick={() => void signOut()}>
          Sign in as someone else
        </button>
      )}
    </main>
  );
}
