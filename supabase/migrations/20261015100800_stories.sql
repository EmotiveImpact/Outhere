-- Outhere schema, part 9: who can see a story, and clearing them away.
-- Photo stories live in the private 'stories' bucket and are read through
-- signed URLs, so a file is readable exactly when its stories row is. Each
-- story lasts 24 hours unless its author saves it to a profile highlight; a
-- nightly job (functions/purge-stories) deletes the rest, files included.

alter table public.stories
  add column audience text not null default 'followers'
    check (audience in ('public', 'followers', 'club')),
  add column saved_at timestamptz;                -- kept on the profile as a highlight

alter table public.stories add constraint stories_club_audience
  check ((audience = 'club') = (club_id is not null));

drop policy "live stories" on public.stories;
create policy "stories people can see" on public.stories for select to authenticated using (
  author_id = auth.uid()
  or ((expires_at > now() or saved_at is not null)
      and not public.is_blocked(auth.uid(), author_id)
      and case audience
            when 'public' then true
            when 'followers' then exists (select 1 from public.follows f
                                          where f.follower_id = auth.uid() and f.followee_id = author_id)
            when 'club' then public.is_club_member(club_id)
          end));

drop policy "post stories" on public.stories;
create policy "post stories" on public.stories for insert with check (
  author_id = auth.uid() and (club_id is null or public.is_club_staff(club_id)));

-- Authors can save a story as a highlight, change the caption, or unsave it.
revoke update on public.stories from anon, authenticated;
grant update (caption, saved_at) on public.stories to authenticated;
create policy "edit own stories" on public.stories for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Expired, unsaved stories for the purge job. Service role only.
create or replace function public.expired_stories(p_limit integer default 500)
returns table (id uuid, media_path text) language sql stable security definer set search_path = public as $$
  select s.id, s.media_path from stories s
  where s.expires_at <= now() and s.saved_at is null
  order by s.expires_at
  limit p_limit
$$;
revoke execute on function public.expired_stories(integer) from public, anon, authenticated;

-- Storage: a story file is readable when its row is.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute 'drop policy if exists "members read posts and stories media" on storage.objects';
  execute $p$
    create policy "members read posts media" on storage.objects for select to authenticated
      using (bucket_id = 'posts')
  $p$;
  execute $p$
    create policy "story files follow their story" on storage.objects for select to authenticated
      using (bucket_id = 'stories'
             and exists (select 1 from public.stories s where s.media_path = storage.objects.name))
  $p$;
end $$;

-- Nightly purge at 03:30 London. Needs pg_cron and pg_net, and two Vault
-- secrets: 'project_url' and 'service_role_key'.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then return; end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.schedule('purge-stories', '30 3 * * *', $c$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/purge-stories',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
      body := '{}'::jsonb)
  $c$);
exception when others then
  raise notice 'purge-stories not scheduled: %', sqlerrm;
end $$;
