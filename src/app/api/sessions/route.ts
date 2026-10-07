import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const status = req.nextUrl.searchParams.get('status')
  const sessions = await db.counselingSession.findMany({
    where: status ? { status } : undefined,
    include: {
      patient: { select: { id: true, name: true, mrn: true, age: true, phone: true, referredBy: true, cataractEye: true, k1OD: true, k2OD: true, k1OS: true, k2OS: true, axialLengthOD: true, axialLengthOS: true } },
      recommendedPackage: true,
      plannedLens: true,
      placedLens: true,
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const body = await req.json()
  if (!body.patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 })
  }
  const session = await db.counselingSession.create({
    data: {
      patientId: String(body.patientId),
      date: body.date ? new Date(body.date) : new Date(),
      counselor: body.counselor || 'FRONT DESK',
      procedureType: body.procedureType ?? 'CATARACT',
      eye: body.eye ?? 'OU',
      recommendedPackageId: body.recommendedPackageId || null,
      quotedAmount: Number(body.quotedAmount) || 0,
      finalAmount: Number(body.finalAmount) || 0,
      paidAmount: Number(body.paidAmount) || 0,
      paymentMode: body.paymentMode || null,
      status: body.status ?? 'PENDING',
      notes: body.notes || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      // counseling outcome + surgery planning + pre-op
      willingness: body.willingness ?? 'THINKING',
      surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : null,
      workupDone: Boolean(body.workupDone),
      plannedLensId: body.plannedLensId || null,
      bp: body.bp || null,
      bs: body.bs !== undefined && body.bs !== null && body.bs !== '' ? Number(body.bs) : null,
      axialLength: body.axialLength !== undefined && body.axialLength !== null && body.axialLength !== '' ? Number(body.axialLength) : null,
      k1: body.k1 !== undefined && body.k1 !== null && body.k1 !== '' ? Number(body.k1) : null,
      k2: body.k2 !== undefined && body.k2 !== null && body.k2 !== '' ? Number(body.k2) : null,
      iolPower: body.iolPower !== undefined && body.iolPower !== null && body.iolPower !== '' ? Number(body.iolPower) : null,
    },
    include: { recommendedPackage: true, plannedLens: true, placedLens: true },
  })
  return NextResponse.json(session, { status: 201 })
}
