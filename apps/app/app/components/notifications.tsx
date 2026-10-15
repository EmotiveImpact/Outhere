import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Notification } from "@outhere/core";
import { Icon, usePerson } from "@outhere/ui";
import { useAct } from "~/hooks";

function Note({ n, onPick }: { n: Notification; onPick: () => void }) {
  const p = usePerson(n.personId);
  return (
    <Link className={`np-it${n.unread ? " unread" : ""}`} to={n.href} onClick={onPick}>
      {n.personId ? <img className="av" src={p.avatar} alt="" /> : <span className="np-ic"><Icon name={n.icon} /></span>}
      <span className="t">
        <span dangerouslySetInnerHTML={{ __html: n.html }} />
        <small>{n.ago} ago</small>
      </span>
      {n.unread && <i className="dot" />}
    </Link>
  );
}

export function NotificationsPanel({ notes, onClose }: { notes: Notification[]; onClose: () => void }) {
  const { act } = useAct();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !document.getElementById("bell")?.contains(t)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("click", off, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", off, true);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <div className="npanel" role="dialog" aria-label="Notifications" ref={ref}>
      <div className="np-h">
        <b>Notifications</b>
        <button type="button" id="npall" onClick={() => act({ intent: "notes-read" })}>Mark all read</button>
      </div>
      {notes.map((n) => <Note key={n.id} n={n} onPick={onClose} />)}
      <Link className="np-ft" to="/calendar" onClick={onClose}>See what's coming up this week</Link>
    </div>
  );
}
