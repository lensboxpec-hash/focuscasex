/* Task 13 — catalog corrections requested by the clinic:
   1. MAGNUS (MONOFOCAL, A 118.4)                       → add
   2. EYECRYL ACTIV TORIC (BIFOCAL) [BIOTECH, A 118.6]  → renamed MAGNUS TORIC BIFOCAL,
                                                          A-constant left EMPTY (clinic will supply later)
   3. ACRIOL EC (MONOFOCAL, A 118.8)                    → add
   4. ACRIOL CLEAR (MONOFOCAL, A 118.8)                 → add
   Manufacturer attribution: CARE GROUP (same family as the clinic's ACRIOL/MAGNIFICENT rows).
   Idempotent: safe to run twice. Does NOT touch any other row. */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function upsertCatalog(name: string, type: string, manufacturer: string, aConstant: number | null) {
  const existing = await db.lensStock.findFirst({ where: { name } })
  if (existing) {
    await db.lensStock.update({
      where: { id: existing.id },
      data: { type, manufacturer, aConstant },
    })
    console.log(`updated  : ${name} (${type}, ${manufacturer}, A=${aConstant ?? '—'})`)
  } else {
    await db.lensStock.create({
      data: {
        name, type, manufacturer, aConstant,
        powerSph: 0, batchNo: '', quantity: 0, minStock: 0, // catalog row
      },
    })
    console.log(`created  : ${name} (${type}, ${manufacturer}, A=${aConstant ?? '—'})`)
  }
}

async function main() {
  // 2. rename-in-place: keep the row id, clear the A-constant for later
  const old = await db.lensStock.findFirst({ where: { name: 'EYECRYL ACTIV TORIC (BIFOCAL)' } })
  if (old) {
    await db.lensStock.update({
      where: { id: old.id },
      data: { name: 'MAGNUS TORIC BIFOCAL', manufacturer: 'CARE GROUP', aConstant: null },
    })
    console.log(`renamed  : EYECRYL ACTIV TORIC (BIFOCAL) → MAGNUS TORIC BIFOCAL (A-constant left empty)`)
  } else {
    const already = await db.lensStock.findFirst({ where: { name: 'MAGNUS TORIC BIFOCAL' } })
    console.log(already ? 'rename   : already done' : 'WARN     : EYECRYL ACTIV TORIC (BIFOCAL) not found')
  }

  // 1, 3, 4. new catalog lenses
  await upsertCatalog('MAGNUS', 'MONOFOCAL', 'CARE GROUP', 118.4)
  await upsertCatalog('ACRIOL EC', 'MONOFOCAL', 'CARE GROUP', 118.8)
  await upsertCatalog('ACRIOL CLEAR', 'MONOFOCAL', 'CARE GROUP', 118.8)

  console.log(`\nTOTAL lenses now: ${await db.lensStock.count()}`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
