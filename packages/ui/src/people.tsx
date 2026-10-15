import { createContext, useContext, type ReactNode } from "react";
import { outLabel, ringClass, type Person } from "@outhere/core";

const PeopleContext = createContext<Record<string, Person>>({});

export function PeopleProvider({ people, children }: { people: Record<string, Person>; children: ReactNode }) {
  return <PeopleContext.Provider value={people}>{children}</PeopleContext.Provider>;
}

const UNKNOWN: Person = { id: "unknown", name: "Someone", photo: "/_app/img/lone.jpg", avatar: "/_app/img/lone.jpg", tier: "free" };

export function usePerson(id: string | undefined): Person {
  const people = useContext(PeopleContext);
  return (id && people[id]) || UNKNOWN;
}

export function usePeople(): Record<string, Person> {
  return useContext(PeopleContext);
}

/**
 * A face inside its membership ring, with the out-now dot at the bottom right
 * (blue while out, red once stopped).
 */
export function Avatar({ id, size, className = "" }: { id: string; size?: "s" | "l"; className?: string }) {
  const p = usePerson(id);
  const label = outLabel(p.outNow);
  return (
    <span className={`avr ${ringClass(p.tier)} ${size ?? ""} ${className}`.trim()}>
      <img src={p.avatar} alt="" />
      {label && <em className={`ld${p.outNow === "stopped" ? " stop" : ""}`} aria-label={label} />}
    </span>
  );
}

/** A plain round face with its membership ring drawn as a shadow. */
export function Face({ id, className = "av" }: { id: string; className?: string }) {
  const p = usePerson(id);
  return <img className={`${className} ${ringClass(p.tier)}`} src={p.avatar} alt="" />;
}

/** Overlapping faces, as on "who's going" rows. No rings here, by design. */
export function Faces({ ids, more, className = "faces" }: { ids: string[]; more?: number | string; className?: string }) {
  const people = useContext(PeopleContext);
  return (
    <div className={className}>
      {ids.map((id) => (
        <img key={id} src={(people[id] ?? UNKNOWN).avatar} alt="" />
      ))}
      {more !== undefined && <span>{typeof more === "number" ? `+${more}` : more}</span>}
    </div>
  );
}
