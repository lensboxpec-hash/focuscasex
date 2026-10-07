import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const body = await req.json()
  if (!body.patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 })
  }
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))
  const record = await db.visionRecord.create({
    data: {
      patientId: String(body.patientId),
      date: body.date ? new Date(body.date) : new Date(),
      vaOD: body.vaOD || null,
      vaOS: body.vaOS || null,
      iopOD: num(body.iopOD),
      iopOS: num(body.iopOS),
      sphOD: num(body.sphOD),
      cylOD: num(body.cylOD),
      axisOD: num(body.axisOD),
      sphOS: num(body.sphOS),
      cylOS: num(body.cylOS),
      axisOS: num(body.axisOS),
      notes: body.notes || null,
    },
  })
  return NextResponse.json(record, { status: 201 })
}
