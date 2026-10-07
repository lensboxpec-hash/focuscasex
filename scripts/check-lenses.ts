/* Inspect current LensStock table */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const lenses = await db.lensStock.findMany({ orderBy: { createdAt: 'asc' } })
  console.log(`TOTAL: ${lenses.length}`)
  for (const l of lenses) {
    console.log(
      `${l.id} | ${l.name} | mfr=${l.manufacturer} | type=${l.type} | A=${l.aConstant} | sph=${l.powerSph} | cyl=${l.powerCyl ?? '-'} | batch=${l.batchNo || '-'} | qty=${l.quantity} | created=${l.createdAt.toISOString()}`
    )
  }
  // any patient references to lenses?
  const pRefs = await db.patient.count({ where: { OR: [{ plannedLensId: { not: null } }, { chosenLensId: { not: null } }] } })
  console.log(`\nPatients with lens refs: ${pRefs}`)
  const sRefs = await db.counselingSession.count({ where: { OR: [{ plannedLensId: { not: null } }, { placedLensId: { not: null } }] } })
  console.log(`Sessions with lens refs: ${sRefs}`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
