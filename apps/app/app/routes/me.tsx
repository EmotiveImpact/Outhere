import { useState } from "react";
import { Bars, Icon, Kpi, Seg, Tick, Toggle, useToast } from "@outhere/ui";
import { getData, config } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/me";

export const meta: Route.MetaFunction = () => [{ title: "My profile · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const [viewer, me] = await Promise.all([db.viewer(), db.me()]);
  return { viewer, me, publicUrl: config().publicUrl };
}

export default function Me({ loaderData }: Route.ComponentProps) {
  const { viewer, me, publicUrl } = loaderData;
  const toast = useToast();
  const { act, pending } = useAct();
  const [series, setSeries] = useState<"steps" | "runs">("steps");
  const pub = pending?.intent === "public-profile" ? pending.on : viewer.publicProfile;
  const [first, ...rest] = viewer.name.split(" ");
  const link = `${publicUrl.replace(/^https?:\/\//, "")}/@${viewer.handle}`;

  function setPublic(on: boolean) {
    act({ intent: "public-profile", on });
    toast(on ? "Your profile is public again" : "Your profile is private. Only your clubs can see you.");
  }

  return (
    <>
      <section className="slab mehero" style={{ minHeight: 380 }}>
        <img className="bg" src={viewer.photo} alt={`${first} in running kit`} style={{ objectPosition: "70% 30%" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill glass"><Tick /> {viewer.trust}</span>
          {viewer.foundingNumber && <span className="pill glass">Founding 500 · #{viewer.foundingNumber}</span>}
          {viewer.tier !== "free" && <span className="pill blue">{viewer.tier.toUpperCase()}</span>}
        </div>
        <h1 className="disp" style={{ fontSize: "clamp(60px,8vw,120px)", marginTop: 14 }}>{first}<br /><span className="b">{rest.join(" ")}</span></h1>
        <p style={{ color: "#dfe5ee", marginTop: 10 }}>{[viewer.borough, viewer.city].filter(Boolean).join(", ")} · {me.clubRole}, {me.clubName} · level {viewer.level} · {viewer.streakDays} day streak</p>
        <div className="acts mt">
          <button
            type="button"
            className="btn btn-g btn-s"
            onClick={() => {
              navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
              toast(`Link copied: ${link}`);
            }}
          >
            <Icon name="share" />Copy profile link
          </button>
          <button type="button" className="btn btn-g btn-s" id="pubB" onClick={() => setPublic(!pub)}>
            <Icon name="eye" /><span>{pub ? "Profile is public" : "Profile is private"}</span>
          </button>
        </div>
      </section>
      <div className="g g4 mt">{me.kpis.map((k) => <Kpi key={k.label} kpi={k} />)}</div>
      <div className="g g-73 mt">
        <div className="card">
          <div className="hd">
            <h3>Last 12 weeks</h3>
            <Seg options={[["steps", "Steps"], ["runs", "Runs"]] as const} value={series} onChange={setSeries} />
          </div>
          {series === "steps" ? (
            <Bars values={me.weeks.steps} h={200} labels={me.weeks.labels} hi={11} fmtY={(v) => `${Math.round(v)}k`} label="Counted steps each week, in thousands" />
          ) : (
            <Bars values={me.weeks.runs} h={200} labels={me.weeks.labels} hi={11} fmtY={(v) => String(Math.round(v))} label="Club runs each week" />
          )}
        </div>
        <div className="card">
          <div className="hd"><h3>Badges</h3><span className="muted" style={{ fontSize: 12 }}>{me.badgesEarned} of {me.badgesTotal}</span></div>
          <div className="badges">
            {me.badges.map((b) => <div key={b.label}><img className="obj" src={b.image} alt="" /><span>{b.label}</span></div>)}
          </div>
          <div className="row mt">
            <div className="t"><b>Show me on club pages</b><span>Your face and name on the {me.clubName} page</span></div>
            <Toggle on={pub} onChange={setPublic} label="Public profile" />
          </div>
          <div className="row">
            <div className="t"><b>Hide my start and finish</b><span>Always on. Routes never show where you live.</span></div>
            <span className="pill blue"><Icon name="lock" />On</span>
          </div>
        </div>
      </div>
    </>
  );
}
