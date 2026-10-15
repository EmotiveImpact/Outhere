/**
 * Logo A from the Outhere Design Language: an open O with its gap at the bottom right
 * and the blue out-now dot sitting in the gap (ring 12, dot 9, space 5 on a 100 grid, round ends).
 */
export function LogoMark({ w = 12, dot = 9, space = 5 }: { w?: number; dot?: number; space?: number }) {
  const r = 50 - Math.max(w / 2, dot) - 1;
  const a = Math.PI / 4;
  const g = Math.asin(Math.min(0.95, (dot + space + w / 2) / r));
  const a1 = a + g;
  const a2 = a - g + 2 * Math.PI;
  const pt = (t: number) => `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  return (
    <svg className="oh-logo" viewBox="0 0 100 100" aria-hidden="true">
      <path className="ring" d={`M${pt(a1)} A${r} ${r} 0 1 1 ${pt(a2)}`} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" pathLength={100} />
      <circle className="dot" cx={(50 + r * Math.cos(a)).toFixed(2)} cy={(50 + r * Math.sin(a)).toFixed(2)} r={dot} fill="var(--blue)" />
    </svg>
  );
}

export function Logo({ style }: { style?: React.CSSProperties }) {
  return (
    <a className="logo" href="/" aria-label="Outhere home" style={style}>
      <LogoMark />
      <span>OUTHERE</span>
    </a>
  );
}
