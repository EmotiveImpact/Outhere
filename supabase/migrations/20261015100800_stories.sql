-- Outhere schema, part 9: who can see a story, and clearing them away.
--
-- Story photos live on Cloudflare R2, not in Supabase Storage. The one Edge
-- Function 'story-media' hands out short-lived presigned URLs: a PUT URL for
-- the author's own folder, and GET URLs only for stories the caller can read
-- under the policy below. Each story lasts 24 hours unless its author saves
-- it as a profile highlight; a nightly pg_cron job calls the function to
-- delete expired files from R2 and then their rows.

alter table public.stories
  add column audience text not null default 'followers'
    check (audience in ('public', 'followers', 'club')),
  add column saved_at timestamptz,                -- kept on the profile as a highlight
  add constraint stories_club_audience check ((audience = 'club') = (club_id is not null)),
  add constraint stories_media_key check (media_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.(webp|jpg)$');

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

-- A story can only point at a file in its author's own folder.
drop policy "post stories" on public.stories;
create policy "post stories" on public.stories for insert with check (
  author_id = auth.uid()
  and split_part(media_path, '/', 1) = auth.uid()::text
  and expires_at <= now() + interval '24 hours 1 minute'
  and (club_id is null or public.is_club_staff(club_id)));

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

-- Nightly purge at 03:30. Needs pg_cron and pg_net, and two Vault secrets:
-- 'project_url' and 'service_role_key'.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then return; end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.schedule('purge-stories', '30 3 * * *', $c$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/story-media',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
      body := '{"action": "purge"}'::jsonb)
  $c$);
exception when others then
  raise notice 'purge-stories not scheduled: %', sqlerrm;
end $$;

-- A view (or emote) can only be left on a story you can actually see.
drop policy "mark viewed" on public.story_views;
create policy "mark viewed" on public.story_views for insert with check (
  user_id = auth.uid() and exists (select 1 from public.stories s where s.id = story_id));
