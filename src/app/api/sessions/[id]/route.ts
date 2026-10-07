import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

import { requireAuth } from '@/lib/auth'

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  const body = await req.json()

  const prev = await db.counselingSession.findUnique({ where: { id } })
  if (!prev) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const nextStatus = body.status ?? prev.status
  const placedLensId =
    body.placedLensId !== undefined ? body.placedLensId || null : prev.placedLensId

  // When a case is marked COMPLETED with a placed lens, decrement stock once.
  let stockDecrement: { lensId: string; from: number } | null = null
  if (nextStatus === 'COMPLETED' && prev.status !== 'COMPLETED' && placedLensId) {
    const lens = await db.lensStock.findUnique({ where: { id: placedLensId } })
    if (lens && lens.quantity > 0) {
      stockDecrement = { lensId: lens.id, from: lens.quantity }
    }
  }

  const [session] = await db.$transaction([
    db.counselingSession.update({
      where: { id },
      data: {
        counselor: body.counselor,
        procedureType: body.procedureType,
        eye: body.eye,
        recommendedPackageId:
          body.recommendedPackageId !== undefined
            ? body.recommendedPackageId || null
            : undefined,
        quotedAmount: body.quotedAmount !== undefined ? Number(body.quotedAmount) || 0 : undefined,
        finalAmount: body.finalAmount !== undefined ? Number(body.finalAmount) || 0 : undefined,
        paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) || 0 : undefined,
        paymentMode: body.paymentMode !== undefined ? body.paymentMode || null : undefined,
        status: body.status,
        notes: body.notes !== undefined ? body.notes || null : undefined,
        followUpDate:
          body.followUpDate !== undefined
            ? body.followUpDate
              ? new Date(body.followUpDate)
              : null
            : undefined,
        // counseling outcome + surgery planning + pre-op
        willingness: body.willingness,
        surgeryDate:
          body.surgeryDate !== undefined
            ? body.surgeryDate
              ? new Date(body.surgeryDate)
              : null
            : undefined,
        workupDone: body.workupDone !== undefined ? Boolean(body.workupDone) : undefined,
        plannedLensId:
          body.plannedLensId !== undefined ? body.plannedLensId || null : undefined,
        placedLensId:
          body.placedLensId !== undefined
            ? body.placedLensId || null
            : nextStatus === 'COMPLETED' && placedLensId
              ? placedLensId
              : undefined,
        bp: body.bp !== undefined ? body.bp || null : undefined,
        bs: body.bs !== undefined ? (body.bs === null || body.bs === '' ? null : Number(body.bs)) : undefined,
        axialLength:
          body.axialLength !== undefined
            ? body.axialLength === null || body.axialLength === ''
              ? null
              : Number(body.axialLength)
            : undefined,
        k1: body.k1 !== undefined ? (body.k1 === null || body.k1 === '' ? null : Number(body.k1)) : undefined,
        k2: body.k2 !== undefined ? (body.k2 === null || body.k2 === '' ? null : Number(body.k2)) : undefined,
        iolPower:
          body.iolPower !== undefined
            ? body.iolPower === null || body.iolPower === ''
              ? null
              : Number(body.iolPower)
            : undefined,
      },
      include: {
        recommendedPackage: true,
        plannedLens: true,
        placedLens: true,
        patient: { select: { id: true, name: true, mrn: true, age: true, phone: true, referredBy: true, cataractEye: true, k1OD: true, k2OD: true, k1OS: true, k2OS: true, axialLengthOD: true, axialLengthOS: true } },
      },
    }),
    ...(stockDecrement
      ? [db.lensStock.update({ where: { id: stockDecrement.lensId }, data: { quantity: { decrement: 1 } } })]
      : []),
  ])

  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  await db.counselingSession.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
