#!/usr/bin/env python3
"""Build one file to paste into the Supabase SQL Editor: a clean slate, every
migration in order, the seed, and the migration history, in one transaction.

    python3 supabase/scripts/build_setup_sql.py OUT.sql
"""
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent.parent
migrations = sorted((root / "migrations").glob("*.sql"))
out = [
    "-- Outhere database setup. Paste all of this into the Supabase SQL Editor for the",
    "-- Outhere project and press Run. It wipes the database first, then builds it",
    "-- fresh. It runs as one transaction: if anything fails, nothing is changed.",
    "begin;",
    (root / "scripts" / "wipe.sql").read_text(),
]
for m in migrations:
    out.append(f"-- ════ {m.stem} ════")
    out.append(m.read_text())
out.append("-- ════ seed ════")
out.append((root / "seed.sql").read_text())
rows = ",\n  ".join(
    "('{}', '{}', '{{}}')".format(*m.stem.split("_", 1)) for m in migrations
)
out.append(
    "-- ════ migration history ════\n"
    "do $$\nbegin\n"
    "  if to_regclass('supabase_migrations.schema_migrations') is null then return; end if;\n"
    "  insert into supabase_migrations.schema_migrations (version, name, statements) values\n  "
    + rows
    + "\n  on conflict (version) do nothing;\nend $$;"
)
out.append("commit;\n")
pathlib.Path(sys.argv[1]).write_text("\n".join(out))
print(f"{len(migrations)} migrations, {sum(len(s) for s in out)} bytes")
