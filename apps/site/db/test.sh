#!/usr/bin/env bash
# Builds a throwaway database from the app schema (supabase/), applies
# db/website.sql twice (it must be safe to re-run) and runs db/test_website.sql.
# Needs psql and Postgres 15+; point at it with PGHOST, PGPORT and PGUSER.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
sb="$here/../../../supabase"
db="outhere_site_test_$$"
psql -d postgres -qc "create database $db"
trap 'psql -d postgres -qc "drop database if exists $db" >/dev/null' EXIT
run() { psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; }
shim="$(mktemp)"
if psql -d "$db" -tAc "select 1 from pg_roles where rolname = 'anon'" | grep -q 1; then
  sed '/^create role/d' "$sb/tests/shim.sql" > "$shim"
else
  cp "$sb/tests/shim.sql" "$shim"
fi
run "$shim"; rm -f "$shim"
for f in "$sb"/migrations/*.sql; do run "$f"; done
run "$sb/seed.sql"
run "$here/website.sql"
run "$here/website.sql"
psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$here/test_website.sql"
echo "website database checks passed"
