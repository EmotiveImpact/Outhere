import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@outhere/core";
import { Icon, useToast } from "@outhere/ui";

type Stage = "intro" | 3 | 2 | 1 | "score" | "result";

/**
 * Sunday's reveal: a countdown, both scores counting up together, the winner
 * lit, then what it means for the club, the squad and the borough.
 */
export function RevealOverlay({ onClose, home = { name: "Peckham Pacers", crest: "/img/pacers.jpg", score: 13224 }, away = { name: "Brixton Sunrise", crest: "", score: 12826 } }: {
  onClose: () => void;
  home?: { name: string; crest: string; score: number };
  away?: { name: string; crest: string; score: number };
}) {
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
  return (
    <div className={`rv${lit ? " lit" : ""}`} role="dialog" aria-label="Sunday reveal">
      <img src="/img/derby.jpg" alt="" />
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
              <div className={`side2${won ? " win" : ""}`}>
                <img src={home.crest} alt="" />
                <div className="nm">{home.name}</div>
                <div className="sc2">{formatNumber(scores[0] ?? 0)}</div>
              </div>
              <div className="vs2">VS</div>
              <div className={`side2${won ? " lose" : ""}`}>
                {away.crest && <img src={away.crest} alt="" />}
                <div className="nm">{away.name}</div>
                <div className="sc2">{formatNumber(scores[1] ?? 0)}</div>
              </div>
            </div>
          </>
        )}
        {stage === "result" && (
          <>
            <div className="ft">PECKHAM WIN BY {margin}</div>
            <div className="head" style={{ marginTop: 16 }}>Peckham<br /><span>take the derby</span></div>
            <div className="after">
              <div className="card"><span className="kick">Club Premier</span><h3 style={{ marginTop: 8 }}>Up to 1st</h3><p className="muted" style={{ fontSize: 12.5 }}>+3 points · 13 from 5</p></div>
              <div className="card"><span className="kick">Your squad</span><h3 style={{ marginTop: 8 }}>London beat Manchester</h3><p className="muted" style={{ fontSize: 12.5 }}>8,912 to 8,610 · you were #214</p></div>
              <div className="card"><span className="kick">Borough league</span><h3 style={{ marginTop: 8 }}>Southwark up to 2nd</h3><p className="muted" style={{ fontSize: 12.5 }}>Your 78,265 steps helped</p></div>
            </div>
            <div className="after">
              <button type="button" className="btn btn-p btn-l" onClick={() => toast("Story saved with the final score")}><Icon name="share" />Share the win</button>
              <button type="button" className="btn btn-g btn-l" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
