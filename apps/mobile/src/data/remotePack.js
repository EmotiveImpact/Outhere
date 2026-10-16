// The Fighter Pack over Supabase. Same names and return shapes as pack.js;
// remote.js builds this with its own helpers and spreads it into its
// exports. The rules live in the database (migration
// 20261016100000_fighter_pack.sql); files and fal.ai go through the
// 'avatar-pack' Edge Function (services/packMedia.js).

import { EngineError } from "./engine";
import { cleanRunner } from "./pack";
import { fighterUrls, packFiles, packUrl, prepareScanShot } from "@/services/packMedia";

const ms = (t) => (t ? new Date(t).getTime() : null);

const MESSAGES = {
  NOT_SIGNED_IN: "Sign in first.",
  TIER_REQUIRED: "The Fighter Pack comes with Pro and Black.",
  AGE_REQUIRED: "Add your date of birth first. The Fighter Pack is for 18 and over.",
  UNDER_18: "The Fighter Pack is for 18 and over.",
  CONSENT_REQUIRED: "Agree to the scan first.",
  SCAN_REQUIRED: "Do the face scan first.",
  SCAN_FAILED: "We need all three angles from one scan. Try the scan again.",
  BAD_ANGLE: "Unknown scan angle.",
  ALREADY_MAKING: "Your pack is still being made.",
  NOT_ENOUGH_CREDITS: "Not enough credits for that yet.",
  NO_PACK: "Make your pack first.",
  BAD_SLOT: "Unknown picture.",
  NOT_FOUND: "That picture isn't in your pack.",
  BAD_POSE: "Unknown pose.",
  BAD_RUNNER: "Pick man, woman or rather not say.",
};
const POSE_BLACK = "Pick any pose with Black.";

// Database and function errors as engine errors. TIER_REQUIRED carries the
// tier in its hint ('pro' or 'black'), so the upgrade sheet opens on the
// right plan.
const toEngineError = (error) => {
  const raw = error?.code && MESSAGES[error.code] ? error.code : (error?.message || "").split(/[\s:]/)[0];
  if (!MESSAGES[raw]) return new EngineError("SERVER", error?.message || "Something went wrong.");
  if (raw === "TIER_REQUIRED") {
    const requiredTier = error?.hint === "black" ? "black" : "pro";
    return new EngineError(raw, requiredTier === "black" ? POSE_BLACK : MESSAGES[raw], { requiredTier });
  }
  return new EngineError(raw, MESSAGES[raw]);
};

/** The pack state from pack_state() with keys turned into URLs and times into ms. */
export const packStateFrom = (j) =>
  j && {
    status: j.status || "none",
    packId: j.packId || null,
    tierAtMake: j.tierAtMake || null,
    createdAt: ms(j.createdAt),
    readyAt: ms(j.readyAt),
    consentedAt: ms(j.consentedAt),
    verifiedAt: ms(j.verifiedAt),
    age: j.age || { known: false, adult: false },
    images: (j.images || []).map((i) => ({ slot: i.slot, set: i.set || null, pose: i.pose || null, name: i.name, url: packUrl(i.path), status: i.status })),
    picks: j.picks || {},
    fighter: fighterUrls(j.fighter),
  };

export const packCreditsFrom = (c) => c && { ...c, nextGrantAt: ms(c.nextGrantAt) };

export const makeRemotePack = (h) => {
  const { supabase, run, requireUid, changed, getProfile } = h;

  const rpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw toEngineError(error);
    return data;
  };
  const fn = async (work) => {
    try {
      return await work();
    } catch (e) {
      throw toEngineError(e);
    }
  };

  // Sends any pictures still waiting to fal.ai. Safe to repeat: only rows
  // that were never sent go. A failure here is retried on the next poll.
  let lastKick = 0;
  const kick = async (packId) => {
    lastKick = Date.now();
    await packFiles.generate(packId);
  };
  const busy = (state) => state?.status === "making" || state?.images?.some((i) => i.status === "pending");

  const getPackState = async () => {
    const state = packStateFrom(await rpc("pack_state"));
    if (busy(state) && Date.now() - lastKick > 30 * 1000) kick(state.packId).catch(() => {});
    return state;
  };

  const getPackCredits = async () => packCreditsFrom(await rpc("pack_credits"));

  const recordPackConsent = async ({ ageConfirmed = true } = {}) => {
    const state = packStateFrom(await rpc("record_pack_consent", { p_age_confirmed: !!ageConfirmed }));
    changed();
    return state;
  };

  // The three shots of one scan share a scanId, so the server can check they
  // belong together. A passed scan starts the next one fresh.
  let scanId = null;
  const uploadScanShot = async ({ angle, uri } = {}) =>
    fn(async () => {
      await requireUid();
      const shot = await packFiles.uploadScanShot({ angle, uri: await prepareScanShot(uri), scanId });
      scanId = shot.scanId;
      return { key: shot.key };
    });

  const verifyScan = async ({ keys = [] } = {}) =>
    fn(async () => {
      const r = await packFiles.verify(keys);
      scanId = null;
      changed();
      return { verified: true, verifiedAt: ms(r.verifiedAt) };
    });

  const startPack = async () => {
    const state = packStateFrom(await rpc("start_pack"));
    await kick(state.packId).catch(() => {});
    changed();
    return state;
  };

  const rerollPackSlot = async (slot) => {
    const state = packStateFrom(await rpc("reroll_pack_slot", { p_slot: slot }));
    await kick(state.packId).catch(() => {});
    changed();
    return state;
  };

  const setPackPose = async ({ set, pose } = {}) => {
    const state = packStateFrom(await rpc("set_pack_pose", { p_set: set, p_pose: pose }));
    if (busy(state)) await kick(state.packId).catch(() => {});
    changed();
    return state;
  };

  const deletePack = async () =>
    fn(async () => {
      const r = await packFiles.deletePack();
      changed();
      return packStateFrom(r.state);
    });

  const setRunner = async ({ runner, runnerFigure = null } = {}) => {
    const me = await requireUid();
    const clean = cleanRunner({ runner, runnerFigure }, EngineError);
    await run(supabase.from("profiles").update({ runner: clean.runner, runner_figure: clean.runnerFigure }).eq("id", me));
    changed();
    return getProfile();
  };

  // Fighter pictures and runner choice for people that come back from an RPC
  // (the swipe deck, picks) rather than a profiles select.
  const withFighters = async (people) => {
    const ids = [...new Set((people || []).map((p) => p?.id).filter(Boolean))];
    if (!ids.length) return people || [];
    const rows = await rpc("fighter_cards", { p_ids: ids }).catch(() => []);
    const byId = Object.fromEntries((rows || []).map((r) => [r.id, r]));
    return people.map((p) => {
      const r = byId[p?.id];
      return p && { ...p, runner: r?.runner || p.runner || "man", runnerFigure: r?.runner_figure ?? p.runnerFigure ?? null, fighter: fighterUrls(r?.fighter) };
    });
  };

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
    setRunner,
    // for remote.js
    withFighters,
  };
};
