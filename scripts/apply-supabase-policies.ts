// Apply RLS policies + seed Supabase Auth accounts for the static (GitHub
// Pages, browser-direct) deployment mode.
//
// Env (never hardcoded):
//   SUPABASE_DB_PASSWORD   Postgres password of the project owner role
//   SUPABASE_PROJECT_REF   project ref   (default: this clinic's project)
//   SUPABASE_REGION        pooler region (default: ap-south-1)
//   FCX_ADMIN_PASSWORD     password for the ADMIN login  (required to reset;
//                          omit → existing auth user untouched / random for new)
//   FCX_STAFF_PASSWORD     password for the STAFF login  (same policy)
//
// Usage: SUPABASE_DB_PASSWORD=… FCX_ADMIN_PASSWORD=… FCX_STAFF_PASSWORD=… bun scripts/apply-supabase-policies.ts
import { readFileSync } from 'fs'
import { Client } from 'pg'
import { randomBytes, scryptSync } from 'crypto'

const REF = process.env.SUPABASE_PROJECT_REF || 'qdnzpdgytxmtmrerkpew'
const REGION = process.env.SUPABASE_REGION || 'ap-south-1'
const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('Set SUPABASE_DB_PASSWORD=<your Postgres password> before running this script.')
  process.exit(1)
}

const ACCOUNTS = [
  { email: 'preethikaeyecare@gmail.com', name: 'Dr. Preethika', role: 'ADMIN', pwEnv: 'FCX_ADMIN_PASSWORD' },
  { email: 'eyecarepreethika@gmail.com', name: 'PEC Staff', role: 'STAFF', pwEnv: 'FCX_STAFF_PASSWORD' },
]

function resolvePassword(acct: (typeof ACCOUNTS)[number]): string | null {
  const given = process.env[acct.pwEnv]
  if (given) return given
  return null // existing accounts stay untouched; new accounts get a random one
}

function oneTimePassword(): string {
  return `fcx-${randomBytes(6).toString('hex')}`
}

// Fallback hashing (never used when Supabase's crypt() is available).
function unusedHash(): string {
  return scryptSync(randomBytes(8).toString('hex'), 'salt', 32).toString('hex')
}
void unusedHash

async function main() {
  const client = new Client({
    host: `aws-0-${REGION}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${REF}`,
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
  })
  await client.connect()
  console.log(`connected to Supabase (${REGION} session pooler)`)

  // 1) RLS policies (idempotent)
  const policies = readFileSync('/home/z/my-project/supabase/policies.sql', 'utf8')
  await client.query(policies)
  const { rows: pol } = await client.query(
    `select tablename, policyname from pg_policies where schemaname='public' order by tablename`,
  )
  console.log(`RLS policies: ${pol.length}`)
  for (const p of pol) console.log(`  · ${p.tablename} → ${p.policyname}`)

  // 2) pgcrypto (for crypt/bf password hashing)
  await client.query(`create extension if not exists pgcrypto with schema extensions`)

  // 3) Supabase Auth users + email identities
  for (const acct of ACCOUNTS) {
    const { rows: existing } = await client.query(
      `select id from auth.users where email = $1`, [acct.email],
    )
    const wanted = resolvePassword(acct)
    let password = wanted
    let notice = ''
    if (existing.length && !wanted) {
      console.log(`auth user ${acct.email}: exists, password untouched (set ${acct.pwEnv} to reset)`)
      continue
    }
    if (!existing.length && !wanted) {
      password = oneTimePassword()
      notice = ` (one-time password: ${password})`
    }
    const meta = JSON.stringify({ role: acct.role, name: acct.name })
    const appMeta = JSON.stringify({ provider: 'email', providers: ['email'] })
    if (existing.length) {
      await client.query(
        `update auth.users set
           encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_user_meta_data = $3::jsonb,
           updated_at = now()
         where email = $1`,
        [acct.email, password, meta],
      )
      console.log(`auth user ${acct.email}: password reset${notice}`)
    } else {
      const { rows } = await client.query(
        `insert into auth.users
           (instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token, email_change,
            email_change_token_new, email_change_token_current)
         values
           ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
            extensions.crypt($2, extensions.gen_salt('bf')),
            now(), $3::jsonb, $4::jsonb,
            now(), now(), '', '', '', '', '')
         returning id`,
        [acct.email, password, appMeta, meta],
      )
      const uid = rows[0].id as string
      await client.query(
        `insert into auth.identities
           (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
         values
           (gen_random_uuid(), $1,
            $2::jsonb, 'email', $3, now(), now(), now())
         on conflict (provider, provider_id) do update
           set identity_data = excluded.identity_data, updated_at = now()`,
        [uid, JSON.stringify({ sub: uid, email: acct.email, email_verified: true }), acct.email],
      )
      console.log(`auth user ${acct.email}: created as ${acct.role}${notice}`)
    }
  }

  const { rows: count } = await client.query(`select count(*)::int as n from auth.users`)
  console.log(`auth.users total: ${count[0].n}`)
  await client.end()
  console.log('DONE')
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
