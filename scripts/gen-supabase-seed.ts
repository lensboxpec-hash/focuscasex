/* Generate supabase/seed.sql from the live SQLite DB — real data only:
   the 29-lens given clinic catalog (deterministic ids). Idempotent SQL.
   NOTE: login accounts are NOT seeded here — password hashes must never be
   published in the repo. Create accounts with `bun scripts/seed.ts` once
   DATABASE_URL points at the Supabase database. */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'
const db = new PrismaClient()

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return `'${v.toISOString()}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  const lenses = await db.lensStock.findMany({ orderBy: { createdAt: 'asc' } })

  const lines: string[] = [
    '-- ============================================================================',
    '-- Focus CaseX — Supabase seed: REAL DATA ONLY',
    '--   · the clinic\'s given 29-lens IOL catalog (catalog rows, qty 0)',
    '-- No mock patients / sessions / appointments / packages — entered live from the UI.',
    '-- Login accounts are intentionally NOT seeded here (no password hashes in the',
    '-- public repo): once DATABASE_URL points at Supabase, run `bun scripts/seed.ts`',
    '-- to create the two accounts + upsert this same catalog idempotently.',
    '-- Safe to run once AFTER supabase/schema.sql (idempotent via ON CONFLICT).',
    '-- ============================================================================',
    '',
    'BEGIN;',
    '',
    '-- ---- lens catalog (given by the clinic) ----',
  ]

  for (const l of lenses) {
    lines.push(
      `INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")\n` +
      `VALUES (${q(l.id)}, ${q(l.name)}, ${q(l.type)}, ${q(l.manufacturer)}, ${q(l.model)}, ${q(l.aConstant)}, ${q(l.powerSph)}, ${q(l.powerCyl)}, ${q(l.batchNo)}, ${q(l.expiryDate)}, ${q(l.quantity)}, ${q(l.minStock)}, ${q(l.notes)}, ${q(l.createdAt)}, ${q(l.updatedAt)})\n` +
      `ON CONFLICT ("id") DO NOTHING;`
    )
  }

  lines.push('', 'COMMIT;', '')
  writeFileSync('/home/z/my-project/supabase/seed.sql', lines.join('\n'))
  console.log(`supabase/seed.sql written: ${lenses.length} lenses (no user hashes)`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
