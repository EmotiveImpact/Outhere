import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CheckinRun } from "@outhere/core";
import { Avatar, Icon, QR, usePeople } from "@outhere/ui";

const CODE_SECONDS = 30;
const RING = 301.6;
const GROUPS = ["Fast", "Steady", "Easy"] as const;

/**
 * Full screen check-in for a club run. The code changes every 30 seconds so it
 * only works for people standing at the run. With example data, the people
 * going are played back as arrivals so the screen can be tried out.
 */
export function CheckinOverlay({ run, joinUrl, simulate, onClose }: { run: CheckinRun; joinUrl: string; simulate: boolean; onClose: () => void }) {
  const people = usePeople();
  const close = useRef<HTMLButtonElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const left = CODE_SECONDS - (elapsed % CODE_SECONDS);
  const code = 1 + Math.floor(elapsed / CODE_SECONDS);
  const [arrivals, setArrivals] = useState<{ key: number; personId: string; group: string }[]>([]);

  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ids = run.goingIds;
    if (!simulate || !ids.length) return;
    const t = setInterval(() => {
      setArrivals((a) => {
        if (a.length >= Math.min(18, run.going)) return a;
        const n = a.length + 1;
        return [{ key: n, personId: ids[a.length % ids.length]!, group: GROUPS[n % 3]! }, ...a];
      });
    }, 1900);
    return () => clearInterval(t);
  }, [simulate, run.goingIds, run.going]);

  const runKey = run.runId.replace(/^run-/, "");
  const sep = joinUrl.includes("?") ? "&" : "?";

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Run check-in">
      <button ref={close} type="button" className="iconbtn close" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
      <div className="ci">
        <div>
          <span className="kick">{run.title} · {run.place}</span>
          <h2 className="disp" style={{ fontSize: "clamp(48px,6vw,90px)", marginTop: 12 }}>Scan to <span className="b">check in</span></h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 20 }}>
            <div className="count tab" id="cin" aria-live="polite">{arrivals.length}</div>
            <div className="muted" style={{ paddingBottom: 10 }}>checked in<br />of {run.going} going</div>
          </div>
          <div className="arr" id="carr">
            {arrivals.map((a) => (
              <div className="row" key={a.key}>
                <Avatar id={a.personId} />
                <div className="t"><b>{people[a.personId]?.name ?? "Someone"}</b><span>{a.group} group · just now</span></div>
                <span className="pill blue" aria-label="Checked in"><Icon name="check" /></span>
              </div>
            ))}
          </div>
        </div>
        <div className="qrbig">
          <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" stroke="#1a1f27" />
            <circle id="cring" cx="50" cy="50" r="48" stroke="#4f9bff" strokeDasharray={RING} strokeDashoffset={(RING * (1 - left / CODE_SECONDS)).toFixed(1)} transform="rotate(-90 50 50)" strokeLinecap="round" />
          </svg>
          <div id="cqr"><QR text={`${joinUrl}${sep}run=${runKey}&c=${code}`} label={`Check-in code for ${run.title}`} /></div>
          <p className="clock" style={{ textAlign: "center", marginTop: 18 }}>NEW CODE IN <span id="cleft">{left}</span>s · ONLY WORKS AT THE RUN</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
