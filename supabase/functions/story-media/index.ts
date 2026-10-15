// story-media: the one way story photos get on and off Cloudflare R2.
//
//   upload   { contentType, size }  -> { key, url, headers }  presigned PUT, 5 minutes
//   view     { storyIds }           -> { urls: { [id]: url } } presigned GET, 1 hour,
//                                     only for stories the caller can read (RLS)
//   delete   { storyId }            -> author removes their story and its file
//   discard  { key }                -> author drops an upload that never became a story
//   purge    {}                     -> service role only (pg_cron, nightly): expired,
//                                     unsaved stories, file first, then row
//
// Secrets: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { MAX_STORY_BYTES, STORY_TYPES, ownsKey, r2, storyKey } from "../_shared/r2.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const url = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") ?? "";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const files = r2(
    new AwsClient({ accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" }),
    { accountId: env("R2_ACCOUNT_ID"), bucket: env("R2_BUCKET") },
  );

  if (body.action === "purge") {
    if (auth !== `Bearer ${serviceKey}`) return json({ error: "Not allowed" }, 401);
    let removed = 0;
    for (;;) {
      const { data, error } = await admin.rpc("expired_stories", { p_limit: 200 });
      if (error) return json({ error: error.message, removed }, 500);
      if (!data?.length) break;
      const done: string[] = [];
      for (const s of data as { id: string; media_path: string }[]) {
        try {
          await files.remove(s.media_path);
          done.push(s.id);
        } catch (e) {
          console.error(e);
        }
      }
      if (done.length) {
        const { error: rowsError } = await admin.from("stories").delete().in("id", done);
        if (rowsError) return json({ error: rowsError.message, removed }, 500);
      }
      removed += done.length;
      if (done.length < data.length || data.length < 200) break;
    }
    return json({ removed });
  }

  // Everything else runs as the signed in member, so RLS decides.
  const db = createClient(url, env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: who } = await db.auth.getUser(auth.replace(/^Bearer /, ""));
  const me = who?.user?.id;
  if (!me) return json({ error: "NOT_SIGNED_IN" }, 401);

  switch (body.action) {
    case "upload": {
      const type = String(body.contentType ?? "");
      const size = Number(body.size);
      if (!STORY_TYPES[type]) return json({ error: "Photos only: WebP or JPEG." }, 400);
      if (!Number.isInteger(size) || size <= 0 || size > MAX_STORY_BYTES) return json({ error: "That photo is too big." }, 400);
      const key = storyKey(me, STORY_TYPES[type]);
      return json({ key, url: await files.presignPut(key, type, size), headers: { "Content-Type": type } });
    }

    case "view": {
      const ids = Array.isArray(body.storyIds) ? body.storyIds.map(String).slice(0, 100) : [];
      if (!ids.length) return json({ urls: {} });
      const { data, error } = await db.from("stories").select("id, media_path").in("id", ids);
      if (error) return json({ error: error.message }, 400);
      const urls: Record<string, string> = {};
      for (const s of data ?? []) urls[s.id] = await files.presignGet(s.media_path);
      return json({ urls });
    }

    case "delete": {
      const { data: story } = await db.from("stories").select("id, media_path, author_id").eq("id", String(body.storyId)).maybeSingle();
      if (!story || story.author_id !== me) return json({ error: "NOT_FOUND" }, 404);
      await files.remove(story.media_path);
      const { error } = await db.from("stories").delete().eq("id", story.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "discard": {
      const key = String(body.key ?? "");
      if (!ownsKey(me, key)) return json({ error: "NOT_ALLOWED" }, 403);
      const { count } = await admin.from("stories").select("id", { count: "exact", head: true }).eq("media_path", key);
      if (count) return json({ error: "That photo is in a story. Delete the story instead." }, 400);
      await files.remove(key);
      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown action" }, 400);
  }
});
