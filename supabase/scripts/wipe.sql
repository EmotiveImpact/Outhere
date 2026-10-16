-- ════ Clean slate ════
-- Empties the Outhere database so the rebuild below starts fresh. It removes
-- every table, view, function and type in public, the sign-in accounts, the
-- scheduled jobs, the storage rules and the migration history. The public
-- schema itself and its default grants stay. Storage buckets stay too
-- (Supabase only lets the dashboard or the Storage API delete them) and the
-- rebuild reuses them.

do $$
declare
  r record;
begin
  -- Scheduled jobs
  if to_regclass('cron.job') is not null then
    for r in select jobname from cron.job where jobname is not null loop
      perform cron.unschedule(r.jobname);
    end loop;
  end if;

  -- Storage rules
  if to_regclass('storage.objects') is not null then
    for r in select policyname from pg_policies
             where schemaname = 'storage' and tablename = 'objects' loop
      execute format('drop policy if exists %I on storage.objects', r.policyname);
    end loop;
  end if;

  -- Sign-in trigger, then everything in public (skipping objects that belong
  -- to an extension)
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
  end if;

  for r in select c.relname, c.relkind from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
             and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') loop
    if r.relkind = 'm' then
      execute format('drop materialized view if exists public.%I cascade', r.relname);
    else
      execute format('drop view if exists public.%I cascade', r.relname);
    end if;
  end loop;

  for r in select c.relname from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
             and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;

  for r in select p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) as args
           from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('drop %s if exists public.%I(%s) cascade',
      case r.prokind when 'a' then 'aggregate' when 'p' then 'procedure' else 'function' end,
      r.proname, r.args);
  end loop;

  for r in select c.relname from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
             and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;

  for r in select t.typname from pg_type t
           where t.typnamespace = 'public'::regnamespace and t.typtype in ('e', 'd', 'c', 'r')
             and (t.typtype <> 'c' or exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c'))
             and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e') loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;

  -- Sign-in accounts
  if to_regclass('auth.users') is not null then
    delete from auth.users;
  end if;

  -- Migration history (rewritten at the end of this file)
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations;
  end if;
end $$;
