import { useEffect, useState } from "react";
import { Form, Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { canSeeClubHq, canSeeStaff, type IconName, type Role } from "@outhere/core";
import { Countdown, Icon, Logo, useLiveScore } from "@outhere/ui";
import { config, getData, NO_CLUB, requireMember } from "~/data.server";
import { useAct } from "~/hooks";
import { NotificationsPanel } from "~/components/notifications";
import { SearchOverlay } from "~/components/search";
import type { Route } from "./+types/shell";

/** On real data, member pages need someone signed in. */
export const middleware: Route.MiddlewareFunction[] = [requireMember];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  const [notifications, search, home, hq, verifications, fair] = await Promise.all([
    db.notifications(),
    db.searchIndex(),
    db.home(),
    canSeeClubHq(viewer) && viewer.homeClubId ? db.members(viewer.homeClubId) : null,
    canSeeStaff(viewer) ? db.verifications() : null,
    canSeeStaff(viewer) ? db.fairPlay() : null,
  ]);
  // Someone new may not have a club yet.
  const chat = viewer.homeClubId ? await db.chat(viewer.homeClubId) : null;
  return {
    viewer,
    notifications,
    search,
    club: chat?.club ?? NO_CLUB,
    derby: home.derby,
    reveal: home.reveal,
    counts: {
      chat: chat?.channels.reduce((n, c) => n + c.unread, 0) ?? 0,
      requests: hq?.requests.length ?? 0,
      verify: verifications?.filter((v) => !v.verified).length ?? 0,
      flags: fair?.flags.length ?? 0,
    },
    config: config(),
  };
}

type NavItem = { to: string; label: string; icon: IconName; count?: number; external?: boolean };

export const TITLES: Record<string, [string] | [string, string]> = {
  "/": ["Home"], "/feed": ["Feed"], "/battles": ["Battles"], "/pickups": ["Pick-ups"], "/calendar": ["Calendar"],
  "/league": ["League"], "/clubs": ["Find clubs"], "/me": ["My profile"], "/membership": ["Membership"],
};
const CLUB_TITLES: Record<string, string> = { "/chat": "Club chat", "/hq": "Overview", "/hq/members": "Members", "/hq/runs": "Runs and check-in", "/hq/kit": "Page and QR kit", "/hq/fund": "Club fund" };

export default function Shell({ loaderData }: Route.ComponentProps) {
  const { viewer, notifications, search, club, derby, reveal, counts, config: cfg } = loaderData;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { act } = useAct();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const left = useLiveScore(derby.home.score, 9);
  const right = useLiveScore(derby.away.score, 8);

  const role: Role = canSeeStaff(viewer) ? "staff" : canSeeClubHq(viewer) ? "captain" : "member";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  // A member who loses Club HQ while previewing goes back home.
  useEffect(() => {
    if (pathname.startsWith("/hq") && role === "member") navigate("/", { replace: true });
  }, [pathname, role, navigate]);

  const main: NavItem[] = [
    { to: "/", label: "Home", icon: "home" },
    { to: "/feed", label: "Feed", icon: "feed" },
    { to: "/battles", label: "Battles", icon: "bolt" },
    { to: "/pickups", label: "Pick-ups", icon: "walk" },
    { to: "/chat", label: "Club chat", icon: "chat", count: counts.chat },
    { to: "/calendar", label: "Calendar", icon: "cal" },
    { to: "/league", label: "League", icon: "trophy" },
    { to: "/clubs", label: "Find clubs", icon: "compass" },
    { to: "/me", label: "My profile", icon: "user" },
    { to: "/locals", label: "Outhere Locals", icon: "store" },
    { to: "/membership", label: "Membership", icon: "spark" },
  ];
  const hq: NavItem[] = [
    { to: "/hq", label: "Overview", icon: "grid" },
    { to: "/hq/members", label: "Members", icon: "people", count: counts.requests },
    { to: "/hq/runs", label: "Runs and check-in", icon: "cal" },
    { to: "/hq/kit", label: "Page and QR kit", icon: "qr" },
    { to: "/hq/fund", label: "Club fund", icon: "pound" },
  ];
  const staff: NavItem[] = [
    { to: `${cfg.adminUrl}/`, label: "Overview", icon: "pulse", external: true },
    { to: `${cfg.adminUrl}/verify`, label: "Club verification", icon: "shield", count: counts.verify, external: true },
    { to: `${cfg.adminUrl}/fair-play`, label: "Fair play", icon: "flag", count: counts.flags, external: true },
    { to: `${cfg.adminUrl}/seasons`, label: "Seasons and draws", icon: "dice", external: true },
  ];

  const navList = (items: NavItem[], quiet = false) => (
    <nav className="nav">
      {items.map((it) =>
        it.external ? (
          <a key={it.to} href={it.to}>
            <Icon name={it.icon} />
            {it.label}
            {!!it.count && <span className="ct">{it.count}</span>}
          </a>
        ) : (
          <NavLink key={it.to} to={it.to} end={it.to === "/" || it.to === "/hq"}>
            <Icon name={it.icon} />
            {it.label}
            {!!it.count && <span className={`ct${quiet ? "" : " hot"}`}>{it.count}</span>}
          </NavLink>
        ),
      )}
    </nav>
  );

  const crumb = CLUB_TITLES[pathname] ? [club.name, CLUB_TITLES[pathname]] : (TITLES[pathname] ?? ["Home"]);
  const unread = notifications.some((n) => n.unread);

  return (
    <div className={`shell${open ? " open" : ""}`} id="shell">
      <aside className="side" id="side" aria-label="Main">
        <Link className="logo" to="/">
          <Logo />
          OUTHERE
        </Link>
        <div className="nsec">{navList(main)}</div>
        {role !== "member" && (
          <div className="nsec">
            <div className="nlab">
              <img src={club.crest} alt="" />
              {club.name}
            </div>
            {navList(hq)}
          </div>
        )}
        {role === "staff" && (
          <div className="nsec">
            <div className="nlab">
              <Icon name="lock" />
              Outhere HQ<span className="lock">STAFF</span>
            </div>
            {navList(staff, true)}
          </div>
        )}
        <div className="grow" />
        <Link className="livecard" to="/">
          <img src="/img/derby.jpg" alt="" />
          <span className="pill glass">
            <i className="dot pulse" />
            Derby live
          </span>
          <b>
            {derby.home.short} v {derby.away.short}
          </b>
          <div className="sc tab">
            <span>{left.toLocaleString("en-GB")}</span>
            <span style={{ color: "#ff9ba0" }}>{right.toLocaleString("en-GB")}</span>
          </div>
        </Link>
        <button className="me-btn" type="button" onClick={() => navigate("/me")}>
          <img src={viewer.avatar} alt="" />
          <span>
            <b>{viewer.name}</b>
            <small>{role === "member" ? `Member, ${club.name}` : role === "captain" ? `Captain, ${club.name}` : "Captain and Outhere staff"}</small>
          </span>
        </button>
        {!cfg.example && (
          <Form method="post" action="/signout">
            <button className="btn btn-s" type="submit" style={{ color: "var(--ink-muted)", width: "100%" }}>Sign out</button>
          </Form>
        )}
        {cfg.example && (
          <>
            <div className="role" role="group" aria-label="See the app as">
              {(["member", "captain", "staff"] as const).map((r) => (
                <button key={r} type="button" aria-pressed={r === role} onClick={() => act({ intent: "preview", role: r })}>
                  {r[0]!.toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <div className="rolehint">Preview the app as each kind of user</div>
          </>
        )}
      </aside>
      <div className="scrim" id="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="top">
          <button className="burger" id="burger" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="crumb">
            {crumb.length > 1 ? (
              <>
                <span className="hidem2">{crumb[0]}</span>
                <Icon name="chev" />
                <b>{crumb[1]}</b>
              </>
            ) : (
              <b>{crumb[0]}</b>
            )}
          </div>
          <button className="find" id="find" type="button" aria-label="Search" onClick={() => setSearching(true)}>
            <Icon name="search" />
            <span>Search clubs, people and boroughs</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="sp" />
          <Link className="chip-live" to="/league">
            <i className="dot pulse" />
            London v Manchester · reveal <Countdown to={reveal.at} short />
          </Link>
          {pathname.startsWith("/hq") && (
            <Link className="btn btn-q btn-s hidem" to={`/${club.slug}`}>
              <Icon name="eye" />
              View public page
            </Link>
          )}
          <button className="iconbtn" id="bell" type="button" aria-label="Notifications" aria-expanded={notesOpen} onClick={() => setNotesOpen((o) => !o)}>
            <Icon name="bell" />
            {unread && <span className="badge" />}
          </button>
        </header>
        <main className={`page${pathname === "/chat" ? " chatpage" : ""}`} id="page">
          <Outlet />
        </main>
      </div>
      {searching && <SearchOverlay items={search} onClose={() => setSearching(false)} />}
      {notesOpen && <NotificationsPanel notes={notifications} onClose={() => setNotesOpen(false)} />}
    </div>
  );
}
