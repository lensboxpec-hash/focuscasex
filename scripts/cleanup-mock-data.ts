/* Task 14 — PURGE ALL MOCK DATA from the live DB.
   Keeps: User accounts (real logins) + LensStock (the clinic's given 29-lens catalog).
   Deletes: every demo patient, vision record, counseling session, appointment, package (+items).
   Idempotent — safe to run repeatedly. */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // children first (FK order); lens catalog + users untouched
  const appointments = await db.appointment.deleteMany({})
  const sessions = await db.counselingSession.deleteMany({})
  const vision = await db.visionRecord.deleteMany({})
  const pkgItems = await db.packageItem.deleteMany({})
  const packages = await db.package.deleteMany({})
  const patients = await db.patient.deleteMany({})

  console.log('MOCK DATA PURGED:')
  console.log(`  appointments: ${appointments.count}`)
  console.log(`  counseling sessions: ${sessions.count}`)
  console.log(`  vision records: ${vision.count}`)
  console.log(`  package items: ${pkgItems.count}`)
  console.log(`  packages: ${packages.count}`)
  console.log(`  patients: ${patients.count}`)
  console.log('KEPT:')
  console.log(`  users: ${await db.user.count()}`)
  console.log(`  lens catalog: ${await db.lensStock.count()}`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
