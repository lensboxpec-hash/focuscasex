#!/bin/bash
# One-shot production verification for Focus CaseX (Supabase-backed).
# Starts the standalone server, runs API smoke tests, prints a summary.
# The server lives only for the duration of this script (sandbox reaps
# background processes between tool calls — platform auto-starts dev server).
set -u
cd /home/z/my-project

# Usage:
#   export DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"
#   export FCX_ADMIN_PASSWORD="your-admin-password"
#   bash scripts/verify-prod.sh
: "${DATABASE_URL:?export DATABASE_URL (Supabase pooler connection string) first}"
: "${FCX_ADMIN_PASSWORD:?export FCX_ADMIN_PASSWORD (admin login password) first}"
export NODE_ENV=production
export PORT=3000
export HOSTNAME=127.0.0.1

PASS=0; FAIL=0
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1"; }

echo "== starting standalone server =="
bun .next/standalone/server.js > /tmp/prod-verify-server.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  [ "$(code http://127.0.0.1:3000/login)" = "200" ] && break
  sleep 0.5
done

echo "== page checks =="
[ "$(code http://127.0.0.1:3000/)" = "200" ] && ok "GET / → 200" || bad "GET /"
[ "$(code http://127.0.0.1:3000/login)" = "200" ] && ok "GET /login → 200" || bad "GET /login"

echo "== auth gate =="
[ "$(code http://127.0.0.1:3000/api/patients)" = "401" ] && ok "unauthenticated /api/patients → 401" || bad "unauth API not blocked"

echo "== login =="
WRONG=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin","password":"definitely-wrong"}' -o /dev/null -w '%{http_code}')
[ "$WRONG" = "401" ] && ok "wrong password → 401" || bad "wrong password → $WRONG"

LOGIN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"admin\",\"password\":\"$FCX_ADMIN_PASSWORD\"}" -w '\n%{http_code}')
CODE=$(echo "$LOGIN" | tail -1)
BODY=$(echo "$LOGIN" | head -1)
if [ "$CODE" = "200" ]; then
  ok "admin login → 200 (${BODY:0:80})"
else
  bad "admin login → $CODE $BODY"
  echo "$BODY"
fi
TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "== authenticated API =="
if [ -n "$TOKEN" ]; then
  H="Authorization: Bearer $TOKEN"
  LENSES=$(curl -s -H "$H" http://127.0.0.1:3000/api/lenses | grep -o '"id"' | wc -l)
  [ "$LENSES" -ge 29 ] && ok "/api/lenses → $LENSES rows (Supabase catalog)" || bad "/api/lenses → $LENSES rows"
  PATS=$(curl -s -H "$H" http://127.0.0.1:3000/api/patients)
  echo "$PATS" | grep -q '\[\]' && ok "/api/patients → [] (real-data-only policy)" || bad "/api/patients → ${PATS:0:60}"

  echo "== write cycle (create → verify → delete) =="
  CREATE=$(curl -s -X POST -H "$H" -H 'Content-Type: application/json' http://127.0.0.1:3000/api/patients \
    -d '{"name":"VERIFY-PROD TEST","age":41,"gender":"MALE","cataractEye":"OD","k1OD":44.25,"k2OD":43.75,"axialLengthOD":23.52}')
  PID=$(echo "$CREATE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PID" ]; then
    ok "POST patient → id=$PID"
    DETAIL=$(curl -s -H "$H" http://127.0.0.1:3000/api/patients/$PID)
    echo "$DETAIL" | grep -q '"k1OD":44.25' && ok "biometry persisted (k1OD 44.25)" || bad "biometry missing"
    echo "$DETAIL" | grep -q '"axialLengthOD":23.52' && ok "axial length persisted (23.52)" || bad "axial length missing"
    DEL=$(curl -s -X DELETE -H "$H" http://127.0.0.1:3000/api/patients/$PID -o /dev/null -w '%{http_code}')
    [ "$DEL" = "200" ] || [ "$DEL" = "204" ] && ok "DELETE patient → $DEL" || bad "DELETE → $DEL"
    curl -s -H "$H" http://127.0.0.1:3000/api/patients | grep -q '\[\]' && ok "registry back to 0" || bad "cleanup failed"
  else
    bad "POST patient failed: ${CREATE:0:120}"
  fi
else
  bad "no token — skipping authenticated checks"
fi

kill $SRV 2>/dev/null
echo "== RESULT: $PASS passed, $FAIL failed =="
exit $FAIL
