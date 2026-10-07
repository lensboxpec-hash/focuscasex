import { Client } from 'pg'

// DB password comes from env — never hardcode secrets in a public repo.
const REF = process.env.SUPABASE_PROJECT_REF || 'qdnzpdgytxmtmrerkpew'
const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('Set SUPABASE_DB_PASSWORD=<your Postgres password> before running this script.')
  process.exit(1)
}

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-northeast-1', 'sa-east-1']

async function tryRegion(region: string, port: number): Promise<{ ok: boolean; info: string }> {
  const client = new Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port,
    user: `postgres.${REF}`,
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    const r = await client.query('select version()')
    await client.end()
    return { ok: true, info: r.rows[0].version.slice(0, 40) }
  } catch (e: any) {
    try { await client.end() } catch {}
    return { ok: false, info: String(e.message).slice(0, 90) }
  }
}

async function main() {
  for (const region of regions) {
    // session mode (5432) preferred for DDL
    const r = await tryRegion(region, 5432)
    console.log(`${r.ok ? 'CONNECTED' : 'no     '} | ${region} :5432 | ${r.info}`)
    if (r.ok) return
  }
  console.log('--- no session-mode hit, trying transaction mode 6543 ---')
  for (const region of regions) {
    const r = await tryRegion(region, 6543)
    console.log(`${r.ok ? 'CONNECTED' : 'no     '} | ${region} :6543 | ${r.info}`)
    if (r.ok) return
  }
}

main()
