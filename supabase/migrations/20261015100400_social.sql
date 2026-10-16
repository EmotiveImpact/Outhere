-- Outhere schema, part 5: follows, feed, stories, club chat, notifications
-- and safety reports. The feed has no ads, and routes never show the start
-- or finish.

-- ── Follows ──────────────────────────────────────────────────────────────────

-- Friends are mutual follows.
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  followee_id   uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows(followee_id);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and followee_id = b)
     and exists (select 1 from follows where follower_id = b and followee_id = a)
$$;

-- ── Feed ─────────────────────────────────────────────────────────────────────

create type public.post_kind as enum
  ('text', 'photo', 'run_recap', 'club_run_recap', 'battle', 'welcome', 'milestone', 'reveal', 'memory');

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  club_id       uuid references public.clubs(id) on delete cascade,
  kind          public.post_kind not null default 'text',
  body          text check (char_length(body) <= 2000),
  media_paths   text[] not null default '{}',    -- storage 'posts'
  run_id        uuid references public.runs(id) on delete set null,
  battle_id     uuid references public.battles(id) on delete set null,
  event_id      uuid references public.events(id) on delete set null,
  data          jsonb not null default '{}'::jsonb,  -- extra card data (borough impact etc.)
  visibility    public.visibility not null default 'members',
  reaction_count integer not null default 0,
  comment_count integer not null default 0,
  hidden_at     timestamptz,                     -- moderation
  created_at    timestamptz not null default now()
);
create index posts_club_idx on public.posts(club_id, created_at desc);
create index posts_author_idx on public.posts(author_id, created_at desc);
create index posts_recent_idx on public.posts(created_at desc);

create table public.post_reactions (
  post_id       uuid not null references public.posts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  emoji         text not null check (char_length(emoji) between 1 and 16),
  created_at    timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table public.post_comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 500),
  hidden_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments(post_id, created_at);

create or replace function public.sync_post_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.post_id, old.post_id);
begin
  update posts set
    reaction_count = (select count(*) from post_reactions where post_id = pid),
    comment_count = (select count(*) from post_comments where post_id = pid and hidden_at is null)
  where id = pid;
  return null;
end $$;
create trigger post_reactions_count after insert or delete on public.post_reactions
  for each row execute function public.sync_post_counts();
create trigger post_comments_count after insert or delete on public.post_comments
  for each row execute function public.sync_post_counts();

create or replace function public.can_see_post(p public.posts)
returns boolean language sql stable security definer set search_path = public as $$
  select p.hidden_at is null and not public.is_blocked(auth.uid(), p.author_id) and (
    p.author_id = auth.uid()
    or p.visibility = 'public'
    or (p.visibility = 'members' and p.club_id is null and auth.uid() is not null)
    or (p.visibility = 'members' and p.club_id is not null and public.is_club_member(p.club_id))
    or (p.visibility = 'private' and public.are_friends(auth.uid(), p.author_id)))
  or public.is_staff('moderator')
$$;

-- ── Stories ──────────────────────────────────────────────────────────────────

-- An unwatched story is a soft glow around the ring that fades once seen.
create table public.stories (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  club_id       uuid references public.clubs(id) on delete cascade,  -- club stories, square ring
  media_path    text not null,                   -- object key on R2: '<author id>/<name>.webp'
  caption       text check (char_length(caption) <= 200),
  run_id        uuid references public.runs(id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '24 hours'
);
create index stories_live_idx on public.stories(expires_at desc);

create table public.story_views (
  story_id      uuid not null references public.stories(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  emote         text,
  viewed_at     timestamptz not null default now(),
  primary key (story_id, user_id)
);

-- ── Club chat ────────────────────────────────────────────────────────────────

create table public.club_channels (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  name          text not null check (name ~ '^[a-z0-9-]{2,24}$'),   -- 'general', 'sunday-long'
  staff_only_post boolean not null default false,                    -- 'announcements'
  sort          integer not null default 0,
  unique (club_id, name)
);

create table public.club_messages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references public.club_channels(id) on delete cascade,
  club_id       uuid not null references public.clubs(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text check (char_length(body) <= 2000),
  kind          text not null default 'text' check (kind in ('text', 'poll', 'run_card', 'event_card', 'photo')),
  data          jsonb not null default '{}'::jsonb,   -- poll options, run or event id
  reply_to      uuid references public.club_messages(id) on delete set null,
  hidden_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index club_messages_channel_idx on public.club_messages(channel_id, created_at desc);

create table public.poll_votes (
  message_id    uuid not null references public.club_messages(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  option_index  smallint not null,
  created_at    timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- Every new club gets general and announcements.
create or replace function public.make_default_channels()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into club_channels (club_id, name, staff_only_post, sort) values
    (new.id, 'general', false, 0),
    (new.id, 'announcements', true, 1);
  return new;
end $$;
create trigger clubs_default_channels after insert on public.clubs
  for each row execute function public.make_default_channels();

-- ── Notifications ────────────────────────────────────────────────────────────

create table public.notifications (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,                   -- 'battle', 'club', 'league', 'drop', 'social', 'system'
  title         text not null,
  body          text,
  link          text,                            -- app path, e.g. '/battles/<id>'
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link)
$$;
revoke execute on function public.notify from public, anon, authenticated;

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.followee_id, 'social',
    (select display_name from profiles where id = new.follower_id) || ' followed you', null,
    '/player/' || new.follower_id);
  return new;
end $$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- ── Safety ───────────────────────────────────────────────────────────────────

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  target_type   text not null check (target_type in ('profile', 'post', 'comment', 'message', 'story', 'club', 'event', 'steps')),
  target_id     text not null,
  reason        text not null check (reason in ('spam', 'abuse', 'unsafe', 'cheating', 'impersonation', 'other')),
  detail        text check (char_length(detail) <= 1000),
  status        text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index reports_status_idx on public.reports(status, created_at);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.club_channels enable row level security;
alter table public.club_messages enable row level security;
alter table public.poll_votes enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy "follows are visible to members" on public.follows for select to authenticated using (true);
create policy "follow people" on public.follows for insert with check (
  follower_id = auth.uid() and not public.is_blocked(follower_id, followee_id));
create policy "unfollow people" on public.follows for delete using (follower_id = auth.uid());

create policy "posts people can see" on public.posts for select using (public.can_see_post(posts));
create policy "write posts" on public.posts for insert with check (
  author_id = auth.uid()
  and kind in ('text', 'photo', 'run_recap')
  and (club_id is null or public.is_club_member(club_id)));
create policy "delete own posts" on public.posts for delete using (
  author_id = auth.uid() or (club_id is not null and public.is_club_staff(club_id)) or public.is_staff('moderator'));
create policy "moderate posts" on public.posts for update using (
  author_id = auth.uid() or (club_id is not null and public.is_club_staff(club_id)) or public.is_staff('moderator'));
revoke update on public.posts from anon, authenticated;
grant update (body, visibility, hidden_at) on public.posts to authenticated;

create policy "reactions on posts I can see" on public.post_reactions for select using (
  exists (select 1 from public.posts p where p.id = post_id and public.can_see_post(p)));
create policy "react" on public.post_reactions for insert with check (
  user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and public.can_see_post(p)));
create policy "unreact" on public.post_reactions for delete using (user_id = auth.uid());

create policy "comments on posts I can see" on public.post_comments for select using (
  hidden_at is null and exists (select 1 from public.posts p where p.id = post_id and public.can_see_post(p)));
create policy "comment" on public.post_comments for insert with check (
  author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and public.can_see_post(p)));
create policy "delete own comments" on public.post_comments for delete using (author_id = auth.uid() or public.is_staff('moderator'));

create policy "live stories" on public.stories for select to authenticated using (
  (expires_at > now() and not public.is_blocked(auth.uid(), author_id)
   and (club_id is null or public.is_club_member(club_id)))
  or author_id = auth.uid());
create policy "post stories" on public.stories for insert with check (
  author_id = auth.uid() and (club_id is null or public.is_club_staff(club_id)));
create policy "delete own stories" on public.stories for delete using (author_id = auth.uid());

create policy "own views, and views of my stories" on public.story_views for select using (
  user_id = auth.uid() or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));
create policy "mark viewed" on public.story_views for insert with check (user_id = auth.uid());
create policy "update my view" on public.story_views for update using (user_id = auth.uid());

create policy "members see channels" on public.club_channels for select using (public.is_club_member(club_id));
create policy "club staff manage channels" on public.club_channels for all
  using (public.is_club_staff(club_id)) with check (public.is_club_staff(club_id));

create policy "members read chat" on public.club_messages for select using (
  public.is_club_member(club_id) and hidden_at is null and not public.is_blocked(auth.uid(), author_id));
create policy "members post in chat" on public.club_messages for insert with check (
  author_id = auth.uid()
  and public.is_club_member(club_id)
  and exists (select 1 from public.club_channels c where c.id = channel_id and c.club_id = club_messages.club_id
              and (not c.staff_only_post or public.is_club_staff(c.club_id))));
create policy "delete own messages" on public.club_messages for delete using (
  author_id = auth.uid() or public.is_club_staff(club_id));

create policy "members see votes" on public.poll_votes for select using (
  exists (select 1 from public.club_messages m where m.id = message_id and public.is_club_member(m.club_id)));
create policy "members vote" on public.poll_votes for insert with check (
  user_id = auth.uid() and exists (select 1 from public.club_messages m where m.id = message_id and m.kind = 'poll'
                                   and public.is_club_member(m.club_id)));
create policy "change my vote" on public.poll_votes for update using (user_id = auth.uid());
create policy "remove my vote" on public.poll_votes for delete using (user_id = auth.uid());

create policy "my notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clear notifications" on public.notifications for delete using (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "file a report" on public.reports for insert with check (reporter_id = auth.uid());
create policy "my reports and staff" on public.reports for select using (reporter_id = auth.uid() or public.is_staff('moderator'));
create policy "staff handle reports" on public.reports for update using (public.is_staff('moderator'));
