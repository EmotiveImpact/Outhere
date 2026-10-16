import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { canSeeClubHq, type ChatItem } from "@outhere/core";
import { DateBox, Face, Icon, usePeople, usePerson, useToast } from "@outhere/ui";
import { getData } from "~/data.server";
import { useAct } from "~/hooks";
import { GoingButton } from "~/components/going";
import type { Route } from "./+types/chat";

export const meta: Route.MetaFunction = () => [{ title: "Club chat · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  const chat = await db.chat(viewer.homeClubId);
  return { chat, leader: canSeeClubHq(viewer) };
}

type Message = Extract<ChatItem, { kind: "message" }>;

/** Keeps the chat current: re-reads it every few seconds while the tab is in view. */
function useLive(ms: number) {
  const { revalidate, state } = useRevalidator();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && state === "idle") revalidate();
    }, ms);
    return () => clearInterval(t);
  }, [ms, revalidate, state]);
}

function ChatMessage({ m, prev, channel, clubId, run }: { m: Message; prev?: ChatItem; channel: string; clubId: string; run: Route.ComponentProps["loaderData"]["chat"]["nextRun"] }) {
  const { act } = useAct();
  const p = usePerson(m.personId);
  const same = prev?.kind === "message" && prev.personId === m.personId;
  const poll = m.poll;
  const total = poll ? poll.options.reduce((s, o) => s + o.votes, 0) : 0;
  return (
    <div className={`cmsg${same ? " cont" : ""}`}>
      {same ? <span className="cav" /> : <Face id={m.personId} className="av cav" />}
      <div className="cb">
        {!same && <div className="cn"><b>{p.name}</b><span>{m.time}</span></div>}
        {m.text && <p>{m.text}</p>}
        {m.image && <img className="cimg" src={m.image.src} alt={m.image.alt} />}
        {m.runId && (
          <div className="fp-run cm-run">
            <DateBox day={run.day} date={run.date} />
            <div className="t"><b>{run.title}</b><span>{run.time} · {run.place.replace(/^outside /, "")} · {run.going} going</span></div>
            <GoingButton runId={run.id} going={run.imGoing} />
          </div>
        )}
        {poll && (
          <div className="cpoll">
            <b>{poll.question}</b>
            {poll.options.map((o, i) => {
              const pct = total ? Math.round((o.votes / total) * 100) : 0;
              return (
                <button key={o.label} type="button" aria-pressed={poll.myVote === i} onClick={() => act({ intent: "chat-vote", clubId, channel, messageId: m.id, option: i })}>
                  <span className="fill" style={{ width: `${pct}%` }} />
                  <span className="l">{o.label}</span>
                  <span className="tab n">{pct}%</span>
                </button>
              );
            })}
            <span className="muted" style={{ fontSize: 12 }}>{total} votes</span>
          </div>
        )}
        {m.reactions && m.reactions.length > 0 && (
          <div className="creact">
            {m.reactions.map((r, i) => (
              <button key={r.emoji} type="button" aria-pressed={r.mine} onClick={() => act({ intent: "chat-react", clubId, channel, messageId: m.id, index: i })}>
                {r.emoji} <span className="tab">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat({ loaderData }: Route.ComponentProps) {
  const { chat, leader } = loaderData;
  const toast = useToast();
  const { act } = useAct();
  const people = usePeople();
  const [chan, setChan] = useState("general");
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  useLive(1500);

  const channel = chat.channels.find((c) => c.key === chan) ?? chat.channels[0]!;
  const typing = channel.typing?.[0];
  const typer = usePerson(typing);

  useEffect(() => {
    const s = scroller.current;
    if (s) s.scrollTop = s.scrollHeight;
  }, [chan, channel.items.length, typing]);

  function open(key: string) {
    const c = chat.channels.find((x) => x.key === key);
    if (!c) return;
    if (c.leadersOnly && !leader) {
      toast("Only run leaders and captains can see this one");
      return;
    }
    setChan(key);
    if (c.unread) act({ intent: "chat-read", clubId: chat.club.id, channel: key });
  }

  return (
    <div className="chat">
      <aside className="cside">
        <div className="cclub">
          <img src={chat.club.crest} alt="" />
          <div><b>{chat.club.name}</b><span>{chat.club.members} members · {chat.online} online</span></div>
        </div>
        <div className="mono dim" style={{ margin: "16px 8px 8px" }}>Channels</div>
        <div id="chl" className="chl">
          {chat.channels.map((c) => (
            <button key={c.key} type="button" className="ch" aria-pressed={c.key === chan} onClick={() => open(c.key)}>
              {c.leadersOnly ? <Icon name="lock" /> : <span className="hs">#</span>}
              <span className="nm">{c.key}</span>
              {c.unread > 0 && c.key !== chan && <span className="ct hot">{c.unread}</span>}
            </button>
          ))}
        </div>
        <div className="cnote"><Icon name="shield" /><span>Members only. Guests join #general after their first run. Run leaders can pin and remove messages.</span></div>
      </aside>
      <section className="cmain">
        <header className="chd">
          <div><b>#<span id="chn">{channel.key}</span></b><span id="chd" className="muted">{channel.description}</span></div>
          <div className="faces hidem">
            {chat.onlineIds.map((k) => <img key={k} src={people[k]?.avatar} alt="" />)}
            <span>+{chat.online - chat.onlineIds.length}</span>
          </div>
          <button type="button" className="iconbtn" aria-label="Pinned messages" onClick={() => toast("Pinned: Run routes, the code of conduct and the kit size guide")}><Icon name="pinI" /></button>
        </header>
        <div className="cms" id="cms" aria-live="polite" ref={scroller}>
          {channel.items.map((m, i) =>
            m.kind === "day" ? (
              <div key={`d${i}`} className="cday"><span>{m.label}</span></div>
            ) : (
              <ChatMessage key={m.id} m={m} prev={channel.items[i - 1]} channel={channel.key} clubId={chat.club.id} run={chat.nextRun} />
            ),
          )}
        </div>
        <div className="ctyping" id="ctyp" hidden={!typing}>
          <img className="av s" src={typer.avatar} alt="" /><span>{typer.name.split(" ")[0]} is typing</span><i /><i /><i />
        </div>
        <form
          className="ccomp"
          id="ccomp"
          onSubmit={(e) => {
            e.preventDefault();
            const v = text.trim();
            if (!v) return;
            act({ intent: "chat-send", clubId: chat.club.id, channel: channel.key, text: v });
            setText("");
          }}
        >
          <button type="button" className="iconbtn" aria-label="Add a photo" onClick={() => toast("Photos are checked for faces of people under 18")}><Icon name="image" /></button>
          <input id="cin" autoComplete="off" aria-label="Message" placeholder={`Message #${channel.key}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <button className="btn btn-p btn-s" aria-label="Send"><Icon name="send" /></button>
        </form>
      </section>
      <aside className="cinfo">
        <div className="card flat">
          <div className="mono dim">Next run</div>
          <div className="fp-run" style={{ marginTop: 10 }}>
            <DateBox day={chat.nextRun.day} date={chat.nextRun.date} />
            <div className="t"><b>{chat.nextRun.title}</b><span>{chat.nextRun.time} · {chat.nextRun.going} going</span></div>
          </div>
          <GoingButton runId={chat.nextRun.id} going={chat.nextRun.imGoing} style={{ width: "100%", justifyContent: "center", marginTop: 12 }} />
        </div>
        <div className="card flat mt">
          <div className="mono dim">On a run now</div>
          {chat.onRun.map((k) => (
            <div key={k} className="row">
              <Face id={k} className="av s" />
              <div className="t"><b>{people[k]?.name}</b><span>Out with the club app on</span></div>
              <i className="dot pulse" />
            </div>
          ))}
        </div>
        <div className="card flat mt">
          <div className="mono dim">Run leaders</div>
          <div className="faces" style={{ marginTop: 10 }}>{chat.leaders.map((k) => <img key={k} src={people[k]?.avatar} alt="" />)}</div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Message one if something's not right. They can see reports straight away.</p>
        </div>
      </aside>
    </div>
  );
}
