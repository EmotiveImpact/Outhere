import { useCallback, useState } from "react";
import { Link } from "react-router";
import { canPostStory, firstName, formatNumber, type FeedScope } from "@outhere/core";
import { Avatar, DateBox, Icon, Seg, Spark, usePeople, usePerson, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import { Post } from "~/components/feed-posts";
import { StoryButton, StoryViewer } from "~/components/stories";
import { RevealOverlay } from "~/components/reveal";
import { GoingButton } from "~/components/going";
import type { Route } from "./+types/feed";

export const meta: Route.MetaFunction = () => [{ title: "Feed · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  const [feed, boroughs, chat, lastReveal] = await Promise.all([db.feed(), db.boroughs("steps"), db.chat(viewer.homeClubId), db.lastReveal()]);
  return { feed, boroughs, viewer, club: chat.club, lastReveal };
}

function OutNowRow({ personId, doing, where }: { personId: string; doing: string; where: string }) {
  const toast = useToast();
  const p = usePerson(personId);
  return (
    <div className="row">
      <Avatar id={personId} />
      <div className="t"><b>{p.name}</b><span>{doing} · {where}</span></div>
      <button type="button" className="btn btn-q btn-s" onClick={() => toast(`${firstName(p.name)} got your shout`)}>Shout</button>
    </div>
  );
}

export default function Feed({ loaderData }: Route.ComponentProps) {
  const { feed, boroughs, viewer, club, lastReveal } = loaderData;
  const toast = useToast();
  const { act } = useAct();
  const zain = usePerson(feed.chatPreview.personId);
  const [scope, setScope] = useState<"all" | FeedScope>("all");
  const [story, setStory] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const stories = feed.stories.map((s) => (seen.has(s.id) ? { ...s, seen: true } : s));
  const markSeen = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        act({ intent: "story-seen", storyId: id });
        return new Set(prev).add(id);
      });
    },
    [act],
  );
  const run = feed.nextRun;
  const people = usePeople();
  const outCount = feed.outNow.filter((o) => people[o.personId]?.outNow === "out").length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="kick">Feed</div>
          <h1 className="disp">What's <span className="b">moving</span></h1>
          <p>Your clubs, your people and your borough. In order, no ads, and nobody can see where you live.</p>
        </div>
        <Seg id="ff" options={[["all", "For you"], ["club", "Club"], ["follow", "Following"], ["borough", viewer.borough]] as const} value={scope} onChange={setScope} />
      </div>
      <div className="g g-73 feedg">
        <div className="fstream">
          <div className="stories" id="stories">
            {canPostStory(viewer) ? (
              <button type="button" className="sty me" onClick={() => toast("Post a story from the Outhere app: a photo from today's run, gone in 24 hours")}>
                <span className="ring t-me"><img src={viewer.avatar} alt="" /><i><Icon name="plus" /></i></span>
                <b>You</b>
              </button>
            ) : (
              <Link className="sty me" to="/membership" aria-label="Go Pro to post stories">
                <span className="ring t-me"><img src={viewer.avatar} alt="" /><i><Icon name="lock" /></i></span>
                <b>Go Pro</b>
              </Link>
            )}
            {stories.map((s, i) => (
              <StoryButton key={s.id} story={s} clubCrest={club.crest} clubName={club.name} clubShort={club.nameBottom} onOpen={() => setStory(i)} />
            ))}
          </div>
          <div className="card fp-new">
            <img className="av" src={viewer.avatar} alt="" />
            <button type="button" className="fp-in" onClick={() => toast(`Post to ${club.name}, your followers or both`)}>Share a run, a photo or a shout</button>
            <button type="button" className="iconbtn" aria-label="Add a photo" onClick={() => toast("Pick a photo. Faces of people who haven't joined Outhere get blurred.")}><Icon name="image" /></button>
          </div>
          <div id="fposts">
            {feed.posts.map((p) => (
              <div key={p.id} hidden={scope !== "all" && !p.scopes.includes(scope)}>
                <Post post={p} viewerId={viewer.id} boroughStats={boroughs} onReveal={lastReveal ? () => setReveal(true) : undefined} />
              </div>
            ))}
          </div>
          <div className="fend">
            <img className="obj" src="/img/3d-flame.jpg" alt="" />
            <b>You're all caught up</b>
            <span className="muted">Go and make the next one.</span>
            <Link className="btn btn-p btn-s" to="/">Log a walk</Link>
          </div>
        </div>
        <aside className="fside">
          <div className="card">
            <div className="hd"><h3>Out right now</h3><span className="pill blue"><i className="dot pulse" />{outCount} out</span></div>
            {feed.outNow.map((o) => <OutNowRow key={o.personId} {...o} />)}
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Only people who share their live runs show here, and only the area, never the street.</p>
          </div>
          <div className="card mt">
            <div className="hd"><h3>Your week</h3><Link className="muted" style={{ fontSize: 12.5 }} to="/me">Profile</Link></div>
            <div className="fwk">
              <div><b className="tab">{formatNumber(feed.week.steps)}</b><span>steps</span></div>
              <div><b className="tab">{feed.week.clubRuns}</b><span>club runs</span></div>
              <div><b className="tab bl">{feed.week.points}</b><span>points</span></div>
            </div>
            <Spark values={feed.week.spark} w={300} h={44} />
          </div>
          <div className="card mt">
            <div className="hd"><h3>Next up</h3><Link className="muted" style={{ fontSize: 12.5 }} to="/calendar">Calendar</Link></div>
            <div className="fp-run" style={{ marginTop: 0 }}>
              <DateBox day={run.day} date={run.date} />
              <div className="t"><b>{run.title}</b><span>{run.time} · {run.going} going</span></div>
              <GoingButton runId={run.id} going={run.imGoing} />
            </div>
          </div>
          <div className="card mt fchat">
            <div className="hd"><h3>Club chat</h3>{feed.chatPreview.unread > 0 && <span className="pill blue">{feed.chatPreview.unread} new</span>}</div>
            <div className="row">
              <Avatar id={feed.chatPreview.personId} />
              <div className="t"><b>{firstName(zain.name)} in #{feed.chatPreview.channel}</b><span>{feed.chatPreview.text}</span></div>
            </div>
            <Link className="btn btn-q btn-s" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} to="/chat">Open club chat</Link>
          </div>
        </aside>
      </div>
      {story !== null && (
        <StoryViewer stories={stories} start={story} clubCrest={club.crest} clubName={club.name} onSeen={markSeen} onClose={() => setStory(null)} />
      )}
      {reveal && lastReveal && <RevealOverlay onClose={() => setReveal(false)} result={lastReveal} />}
    </>
  );
}
