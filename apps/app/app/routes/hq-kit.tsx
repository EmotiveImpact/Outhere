import { useEffect, useRef, useState } from "react";
import { Link, redirect } from "react-router";
import { canSeeClubHq, isValidClubSlug, RESERVED_SLUGS, slugify } from "@outhere/core";
import { Icon, Logo, QR, Tick, useToast } from "@outhere/ui";
import { config, getData } from "~/data.server";
import { useAct } from "~/hooks";
import type { Route } from "./+types/hq-kit";

export const meta: Route.MetaFunction = () => [{ title: "Page and QR kit · Outhere" }];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  const viewer = await db.viewer();
  if (!canSeeClubHq(viewer)) throw redirect("/");
  const kit = await db.kit(viewer.homeClubId);
  const { publicUrl } = config();
  return { kit, publicUrl, host: new URL(publicUrl).host };
}

/** Why a link can't be used, or null when it can. */
function slugProblem(raw: string, takenBy: string | null): string | null {
  const s = slugify(raw);
  if (s.length < 3) return "Use at least 3 letters or numbers.";
  if (s.length > 40) return "Keep it to 40 letters or numbers.";
  if (RESERVED_SLUGS.has(s)) return "Outhere uses that link itself. Try another.";
  if (takenBy === s) return "Another club already has that link.";
  return isValidClubSlug(s) ? null : "Use letters and numbers only.";
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function HqKit({ loaderData }: Route.ComponentProps) {
  const { kit, publicUrl, host } = loaderData;
  const { club } = kit;
  const toast = useToast();
  const { act, state, result } = useAct();
  const [tagline, setTagline] = useState(club.tagline);
  const [cover, setCover] = useState(club.cover);
  const [tags, setTags] = useState<string[]>(club.tags);
  const [slug, setSlug] = useState(club.slug);
  const [taken, setTaken] = useState<string | null>(null);
  const lastSlug = useRef<string | null>(null);
  const plain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result?.error === "SLUG_TAKEN" && lastSlug.current) setTaken(lastSlug.current);
  }, [result]);

  // The poster and sticker carry the club's first code, so their scans and joins are counted.
  const firstCode = kit.codes[0]?.code.toLowerCase();
  const joinUrl = `${publicUrl}/join/${club.slug}${firstCode ? `?c=${firstCode}` : ""}`;
  const clean = slugify(slug);
  const problem = slugProblem(slug, taken);
  const tagOrder = [...kit.allTags, ...tags.filter((t) => !kit.allTags.includes(t))];
  const shownTags = tagOrder.filter((t) => tags.includes(t));

  const saveTagline = () => {
    if (tagline.trim() !== club.tagline) act({ intent: "club-page", clubId: club.id, tagline });
  };
  const saveSlug = () => {
    if (problem || clean === club.slug) return;
    lastSlug.current = clean;
    act({ intent: "club-page", clubId: club.id, slug: clean });
  };
  const pickCover = (c: string) => {
    setCover(c);
    act({ intent: "club-page", clubId: club.id, cover: c });
  };
  const toggleTag = (t: string) => {
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    setTags(next);
    act({ intent: "club-page", clubId: club.id, tags: next });
  };

  const downloadPlain = async () => {
    const svg = plain.current?.querySelector("svg.qr");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([text], { type: "image/svg+xml" });
    download(svgBlob, `${club.slug}-qr.svg`);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      const x = c.getContext("2d");
      if (!x) return;
      x.imageSmoothingEnabled = false;
      x.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob((b) => b && download(b, `${club.slug}-qr.png`), "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    toast("PNG and SVG downloaded");
  };

  const lead = kit.derby.lead;
  const stickerText = `${club.name.toUpperCase()} · SCAN TO RUN WITH US · WE OUTHERE ·`;

  return (
    <>
      <div className="ph">
        <div>
          <span className="kick">Club HQ</span>
          <h1 className="disp" style={{ marginTop: 12 }}>Page and <span className="b">QR kit</span></h1>
          <p>Your club's home on the web, plus posters, stickers and stories that bring people to it. Each print has its own code, so you can see which wall works.</p>
        </div>
        <div className="acts"><Link className="btn btn-p" to={`/${club.slug}`}><Icon name="ext" />Open your page</Link></div>
      </div>

      <div className="g g-37">
        <div className="card">
          <div className="hd"><h3>Edit your page</h3><span className="pill blue" aria-live="polite">{state === "idle" ? "Live" : "Saving"}</span></div>
          <div className="field">
            <label htmlFor="ktl">Line under your name</label>
            <textarea className="input" id="ktl" maxLength={160} value={tagline} onChange={(e) => setTagline(e.target.value)} onBlur={saveTagline} />
          </div>
          <div className="field mt">
            <label id="kthumbs-l">Cover photo</label>
            <div className="thumbs" id="kthumbs" role="group" aria-labelledby="kthumbs-l">
              {kit.covers.map((c, i) => (
                <button key={c} type="button" aria-pressed={c === cover} aria-label={`Cover photo ${i + 1}`} onClick={() => pickCover(c)}><img src={c} alt="" /></button>
              ))}
            </div>
          </div>
          <div className="field mt">
            <label id="ktags-l">What you're like</label>
            <div className="chips" id="ktags" role="group" aria-labelledby="ktags-l">
              {tagOrder.map((t) => (
                <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="field mt">
            <label htmlFor="kurl">Your link</label>
            <div className="search" style={{ borderRadius: 12, padding: "0 4px 0 12px", ...(problem ? { borderColor: "rgba(255,77,85,.55)" } : {}) }}>
              <span className="muted" style={{ font: "500 13px var(--mono)" }}>{host}/</span>
              <input
                id="kurl"
                value={slug}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!problem}
                aria-describedby={problem ? "kurl-e" : undefined}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={saveSlug}
                onKeyDown={(e) => e.key === "Enter" && saveSlug()}
                style={{ font: "500 13px var(--mono)", padding: "10px 0" }}
              />
            </div>
            {problem && <p id="kurl-e" role="alert" style={{ fontSize: 12, color: "#ff8a90" }}>{problem}</p>}
          </div>
        </div>
        <div>
          <div className="preview">
            <div className="urlbar"><i /><i /><i /><span style={{ marginLeft: 8 }} id="kurlv">{host}/{clean}</span></div>
            <div className="pvh">
              <img className="bg" id="kimg" src={cover} alt="" />
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {club.verified && <span className="pill glass"><Tick /> Verified club</span>}
                  <span className="pill glass">{club.borough || club.city}</span>
                </div>
                <h3>{club.nameTop}<br /><span>{club.nameBottom}</span></h3>
                <p id="ktlv" style={{ fontSize: 13, color: "#dfe5ee", marginTop: 8, maxWidth: "40ch" }}>{tagline}</p>
                <div className="tg" id="ktagv" style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                  {shownTags.map((t) => <span key={t} className="pill glass">{t}</span>)}
                </div>
              </div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Search engines can find your page, so "run club {club.nameTop}" leads here.</p>
        </div>
      </div>

      <div className="sech"><h2>Print and <span className="b">share</span></h2><span className="muted" style={{ fontSize: 13 }}>Every code opens your page, then a one tap join</span></div>
      <div className="kit">
        <div className="card kitem">
          <div className="pv">
            <div className="poster">
              <img src={club.cover} alt="" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="logo" style={{ fontSize: 12 }}><Logo />OUTHERE</span></div>
              <div className="ph1">Run with<br /><span>{club.nameTop}</span><br />{club.nameBottom}</div>
              <div className="pq"><small>{kit.poster.when}<br />{kit.poster.where}<br />{kit.poster.who}</small><QR text={joinUrl} label={`Join ${club.name}`} /></div>
            </div>
          </div>
          <div><b>A4 poster</b><p className="muted" style={{ fontSize: 12.5 }}>For lampposts, gyms and shop windows</p></div>
          <button type="button" className="btn btn-q btn-s" onClick={() => toast(`Poster PDF downloaded with its own code: ${kit.codes[0]?.code ?? "RYE-04"}`)}><Icon name="down" />Download PDF</button>
        </div>
        <div className="card kitem">
          <div className="pv">
            <div className="sticker">
              <QR text={joinUrl} label={`Join ${club.name}`} />
              <svg className="rt" viewBox="0 0 200 200" aria-hidden="true">
                <defs><path id="cp" d="M100 100 m-82 0 a82 82 0 1 1 164 0 a82 82 0 1 1 -164 0" /></defs>
                <text><textPath href="#cp">{stickerText}</textPath></text>
              </svg>
            </div>
          </div>
          <div><b>Round sticker</b><p className="muted" style={{ fontSize: 12.5 }}>Order 100 for £12 or print your own</p></div>
          <button type="button" className="btn btn-q btn-s" onClick={() => toast("Sticker sheet downloaded")}><Icon name="down" />Download</button>
        </div>
        <div className="card kitem">
          <div className="pv">
            <div className="story">
              <img src="/_app/img/derby.jpg" alt="" />
              <span className="logo" style={{ fontSize: 11 }}><Logo />OUTHERE</span>
              <div className="ph1">{lead >= 0 ? "We lead" : "Chasing"}<br />{kit.derby.opponent}<br /><span>by {Math.abs(lead)}</span></div>
              <span className="lnk"><Icon name="ext" />{club.name}</span>
            </div>
          </div>
          <div><b>Story</b><p className="muted" style={{ fontSize: 12.5 }}>Live score with your link sticker</p></div>
          <button type="button" className="btn btn-q btn-s" onClick={() => toast("Story image saved")}><Icon name="share" />Share</button>
        </div>
        <div className="card kitem">
          <div className="pv" style={{ background: "#fff" }}>
            <div style={{ width: "72%" }} ref={plain}>
              <QR text={joinUrl} label={`Join ${club.name}`} />
              <p style={{ color: "#07090c", font: "600 15px/1 var(--display)", textAlign: "center", marginTop: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Scan to join</p>
            </div>
          </div>
          <div><b>Plain code</b><p className="muted" style={{ fontSize: 12.5 }}>For your own flyers and kit</p></div>
          <button type="button" className="btn btn-q btn-s" onClick={downloadPlain}><Icon name="down" />PNG and SVG</button>
        </div>
      </div>

      <div className="card mt">
        <div className="hd"><h3>Where people find you</h3><span className="muted" style={{ fontSize: 12 }}>This month</span></div>
        <div className="tw">
          <table>
            <thead><tr><th>Code</th><th>Placed at</th><th className="num">Scans</th><th className="num">Came to a run</th><th className="num">Joined</th><th /></tr></thead>
            <tbody>
              {kit.codes.map((r) => {
                const rate = r.scans ? r.joined / r.scans : 0;
                const best = Math.max(...kit.codes.map((c) => (c.scans ? c.joined / c.scans : 0))) || 1;
                return (
                  <tr key={r.code}>
                    <td><code style={{ font: "500 12px var(--mono)" }}>{r.code}</code></td>
                    <td>{r.placed}</td>
                    <td className="num">{r.scans}</td>
                    <td className="num">{r.cameToRun}</td>
                    <td className="num"><b>{r.joined}</b></td>
                    <td style={{ width: 120 }}>
                      <div className="meter" role="img" aria-label={`${Math.round(rate * 100)}% of scans joined`}><i style={{ width: `${(rate / best) * 100}%` }} /></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
