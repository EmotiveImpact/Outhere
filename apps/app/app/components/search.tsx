import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { SearchItem } from "@outhere/core";
import { Icon, useToast } from "@outhere/ui";

export const PAGES: SearchItem[] = [
  { group: "Go to", name: "Home", sub: "Outhere", href: "/", icon: "home" },
  { group: "Go to", name: "Feed", sub: "Outhere", href: "/feed", icon: "feed" },
  { group: "Go to", name: "Battles", sub: "Outhere", href: "/battles", icon: "bolt" },
  { group: "Go to", name: "Pick-ups", sub: "Outhere", href: "/pickups", icon: "walk" },
  { group: "Go to", name: "Club chat", sub: "Outhere", href: "/chat", icon: "chat" },
  { group: "Go to", name: "Calendar", sub: "Outhere", href: "/calendar", icon: "cal" },
  { group: "Go to", name: "League", sub: "Outhere", href: "/league", icon: "trophy" },
  { group: "Go to", name: "Find clubs", sub: "Outhere", href: "/clubs", icon: "compass" },
  { group: "Go to", name: "My profile", sub: "Outhere", href: "/me", icon: "user" },
  { group: "Go to", name: "Outhere Locals", sub: "Outhere", href: "/locals", icon: "store" },
  { group: "Go to", name: "Membership", sub: "Outhere", href: "/membership", icon: "spark" },
];

/** Cmd K search across clubs, people, cities, boroughs and pages, driven by the keyboard. */
export function SearchOverlay({ items, onClose }: { items: SearchItem[]; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const all = useMemo(() => [...items, ...PAGES], [items]);
  const query = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      (query
        ? all.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(query))
        : [
            ...all.filter((r) => r.group === "Clubs").slice(0, 3),
            ...all.filter((r) => r.group === "People").slice(1, 4),
            ...PAGES.filter((p) => ["/feed", "/chat", "/calendar", "/membership"].includes(p.href ?? "")),
          ]
      ).slice(0, 12),
    [all, query],
  );
  const at = Math.min(sel, Math.max(0, list.length - 1));

  useEffect(() => input.current?.focus(), []);

  const pick = (i: number) => {
    const r = list[i];
    if (!r) return;
    onClose();
    if (r.href) navigate(r.href);
    else toast(`${r.name}'s profile is private to members of their club`);
  };

  let group = "";
  return (
    <div className="overlay srch" role="dialog" aria-label="Search" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sr-box">
        <div className="sr-in">
          <Icon name="search" />
          <input
            ref={input}
            id="srq"
            placeholder="Search clubs, people, cities and pages"
            aria-label="Search"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(list.length - 1, at + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(0, at - 1)); }
              if (e.key === "Enter") { e.preventDefault(); pick(at); }
              if (e.key === "Escape") onClose();
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="sr-res" id="srr" role="listbox">
          {list.length ? (
            list.map((r, i) => {
              const head = r.group !== group ? <div className="sr-g">{query || r.group !== "Go to" ? r.group : "Jump to"}</div> : null;
              group = r.group;
              return (
                <div key={`${r.group}-${r.name}`}>
                  {head}
                  <button type="button" className="sr-it" role="option" aria-selected={i === at} onClick={() => pick(i)} onMouseEnter={() => setSel(i)}>
                    {r.image ? <img src={r.image} alt="" /> : <span className="sr-ic"><Icon name={r.icon ?? "arrow"} /></span>}
                    <span className="t">
                      <b>{r.name}</b>
                      <span>{r.sub}</span>
                    </span>
                    <Icon name="chev" />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="muted sr-no">Nothing for "{q}". Try a city, an area or a park.</p>
          )}
        </div>
      </div>
    </div>
  );
}
