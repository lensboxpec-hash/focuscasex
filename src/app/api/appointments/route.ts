import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const sp = req.nextUrl.searchParams
  const from = sp.get('from')
  const to = sp.get('to')
  const appointments = await db.appointment.findMany({
    where:
      from && to
        ? { date: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) } }
        : undefined,
    include: {
      patient: { select: { id: true, name: true, mrn: true, age: true, phone: true } },
      package: true,
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const body = await req.json()
  if (!body.patientId || !body.date) {
    return NextResponse.json({ error: 'patientId and date required' }, { status: 400 })
  }
  const [y, m, d] = String(body.date).split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
  const appointment = await db.appointment.create({
    data: {
      patientId: String(body.patientId),
      date,
      time: body.time ?? '09:00',
      duration: Number(body.duration) || 30,
      procedureType: body.procedureType ?? 'CONSULTATION',
      eye: body.eye ?? 'NA',
      packageId: body.packageId || null,
      status: body.status ?? 'SCHEDULED',
      notes: body.notes || null,
    },
    include: {
      patient: { select: { id: true, name: true, mrn: true, age: true, phone: true } },
      package: true,
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
