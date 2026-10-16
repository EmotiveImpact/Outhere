import type { IconName } from "@outhere/core";

/** Stroke icons from the web app mockup, drawn on a 24 grid. */
const PATHS: Record<IconName, string> = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.7-5.5 7-5.5s6.1 1.9 7 5.5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  people: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="8" r="2.5"/><path d="M15.5 13.6c2.3.2 4 1.6 4.7 4.4"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5V20M20 14v.5"/>',
  pound: '<path d="M16.5 6.5A3.8 3.8 0 0 0 9.5 8v4.5c0 3-1 5.5-3 7h11.5M7 12.5h7"/>',
  shield: '<path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.6-4-1.4-7-5.2-7-9.6V6z"/><path d="M9 12l2 2 4-4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/>',
  share: '<path d="M12 4v11M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v6h14v-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ext: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 14v5H5V7h5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6-2.5-2.5 1-4.5 4 2.5 2.5 1M9.5 8.5L7 11l-.5 3M12 15l3 6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  store: '<path d="M4 9.5L5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8"/>',
  log: '<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  chat: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/>',
  feed: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M7.5 7.5h5M7.5 16.5h7"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 15.5l-5-4.5-8.5 8"/>',
  send: '<path d="M4.5 12L20 4.5 15 20l-3-6.5z"/><path d="M12 13.5L20 4.5"/>',
  bolt: '<path d="M13.5 3L5.5 13.5h6L10.5 21l8-10.5h-6z"/>',
  pinI: '<path d="M9 3.5h6l-1 5 3 3H7l3-3z"/><path d="M12 11.5V20"/>',
};

export function Icon({ name, className = "i" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

/** The blue verified shield after a club's name. */
export function Tick() {
  return (
    <svg className="tick" viewBox="0 0 24 24" role="img" aria-label="Verified club">
      <path fill="currentColor" d="M12 2l7.5 3.2v5.4c0 4.7-3.2 8.9-7.5 10.4-4.3-1.5-7.5-5.7-7.5-10.4V5.2z" />
      <path d="M8.5 12l2.4 2.4 4.6-4.8" fill="none" stroke="#07090c" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Logo A: an open O with the gap at the bottom right and the blue dot in the
 * gap. Ring 12, dot 9, space 5 on a 100 grid, round ends.
 */
export function Logo({ ring = 12, dot = 9, space = 5, dotColour = "var(--blue)" }: { ring?: number; dot?: number; space?: number; dotColour?: string }) {
  const r = 50 - Math.max(ring / 2, dot) - 1;
  const a = Math.PI / 4;
  const g = Math.asin(Math.min(0.95, (dot + space + ring / 2) / r));
  const pt = (t: number) => `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  return (
    <svg className="oh-logo" viewBox="0 0 100 100" aria-hidden="true">
      <path d={`M${pt(a + g)} A${r} ${r} 0 1 1 ${pt(a - g + 2 * Math.PI)}`} fill="none" stroke="currentColor" strokeWidth={ring} strokeLinecap="round" />
      <circle cx={(50 + r * Math.cos(a)).toFixed(2)} cy={(50 + r * Math.sin(a)).toFixed(2)} r={dot} fill={dotColour} />
    </svg>
  );
}
