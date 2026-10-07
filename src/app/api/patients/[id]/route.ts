import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

// '' or null → clears the field; undefined → leaves it untouched; else Number()
const numOrNull = (v: unknown) =>
  v === undefined ? undefined : v === null || v === '' ? null : Number(v)

import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      visionRecords: { orderBy: { date: 'desc' } },
      sessions: {
        orderBy: { date: 'desc' },
        include: { recommendedPackage: true },
      },
      appointments: {
        orderBy: { date: 'desc' },
        include: { package: true },
      },
      plannedLens: true,
      chosenLens: true,
    },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(patient)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  const body = await req.json()

  // optional renumber — unique-checked against other patients
  let mrn: string | undefined = undefined
  if (typeof body.mrn === 'string') {
    mrn = body.mrn.trim().toUpperCase().replace(/\s+/g, ' ')
    if (mrn && (mrn.length < 2 || mrn.length > 20)) {
      return NextResponse.json({ error: 'Patient number must be 2–20 characters.' }, { status: 400 })
    }
    if (mrn) {
      const dup = await db.patient.findFirst({
        where: { mrn, id: { not: id } },
        select: { id: true },
      })
      if (dup) {
        return NextResponse.json(
          { error: `Patient number ${mrn} is already in use.` },
          { status: 409 },
        )
      }
    }
  }

  const patient = await db.patient.update({
    where: { id },
    data: {
      mrn: mrn === undefined ? undefined : mrn || undefined, // '' → keep existing
      name: body.name !== undefined ? String(body.name).toUpperCase() : undefined,
      age: body.age !== undefined ? Number(body.age) : undefined,
      gender: body.gender,
      phone: body.phone !== undefined ? body.phone || null : undefined,
      referredBy: body.referredBy !== undefined ? body.referredBy || null : undefined,
      address: body.address !== undefined ? body.address || null : undefined,
      cataractEye: body.cataractEye,
      pterygiumEye: body.pterygiumEye,
      pterygiumGrade: body.pterygiumGrade,
      diabetes: body.diabetes !== undefined ? !!body.diabetes : undefined,
      hypertension: body.hypertension !== undefined ? !!body.hypertension : undefined,
      allergies: body.allergies !== undefined ? body.allergies || null : undefined,
      // lens details
      k1OD: numOrNull(body.k1OD),
      k2OD: numOrNull(body.k2OD),
      k1OS: numOrNull(body.k1OS),
      k2OS: numOrNull(body.k2OS),
      axialLengthOD: numOrNull(body.axialLengthOD),
      axialLengthOS: numOrNull(body.axialLengthOS),
      aConstant: numOrNull(body.aConstant),
      plannedLensId: body.plannedLensId !== undefined ? body.plannedLensId || null : undefined,
      chosenLensId: body.chosenLensId !== undefined ? body.chosenLensId || null : undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
  })
  return NextResponse.json(patient)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  await db.patient.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
