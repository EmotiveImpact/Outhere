import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { firstName, formatNumber, type Battle, type FeedComment, type FeedPost, type Reaction, type ReactionCounts } from "@outhere/core";
import { Avatar, BoroughMap, Faces, Icon, RouteMap, useLiveScore, usePerson, useReducedMotion, useToast } from "@outhere/ui";
import type { BoroughStat } from "@outhere/core";
import { useAct } from "~/hooks";

const RX: [Reaction, string, string][] = [
  ["fire", "🔥", "Out there"],
  ["pushed", "💪", "Pushed it"],
  ["respect", "🙌", "Respect"],
];

function Reactions({ postId, counts }: { postId: string; counts: ReactionCounts }) {
  const { act } = useAct();
  const reduce = useReducedMotion();
  const [mine, setMine] = useState<Reaction[]>(counts.mine);
  const [pop, setPop] = useState<Reaction | null>(null);
  return (
    <div className="fp-rx">
      {RX.map(([k, emoji, title]) => {
        const on = mine.includes(k);
        const base = counts[k] - (counts.mine.includes(k) ? 1 : 0);
        return (
          <button
            key={k}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={on}
            className={pop === k ? "pop" : undefined}
            onAnimationEnd={() => setPop(null)}
            onClick={() => {
              setMine(on ? mine.filter((m) => m !== k) : [...mine, k]);
              if (!on && !reduce) setPop(k);
              act({ intent: "react", postId, reaction: k });
            }}
          >
            <span>{emoji}</span>
            <b className="tab">{base + (on ? 1 : 0)}</b>
          </button>
        );
      })}
    </div>
  );
}

function Comment({ c }: { c: FeedComment }) {
  const p = usePerson(c.personId);
  return (
    <div className="fc">
      <img className="av s" src={p.avatar} alt="" />
      <p><b>{firstName(p.name)}</b> {c.text}</p>
    </div>
  );
}

function Footer({ postId, reactions, comments, commentCount, viewerId }: { postId: string; reactions: ReactionCounts; comments: FeedComment[]; commentCount: number; viewerId: string }) {
  const toast = useToast();
  const { act } = useAct();
  const me = usePerson(viewerId);
  const [open, setOpen] = useState(comments.length > 0);
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  return (
    <>
      <footer className="fp-f">
        <Reactions postId={postId} counts={reactions} />
        <span className="sp" />
        <button type="button" className="cmtb" aria-label="Comments" onClick={() => { setOpen(true); setFocus(true); }}>
          <Icon name="chat" />
          <span className="tab">{commentCount}</span>
        </button>
        <button type="button" className="fp-sh" aria-label="Share" onClick={() => toast("Link copied. Anyone can see this post, but never your route's ends.")}>
          <Icon name="share" />
        </button>
      </footer>
      <div className="fp-c" hidden={!open}>
        {comments.map((c, i) => <Comment key={i} c={c} />)}
        <form
          className="fc-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            act({ intent: "comment", postId, text });
            setText("");
          }}
        >
          <img className="av s" src={me.avatar} alt="" />
          <input placeholder="Say something nice" aria-label="Add a comment" value={text} onChange={(e) => setText(e.target.value)} autoFocus={focus} />
          <button className="btn btn-q btn-s">Post</button>
        </form>
      </div>
    </>
  );
}

function Head({ personId, meta, tag }: { personId: string; meta: string; tag?: ReactNode }) {
  const p = usePerson(personId);
  return (
    <header className="fp-h">
      <Link to="/me"><img className={`av t-${p.tier}`} src={p.avatar} alt="" /></Link>
      <div className="t"><b>{p.name}</b><span>{meta}</span></div>
      {tag}
    </header>
  );
}

const Stat = ({ v, l, blue }: { v: string | number; l: string; blue?: boolean }) => (
  <div><b className={`tab${blue ? " bl" : ""}`}>{v}</b><span>{l}</span></div>
);

export function BattleCard({ battle, viewerId }: { battle: Battle; viewerId: string }) {
  const toast = useToast();
  const them = usePerson(battle.opponentId);
  return (
    <article className="card fp fp-battle">
      <div className="fl-top"><span className="pill blue"><Icon name="trophy" />Your battle</span><span className="muted tab" style={{ fontSize: 12 }}>{battle.ends}</span></div>
      <div className="bt-row">
        <div><Avatar id={viewerId} size="l" /><b>You</b><span className="tab bl">{battle.us}</span></div>
        <span className="bt-vs">v</span>
        <div className="r"><Avatar id={battle.opponentId} size="l" /><b>{firstName(them.name)}</b><span className="tab rd">{battle.them}</span></div>
      </div>
      <div className="fd-bar"><span style={{ width: `${battle.share}%` }} /><i style={{ width: `${100 - battle.share}%` }} /></div>
      <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{battle.mode} by Friday. {battle.stake} at Rye Lane. {battle.note}</p>
      <div className="fl-ft">
        <button type="button" className="btn btn-q btn-s" onClick={() => toast("Shout sent: 'Is that all you've got?'")}><Icon name="spark" />Send {firstName(them.name)} a shout</button>
        <button type="button" className="btn btn-q btn-s" onClick={() => toast("Rematch set for next week")}>Rematch</button>
      </div>
    </article>
  );
}

function FirstRun({ post }: { post: Extract<FeedPost, { kind: "first-run" }> }) {
  const toast = useToast();
  const { act } = useAct();
  const p = usePerson(post.personId);
  const name = firstName(p.name);
  return (
    <article className="card fp fp-first">
      <div className="ff-in">
        <img className="obj" src="/_app/img/3d-badge.jpg" alt="" />
        <div>
          <div className="kick">First run</div>
          <h3 className="disp">{name} did her <span className="b">first run</span> with the Pacers</h3>
          <p className="muted">{post.text}</p>
        </div>
      </div>
      <div className="ff-act">
        <button
          type="button"
          id="welcome"
          className={`btn ${post.welcomed ? "btn-q" : "btn-p"}`}
          disabled={post.welcomed}
          onClick={() => { act({ intent: "welcome", postId: post.id }); toast(`${name} got your welcome`); }}
        >
          {post.welcomed ? <><Icon name="check" />Welcomed</> : <><Icon name="heart" />Welcome {name}</>}
        </button>
        <span className="muted tab" id="welcomeN">{post.welcomed ? `You and ${post.welcomes - 1} other Pacers have welcomed her` : `${post.welcomes} Pacers have welcomed her`}</span>
      </div>
    </article>
  );
}

function DerbyCard({ post }: { post: Extract<FeedPost, { kind: "derby" }> }) {
  const d = post.derby;
  const L = useLiveScore(d.home.score, 9);
  const R = useLiveScore(d.away.score, 8);
  const share = (L / (L + R)) * 100;
  return (
    <article className="card fp fp-live">
      <div className="fl-top"><span className="pill red"><Icon name="pulse" />Derby live</span><span className="muted tab" style={{ fontSize: 12 }}>{d.endsAt}</span></div>
      <div className="fd-row">
        <div><img src={d.home.crest} alt="" /><b>{d.home.name}</b></div>
        <div className="fd-sc tab"><span className="bl">{formatNumber(L)}</span><span className="vs">v</span><span className="rd">{formatNumber(R)}</span></div>
        <div className="r"><b>{d.away.name}</b><img src={d.away.crest} alt="" /></div>
      </div>
      <div className="fd-bar"><span style={{ width: `${share.toFixed(1)}%` }} /><i style={{ width: `${(100 - share).toFixed(1)}%` }} /></div>
      <div className="fl-ft">
        <Faces ids={d.outNow} />
        <span className="muted">{d.outNow.length} Pacers out right now. Every step tonight counts.</span>
        <Link className="btn btn-p btn-s" to="/">Get out there</Link>
      </div>
    </article>
  );
}

export function Post({ post, viewerId, boroughStats, onReveal }: { post: FeedPost; viewerId: string; boroughStats: BoroughStat[]; onReveal?: () => void }) {
  const toast = useToast();
  switch (post.kind) {
    case "derby":
      return <DerbyCard post={post} />;
    case "recap":
      return (
        <article className="card fp fp-recap">
          <div className="rc-img">
            <img src={post.image} alt="The Pacers running down Rye Lane at night" />
            <div className="rc-ov"><span className="pill glass"><Icon name="people" />Club run recap</span><h3 className="disp">{post.title[0]}<br /><span className="b">{post.title[1]}</span> tonight</h3></div>
          </div>
          <div className="fp-stats rc-st">
            <Stat v={post.runners} l="runners" />
            <Stat v={post.km} l="km together" />
            <Stat v={post.firstTimers} l="first timers" />
            <Stat v={`+${formatNumber(post.boroughPoints)}`} l={post.borough ? `for ${post.borough}` : "for your area"} blue />
          </div>
          <div className="fp-impact"><Icon name="trophy" /><span dangerouslySetInnerHTML={{ __html: post.impact }} /></div>
          <div className="fp-with"><Faces ids={post.withIds} more={25} /><span className="muted">{post.withLine}</span></div>
          <Footer postId={post.id} reactions={post.reactions} comments={post.comments} commentCount={post.commentCount} viewerId={viewerId} />
        </article>
      );
    case "first-run":
      return <FirstRun post={post} />;
    case "run":
      return (
        <article className="card fp">
          <Head personId={post.personId} meta={post.meta} />
          <h3 className="fp-t">{post.title}</h3>
          <div className="fp-stats">
            <Stat v={post.km} l="km" />
            <Stat v={post.pace} l="per km" />
            <Stat v={post.time} l="time" />
            <Stat v={`+${post.boroughPoints}`} l={post.borough ? `for ${post.borough}` : "for your area"} blue />
          </div>
          <RouteMap shape={post.route}>
            <span className="pill glass fp-priv"><Icon name="lock" />Start and finish hidden</span>
          </RouteMap>
          {post.impact && <div className="fp-impact"><Icon name="arrow" /><span dangerouslySetInnerHTML={{ __html: post.impact }} /></div>}
          <div className="fp-with"><Faces ids={post.withIds} /><span className="muted">{post.withLine}</span></div>
          <Footer postId={post.id} reactions={post.reactions} comments={post.comments} commentCount={post.commentCount} viewerId={viewerId} />
        </article>
      );
    case "battle":
      return <BattleCard battle={post.battle} viewerId={viewerId} />;
    case "photo":
      return (
        <article className="card fp">
          <Head personId={post.personId} meta={post.meta} />
          <p>{post.text}</p>
          <img className="fp-img" src={post.image} alt={post.alt} />
          <Footer postId={post.id} reactions={post.reactions} comments={post.comments} commentCount={post.commentCount} viewerId={viewerId} />
        </article>
      );
    case "borough":
      return (
        <article className="card fp fp-boro">
          <div className="fl-top"><span className="pill blue"><Icon name="pin" />{post.borough} this week</span><span className="muted" style={{ fontSize: 12 }}>Updated live</span></div>
          <div className="fb-in">
            <div>
              <div className="disp fb-n">{post.place}</div>
              <p className="muted">{post.line}</p>
              <div className="fb-l">
                {post.leaders.map((r, i) => (
                  <div key={r.name}><span className="tab">{i + 1}</span><b>{r.name}</b><span className="tab muted">{formatNumber(r.steps)}</span></div>
                ))}
              </div>
            </div>
            {/* Only cities with a tile map get one; elsewhere the leaders list stands alone. */}
            {boroughStats.some((b) => b.col || b.row) && <BoroughMap stats={boroughStats} metric="steps" home={post.borough} id="fmap" className="fb-map bmap" />}
          </div>
        </article>
      );
    case "memory":
      return (
        <article className="card fp fp-mem">
          <div className="fm-in">
            <div className="kick">A year ago today</div>
            <h3 className="disp">Your first 5k: <span className="dim">{post.then}</span>. Now: <span className="b">{post.now}</span></h3>
            <p className="muted">{post.line}</p>
            <button type="button" className="btn btn-q btn-s" onClick={() => toast("Your story card is ready to share")}><Icon name="share" />Share how far you've come</button>
          </div>
        </article>
      );
    case "reveal":
      return (
        <article className="card fp fp-rv">
          <img src={post.image} alt="" />
          <div className="rvf-ov">
            <span className="pill glass"><i className="dot pulse" />Sunday reveal</span>
            <h3 className="disp">{post.match.split(" v ")[0]} <span className="b">v</span> {post.match.split(" v ")[1]}</h3>
            <p>{post.line}</p>
            {onReveal && <button type="button" className="btn btn-p" id="frv" onClick={onReveal}>Watch last week's reveal</button>}
          </div>
        </article>
      );
    case "club-post":
      return (
        <article className="card fp">
          <Head personId={post.personId} meta={post.meta} tag={<span className="pill blue">Club post</span>} />
          <p>{post.text}</p>
          {post.fund && (
            <Link className="fp-fund" to="/hq/fund">
              <img className="obj" src="/_app/img/3d-stack.jpg" alt="" />
              <div className="t"><b>{post.fund.raised}</b><span>{post.fund.line}</span></div>
              <Icon name="chev" />
            </Link>
          )}
          <Footer postId={post.id} reactions={post.reactions} comments={post.comments} commentCount={post.commentCount} viewerId={viewerId} />
        </article>
      );
  }
}
