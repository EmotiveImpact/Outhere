import { BOROUGHS, type Borough } from '../lib/boroughs';

/** A row of toggle buttons where exactly one is pressed (the prototype's chips and segments). */
export function Choice<T extends string>({ options, value, onChange, className = 'chips', label, render }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; className?: 'chips' | 'seg'; label?: string; render?: (v: T) => React.ReactNode;
}) {
  return (
    <div className={className} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

export function BoroughSelect({ id, value, onChange }: { id: string; value: Borough; onChange: (b: Borough) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as Borough)}>
      {BOROUGHS.map((b) => <option key={b}>{b}</option>)}
    </select>
  );
}

/** Hidden field that only bots fill in. */
export const Honeypot = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="hp" aria-hidden="true">
    <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" /></label>
  </div>
);

export const Mist = () => <div className="mist" aria-hidden="true" />;
