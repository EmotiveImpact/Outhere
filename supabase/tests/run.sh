#!/usr/bin/env bash
# Apply every migration to a throwaway Postgres database, load the seed and
# run the rules and RLS tests. Needs psql and a running Postgres 15+; point
# at it with the usual PGHOST, PGPORT and PGUSER variables.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/.."
db="outhere_test_$$"
psql -d postgres -qc "create database $db"
trap 'psql -d postgres -qc "drop database if exists $db" >/dev/null' EXIT
run() { psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; }

# Roles are cluster wide, so create them only the first time.
shim="$(mktemp)"
if psql -d "$db" -tAc "select 1 from pg_roles where rolname = 'authenticated'" | grep -q 1; then
  sed '/^create role/d' "$here/shim.sql" > "$shim"
else
  cp "$here/shim.sql" "$shim"
fi
run "$shim"; rm -f "$shim"

for f in "$root"/migrations/*.sql; do echo "migrate $(basename "$f")"; run "$f"; done
echo "seed"; run "$root/seed.sql"
for f in "$here"/test_*.sql; do
  [ -e "$f" ] || continue
  echo "test $(basename "$f")"
  psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "all good"
