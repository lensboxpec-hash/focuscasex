#!/usr/bin/env python3
"""Insert requireAuth guard into every API route handler (idempotent)."""
import re, pathlib

BASE = pathlib.Path('/home/z/my-project/src/app/api')
GUARD = '  const denied = await requireAuth()\n  if (denied) return denied\n'
HANDLER_RE = re.compile(r'^export async function (GET|POST|PUT|PATCH|DELETE)\(')
IMPORT_LINE = "import { requireAuth } from '@/lib/auth'"

files = sorted(p for p in BASE.rglob('route.ts') if 'auth' not in p.parts)
for path in files:
    src = path.read_text()
    if 'requireAuth' in src:
        print(f'skip (already guarded): {path}')
        continue
    lines = src.splitlines(keepends=True)
    out, guarded = [], 0
    for line in lines:
        out.append(line)
        if HANDLER_RE.match(line):
            out.append(GUARD)
            guarded += 1
    src = ''.join(out)
    # add import right before the first top-level export
    m = re.search(r'^export ', src, flags=re.M)
    if m:
        src = src[:m.start()] + IMPORT_LINE + '\n\n' + src[m.start():]
    path.write_text(src)
    print(f'guarded {guarded} handlers: {path.relative_to(BASE.parent.parent)}')
