import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Global search across patients, packages, counseling sessions and appointments.
// Used by the Ctrl+K command palette.
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ patients: [], packages: [], sessions: [], appointments: [] })
  }

  const [patients, packages, sessions, appointments] = await Promise.all([
    db.patient.findMany({
      where: {
        OR: [{ name: { contains: q } }, { mrn: { contains: q } }, { phone: { contains: q } }],
      },
      select: { id: true, name: true, mrn: true, age: true, gender: true, phone: true, cataractEye: true, pterygiumEye: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    db.package.findMany({
      where: {
        OR: [{ name: { contains: q } }, { category: { contains: q } }],
      },
      select: { id: true, name: true, category: true, finalPrice: true, active: true },
      take: 4,
      orderBy: { name: 'asc' },
    }),
    db.counselingSession.findMany({
      where: {
        OR: [
          { patient: { name: { contains: q } } },
          { patient: { mrn: { contains: q } } },
          { counselor: { contains: q } },
          { procedureType: { contains: q } },
        ],
      },
      select: {
        id: true, date: true, procedureType: true, eye: true, status: true,
        quotedAmount: true, patient: { select: { id: true, name: true, mrn: true } },
      },
      take: 5,
      orderBy: { date: 'desc' },
    }),
    db.appointment.findMany({
      where: {
        OR: [
          { patient: { name: { contains: q } } },
          { patient: { mrn: { contains: q } } },
          { procedureType: { contains: q } },
        ],
      },
      select: {
        id: true, date: true, time: true, procedureType: true, eye: true, status: true,
        patient: { select: { id: true, name: true, mrn: true } },
      },
      take: 5,
      orderBy: { date: 'desc' },
    }),
  ])

  return NextResponse.json({ patients, packages, sessions, appointments })
}
