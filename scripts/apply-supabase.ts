import { readFileSync } from 'fs'
import { Client } from 'pg'

// Connection details come from env — never hardcode the DB password.
//   SUPABASE_DB_PASSWORD  the Postgres password of the project owner role
//   SUPABASE_PROJECT_REF  project ref (default: this clinic's project)
//   SUPABASE_REGION       pooler region (default: ap-south-1)
const REF = process.env.SUPABASE_PROJECT_REF || 'qdnzpdgytxmtmrerkpew'
const REGION = process.env.SUPABASE_REGION || 'ap-south-1'
const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('Set SUPABASE_DB_PASSWORD=<your Postgres password> before running this script.')
  process.exit(1)
}

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
  console.log('connected to Supabase (ap-south-1 session pooler)')

  // 1) schema
  const schema = readFileSync('/home/z/my-project/supabase/schema.sql', 'utf8')
  try {
    await client.query(schema)
    console.log('schema.sql applied OK')
  } catch (e: any) {
    // tolerate "already exists" if partially run before — report and continue only if clearly idempotent-safe
    console.error('schema.sql ERROR:', e.message)
    throw e
  }

  // 2) seed (real data only — 29 lens catalog rows)
  const seed = readFileSync('/home/z/my-project/supabase/seed.sql', 'utf8')
  await client.query(seed)
  console.log('seed.sql applied OK')

  // 3) verify
  const tables = await client.query(
    `select table_name from information_schema.tables where table_schema='public' order by table_name`
  )
  console.log('tables:', tables.rows.map((r: any) => r.table_name).join(', '))

  const counts = ['User', 'LensStock', 'Patient', 'CounselingSession', 'Appointment', 'VisionRecord', 'Package', 'PackageItem', 'Session']
  for (const t of counts) {
    const r = await client.query(`select count(*)::int as n from "${t}"`)
    console.log(`  ${t}: ${r.rows[0].n}`)
  }

  const rls = await client.query(
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' order by c.relname`
  )
  console.log('RLS:', rls.rows.map((r: any) => `${r.relname}=${r.relrowsecurity}`).join(' '))

  const lenses = await client.query(`select count(*)::int as n from "LensStock" where "aConstant" is null`)
  console.log(`lenses with null A-constant: ${lenses.rows[0].n}`)

  await client.end()
  console.log('DONE')
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
