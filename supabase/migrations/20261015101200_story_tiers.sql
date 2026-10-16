-- Only paying members post stories (Edem, 2026-10-15). Free members still
-- watch and react. The story-media function also refuses upload links to
-- free members, so a free account cannot even put a file on R2.

create or replace function public.can_post_stories(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select tier in ('pro', 'black') from profiles where id = p_user), false);
$$;
grant execute on function public.can_post_stories(uuid) to authenticated;

drop policy "post stories" on public.stories;
create policy "post stories" on public.stories for insert with check (
  author_id = auth.uid()
  and public.can_post_stories(auth.uid())
  and split_part(media_path, '/', 1) = auth.uid()::text
  and expires_at <= now() + interval '24 hours 1 minute'
  and (club_id is null or public.is_club_staff(club_id)));
