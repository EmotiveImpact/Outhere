# Splits migrations into chunks under 7.5 KB for the Supabase MCP apply_migration tool, which
# times out on larger payloads. Usage: python3 split_for_mcp.py <out_dir> <files...>
# Split SQL files into chunks of whole top-level statements, each under LIMIT bytes.
import sys, os, re, glob
LIMIT = 7500
out = sys.argv[1]
files = sys.argv[2:]
def statements(sql):
    stmts, cur, i, n = [], [], 0, len(sql)
    dollar = None; sq = False; line_comment = False; block = 0
    buf = ''
    while i < n:
        c = sql[i]
        if line_comment:
            buf += c
            if c == '\n': line_comment = False
            i += 1; continue
        if block:
            if sql.startswith('*/', i): block -= 1; buf += '*/'; i += 2; continue
            buf += c; i += 1; continue
        if dollar:
            if sql.startswith(dollar, i): buf += dollar; i += len(dollar); dollar = None; continue
            buf += c; i += 1; continue
        if sq:
            buf += c
            if c == "'":
                if i + 1 < n and sql[i+1] == "'": buf += "'"; i += 2; continue
                sq = False
            i += 1; continue
        if sql.startswith('--', i): line_comment = True; buf += '--'; i += 2; continue
        if sql.startswith('/*', i): block = 1; buf += '/*'; i += 2; continue
        if c == "'": sq = True; buf += c; i += 1; continue
        m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
        if m: dollar = m.group(0); buf += dollar; i += len(dollar); continue
        buf += c; i += 1
        if c == ';':
            # take the rest of the line (trailing comment / newline) with it
            j = sql.find('\n', i)
            if j != -1 and sql[i:j].strip() == '': buf += sql[i:j+1]; i = j + 1
            stmts.append(buf); buf = ''
    if buf.strip(): stmts.append(buf)
    return stmts
for f in files:
    base = re.sub(r'^\d+_', '', os.path.basename(f))[:-4]
    sql = open(f, encoding='utf-8').read()
    st = statements(sql)
    assert ''.join(st) == sql, f
    chunks, cur = [], ''
    for s in st:
        if cur and len((cur + s).encode()) > LIMIT: chunks.append(cur); cur = ''
        cur += s
    if cur: chunks.append(cur)
    for k, c in enumerate(chunks, 1):
        name = base if k == 1 else f"{base}_part{k}"
        open(os.path.join(out, f"{os.path.basename(f)[:14]}_{k:02d}_{name}.sql"), 'w', encoding='utf-8').write(c)
    print(base, len(chunks), max(len(c.encode()) for c in chunks))
