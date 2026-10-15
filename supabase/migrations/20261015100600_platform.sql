-- Outhere schema, part 7: realtime, storage buckets and schedules. Each block
-- checks the Supabase piece exists, so the migrations also run on a plain
-- Postgres used for tests.

-- ── Realtime ─────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.presence, public.club_messages, public.battles, public.notifications,
      public.posts, public.post_reactions, public.stories;
  end if;
end $$;

-- ── Storage ──────────────────────────────────────────────────────────────────

-- Paths start with the owner's id ('<uid>/...'), or the club's id for club
-- media, so policies can check ownership from the path. Story photos are not
-- here: they live on Cloudflare R2 (see 20261015100800_stories.sql).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;

  insert into storage.buckets (id, name, public) values
    ('avatars', 'avatars', true),
    ('club-media', 'club-media', true),
    ('posts', 'posts', false),
    ('drops', 'drops', true)
  on conflict (id) do nothing;

  execute $p$
    create policy "public media is readable" on storage.objects for select
      using (bucket_id in ('avatars', 'club-media', 'drops'))
  $p$;
  execute $p$
    create policy "members read posts media" on storage.objects for select to authenticated
      using (bucket_id = 'posts')
  $p$;
  execute $p$
    create policy "upload to my folder" on storage.objects for insert to authenticated
      with check (bucket_id in ('avatars', 'posts')
                  and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
  execute $p$
    create policy "replace my files" on storage.objects for update to authenticated
      using (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
  execute $p$
    create policy "delete my files" on storage.objects for delete to authenticated
      using (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
  execute $p$
    create policy "club staff upload club media" on storage.objects for insert to authenticated
      with check (bucket_id = 'club-media'
                  and public.is_club_staff(((storage.foldername(name))[1])::uuid))
  $p$;
end $$;

-- ── Schedules ────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron;
  perform cron.schedule('settle-battles', '*/5 * * * *', 'select public.settle_due_battles()');
  perform cron.schedule('club-fund', '0 3 1 * *',
    $c$select public.credit_club_fund((date_trunc('month', now()) - interval '1 month')::date)$c$);
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;
