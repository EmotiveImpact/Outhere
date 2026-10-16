import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@outhere/ui";

/**
 * Pieces shared by the public pages (club pages, the join flow, Outhere
 * Locals): pages people open from a shared link or a QR code, outside the app
 * shell.
 */

/** Top bar of a public page. Clear over the hero, solid once you scroll. */
export function PublicNav({ locals = false, links, action }: { locals?: boolean; links: [string, string][]; action: { to: string; label: string } }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const f = () => nav.current?.classList.toggle("solid", window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <nav className="pnav" id="pnav" ref={nav}>
      <Link className="logo" to="/clubs"><Logo />OUTHERE{locals && <> <em>LOCALS</em></>}</Link>
      <div className="lk">{links.map(([to, label]) => <Link key={label} to={to}>{label}</Link>)}</div>
      <div className="sp" />
      <Link className="btn btn-g btn-s" to={action.to}>{action.label}</Link>
    </nav>
  );
}

export function PublicFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="pfoot">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <span className="logo" style={{ fontSize: 18 }}><Logo />OUTHERE</span>
        <span>{children}</span>
      </div>
    </footer>
  );
}

/** weouthere.app, from the configured public URL. */
export const hostOf = (publicUrl: string): string => publicUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Title, description and the tags link previews read (Open Graph, X). */
export function shareMeta({ title, description, url, image, imageAlt }: { title: string; description: string; url: string; image: string; imageAlt?: string }) {
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Outhere" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    ...(imageAlt ? [{ property: "og:image:alt", content: imageAlt }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}

/** Images in the seed are site paths; link previews need the full address. */
export const absolute = (src: string, origin: string): string => (/^(https?:|data:)/.test(src) ? src : `${origin}${src.startsWith("/") ? "" : "/"}${src}`);
