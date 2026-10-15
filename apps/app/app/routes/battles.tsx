import { useEffect, useRef, useState } from "react";
import { battleLengths, canSeeClubHq, firstName, type BattleModeKey } from "@outhere/core";
import { Avatar, ChipPick, Icon, Toggle, usePerson, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/battles";

export const meta: Route.MetaFunction = () => [{ title: "Battles · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const [battles, viewer] = await Promise.all([db.battles(), db.viewer()]);
  return { battles, viewer, captain: canSeeClubHq(viewer) };
}

type Versus = { who: string; mode: string; line: string };

/** The fighting game style versus screen: you in blue, them in red. */
function VersusOverlay({ v, me, onClose }: { v: Versus; me: { name: string; photo: string }; onClose: () => void }) {
  const them = usePerson(v.who === "random" ? undefined : v.who);
  const random = v.who === "random";
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="overlay vsx" role="dialog" aria-label="Versus">
      <div className="vs-side us">
        <img src={me.photo} alt="" />
        <div className="vs-nm"><span className="mono">1P · Blue</span><b className="disp">{firstName(me.name)}</b></div>
      </div>
      <div className={`vs-side them${random ? " hid" : ""}`}>
        <img src={random ? "/_app/img/lone.jpg" : them.photo} alt="" />
        <div className="vs-nm"><span className="mono">2P · Red</span><b className="disp">{random ? "???" : firstName(them.name)}</b></div>
      </div>
      <div className="vs-mid">
        <b className="disp">VS</b>
        <span className="mono">{v.mode}</span>
        <p>{v.line}</p>
        <button ref={ok} type="button" className="btn btn-w btn-s" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function Name({ id }: { id: string }) {
  return <>{usePerson(id).name}</>;
}
function First({ id }: { id: string }) {
  return <>{firstName(usePerson(id).name)}</>;
}

export default function Battles({ loaderData }: Route.ComponentProps) {
  const { battles, viewer, captain } = loaderData;
  const toast = useToast();
  const { act } = useAct();
  const [who, setWho] = useState<string | null>(null);
  const [mode, setMode] = useState<BattleModeKey>("steps");
  const [len, setLen] = useState<string | null>(null);
  const [stake, setStake] = useState(battles.stakes[0] ?? "Bragging rights");
  const [versus, setVersus] = useState<Versus | null>(null);
  const [surprise, setSurprise] = useState(battles.surpriseChallengers);

  const m = battles.modes.find((x) => x.key === mode) ?? battles.modes[0]!;
  const lengths = battleLengths(m);
  const length = len && lengths.options.includes(len) ? len : lengths.fallback;
  const whoPerson = usePerson(who && who !== "random" ? who : undefined);
  const whoName = who === "random" ? "anyone near your level" : who ? firstName(whoPerson.name) : null;
  const challenge = battles.challenges[0];
  const challenger = usePerson(challenge?.fromId);

  function send() {
    if (!who) return;
    act({ intent: "battle-create", opponentId: who, mode, length, stake });
    setVersus({
      who,
      mode: `${m.name} · ${length}`,
      line: who === "random"
        ? "Finding someone near your level. You'll both see who it is once you each accept."
        : `Challenge sent. ${firstName(whoPerson.name)} has 24 hours to accept. ${stake}.`,
    });
  }

  return (
    <>
      <section className="slab bhero" style={{ minHeight: 300 }}>
        <img className="bg" src="/_app/img/lbattle.jpg" alt="Two runners side by side on a night street" style={{ objectPosition: "50% 40%" }} />
        <span className="kick">Versus</span>
        <h1 className="disp" style={{ fontSize: "clamp(52px,7vw,100px)", marginTop: 12 }}>Settle it <span className="b">outside</span></h1>
        <p style={{ color: "#dfe5ee", maxWidth: "54ch", marginTop: 12 }}>Pick someone, pick how you fight, and let the streets decide. You're always blue, they're always red.</p>
        <div className="brec">
          <div><b className="tab">{battles.record.won}</b><span>Won</span></div>
          <div><b className="tab">{battles.record.lost}</b><span>Lost</span></div>
          <div><b className="tab">{battles.record.streak}</b><span>Streak</span></div>
          <div><b className="tab">{battles.record.live}</b><span>Live now</span></div>
        </div>
      </section>
      <div className="g bgrid mt">
        <div className="bmain">
          <section className="card bset" id="bset">
            <div className="hd"><h3>Set up a battle</h3><span className="muted" style={{ fontSize: 12.5 }}>Four quick picks</span></div>
            <div className="bs-l"><span className="bs-n">1</span>Who are you taking on?</div>
            <div className="bs-who" id="bwho">
              {battles.candidates.map((k) => (
                <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)}>
                  <Avatar id={k} /><b><First id={k} /></b>
                </button>
              ))}
              <button type="button" aria-pressed={who === "random"} onClick={() => setWho("random")}>
                <span className="avr rnd"><Icon name="dice" /></span><b>Anyone</b>
              </button>
            </div>
            <div className="bs-l"><span className="bs-n">2</span>How do you want to fight?</div>
            <div className="bs-modes" id="bmode">
              {battles.modes.map((x) => (
                <button key={x.key} type="button" aria-pressed={x.key === mode} onClick={() => setMode(x.key)}>
                  <b>{x.name}</b><span>{x.description}</span>
                </button>
              ))}
            </div>
            <div className="bs-l"><span className="bs-n">3</span><span id="blenq">{lengths.question}</span></div>
            <ChipPick id="blen" options={lengths.options} value={length} onChange={setLen} />
            <div className="bs-l"><span className="bs-n">4</span>What's on it?</div>
            <ChipPick id="bstake" options={battles.stakes} value={stake} onChange={setStake} />
            <div className="bs-go">
              <p className="muted" id="bsum">
                {whoName ? <><b>{m.name}</b> v {whoName} · {length} · {stake}</> : "Pick who you're taking on."}
              </p>
              <button type="button" className="btn btn-p" id="bsend" disabled={!whoName} onClick={send}><Icon name="bolt" />Send the challenge</button>
            </div>
          </section>

          <div className="hd mt2" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Live now</h3><span className="muted" style={{ fontSize: 12.5 }}>{battles.active.length} battles</span>
          </div>
          <div className="g" id="bact">
            {battles.active.map((b) => (
              <article key={b.id} className="card bcard">
                <div className="fl-top">
                  <span className={`pill ${b.sealed ? "" : "blue"}`}><Icon name={b.sealed ? "lock" : "bolt"} />{b.mode}</span>
                  <span className="muted tab" style={{ fontSize: 12 }}>{b.ends}</span>
                </div>
                <div className="bt-row">
                  <div><Avatar id={viewer.id} size="l" /><b>You</b><span className="tab bl">{b.us}</span></div>
                  <span className="bt-vs">v</span>
                  <div className="r"><Avatar id={b.opponentId} size="l" /><b><First id={b.opponentId} /></b><span className={`tab ${b.sealed ? "dim" : "rd"}`}>{b.them}</span></div>
                </div>
                <div className={`fd-bar${b.even ? " even" : ""}`}><span style={{ width: `${b.share}%` }} /><i style={{ width: `${100 - b.share}%` }} /></div>
                <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{b.note}</p>
                <div className="fl-ft">
                  <span className="pill">{b.stake}</span><span className="sp" />
                  <ShoutButton id={b.opponentId} />
                </div>
              </article>
            ))}
            {challenge && (
              <article className="card bcard bin">
                <div className="fl-top">
                  <span className="pill red"><Icon name="bolt" /><First id={challenge.fromId} /> challenged you</span>
                  <span className="muted tab" style={{ fontSize: 12 }}>{challenge.answerIn}</span>
                </div>
                <div className="bin-r">
                  <Avatar id={challenge.fromId} size="l" />
                  <div className="t"><b>{challenge.mode}</b><span>{challenge.line}</span></div>
                </div>
                <div className="fl-ft">
                  {challenge.accepted ? (
                    <span className="pill blue"><Icon name="check" />Accepted</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-p btn-s"
                        id="bacc"
                        onClick={() => {
                          act({ intent: "challenge-accept", id: challenge.id });
                          setVersus({ who: challenge.fromId, mode: challenge.mode, line: `You're on. ${firstName(challenger.name)}'s ghost is ready whenever you are, until Sunday.` });
                        }}
                      >
                        <Icon name="check" />Accept
                      </button>
                      <DeclineButton id={challenge.fromId} challengeId={challenge.id} />
                    </>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>

        <aside className="bside">
          <div className="card">
            <div className="hd"><h3>Club v club</h3>{!captain && <span className="pill">Captains</span>}</div>
            <div className="bcvc"><img src="/_app/img/pacers.jpg" alt="" /><span className="bt-vs">v</span><img src={battles.rivalClub.crest} alt="" /></div>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Friendlies on top of the league. Club live race, relay, turnout night or turf war. Members vote to accept, and no league points change hands.</p>
            {captain ? (
              <button type="button" className="btn btn-p btn-s mt" onClick={() => toast(`Challenge sent to ${battles.rivalClub.name}. Their members vote by Thursday.`)}><Icon name="bolt" />Challenge a club</button>
            ) : (
              <button type="button" className="btn btn-q btn-s mt" onClick={() => toast("Asked your captains to set one up")}>Ask your captain</button>
            )}
          </div>
          <div className="card mt">
            <div className="hd"><h3>Your rivals</h3></div>
            {battles.rivals.map((r) => (
              <div key={r.personId} className="row">
                <Avatar id={r.personId} />
                <div className="t"><b><Name id={r.personId} /></b><span>{r.mine > r.theirs ? "You lead" : r.mine < r.theirs ? "They lead" : "All square"}</span></div>
                <span className="brv tab"><b className="bl">{r.mine}</b><i>-</i><b className="rd">{r.theirs}</b></span>
              </div>
            ))}
          </div>
          <div className="card mt">
            <div className="hd"><h3>Here comes a new challenger</h3></div>
            <div className="row" style={{ border: 0, paddingTop: 0 }}>
              <div className="t"><span>Let people near your level challenge you out of nowhere. You see who it is once you both accept.</span></div>
              <Toggle
                on={surprise}
                label="Allow surprise challengers"
                onChange={(on) => {
                  setSurprise(on);
                  act({ intent: "surprise", on });
                }}
              />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Never for under 18s. Anyone you remove from your list can't find you.</p>
          </div>
          <div className="card mt">
            <div className="hd"><h3>Last results</h3></div>
            {battles.results.map((r) => (
              <div key={r.personId + r.mode} className="row">
                <Avatar id={r.personId} />
                <div className="t"><b>{r.mode} v <First id={r.personId} /></b><span>{r.line}</span></div>
                <span className={`pill ${r.won ? "blue" : "red"}`}>{r.won ? "Won" : "Lost"}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {versus && <VersusOverlay v={versus} me={viewer} onClose={() => setVersus(null)} />}
    </>
  );
}

function ShoutButton({ id }: { id: string }) {
  const toast = useToast();
  const p = usePerson(id);
  return <button type="button" className="btn btn-q btn-s" onClick={() => toast(`Shout sent to ${firstName(p.name)}`)}><Icon name="spark" />Send a shout</button>;
}

function DeclineButton({ id, challengeId }: { id: string; challengeId: string }) {
  const toast = useToast();
  const { act } = useAct();
  const p = usePerson(id);
  return (
    <button
      type="button"
      className="btn btn-q btn-s"
      onClick={() => {
        act({ intent: "challenge-decline", id: challengeId });
        toast(`${firstName(p.name)}'s been told you can't make it this week. No points lost.`);
      }}
    >
      Not this week
    </button>
  );
}
