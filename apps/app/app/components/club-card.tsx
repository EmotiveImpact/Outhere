import { Link } from "react-router";
import { formatNumber, type Club } from "@outhere/core";
import { Icon, Tick } from "@outhere/ui";

/** A club as a card: cover, crest, name, size, next run and tags. Opens its public page. */
export function ClubCard({ club }: { club: Club }) {
  return (
    <Link className="cc" to={`/${club.slug}`}>
      <div className="im">
        <img src={club.cover} alt="" loading="lazy" />
        {club.founding ? <span className="pill warn">Founding club</span> : <span className="pill glass">{club.division}</span>}
      </div>
      <div className="bd">
        <img className="cr" src={club.crest} alt="" />
        <h3>{club.name}{club.verified && <Tick />}</h3>
        <div className="meta">{[club.borough, club.city].filter(Boolean).join(", ")} · {formatNumber(club.members)} members</div>
        <div className="nx"><Icon name="clock" />{club.nextRun}</div>
        <div className="tg">{club.tags.map((t) => <span key={t}>{t}</span>)}</div>
      </div>
    </Link>
  );
}
