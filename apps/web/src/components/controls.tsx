import { useRef } from 'react';
import { BOROUGHS, type Borough, DEFAULT_BOROUGH } from '../lib/boroughs';
import { CITIES, type CityId, ELSEWHERE, type Place, REGIONS, type Region } from '../lib/places';

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

/**
 * Where someone moves: one of the launch cities (London also asks for the borough),
 * or a town anywhere else in the UK and the region it plays for.
 */
export function PlacePicker({ id, value, onChange, cityLabel = 'Your city' }: {
  id: string; value: Place; onChange: (p: Place) => void; cityLabel?: string;
}) {
  // Remember the borough or town if someone flicks between cities.
  const last = useRef({
    borough: value.city === 'london' ? value.borough : DEFAULT_BOROUGH,
    town: value.city === ELSEWHERE ? value.town : '',
    region: value.city === ELSEWHERE ? value.region : ('' as Region | ''),
  });
  const set = (p: Place) => {
    if (p.city === 'london') last.current.borough = p.borough;
    if (p.city === ELSEWHERE) Object.assign(last.current, { town: p.town, region: p.region });
    onChange(p);
  };
  const pick = (c: string) => {
    const { borough, town, region } = last.current;
    if (c === 'london') onChange({ city: 'london', borough });
    else if (c === ELSEWHERE) onChange({ city: ELSEWHERE, town, region });
    else onChange({ city: c as Exclude<CityId, 'london'> });
  };
  return (
    <>
      <div className="field">
        <label htmlFor={id + 'City'}>{cityLabel}</label>
        <select id={id + 'City'} value={value.city} onChange={(e) => pick(e.target.value)}>
          <optgroup label="Launch cities">{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          <option value={ELSEWHERE}>Somewhere else in the UK</option>
        </select>
      </div>
      {value.city === 'london' && (
        <div className="field"><label htmlFor={id + 'Borough'}>Your borough</label><BoroughSelect id={id + 'Borough'} value={value.borough} onChange={(b) => set({ city: 'london', borough: b })} /></div>
      )}
      {value.city === ELSEWHERE && (
        <div className="row2">
          <div className="field"><label htmlFor={id + 'Town'}>Town or city</label><input id={id + 'Town'} value={value.town} onChange={(e) => set({ ...value, town: e.target.value })} placeholder="Like Hexham or Truro" maxLength={60} autoComplete="address-level2" /></div>
          <div className="field"><label htmlFor={id + 'Region'}>Region</label>
            <select id={id + 'Region'} value={value.region} onChange={(e) => set({ ...value, region: e.target.value as Region })}>
              <option value="" disabled>Choose one</option>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
      )}
    </>
  );
}

/** Hidden field that only bots fill in. */
export const Honeypot = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="hp" aria-hidden="true">
    <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" /></label>
  </div>
);

export const Mist = () => <div className="mist" aria-hidden="true" />;
