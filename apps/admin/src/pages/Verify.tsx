import { useState } from "react";
import type { Club } from "@outhere/core";
import { Icon, useToast } from "@outhere/ui";
import { WEB_URL } from "../data";
import { useAct, useLoad } from "../load";
import { signature } from "../util";

export function Verify() {
  const toast = useToast();
  const act = useAct();
  const [selId, setSelId] = useState<string | null>(null);
  const { data } = useLoad(async (db) => {
    const [requests, clubs, viewer] = await Promise.all([db.verifications(), db.clubs(), db.viewer()]);
    return { requests, clubs: new Map<string, Club>(clubs.map((c) => [c.id, c])), me: signature(viewer) };
  });
  if (!data) return null;

  const { requests, clubs, me } = data;
  const q = requests.find((r) => r.id === selId) ?? requests[0];
  const c = q && clubs.get(q.clubId);
  const allTicked = !!q && q.checks.every((k) => k.done);

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Outhere HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>
            Club <span className="b">verification</span>
          </h1>
          <p>
            A club gets the blue shield once a person has checked it is real. Founding clubs go official after three meetups with six people at each, ten different
            verified people in all.
          </p>
        </div>
      </div>
      {!q || !c ? (
        <div className="card">
          <p className="muted">Nobody is waiting for a check. New requests land here as soon as a club asks.</p>
        </div>
      ) : (
        <div className="vq">
          <div className="list" id="vlist">
            {requests.map((r) => {
              const rc = clubs.get(r.clubId);
              return (
                <button key={r.id} type="button" className="it" aria-pressed={r.id === q.id} onClick={() => setSelId(r.id)}>
                  <img src={rc?.cover} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{rc?.name ?? r.clubId}</b>
                    <span>
                      {r.claim ? "Claim of an existing club" : "Founding club"} · {r.age}
                    </span>
                  </div>
                  {r.verified && (
                    <span className="pill blue" aria-label="Verified">
                      <Icon name="check" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="card" id="vdet">
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <img src={c.crest} alt="" style={{ width: 60, height: 60, borderRadius: 16 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ font: "600 32px/1 var(--display)", textTransform: "uppercase" }}>{c.name}</h3>
                <div className="muted" style={{ fontSize: 13 }}>
                  {c.borough} · organiser {q.organiser} · {c.members} people so far
                </div>
              </div>
              <a className="btn btn-q btn-s" href={`${WEB_URL}/${c.slug}`} target="_blank" rel="noreferrer">
                <Icon name="eye" />
                Page
              </a>
            </div>
            <div className="evid mt">
              {q.evidence.map((src, i) => (
                <img key={`${src}-${i}`} src={src} alt="Meetup photo" />
              ))}
            </div>
            <div className="checks mt">
              {q.checks.map((k, i) => (
                <div className="row" key={k.label}>
                  <button
                    className="cb"
                    type="button"
                    role="checkbox"
                    aria-checked={k.done}
                    aria-label={k.label}
                    disabled={q.verified}
                    onClick={() => act((db) => db.setVerificationCheck(q.id, i, !k.done))}
                  >
                    <Icon name="check" />
                  </button>
                  <div className="t">
                    <b>{k.label}</b>
                    <span>{k.auto ? "Checked automatically from check-ins" : "Needs a person to look"}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn btn-q" type="button" onClick={() => toast(`Asked ${q.organiser} for more photos`)}>
                Ask for more
              </button>
              <button
                className="btn btn-p"
                id="vgo"
                type="button"
                disabled={!allTicked || q.verified}
                onClick={() => act((db) => db.verifyClub(q.id), `${c.name} verified. Logged as ${me}`)}
              >
                <Icon name="shield" />
                {q.verified ? "Verified" : "Verify club"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
