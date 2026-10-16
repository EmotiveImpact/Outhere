export const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

/** Simple persisted values for this browser only (the visitor's own place on the list). */
export const local = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem('oh_' + k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem('oh_' + k, JSON.stringify(v));
    } catch {
      /* private mode: nothing to keep */
    }
  },
};

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ease a number from its current value to `to`, calling `set` each frame. */
export function countTo(from: number, to: number, set: (v: number) => void, ms = 900) {
  if (prefersReducedMotion()) {
    set(to);
    return () => {};
  }
  const t0 = performance.now();
  let raf = 0;
  const f = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    set(from + (to - from) * (1 - Math.pow(1 - k, 4)));
    if (k < 1) raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
  return () => cancelAnimationFrame(raf);
}
