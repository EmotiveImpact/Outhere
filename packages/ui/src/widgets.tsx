import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { countdown, formatNumber, type BoroughStat, type Kpi as KpiData } from "@outhere/core";
import { Logo } from "./icons";
import { Spark } from "./charts";

/* ---------- motion preference ---------- */

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

/* ---------- toasts ---------- */

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback<ToastFn>((text) => {
    clearTimeout(timer.current);
    setMsg({ text, key: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div key={msg.key} className="toast" role="status">
          {msg.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastFn => useContext(ToastContext);

/* ---------- small controls ---------- */

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="toggle" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

/** Segmented control. Only one option is ever pressed. */
export function Seg<T extends string>({ options, value, onChange, id, className = "seg" }: { options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; id?: string; className?: string }) {
  return (
    <div className={className} id={id} role="group">
      {options.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={k === value} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Chips where one is picked. */
export function ChipPick({ options, value, onChange, id }: { options: string[]; value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div className="chips" id={id} role="group">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function DateBox({ day, date, style }: { day: string; date: number; style?: React.CSSProperties }) {
  return (
    <div className="datebox" style={style}>
      <span>{day}</span>
      <b>{date}</b>
    </div>
  );
}

/* ---------- live numbers ---------- */

/** Re-renders every second on the client. Null on the server so markup matches. */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function Countdown({ to, short = false }: { to: string; short?: boolean }) {
  const now = useNow();
  return <span className="tab">{now === null ? (short ? "–d ––h" : "–d ––:––:––") : countdown(to, now, short)}</span>;
}

/** Counts up from zero when it first shows, like the mockup's KPI tiles. */
export function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setShown(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <>
      {prefix}
      {formatNumber(shown)}
    </>
  );
}

/** A score that ticks upward while a match is live. */
/**
 * True while the app runs on example data. Some widgets act out live activity
 * then (a derby score that ticks up); with real data they show what the server
 * sent and nothing more.
 */
const ExampleDataContext = createContext(true);
export const ExampleDataProvider = ExampleDataContext.Provider;

export function useLiveScore(start: number, perTick: number, ms = 2600): number {
  const example = useContext(ExampleDataContext);
  const [v, setV] = useState(start);
  useEffect(() => {
    setV(start);
    if (!example) return;
    const t = setInterval(() => setV((x) => x + Math.round(Math.random() * perTick)), ms);
    return () => clearInterval(t);
  }, [start, perTick, ms, example]);
  return v;
}

export function Kpi({ kpi }: { kpi: KpiData }) {
  return (
    <div className="card kpi">
      <div className="l">{kpi.label}</div>
      <div className="v tab">{typeof kpi.value === "number" ? <CountUp value={kpi.value} prefix={kpi.prefix} /> : kpi.value}</div>
      <div className="d" dangerouslySetInnerHTML={{ __html: kpi.delta }} />
      {kpi.spark && <Spark values={kpi.spark} />}
    </div>
  );
}

/* ---------- QR codes ---------- */

/**
 * A scannable QR code drawn as SVG (qrcode-generator, MIT), with the Outhere
 * logo in the middle. High error correction keeps it readable under the logo.
 */
export function QR({ text, logo = true, label }: { text: string; logo?: boolean; label?: string }) {
  const path = useMemo(() => {
    const q = qrcode(0, "H");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { d, size: n + 4 };
  }, [text]);
  return (
    <div className="qrt" data-qr={text}>
      <svg className="qr" viewBox={`0 0 ${path.size} ${path.size}`} role="img" aria-label={label ?? "QR code"} shapeRendering="crispEdges">
        <rect width={path.size} height={path.size} fill="#fff" />
        <path d={path.d} fill="#07090c" />
      </svg>
      {logo && (
        <span className="qlogo">
          <Logo dotColour="#2a6af0" />
        </span>
      )}
    </div>
  );
}

/* ---------- London tile map ---------- */

export function BoroughMap({ stats, metric, home, picked, onPick, id, className = "bmap" }: { stats: BoroughStat[]; metric: "steps" | "clubs"; home?: string; picked?: string | null; onPick?: (b: string | null) => void; id?: string; className?: string }) {
  const reduce = useReducedMotion();
  const vals = stats.map((s) => s.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  return (
    <div className={className} id={id}>
      {stats.map((b) => {
        const lit = 0.05 + 0.95 * Math.pow((b.value - min) / (max - min || 1), 1.6);
        return (
          <button
            key={b.code}
            type="button"
            className={b.name === home ? "home" : undefined}
            style={{ gridColumn: b.col + 1, gridRow: b.row + 1, ["--lit" as string]: lit.toFixed(2), animation: reduce ? undefined : `tilein .5s cubic-bezier(.3,1.4,.5,1) ${(b.col + b.row) * 40}ms backwards` }}
            data-lit={lit > 0.42 ? 1 : 0}
            aria-pressed={picked === b.name}
            aria-label={`${b.name}, ${metric === "clubs" ? `${b.value} clubs` : `${formatNumber(b.value)} steps a day`}`}
            title={b.name}
            onClick={() => onPick?.(picked === b.name ? null : b.name)}
          >
            {b.code}
          </button>
        );
      })}
    </div>
  );
}
