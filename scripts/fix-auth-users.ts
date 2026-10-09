// Diagnose + fix hand-seeded auth.users rows (instance_id etc.), then test sign-in.
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'

const REF = process.env.SUPABASE_PROJECT_REF || 'qdnzpdgytxmtmrerkpew'
const REGION = process.env.SUPABASE_REGION || 'ap-south-1'
const PW = process.env.SUPABASE_DB_PASSWORD!
const ADMIN_PW = process.env.FCX_ADMIN_PASSWORD!
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const pg = new Client({
  host: `aws-0-${REGION}.pooler.supabase.com`, port: 5432,
  user: `postgres.${REF}`, password: PW, database: 'postgres', connectionTimeoutMillis: 10000,
})
await pg.connect()

const { rows: cols } = await pg.query(`
  select table_name, column_name, column_default, is_nullable
  from information_schema.columns
  where table_schema='auth' and table_name in ('users','identities')
    and column_name in ('instance_id','aud','role','encrypted_password','email_confirmed_at','confirmation_token')
  order by table_name, column_name`)
console.log('== relevant auth schema columns ==')
for (const c of cols) console.log(`  ${c.table_name}.${c.column_name} default=${c.column_default} null=${c.is_nullable}`)

const { rows: u } = await pg.query(`
  select email, instance_id, aud, role, left(encrypted_password, 7) as pw_prefix,
         email_confirmed_at is not null as confirmed, raw_user_meta_data
  from auth.users order by email`)
console.log('== current auth.users rows ==')
for (const r of u) console.log(' ', JSON.stringify(r))

// Fix instance_id to the hosted-Supabase default instance if needed
const FIXED = '00000000-0000-0000-0000-000000000000'
const needsFix = u.some((r) => r.instance_id !== FIXED)
if (needsFix) {
  await pg.query(`update auth.users set instance_id = $1 where instance_id is distinct from $1`, [FIXED])
  console.log(`instance_id normalized → ${FIXED}`)
}

// identities.instance_id too (if the column exists)
const { rows: idCols } = await pg.query(`
  select column_name from information_schema.columns
  where table_schema='auth' and table_name='identities' and column_name='instance_id'`)
if (idCols.length) {
  await pg.query(`update auth.identities set instance_id = $1 where instance_id is distinct from $1`, [FIXED])
  console.log('identities.instance_id normalized')
}

await pg.end()

// test sign-in for both accounts
const sb = createClient(URL, KEY, { auth: { persistSession: false } })
for (const [email, pw] of [['preethikaeyecare@gmail.com', ADMIN_PW], ['eyecarepreethika@gmail.com', process.env.FCX_STAFF_PASSWORD!]] as const) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw })
  if (error) console.log(`  ✗ ${email}: ${error.message}`)
  else console.log(`  ✓ ${email} signed in (role=${(data.user!.user_metadata as any).role})`)
}
