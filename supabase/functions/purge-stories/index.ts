// Deletes stories older than 24 hours that nobody saved to a highlight. Files
// go through the Storage API (deleting storage rows in SQL would orphan them),
// then the rows. Called nightly by pg_cron (migration 20261015100800).

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${key}`) return new Response("Not allowed", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false } });

  let removed = 0;
  for (;;) {
    const { data, error } = await db.rpc("expired_stories", { p_limit: 500 });
    if (error) return Response.json({ error: error.message, removed }, { status: 500 });
    if (!data?.length) break;
    const paths = data.map((s: { media_path: string }) => s.media_path);
    const { error: filesError } = await db.storage.from("stories").remove(paths);
    if (filesError) return Response.json({ error: filesError.message, removed }, { status: 500 });
    const { error: rowsError } = await db.from("stories").delete().in("id", data.map((s: { id: string }) => s.id));
    if (rowsError) return Response.json({ error: rowsError.message, removed }, { status: 500 });
    removed += data.length;
    if (data.length < 500) break;
  }
  return Response.json({ removed });
});
