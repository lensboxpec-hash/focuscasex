import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const counts = {
    users: await db.user.count(),
    patients: await db.patient.count(),
    lenses: await db.lensStock.count(),
    sessions: await db.counselingSession.count(),
    appointments: await db.appointment.count(),
    vision: await db.visionRecord.count(),
    packages: await db.package.count(),
  }
  console.log('COUNTS:', JSON.stringify(counts))
  const users = await db.user.findMany({ select: { username: true, email: true, role: true } })
  console.log('USERS:', JSON.stringify(users))
}

main().finally(() => db.$disconnect())
