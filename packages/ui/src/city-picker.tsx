import type { City } from "@outhere/core";
import { Icon } from "./icons";

/** Every city and town, launch cities first. "uk" stands for clubs anywhere in the UK. */
export function CityPicker({ cities, value, onChange, allUk = false, id = "city" }: { cities: City[]; value: string; onChange: (cityId: string) => void; allUk?: boolean | string; id?: string }) {
  const launch = cities.filter((c) => c.launch);
  const more = cities.filter((c) => !c.launch);
  return (
    <label className="citysel" htmlFor={id}>
      <Icon name="pin" />
      <select id={id} aria-label="City" value={value} onChange={(e) => onChange(e.target.value)}>
        {allUk && <option value="uk">{allUk === true ? "All of the UK" : allUk}</option>}
        <optgroup label="Launch cities">
          {launch.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
        {more.length > 0 && (
          <optgroup label="More cities and towns">
            {more.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        )}
      </select>
      <Icon name="chev" />
    </label>
  );
}
