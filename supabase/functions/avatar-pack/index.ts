// avatar-pack: the Fighter Pack's way on and off Cloudflare R2 and fal.ai.
//
//   selfie-url { angle, scanId?, size } -> { key, url, headers, scanId }  presigned PUT, 5 minutes,
//                                          private bucket, selfies/<member>/<scanId>/<angle>.jpg
//   verify     { keys }                 -> { verified, verifiedAt }  the three shots are there and fresh
//   generate   { packId? }              -> { submitted }  one fal.ai queue request per pending picture
//   webhook    (fal.ai calls this)      -> stores the picture in the public bucket, marks it ready
//   delete     {}                       -> the member's pack, rows and files
//   cleanup    {}                       -> service role only (pg_cron, hourly): selfies over 24 hours,
//                                          orphaned pictures, pictures fal.ai never answered for
//
// Every action but webhook and cleanup runs with the member's session.
//
// Secrets: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (one token
// with read and write on both buckets), R2_PACK_BUCKET (private, selfies;
// defaults to R2_BUCKET), R2_AVATAR_BUCKET (public read, finished pictures;
// the app reads them from EXPO_PUBLIC_AVATAR_URL), FAL_KEY, and optionally
// AVATAR_WEBHOOK_SECRET. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { r2 } from "../_shared/r2.ts";
import {
  EXT_FOR,
  FAL_JWKS_URL,
  type Jwk,
  MAX_ATTEMPTS,
  MAX_PICTURE_BYTES,
  MAX_SELFIE_BYTES,
  PROMPTS,
  SCAN_ANGLES,
  SELFIE_TTL_MS,
  type Shot,
  avatarKey,
  checkWebhookToken,
  falInput,
  falQueueUrl,
  newScanId,
  parseSelfieKey,
  scanProblem,
  selfieKey,
  verifyFalWebhook,
  webhookToken,
} from "../_shared/avatar.ts";

const env = (name: string, fallback?: string) => {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

type Files = ReturnType<typeof r2>;
type Image = { id: string; pack_id: string; user_id: string; name: string; path: string | null; attempts: number; status: string };

// ── Hooks for providers we haven't picked yet ───────────────────────────────

// LIVENESS HOOK. Today a scan passes when its three shots exist and were
// uploaded within 10 minutes (the app only takes them from the live camera).
// A liveness or face match provider plugs in here: return false to fail the
// scan, and record method 'liveness' instead of 'fresh_shots'.
async function livenessCheck(_files: Files, _keys: string[]): Promise<{ ok: boolean; method: "fresh_shots" | "liveness" }> {
  return { ok: true, method: "fresh_shots" };
}

// OUTPUT SAFETY HOOK. Every finished picture passes through here before it
// is stored. A moderation provider plugs in here: return false and the
// picture counts as failed (and is refunded).
async function outputIsSafe(_bytes: Uint8Array, _contentType: string, _name: string): Promise<boolean> {
  return true;
}

// ── fal.ai ──────────────────────────────────────────────────────────────────

let jwks: { keys: Jwk[]; at: number } | null = null;
async function falKeys(): Promise<Jwk[]> {
  if (jwks && Date.now() - jwks.at < 12 * 60 * 60 * 1000) return jwks.keys;
  const res = await fetch(FAL_JWKS_URL);
  if (!res.ok) throw new Error(`fal JWKS ${res.status}`);
  jwks = { keys: ((await res.json()).keys ?? []) as Jwk[], at: Date.now() };
  return jwks.keys;
}

const webhookUrl = async (imageId: string) => {
  const u = new URL(`${env("SUPABASE_URL")}/functions/v1/avatar-pack`);
  u.searchParams.set("action", "webhook");
  u.searchParams.set("image", imageId);
  const secret = Deno.env.get("AVATAR_WEBHOOK_SECRET");
  if (secret) u.searchParams.set("token", await webhookToken(secret, imageId));
  return u.toString();
};

// The face to work from: the straight selfie while it lasts (24 hours), then
// the member's finished profile picture, so later re-rolls and poses skip
// the scan.
async function referenceUrl(admin: SupabaseClient, selfies: Files, avatars: Files, img: Image) {
  const { data: pack } = await admin.from("avatar_packs").select("selfie_key").eq("id", img.pack_id).maybeSingle();
  if (pack?.selfie_key) {
    const { data: shot } = await admin.from("avatar_scan_shots").select("key").eq("key", pack.selfie_key).maybeSingle();
    if (shot) return selfies.presignGet(pack.selfie_key, 15 * 60);
  }
  const { data: profile } = await admin
    .from("avatar_images")
    .select("path")
    .eq("user_id", img.user_id)
    .eq("name", "profile")
    .not("path", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return profile?.path ? avatars.presignGet(profile.path, 15 * 60) : null;
}

// Sends one picture to the queue, or fails it (refunded) when it can't go.
async function submit(admin: SupabaseClient, selfies: Files, avatars: Files, img: Image) {
  const fail = async (why: string) => {
    const marker = `nosend:${img.id}:${img.attempts}`;
    await admin.from("avatar_images").update({ request_id: marker }).eq("id", img.id);
    await admin.rpc("finish_pack_image", { p_request_id: marker, p_ok: false, p_error: why });
    return false;
  };
  if (!PROMPTS[img.name]) return fail("no prompt");
  const ref = await referenceUrl(admin, selfies, avatars, img);
  if (!ref) return fail("no reference photo");
  const res = await fetch(falQueueUrl(await webhookUrl(img.id)), {
    method: "POST",
    headers: { Authorization: `Key ${env("FAL_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify(falInput(img.name, ref)),
  });
  if (!res.ok) return fail(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { request_id } = await res.json();
  const { error } = await admin
    .from("avatar_images")
    .update({ request_id, submitted_at: new Date().toISOString(), attempts: img.attempts + 1 })
    .eq("id", img.id)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return true;
}

// ── The handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") ?? "";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const signer = new AwsClient({ accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" });
  const selfies = r2(signer, { accountId: env("R2_ACCOUNT_ID"), bucket: env("R2_PACK_BUCKET", Deno.env.get("R2_BUCKET")) });
  const avatars = r2(signer, { accountId: env("R2_ACCOUNT_ID"), bucket: env("R2_AVATAR_BUCKET") });
  const query = new URL(req.url).searchParams;

  // ── webhook: fal.ai with a result ─────────────────────────────────────────
  if (query.get("action") === "webhook") {
    const raw = new Uint8Array(await req.arrayBuffer());
    const imageId = query.get("image") ?? "";
    const secret = Deno.env.get("AVATAR_WEBHOOK_SECRET");
    if (secret && !(await checkWebhookToken(secret, imageId, query.get("token")))) return json({ error: "Not allowed" }, 401);
    if (!(await verifyFalWebhook(req.headers, raw, await falKeys()))) return json({ error: "Bad signature" }, 401);

    let body: { request_id?: string; status?: string; error?: string; payload?: { images?: { url: string; content_type?: string }[] } };
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return json({ error: "Bad JSON" }, 400);
    }
    const requestId = String(body.request_id ?? "");
    const { data: img } = await admin.from("avatar_images").select("id, pack_id, user_id, name, path, attempts, status").eq("request_id", requestId).maybeSingle();
    // Not ours, or already answered (fal retries): acknowledge and stop.
    if (!img || img.id !== imageId || img.status !== "pending") return json({ ok: true });

    const finish = (ok: boolean, path: string | null, why: string | null) =>
      admin.rpc("finish_pack_image", { p_request_id: requestId, p_ok: ok, p_path: path, p_error: why });
    const retryOrFail = async (why: string) => {
      if (img.attempts < MAX_ATTEMPTS) {
        await admin.from("avatar_images").update({ request_id: null, last_error: why }).eq("id", img.id);
        await submit(admin, selfies, avatars, { ...img, status: "pending" });
      } else {
        await finish(false, null, why);
      }
      return json({ ok: true });
    };

    const picture = body.status === "OK" ? body.payload?.images?.[0] : null;
    if (!picture?.url) return retryOrFail(body.error ?? "no picture");
    const res = await fetch(picture.url);
    const type = (res.headers.get("Content-Type") ?? picture.content_type ?? "").split(";")[0].trim();
    const bytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    if (!bytes || !EXT_FOR[type] || bytes.byteLength > MAX_PICTURE_BYTES) return retryOrFail(`download ${res.status} ${type}`);
    if (!(await outputIsSafe(bytes, type, img.name))) return finish(false, null, "safety").then(() => json({ ok: true }));

    // fal makes WebP (output_format); anything else keeps its own extension.
    const key = avatarKey(img.user_id, img.pack_id, img.name, img.attempts, EXT_FOR[type]);
    await avatars.put(key, bytes, type);
    const { data: done, error } = await finish(true, key, null);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, done });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  // ── cleanup: service role only ────────────────────────────────────────────
  if (body.action === "cleanup") {
    if (auth !== `Bearer ${serviceKey}`) return json({ error: "Not allowed" }, 401);
    const before = new Date(Date.now() - SELFIE_TTL_MS).toISOString();
    let selfiesRemoved = 0;
    let picturesRemoved = 0;
    const { data: old } = await admin.from("avatar_scan_shots").select("key").lt("created_at", before).limit(500);
    for (const s of old ?? []) {
      try {
        await selfies.remove(s.key);
        await admin.from("avatar_scan_shots").delete().eq("key", s.key);
        selfiesRemoved += 1;
      } catch (e) {
        console.error(e);
      }
    }
    // Selfie keys on packs and verifications go with the files.
    await admin.from("avatar_packs").update({ selfie_key: null }).lt("created_at", before).not("selfie_key", "is", null);
    await admin.from("avatar_verifications").update({ selfie_key: null }).lt("verified_at", before).not("selfie_key", "is", null);
    const { data: orphans } = await admin.from("avatar_orphans").select("path").limit(500);
    for (const o of orphans ?? []) {
      try {
        await avatars.remove(o.path);
        await admin.from("avatar_orphans").delete().eq("path", o.path);
        picturesRemoved += 1;
      } catch (e) {
        console.error(e);
      }
    }
    const { data: expired } = await admin.rpc("expire_stuck_pack_images");
    return json({ selfiesRemoved, picturesRemoved, expired });
  }

  // Everything else runs as the signed in member, so RLS and the RPCs decide.
  const db = createClient(url, env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: who } = await db.auth.getUser(auth.replace(/^Bearer /, ""));
  const me = who?.user?.id;
  if (!me) return json({ error: "NOT_SIGNED_IN" }, 401);

  switch (body.action) {
    case "selfie-url": {
      const angle = String(body.angle ?? "");
      const size = Number(body.size);
      if (!SCAN_ANGLES.includes(angle as (typeof SCAN_ANGLES)[number])) return json({ error: "BAD_ANGLE" }, 400);
      if (!Number.isInteger(size) || size <= 0 || size > MAX_SELFIE_BYTES) return json({ error: "That photo is too big." }, 400);
      const { count } = await db.from("avatar_consents").select("id", { count: "exact", head: true }).eq("user_id", me);
      if (!count) return json({ error: "CONSENT_REQUIRED" }, 403);
      const scanId = typeof body.scanId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.scanId) ? body.scanId : newScanId();
      const key = selfieKey(me, scanId, angle);
      const { error } = await admin.from("avatar_scan_shots").upsert({ key, user_id: me, scan_id: scanId, angle, created_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ key, scanId, url: await selfies.presignPut(key, "image/jpeg", size), headers: { "Content-Type": "image/jpeg" } });
    }

    case "verify": {
      const keys = Array.isArray(body.keys) ? body.keys.slice(0, 3) : [];
      const parsed = keys.map((k) => parseSelfieKey(me, k));
      if (keys.length !== 3 || parsed.some((p) => !p)) return json({ error: "SCAN_FAILED" }, 400);
      const shots: Shot[] = await Promise.all(
        parsed.map(async (p, i) => {
          const head = await selfies.head(keys[i] as string);
          return head ? { angle: p!.angle, scanId: p!.scanId, uploadedAt: head.uploadedAt } : null;
        }),
      );
      const problem = scanProblem(shots);
      if (problem) return json({ error: "SCAN_FAILED", reason: problem }, 400);
      const live = await livenessCheck(selfies, keys as string[]);
      if (!live.ok) return json({ error: "SCAN_FAILED", reason: "LIVENESS" }, 400);
      const straight = keys[parsed.findIndex((p) => p!.angle === "straight")] as string;
      const { data: verifiedAt, error } = await admin.rpc("record_pack_verification", {
        p_user: me,
        p_scan_id: parsed[0]!.scanId,
        p_selfie_key: straight,
        p_method: live.method,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ verified: true, verifiedAt });
    }

    case "generate": {
      // Pictures start_pack, reroll_pack_slot or set_pack_pose left pending
      // and not yet sent.
      let q = admin.from("avatar_images").select("id, pack_id, user_id, name, path, attempts, status").eq("user_id", me).eq("status", "pending").is("request_id", null);
      if (typeof body.packId === "string") q = q.eq("pack_id", body.packId);
      const { data: pending, error } = await q.limit(40);
      if (error) return json({ error: error.message }, 500);
      let submitted = 0;
      for (const img of (pending ?? []) as Image[]) if (await submit(admin, selfies, avatars, img)) submitted += 1;
      return json({ submitted });
    }

    case "delete": {
      const { data, error } = await db.rpc("delete_pack");
      if (error) return json({ error: error.message }, 400);
      const paths: string[] = data?.paths ?? [];
      for (const p of paths) {
        try {
          await avatars.remove(p);
          await admin.from("avatar_orphans").delete().eq("path", p);
        } catch (e) {
          console.error(e); // the hourly clean up tries again
        }
      }
      return json({ ok: true, state: data?.state ?? null });
    }

    default:
      return json({ error: "Unknown action" }, 400);
  }
});
