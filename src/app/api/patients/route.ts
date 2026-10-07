import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth } from '@/lib/auth'

// '' or null → null (clear); undefined → null at create; else Number()
const numOrNull = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const patients = await db.patient.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { mrn: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: {
      sessions: { orderBy: { date: 'desc' }, take: 1 },
      visionRecords: { orderBy: { date: 'desc' }, take: 1 },
      appointments: { orderBy: { date: 'desc' }, take: 1 },
      _count: { select: { sessions: true, visionRecords: true, appointments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(patients)
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const body = await req.json()
  if (!body.name || !body.age) {
    return NextResponse.json({ error: 'Name and age are required' }, { status: 400 })
  }
  // Optional custom patient number (e.g. the clinic's own register no.) —
  // blank/absent → auto-generate the next PEC-####.
  const customMrn =
    typeof body.mrn === 'string' ? body.mrn.trim().toUpperCase().replace(/\s+/g, ' ') : ''
  if (customMrn && (customMrn.length < 2 || customMrn.length > 20)) {
    return NextResponse.json(
      { error: 'Patient number must be 2–20 characters.' },
      { status: 400 },
    )
  }
  if (customMrn) {
    const dup = await db.patient.findUnique({ where: { mrn: customMrn }, select: { id: true } })
    if (dup) {
      return NextResponse.json(
        { error: `Patient number ${customMrn} is already in use.` },
        { status: 409 },
      )
    }
  }

  // Generate next MRN — use max of all FC-#### MRNs (createdAt ordering is unreliable)
  const existing = await db.patient.findMany({
    where: { mrn: { startsWith: 'PEC-' } },
    select: { mrn: true },
  })
  const maxNum = existing.reduce((m, p) => {
    const n = parseInt(p.mrn.slice(3), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  let nextNum = maxNum + 1
  // Retry loop to stay collision-safe under concurrency
  let patient: Awaited<ReturnType<typeof db.patient.create>> | null = null
  for (let attempt = 0; attempt < 5 && !patient; attempt++) {
    const mrn = customMrn || `PEC-${String(nextNum).padStart(4, '0')}`
    try {
      patient = await db.patient.create({
        data: {
          mrn,
          name: String(body.name).toUpperCase(),
          age: Number(body.age),
          gender: body.gender ?? 'MALE',
          phone: body.phone || null,
          referredBy: body.referredBy || 'DIRECT',
          address: body.address || null,
          cataractEye: body.cataractEye ?? 'NONE',
          pterygiumEye: body.pterygiumEye ?? 'NONE',
          pterygiumGrade: body.pterygiumGrade ?? 'G1',
          diabetes: !!body.diabetes,
          hypertension: !!body.hypertension,
          allergies: body.allergies || null,
          notes: body.notes || null,
          // biometry captured at registration (optional)
          k1OD: numOrNull(body.k1OD),
          k2OD: numOrNull(body.k2OD),
          k1OS: numOrNull(body.k1OS),
          k2OS: numOrNull(body.k2OS),
          axialLengthOD: numOrNull(body.axialLengthOD),
          axialLengthOS: numOrNull(body.axialLengthOS),
        },
      })
    } catch (e) {
      if (customMrn) {
        // unique violation on the user-chosen number — surface it clearly
        return NextResponse.json(
          { error: `Patient number ${customMrn} is already in use.` },
          { status: 409 },
        )
      }
      // auto-generated mrn unique violation — bump and retry
      nextNum += 1
      if (attempt === 4) throw e
    }
  }
  return NextResponse.json(patient, { status: 201 })
}
