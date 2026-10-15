import { useEffect, useRef, useState } from "react";
import { formatNumber, type RevealResult } from "@outhere/core";
import { Icon, useToast } from "@outhere/ui";

type Stage = "intro" | 3 | 2 | 1 | "score" | "result";

/**
 * Sunday's reveal: a countdown, both scores counting up together, the winner
 * lit, then what it means for the club, the squad and the borough.
 */
export function RevealOverlay({ onClose, result }: { onClose: () => void; result: RevealResult }) {
  const { home, away, cards } = result;
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("intro");
  const [lit, setLit] = useState(false);
  const [won, setWon] = useState(false);
  const [scores, setScores] = useState([0, 0]);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    skip.current?.focus();
    const timers = [
      setTimeout(() => { setLit(true); setStage(3); }, 1900),
      setTimeout(() => setStage(2), 2800),
      setTimeout(() => setStage(1), 3700),
      setTimeout(() => setStage("score"), 4600),
      setTimeout(() => setWon(true), 7200),
      setTimeout(() => setStage("result"), 9400),
    ];
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  useEffect(() => {
    if (stage !== "score") return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 2200);
      const e = 1 - Math.pow(1 - p, 3);
      setScores([home.score * e, away.score * Math.min(1, e * 1.012)]);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, home.score, away.score]);

  const margin = home.score - away.score;
  const winner = margin > 0 ? home : margin < 0 ? away : null;
  const share = () => {
    const text = `${home.name} ${formatNumber(home.score)}, ${away.name} ${formatNumber(away.score)}. Sunday reveal on Outhere.`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast("Score copied to share"), () => {});
  };
  return (
    <div className={`rv${lit ? " lit" : ""}`} role="dialog" aria-label="Sunday reveal">
      <img src="/_app/img/derby.jpg" alt="" />
      <div className={`sweep${won ? " go" : ""}`} />
      <button ref={skip} type="button" className="btn btn-g btn-s skip" onClick={onClose}>Skip</button>
      <div className="stage">
        {stage === "intro" && (
          <>
            <div className="ft">SUNDAY · 20:00</div>
            <div className="head" style={{ marginTop: 18 }}>The results<br /><span>are in</span></div>
          </>
        )}
        {typeof stage === "number" && <div className="cd" key={stage}>{stage}</div>}
        {stage === "score" && (
          <>
            <div className="ft">FULL TIME · CLUB DERBY</div>
            <div className="sides">
              <div className={`side2${won && margin !== 0 ? (margin > 0 ? " win" : " lose") : ""}`}>
                <img src={home.crest} alt="" />
                <div className="nm">{home.name}</div>
                <div className="sc2">{formatNumber(scores[0] ?? 0)}</div>
              </div>
              <div className="vs2">VS</div>
              <div className={`side2${won && margin !== 0 ? (margin < 0 ? " win" : " lose") : ""}`}>
                {away.crest && <img src={away.crest} alt="" />}
                <div className="nm">{away.name}</div>
                <div className="sc2">{formatNumber(scores[1] ?? 0)}</div>
              </div>
            </div>
          </>
        )}
        {stage === "result" && (
          <>
            <div className="ft">{winner ? `${winner.short.toUpperCase()} WIN BY ${formatNumber(Math.abs(margin))}` : "LEVEL AT FULL TIME"}</div>
            <div className="head" style={{ marginTop: 16 }}>{winner ? <>{winner.short}<br /><span>take the derby</span></> : <>All<br /><span>square</span></>}</div>
            {cards.length > 0 && (
              <div className="after">
                {cards.slice(0, 3).map((c) => (
                  <div key={c.kick} className="card"><span className="kick">{c.kick}</span><h3 style={{ marginTop: 8 }}>{c.title}</h3><p className="muted" style={{ fontSize: 12.5 }}>{c.line}</p></div>
                ))}
              </div>
            )}
            <div className="after">
              <button type="button" className="btn btn-p btn-l" onClick={share}><Icon name="share" />{margin > 0 ? "Share the win" : "Share the result"}</button>
              <button type="button" className="btn btn-g btn-l" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
