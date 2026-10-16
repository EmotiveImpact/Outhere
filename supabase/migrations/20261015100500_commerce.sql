-- Outhere schema, part 6: memberships, the club fund, Outhere Locals and drops.
--
-- Prices (Edem, 2026-10-15): Pro £5.99, Black £12.99 a month (£129.99 a year,
-- not yet confirmed). A club gets a flat £1 a month for each member
-- subscribing through its web link, 50p
-- through the app, three times that for Black (not finally signed off).

create type public.sub_source as enum ('app_store', 'play', 'web');
create type public.sub_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');

-- Written only by the payment webhooks (RevenueCat for the stores, Stripe for
-- web), running with the service role.
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  tier                public.tier not null check (tier <> 'free'),
  source              public.sub_source not null,
  status              public.sub_status not null,
  provider_ref        text not null unique,      -- RevenueCat or Stripe subscription id
  referral_club_id    uuid references public.clubs(id) on delete set null,
  yearly              boolean not null default false,
  current_period_end  timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id);
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- The ring follows the best live subscription.
create or replace function public.sync_tier()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles set tier = coalesce((
    select max(tier) from subscriptions
    where user_id = uid and status in ('trialing', 'active', 'past_due')
      and current_period_end > now()), 'free')
  where id = uid;
  return null;
end $$;
create trigger subscriptions_sync_tier after insert or update or delete on public.subscriptions
  for each row execute function public.sync_tier();

-- Monthly club fund lines, one per paying member per month.
create table public.club_fund_entries (
  id              bigint generated always as identity primary key,
  club_id         uuid not null references public.clubs(id) on delete cascade,
  month           date not null check (extract(day from month) = 1),
  source          text not null check (source in ('member_web', 'member_app', 'locals', 'kit', 'adjustment')),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_pence    integer not null,
  note            text,
  created_at      timestamptz not null default now(),
  unique (club_id, month, subscription_id)
);
create index club_fund_club_idx on public.club_fund_entries(club_id, month);

create or replace view public.club_fund_months with (security_invoker = true) as
select club_id, month, sum(amount_pence)::int as amount_pence, count(*)::int as lines
from public.club_fund_entries group by club_id, month;

-- Run by the scheduler on the 1st: credit each club for last month's
-- referred paying members.
create or replace function public.credit_club_fund(p_month date)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into club_fund_entries (club_id, month, source, subscription_id, amount_pence)
  select s.referral_club_id, p_month,
         case when s.source = 'web' then 'member_web' else 'member_app' end,
         s.id,
         (case when s.source = 'web' then 100 else 50 end) * (case when s.tier = 'black' then 3 else 1 end)
  from subscriptions s
  join clubs c on c.id = s.referral_club_id and c.status = 'verified'
  where s.status in ('active', 'past_due')
    and s.created_at < (p_month + interval '1 month')
    and s.current_period_end >= p_month
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.credit_club_fund from public, anon, authenticated;

-- Outhere Locals: local businesses back a verified club. The club gets 80%.
-- No betting, vape, alcohol or payday lenders.
create table public.locals_partners (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  business_name text not null,
  category      text not null check (category not in ('betting', 'vape', 'alcohol', 'payday')),
  tier          text not null check (tier in ('local', 'partner', 'headline')),  -- £50 / £150 / £400
  monthly_pence integer not null,
  perk          text,                            -- 'Free flat white after Saturday runs'
  logo_path     text,
  approved_by   uuid[] not null default '{}',     -- two approvers before payouts
  starts_on     date not null,
  ends_on       date,
  created_at    timestamptz not null default now()
);

-- ── Drops ────────────────────────────────────────────────────────────────────

create table public.drops (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  image_path    text,
  price_out     integer not null check (price_out >= 0),
  price_pence   integer,
  sizes         text[] not null default '{}',
  stock         integer not null check (stock >= 0),
  tier_required public.tier not null default 'free',
  early_access_h integer not null default 24,    -- Pro and Black see it this many hours early
  opens_at      timestamptz not null,
  closes_at     timestamptz,
  club_id       uuid references public.clubs(id) on delete set null,  -- club kit, club gets a share
  created_at    timestamptz not null default now()
);

create table public.drop_orders (
  id            uuid primary key default gen_random_uuid(),
  drop_id       uuid not null references public.drops(id),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  size          text,
  status        text not null default 'reserved' check (status in ('reserved', 'paid', 'shipped', 'collected', 'cancelled')),
  out_spent     integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (drop_id, user_id)
);

create table public.drop_reminders (
  drop_id       uuid not null references public.drops(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  primary key (drop_id, user_id)
);

create or replace function public.reserve_drop(p_drop uuid, p_size text default null)
returns public.drop_orders language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d drops;
  my_tier tier;
  o drop_orders;
begin
  select * into d from drops where id = p_drop for update;
  if d.id is null then raise exception 'NOT_FOUND'; end if;
  select tier into my_tier from profiles where id = me;
  if my_tier < d.tier_required then raise exception 'TIER_REQUIRED' using hint = d.tier_required::text; end if;
  if now() < d.opens_at - (case when my_tier > 'free' then make_interval(hours => d.early_access_h) else interval '0' end) then
    raise exception 'NOT_OPEN';
  end if;
  if d.closes_at is not null and now() > d.closes_at then raise exception 'CLOSED'; end if;
  if d.stock <= 0 then raise exception 'SOLD_OUT'; end if;
  if array_length(d.sizes, 1) > 0 and not (p_size = any(d.sizes)) then raise exception 'SIZE_REQUIRED'; end if;
  if public.out_available(me) < d.price_out then raise exception 'NOT_ENOUGH_OUT'; end if;

  insert into drop_orders (drop_id, user_id, size, out_spent) values (p_drop, me, p_size, d.price_out)
  returning * into o;
  update drops set stock = stock - 1 where id = p_drop;
  if d.price_out > 0 then
    perform public.award(me, 'drop:' || o.id, d.title, 'drop', 0, -d.price_out, 'drop', d.id::text);
  end if;
  return o;
exception when unique_violation then
  raise exception 'ALREADY_RESERVED';
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.subscriptions enable row level security;
alter table public.club_fund_entries enable row level security;
alter table public.locals_partners enable row level security;
alter table public.drops enable row level security;
alter table public.drop_orders enable row level security;
alter table public.drop_reminders enable row level security;

create policy "my subscriptions" on public.subscriptions for select using (user_id = auth.uid() or public.is_staff('finance'));

create policy "club staff see the fund" on public.club_fund_entries for select using (
  public.is_club_staff(club_id) or public.is_staff('finance'));

create policy "locals are public" on public.locals_partners for select using (array_length(approved_by, 1) >= 2 or public.is_staff());
create policy "staff manage locals" on public.locals_partners for all using (public.is_staff('finance')) with check (public.is_staff('finance'));

create policy "drops are public" on public.drops for select using (true);
create policy "staff manage drops" on public.drops for all using (public.is_staff('admin')) with check (public.is_staff('admin'));

create policy "my orders" on public.drop_orders for select using (user_id = auth.uid() or public.is_staff('support'));

create policy "my reminders" on public.drop_reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
