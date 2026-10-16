import { useEffect, useState } from "react";
import type { Story } from "@outhere/core";
import { firstName, storyRing } from "@outhere/core";
import { Icon, useReducedMotion, usePerson, useToast } from "@outhere/ui";

/** One button in the stories row. The ring here is the story alone, never membership. */
export function StoryButton({ story, clubCrest, clubName, clubShort, onOpen }: { story: Story; clubCrest: string; clubName: string; clubShort: string; onOpen: () => void }) {
  const p = usePerson(story.personId);
  const club = !!story.clubId;
  const { ring, state } = storyRing(story.seen);
  return (
    <button type="button" className={`sty ${state}${club ? " club" : ""}`} onClick={onOpen} aria-label={`${club ? clubName : p.name}'s story${story.seen ? ", watched" : ""}`}>
      <span className={`ring ${ring}`}>
        <img src={club ? clubCrest : p.avatar} alt="" />
      </span>
      <b>{club ? clubShort : firstName(p.name)}</b>
      {!club && p.outNow === "out" && <em className="ld" aria-label="Out now" />}
      {!club && p.outNow === "stopped" && <em className="ld stop" aria-label="Just stopped" />}
    </button>
  );
}

/** Full-screen story viewer. Moves on by itself, arrows and Esc work, you can reply. */
export function StoryViewer({ stories, start, clubCrest, clubName, onSeen, onClose }: {
  stories: Story[];
  start: number;
  clubCrest: string;
  clubName: string;
  onSeen: (id: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const reduce = useReducedMotion();
  const [at, setAt] = useState(start);
  const [reply, setReply] = useState("");
  const s = stories[at];
  const p = usePerson(s?.personId);

  useEffect(() => {
    if (!s) return;
    onSeen(s.id);
  }, [s, onSeen]);

  useEffect(() => {
    if (reduce || !s) return;
    const t = setTimeout(() => go(1), 4200);
    return () => clearTimeout(t);
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  function go(d: number) {
    const next = Math.max(0, at + d);
    if (next >= stories.length) onClose();
    else setAt(next);
  }

  if (!s) return null;
  const club = !!s.clubId;
  const name = club ? clubName : p.name;
  return (
    <div className="overlay sv" role="dialog" aria-label="Stories" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sv-card">
        <div className="sv-bars">
          {stories.map((x, j) => (
            <span key={x.id}><i className={j < at ? "done" : j === at ? "run" : ""} /></span>
          ))}
        </div>
        <div className="sv-h">
          <img className="av s" src={club ? clubCrest : p.avatar} alt="" />
          <b>{name}</b>
          {!club && p.outNow === "out" && <span className="pill blue" style={{ padding: "2px 8px" }}><i className="dot pulse" />Out now</span>}
          {!club && p.outNow === "stopped" && <span className="pill red" style={{ padding: "2px 8px" }}><i className="dot red" />Just stopped</span>}
          <button type="button" className="sv-x" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <img className="sv-img" src={s.image} alt="" />
        <p className="sv-cap">{s.caption}</p>
        <button type="button" className="sv-prev" aria-label="Previous" onClick={() => go(-1)} />
        <button type="button" className="sv-next" aria-label="Next" onClick={() => go(1)} />
        <form
          className="sv-rep"
          onSubmit={(e) => {
            e.preventDefault();
            if (reply.trim()) toast("Reply sent");
            setReply("");
            go(1);
          }}
        >
          <input placeholder={`Reply to ${club ? "the Pacers" : firstName(p.name)}`} aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} />
          <button className="btn btn-p btn-s" aria-label="Send"><Icon name="send" /></button>
        </form>
      </div>
    </div>
  );
}
