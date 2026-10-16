// The Fighter Pack on the local engine: consent, a simulated face scan, the
// credits, making the pictures, re-rolls, pose picks and the runner choice.
// Built by engine.js with its private helpers (like profile.js), so it reads
// and writes the same saved world. remotePack.js is the Supabase twin with
// the same names and return shapes.
//
// Nothing leaves the phone here. "Making" a pack gives each picture a time it
// lands, a few hundred milliseconds apart, so the pictures appear one by one
// as the screen polls; the pictures are the bundled PACK_SAMPLES.

import {
  BLACK_SLOTS,
  DEFAULT_POSES,
  PACK_COST,
  PACK_CREDITS,
  PACK_MIN_AGE,
  POSE_SETS,
  REROLL_COST,
  RUNNERS,
  SCAN_ANGLES,
  SCAN_MAX_AGE_MINUTES,
  SELFIE_TTL_HOURS,
  SLOTS,
  fighterFrom,
  nextGrantAt,
  packPicturesFor,
  pictureName,
  poseAllowed,
} from "@/constants/pack";
import { PACK_SAMPLES } from "@/constants/photos";
import { ageOn } from "./account";
import { randomId } from "./random";

const HOUR_MS = 60 * 60 * 1000;
const RANK = { free: 0, pro: 1, black: 2 };
// How long each picture takes on the phone, and the gap between them.
export const PACK_STEP_MS = 450;
export const REROLL_MS = 1800;

// Which bundled sample stands in for each picture. Some are shared.
const SAMPLE_FOR = {
  profile: "selfie",
  vs: "stride",
  vsMirror: "stride",
  swipe: "selfie",
  sprint: "stride",
  win: "win",
  respect: "respect",
  background: "rooftop",
  blackEdition: "win",
  clubKit: "stride",
  "race-nightRun": "stride",
  "race-hoodUp": "rooftop",
  "race-finishLean": "stride",
  "win-roar": "win",
  "win-crown": "win",
  "win-pointUp": "win",
  "respect-fistBump": "respectFist",
  "respect-handOnHeart": "respectHeart",
  "respect-slowClap": "respectClap",
};
export const sampleFor = (name) => PACK_SAMPLES[SAMPLE_FOR[name]] || PACK_SAMPLES.stride;

const RUNNER_KEYS = RUNNERS.map((r) => r.key);
const FIGURES = ["man", "woman"];
const ALL_NAMES = new Set([...SLOTS.map((s) => s.key), ...BLACK_SLOTS.map((s) => s.key), ...packPicturesFor("black").map(pictureName)]);

const monthKey = (ms = Date.now()) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const nextMonth = (key) => {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/** Checks a runner choice. Returns the clean pair or throws. */
export const cleanRunner = ({ runner, runnerFigure } = {}, EngineError) => {
  if (!RUNNER_KEYS.includes(runner)) throw new EngineError("BAD_RUNNER", "Pick man, woman or rather not say.");
  if (runner !== "either") return { runner, runnerFigure: null };
  if (runnerFigure != null && !FIGURES.includes(runnerFigure)) throw new EngineError("BAD_RUNNER", "Pick a figure: man or woman.");
  return { runner, runnerFigure: runnerFigure || null };
};

export const makePack = (h) => {
  const { read, write, touch, requireMe, EngineError, ME } = h;

  const tierError = (requiredTier, message) => new EngineError("TIER_REQUIRED", message, { requiredTier });

  // Older saved worlds don't have the pack yet.
  const ensure = (s) => {
    s.pack = s.pack || {};
    const p = s.pack;
    p.credits = p.credits || [];
    p.joinGranted = p.joinGranted || {};
    p.topUps = p.topUps || {};
    p.scans = p.scans || {};
    p.picks = { ...DEFAULT_POSES, ...(p.picks || {}) };
    p.current = p.current || null;
    p.previous = p.previous || null;
    p.failNext = p.failNext || 0;
    return p;
  };

  const balanceOf = (p) => p.credits.reduce((sum, c) => sum + c.delta, 0);
  const credit = (p, delta, reason, ref = null) => {
    p.credits.push({ id: randomId("cr"), delta, reason, ref, at: Date.now() });
  };

  // ── Credits: the join grant and the monthly top-up ─────────────────────────

  // Moving up to Pro or Black grants that tier's join credits, once per tier,
  // up to the cap. From the 1st after joining, each month tops up by
  // `monthly`, never past the cap. Returns true if anything was granted.
  const syncCredits = (s) => {
    if (!s.me) return false;
    const p = ensure(s);
    const tier = s.me.tier || "free";
    const seen = p.tierSeen || "free";
    let any = false;
    if (RANK[tier] > RANK[seen] && tier !== "free" && !p.joinGranted[tier]) {
      const rules = PACK_CREDITS[tier];
      const delta = Math.max(0, Math.min(rules.join, rules.cap - balanceOf(p)));
      p.joinGranted[tier] = Date.now();
      if (delta) credit(p, delta, "join", tier);
      p.lastTopUp = monthKey();
      any = true;
    }
    p.tierSeen = tier;
    if (tier !== "free") {
      const rules = PACK_CREDITS[tier];
      const now = monthKey();
      let key = p.lastTopUp || now;
      for (let i = 0; i < 36 && key < now; i += 1) {
        key = nextMonth(key);
        if (p.topUps[key]) continue;
        p.topUps[key] = Date.now();
        const delta = Math.max(0, Math.min(rules.monthly, rules.cap - balanceOf(p)));
        if (delta) credit(p, delta, "monthly", key);
        any = true;
      }
      p.lastTopUp = now;
    }
    return any;
  };

  const creditsView = (s) => {
    const p = ensure(s);
    const tier = s.me?.tier || "free";
    const rules = PACK_CREDITS[tier] || PACK_CREDITS.free;
    return {
      tier,
      locked: tier === "free",
      balance: balanceOf(p),
      monthly: rules.monthly,
      cap: rules.cap,
      nextGrantAt: tier === "free" ? null : nextGrantAt(),
      packCost: PACK_COST,
      rerollCost: REROLL_COST,
    };
  };

  // ── Making the pictures ────────────────────────────────────────────────────

  // Lands every picture whose time has come. Returns { any, finished }.
  const settle = (s) => {
    const p = ensure(s);
    const pack = p.current;
    if (!pack) return { any: false, finished: false };
    const now = Date.now();
    let any = false;
    for (const img of pack.images) {
      if (img.status !== "pending" || img.dueAt > now) continue;
      any = true;
      img.attempts += 1;
      if (p.failNext > 0) {
        p.failNext -= 1;
        // A failed re-roll keeps the picture it had.
        img.status = img.url ? "ready" : "failed";
        if (img.cost) credit(p, img.cost, "refund", pictureName(img));
      } else {
        img.status = "ready";
        img.url = sampleFor(pictureName(img));
        img.readyAt = now;
      }
      img.cost = 0;
    }
    let finished = false;
    if (pack.status === "making" && !pack.images.some((i) => i.status === "pending")) {
      pack.status = pack.images.every((i) => i.status === "failed") ? "failed" : "ready";
      pack.readyAt = now;
      if (pack.status === "ready") p.previous = null;
      finished = true;
    }
    return { any, finished };
  };

  const readyPack = (p) => (p.current?.status === "ready" ? p.current : p.previous?.status === "ready" ? p.previous : null);

  /** player.fighter for the member: { [slot]: picture } or null. */
  const fighterOf = (s) => {
    if (!s.me) return null;
    const p = ensure(s);
    const pack = readyPack(p);
    return pack ? fighterFrom(pack.images, p.picks, s.me.tier) : null;
  };

  const stateView = (s) => {
    const p = ensure(s);
    const pack = p.current;
    const age = ageOn(s.me?.birthDate);
    return {
      status: pack ? pack.status : "none",
      packId: pack?.id || null,
      tierAtMake: pack?.tierAtMake || null,
      createdAt: pack?.createdAt || null,
      readyAt: pack?.readyAt || null,
      consentedAt: p.consentedAt || null,
      verifiedAt: p.verifiedAt || null,
      age: { known: age != null, adult: age != null && age >= PACK_MIN_AGE },
      images: (pack?.images || []).map((i) => ({ slot: i.slot, set: i.set, pose: i.pose, name: pictureName(i), url: i.url || null, status: i.status })),
      picks: { ...p.picks },
      fighter: fighterOf(s),
    };
  };

  // Reads move time on: pictures land as the screen polls. Saving the last
  // picture tells every screen, so the profile and battles pick the pack up.
  const settledRead = async (fn) => {
    let finished = false;
    const out = await touch((s) => {
      if (!s.me) return fn(s);
      syncCredits(s);
      finished = settle(s).finished;
      return fn(s);
    });
    if (finished) await write(() => {});
    return out;
  };

  // ── Checks ─────────────────────────────────────────────────────────────────

  const requireAdult = (s) => {
    const age = ageOn(s.me.birthDate);
    if (age == null) throw new EngineError("AGE_REQUIRED", "Add your date of birth first. The Fighter Pack is for 18 and over.");
    if (age < PACK_MIN_AGE) throw new EngineError("UNDER_18", "The Fighter Pack is for 18 and over.");
  };

  const requirePaid = (s, message = "The Fighter Pack comes with Pro and Black.") => {
    if ((s.me.tier || "free") === "free") throw tierError("pro", message);
  };

  // A write that first brings credits and pictures up to date.
  const act = (fn) =>
    write((s) => {
      requireMe(s);
      syncCredits(s);
      settle(s);
      return fn(s, ensure(s));
    });

  // ── The API ────────────────────────────────────────────────────────────────

  const getPackState = async () => settledRead((s) => (s.me ? stateView(s) : null));

  const getPackCredits = async () => settledRead((s) => (s.me ? creditsView(s) : null));

  // The consent tick: the member agrees to the scan and confirms they are 18+.
  const recordPackConsent = async ({ ageConfirmed = true } = {}) =>
    act((s, p) => {
      requireAdult(s);
      if (!ageConfirmed) throw new EngineError("AGE_REQUIRED", "Confirm you are 18 or over.");
      p.consentedAt = Date.now();
      p.ageConfirmed = true;
      return stateView(s);
    });

  // A live camera shot for one scan angle. On the phone the picture stays
  // where the camera saved it; the key is what verifyScan checks.
  const uploadScanShot = async ({ angle, uri } = {}) =>
    act((s, p) => {
      if (!p.consentedAt) throw new EngineError("CONSENT_REQUIRED", "Agree to the scan first.");
      if (!SCAN_ANGLES.some((a) => a.key === angle)) throw new EngineError("BAD_ANGLE", "Unknown scan angle.");
      if (!uri) throw new EngineError("NO_PHOTO", "Take the photo first.");
      if (!p.scanId || (p.scanStartedAt && Date.now() - p.scanStartedAt > SCAN_MAX_AGE_MINUTES * 60 * 1000)) {
        p.scanId = randomId("scan");
        p.scanStartedAt = Date.now();
      }
      const key = `selfies/${ME}/${p.scanId}/${angle}.jpg`;
      p.scans[key] = { angle, uri, at: Date.now() };
      return { key };
    });

  // The scan passes when all three angles are there and fresh. The server
  // runs the same rule (and, later, a liveness check).
  const verifyScan = async ({ keys = [] } = {}) =>
    act((s, p) => {
      if (!p.consentedAt) throw new EngineError("CONSENT_REQUIRED", "Agree to the scan first.");
      const now = Date.now();
      const shots = keys.map((k) => p.scans[k]).filter(Boolean);
      const fresh = shots.filter((x) => now - x.at <= SCAN_MAX_AGE_MINUTES * 60 * 1000);
      const angles = new Set(fresh.map((x) => x.angle));
      if (!SCAN_ANGLES.every((a) => angles.has(a.key))) {
        throw new EngineError("SCAN_FAILED", "We need all three angles from one scan. Try the scan again.");
      }
      p.verifiedAt = now;
      p.scanId = null;
      // Selfies go within a day either way.
      for (const [k, x] of Object.entries(p.scans)) if (now - x.at > SELFIE_TTL_HOURS * HOUR_MS) delete p.scans[k];
      return { verified: true, verifiedAt: now };
    });

  const newImages = (pictures, from) =>
    pictures.map((pic, i) => ({ id: randomId("img"), ...pic, status: "pending", url: null, attempts: 0, dueAt: from + (i + 1) * PACK_STEP_MS }));

  const startPack = async () =>
    act((s, p) => {
      requirePaid(s);
      requireAdult(s);
      if (!p.consentedAt) throw new EngineError("CONSENT_REQUIRED", "Agree to the scan first.");
      if (!p.verifiedAt) throw new EngineError("SCAN_REQUIRED", "Do the face scan first.");
      if (p.current?.status === "making") throw new EngineError("ALREADY_MAKING", "Your pack is still being made.");
      if (balanceOf(p) < PACK_COST) throw new EngineError("NOT_ENOUGH_CREDITS", `A pack takes ${PACK_COST} credits.`);
      const now = Date.now();
      const id = randomId("pack");
      credit(p, -PACK_COST, "pack", id);
      // The last ready pack stays in use until the new one is ready.
      if (p.current?.status === "ready") p.previous = p.current;
      p.current = { id, status: "making", createdAt: now, readyAt: null, tierAtMake: s.me.tier, images: newImages(packPicturesFor(s.me.tier), now) };
      return stateView(s);
    });

  // name: a slot ("vs") or an extra pose's picture name ("race-hoodUp").
  const rerollPackSlot = async (name) =>
    act((s, p) => {
      requirePaid(s, "Re-rolls come with Pro and Black.");
      if (!ALL_NAMES.has(name)) throw new EngineError("BAD_SLOT", "Unknown picture.");
      const pack = p.current;
      if (!pack || pack.status === "failed") throw new EngineError("NO_PACK", "Make your pack first.");
      if (pack.status === "making") throw new EngineError("ALREADY_MAKING", "Your pack is still being made.");
      const img = pack.images.find((i) => pictureName(i) === name);
      if (!img) throw new EngineError("NOT_FOUND", "That picture isn't in your pack.");
      if (img.status === "pending") throw new EngineError("ALREADY_MAKING", "That picture is already being made.");
      if (balanceOf(p) < REROLL_COST) throw new EngineError("NOT_ENOUGH_CREDITS", `A re-roll takes ${REROLL_COST} credit.`);
      credit(p, -REROLL_COST, "reroll", name);
      img.status = "pending";
      img.cost = REROLL_COST;
      img.dueAt = Date.now() + REROLL_MS;
      return stateView(s);
    });

  // One pick per set. Pro picks the first pose only; Black picks any. A Black
  // member whose pack was made on Pro gets the missing pose made for free.
  const setPackPose = async ({ set, pose } = {}) =>
    act((s, p) => {
      const def = POSE_SETS.find((x) => x.key === set);
      if (!def || !def.poses.some((x) => x.key === pose)) throw new EngineError("BAD_POSE", "Unknown pose.");
      const tier = s.me.tier || "free";
      if (!poseAllowed(tier, set, pose)) {
        const first = def.poses[0].key === pose;
        throw tierError(first ? "pro" : "black", first ? "Poses come with Pro and Black." : "Pick any pose with Black.");
      }
      p.picks[set] = pose;
      const pack = p.current;
      if (pack && pack.status !== "failed" && !pack.images.some((i) => i.set === set && i.pose === pose)) {
        pack.images.push(...newImages([{ slot: def.slot, set, pose, cost: 0 }], Date.now() + REROLL_MS - PACK_STEP_MS));
      }
      return stateView(s);
    });

  // Deletes every picture and pick. Credits already spent stay spent.
  const deletePack = async () =>
    act((s, p) => {
      p.current = null;
      p.previous = null;
      p.picks = { ...DEFAULT_POSES };
      return stateView(s);
    });

  // Developer helper and test hook: the next n pictures fail.
  const devFailPackPictures = async (n = 1) =>
    write((s) => {
      ensure(s).failNext = Math.max(0, Math.round(n));
    });

  return {
    getPackState,
    getPackCredits,
    recordPackConsent,
    uploadScanShot,
    verifyScan,
    startPack,
    rerollPackSlot,
    setPackPose,
    deletePack,
    devFailPackPictures,
    // for engine.js
    syncCredits,
    fighterOf,
  };
};
