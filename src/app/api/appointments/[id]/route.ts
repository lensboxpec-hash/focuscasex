import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

import { requireAuth } from '@/lib/auth'

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  const body = await req.json()
  let date: Date | undefined
  if (body.date) {
    const [y, m, d] = String(body.date).split('-').map(Number)
    date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
  }
  const appointment = await db.appointment.update({
    where: { id },
    data: {
      date,
      time: body.time,
      duration: body.duration !== undefined ? Number(body.duration) || 30 : undefined,
      procedureType: body.procedureType,
      eye: body.eye,
      packageId: body.packageId !== undefined ? body.packageId || null : undefined,
      status: body.status,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
    include: {
      patient: { select: { id: true, name: true, mrn: true, age: true, phone: true } },
      package: true,
    },
  })
  return NextResponse.json(appointment)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  await db.appointment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
