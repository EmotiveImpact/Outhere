import { useId } from "react";

export interface BarsOptions {
  w?: number;
  h?: number;
  labels?: string[];
  /** Index of the bar to light up. */
  hi?: number;
  max?: number;
  fmtY?: (v: number) => string;
  ticks?: number;
  /** A dashed line, such as the 10k full-rate cap. */
  cap?: number;
  label?: string;
}

export function Bars({ values, w = 560, h = 200, labels = [], hi = -1, max, fmtY = (v) => String(Math.round(v)), ticks = 4, cap, label }: BarsOptions & { values: number[] }) {
  const gid = useId().replace(/:/g, "");
  const pl = 34, pb = 22, pt = 8;
  const M = max || Math.max(...values) * 1.15;
  const bw = (w - pl - 6) / values.length;
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / M);
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label ?? "Bar chart"}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (M * i) / ticks;
        return (
          <g key={i}>
            <line x1={pl} x2={w} y1={y(v)} y2={y(v)} stroke="#1a1f27" />
            <text x={pl - 6} y={y(v) + 3} textAnchor="end">{fmtY(v)}</text>
          </g>
        );
      })}
      {cap !== undefined && <line x1={pl} x2={w} y1={y(cap)} y2={y(cap)} stroke="#3a4250" strokeDasharray="4 4" />}
      {values.map((v, i) => {
        const x = pl + i * bw + bw * 0.18;
        const bwid = bw * 0.64;
        return (
          <g key={i}>
            <rect className="grow" style={{ animationDelay: `${i * 35}ms` }} x={x} y={y(v)} width={bwid} height={y(0) - y(v)} rx={Math.min(6, bwid / 3)} fill={i === hi ? `url(#${gid})` : "#26507f"} />
            {labels[i] && <text x={x + bwid / 2} y={h - 6} textAnchor="middle">{labels[i]}</text>}
          </g>
        );
      })}
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cbcff" />
          <stop offset="1" stopColor="#2a6af0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Spark({ values, w = 110, h = 28, colour = "#4f9bff", fill = true }: { values: number[]; w?: number; h?: number; colour?: string; fill?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const M = Math.max(...values), m = Math.min(...values);
  const x = (i: number) => i * (w / (values.length - 1));
  const y = (v: number) => h - 2 - (h - 4) * ((v - m) / (M - m || 1));
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="sp" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colour} stopOpacity=".35" />
              <stop offset="1" stopColor={colour} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={colour} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Area({ values, w = 640, h = 200, labels = [], label }: { values: number[]; w?: number; h?: number; labels?: string[]; label?: string }) {
  const gid = useId().replace(/:/g, "");
  const pl = 40, pb = 22, pt = 10;
  const M = Math.max(...values) * 1.1;
  const x = (i: number) => pl + i * ((w - pl) / (values.length - 1));
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / M);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label ?? "Area chart"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f9bff" stopOpacity=".35" />
          <stop offset="1" stopColor="#4f9bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (M * i) / 4;
        return (
          <g key={i}>
            <line x1={pl} x2={w} y1={y(v)} y2={y(v)} stroke="#1a1f27" />
            <text x={pl - 6} y={y(v) + 3} textAnchor="end">{v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}</text>
          </g>
        );
      })}
      {labels.map((l, i) => l && <text key={i} x={x(i)} y={h - 5} textAnchor="middle">{l}</text>)}
      <path d={`${d} L${x(last)} ${y(0)} L${pl} ${y(0)}Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke="#4f9bff" strokeWidth={2} />
      <circle cx={x(last)} cy={y(values[last] ?? 0)} r={4.5} fill="#8cbcff" stroke="#06080b" strokeWidth={2} />
    </svg>
  );
}

/** League form, newest last: w, d or l. */
export function Form({ form }: { form: string }) {
  return (
    <span className="form" aria-label={`Form ${form.toUpperCase().split("").join(" ")}`}>
      {[...form].map((c, i) => (
        <i key={i} className={c}>{c.toUpperCase()}</i>
      ))}
    </span>
  );
}

export type RouteShape = "rye" | "river" | "park";

const ROUTES: Record<RouteShape, { d: string; a: string; b: string }> = {
  rye: { d: "M78 168 C118 160 140 124 188 116 S268 72 330 82 S418 142 470 122 S532 70 552 56", a: "M40 192 L78 168", b: "M552 56 L590 30" },
  river: { d: "M64 70 C140 84 176 152 258 150 S374 92 440 108 S512 176 556 166", a: "M24 54 L64 70", b: "M556 166 L594 182" },
  park: { d: "M300 178 C210 178 160 150 166 108 S236 40 304 42 S440 70 438 112 S392 176 318 178", a: "M300 178 L280 206", b: "M318 178 L340 206" },
};

/** A run's route with the first and last stretch cut, so nobody's home shows. */
export function RouteMap({ shape, children }: { shape: RouteShape; children?: React.ReactNode }) {
  const r = ROUTES[shape];
  return (
    <div className="fp-map">
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="st">
          {Array.from({ length: 9 }, (_, i) => <path key={`v${i}`} d={`M${-20 + i * 80} 230 L${60 + i * 80} -10`} />)}
          {Array.from({ length: 5 }, (_, i) => <path key={`h${i}`} d={`M-10 ${20 + i * 48} L620 ${-10 + i * 52}`} />)}
        </g>
        <path className="glow" d={r.d} />
        <path className="rt" d={r.d} />
        <path className="cut" d={r.a} />
        <path className="cut" d={r.b} />
      </svg>
      {children}
    </div>
  );
}
