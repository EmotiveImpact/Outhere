#!/usr/bin/env python3
"""Write TypeScript types for the public schema in the shape `supabase gen
types typescript` produces (Database['public']['Tables'][name]['Row'] ...),
from a database the migrations have been applied to.

Usage: PGHOST=... python3 supabase/scripts/gen_types.py <dbname> <out.ts> [more.ts]

Prefer `supabase gen types typescript --project-id <ref>` once the hosted
project exists; this keeps the types honest until then.
"""
import json, subprocess, sys

db, outs = sys.argv[1], sys.argv[2:]

def q(sql):
    r = subprocess.run(["psql", "-d", db, "-tAc", sql], capture_output=True, text=True, check=True)
    return json.loads(r.stdout.strip() or "null") or []

PG = {
    "uuid": "string", "text": "string", "date": "string", "timestamp with time zone": "string",
    "integer": "number", "bigint": "number", "smallint": "number", "numeric": "number",
    "double precision": "number", "boolean": "boolean", "jsonb": "Json", "json": "Json",
}

enums = {}
for e in q("""select json_agg(json_build_object('n', t.typname, 'v', (select json_agg(enumlabel order by enumsortorder) from pg_enum where enumtypid = t.oid)))
              from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'"""):
    enums[e["n"]] = e["v"]

cols = q("""select json_agg(json_build_object('t', c.table_name, 'c', c.column_name, 'type', c.data_type, 'udt', c.udt_name,
                 'null', c.is_nullable = 'YES', 'def', c.column_default is not null or c.is_identity = 'YES' or c.is_generated = 'ALWAYS',
                 'gen', c.is_generated = 'ALWAYS', 'kind', t.table_type) order by c.table_name, c.ordinal_position)
            from information_schema.columns c join information_schema.tables t using (table_schema, table_name)
            where c.table_schema = 'public'""")

def ts(c):
    if c["type"] == "USER-DEFINED":
        base = f'Database["public"]["Enums"]["{c["udt"]}"]' if c["udt"] in enums else "unknown"
    elif c["type"] == "ARRAY":
        inner = c["udt"].lstrip("_")
        base = ("string" if inner in ("text", "uuid") else "number") + "[]"
    else:
        base = PG.get(c["type"], "unknown")
    return base + (" | null" if c["null"] else "")

tables, views = {}, {}
for c in cols:
    (views if c["kind"] == "VIEW" else tables).setdefault(c["t"], []).append(c)

# Foreign keys between public tables, in the supabase-js Relationships shape.
# isOneToOne when the key columns are also unique on their own table.
fks = q("""select json_agg(json_build_object(
              't', cl.relname, 'name', con.conname, 'ref', rl.relname,
              'cols', (select json_agg(a.attname order by k.o) from unnest(con.conkey) with ordinality k(n, o)
                       join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n),
              'refcols', (select json_agg(a.attname order by k.o) from unnest(con.confkey) with ordinality k(n, o)
                          join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n),
              'one', exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique and i.indpred is null
                             and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x)
                               = (select array_agg(x order by x) from unnest(con.conkey) x)))
            order by cl.relname, con.conname)
           from pg_constraint con
           join pg_class cl on cl.oid = con.conrelid join pg_namespace n on n.oid = cl.relnamespace
           join pg_class rl on rl.oid = con.confrelid join pg_namespace rn on rn.oid = rl.relnamespace
           where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'""")

# Which base table columns each view reads, so a view gets the foreign keys of
# the tables it shows (as PostgREST does) when it exposes every key column.
used = {}
for u in q("""select json_agg(json_build_object('v', view_name, 't', table_name, 'c', column_name))
              from information_schema.view_column_usage where view_schema = 'public' and table_schema = 'public'"""):
    used.setdefault(u["v"], set()).add((u["t"], u["c"]))

fns = q("""select json_agg(json_build_object('n', p.proname, 'args', pg_get_function_arguments(p.oid), 'ret', pg_get_function_result(p.oid),
                 'cols', (select json_agg(json_build_object('n', a.n, 't', format_type(a.t, null)) order by a.o)
                          from unnest(p.proargnames, p.proallargtypes, p.proargmodes) with ordinality a(n, t, m, o)
                          where a.m = 't')) order by p.proname)
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and has_function_privilege('authenticated', p.oid, 'execute')
             and p.prorettype <> 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')""")

def row_ts(t):
    if t in tables: return f'Database["public"]["Tables"]["{t}"]["Row"]'
    if t in views: return f'Database["public"]["Views"]["{t}"]["Row"]'

def arg_ts(t):
    t = t.strip().removeprefix("public.")
    if t in enums: return f'Database["public"]["Enums"]["{t}"]'
    if row_ts(t): return row_ts(t)
    if t.endswith("[]"): return arg_ts(t[:-2]) + "[]"
    return PG.get(t, "string" if "time" in t or t in ("text", "uuid", "date", "citext") else "unknown")

def ret_ts(f):
    r = f["ret"].replace("public.", "")
    if r.startswith("TABLE"):
        # A table returning function gives rows of its columns.
        return "{ " + " ".join(f"{c['n']}: {arg_ts(c['t'])};" for c in f["cols"] or []) + " }[]"
    if r.startswith("SETOF "):
        name = r[6:]
        return (row_ts(name) or arg_ts(name)) + "[]"
    if r in enums: return f'Database["public"]["Enums"]["{r}"]'
    if row_ts(r): return row_ts(r)
    return {"void": "undefined"}.get(r, PG.get(r, "Json"))

def rels(name):
    """Relationships for a table or a view, as supabase gen types writes them."""
    if name in tables:
        found = [k for k in fks if k["t"] == name]
    else:
        cols = {c["c"] for c in views[name]}
        reads = used.get(name, set())
        found, seen_rel = [], set()
        for k in fks:
            key = (tuple(k["cols"]), k["ref"], tuple(k["refcols"]))
            if key in seen_rel: continue
            if all((k["t"], c) in reads and c in cols for c in k["cols"]):
                seen_rel.add(key)
                found.append(k)
    if not found: return ["        Relationships: [];"]
    out = ["        Relationships: ["]
    for k in found:
        out += ["          {",
                f"            foreignKeyName: {json.dumps(k['name'])};",
                f"            columns: {json.dumps(k['cols'])};",
                f"            isOneToOne: {'true' if k['one'] else 'false'};",
                f"            referencedRelation: {json.dumps(k['ref'])};",
                f"            referencedColumns: {json.dumps(k['refcols'])};",
                "          },"]
    return out + ["        ];"]

L = ["// Generated by supabase/scripts/gen_types.py from the migrations. Do not edit.", "",
     "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];", "",
     "export type Database = {", "  public: {", "    Tables: {"]
for name, cs in tables.items():
    L.append(f"      {name}: {{")
    L.append("        Row: {"); L += [f"          {c['c']}: {ts(c)};" for c in cs]; L.append("        };")
    L.append("        Insert: {"); L += [f"          {c['c']}{'?' if c['def'] or c['null'] else ''}: {ts(c)};" for c in cs if not c["gen"]]; L.append("        };")
    L.append("        Update: {"); L += [f"          {c['c']}?: {ts(c)};" for c in cs if not c["gen"]]; L.append("        };")
    L += rels(name); L.append("      };")
L += ["    };", "    Views: {"]
for name, cs in views.items():
    L.append(f"      {name}: {{"); L.append("        Row: {")
    L += [f"          {c['c']}: {ts(c).replace(' | null', '')} | null;" for c in cs]
    L += ["        };"] + rels(name) + ["      };"]
L += ["    };", "    Functions: {"]
seen = set()
for f in fns:
    if f["n"] in seen: continue
    seen.add(f["n"])
    args = []
    for a in filter(None, [x.strip() for x in f["args"].split(",")]):
        parts = a.split(" DEFAULT ")[0].split(" ", 1)
        if len(parts) < 2: continue
        opt = " DEFAULT " in a
        args.append(f"{parts[0]}{'?' if opt else ''}: {arg_ts(parts[1])}")
    L.append(f"      {f['n']}: {{ Args: {{ {'; '.join(args)}{';' if args else ''} }}; Returns: {ret_ts(f)} }};")
L += ["    };", "    Enums: {"]
L += [f"      {n}: {' | '.join(json.dumps(v) for v in vs)};" for n, vs in enums.items()]
L += ["    };", "    CompositeTypes: Record<string, never>;", "  };", "};", "",
      'export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];',
      'export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];', ""]
for o in outs:
    open(o, "w").write("\n".join(L))
    print("wrote", o)
