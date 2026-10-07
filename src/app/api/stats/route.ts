import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth } from '@/lib/auth'

type Parsed = { from?: Date; to?: Date; label: string }

function parseRange(req: NextRequest): Parsed {
  const sp = req.nextUrl.searchParams
  const preset = sp.get('preset') ?? 'THIS_MONTH'
  const now = new Date()
  const day = (y: number, m: number, d: number, end = false) =>
    new Date(y, m, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)

  if (preset === 'CUSTOM') {
    const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00`) : undefined
    const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59.999`) : undefined
    return { from, to, label: 'CUSTOM' }
  }
  if (preset === 'LAST_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { from: start, to: end, label: 'LAST_MONTH' }
  }
  if (preset === 'ALL_TIME') return { label: 'ALL_TIME' }
  // THIS_MONTH
  return {
    from: day(now.getFullYear(), now.getMonth(), 1),
    to: day(now.getFullYear(), now.getMonth() + 1, 0, true),
    label: 'THIS_MONTH',
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const { from, to, label } = parseRange(req)

  const sessionDateWhere: Record<string, Date> = {}
  if (from) sessionDateWhere.gte = from
  if (to) sessionDateWhere.lte = to

  const [
    totalPatients,
    todayAppointments,
    pendingFollowUps,
    convertedRange,
    sessionsRange,
    surgeriesRange,
    willingRange,
    notWillingRange,
    todayList,
    followUpList,
    recentSessions,
    allMoneySessions,
    rangeMixSessions,
    cataractPatients,
    pterygiumPatients,
    // all-time blocks
    allSessions,
    allSurgeries,
    allConverted,
    allRevenueRows,
  ] = await Promise.all([
    db.patient.count(),
    db.appointment.count({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    db.counselingSession.findMany({
      where: { status: 'FOLLOW_UP' },
      include: { patient: { select: { id: true, name: true, mrn: true, phone: true } } },
      orderBy: { followUpDate: 'asc' },
    }),
    // converted (closed-won) in range
    db.counselingSession.findMany({
      where: {
        status: { in: ['CONVERTED', 'COMPLETED'] },
        ...(Object.keys(sessionDateWhere).length ? { date: sessionDateWhere } : {}),
      },
      select: { finalAmount: true, quotedAmount: true },
    }),
    // cases counselled in range
    db.counselingSession.count({
      ...(Object.keys(sessionDateWhere).length ? { where: { date: sessionDateWhere } } : {}),
    }),
    // surgeries done in range: completed with a surgery date
    db.counselingSession.count({
      where: {
        status: 'COMPLETED',
        surgeryDate: { not: null },
        ...(Object.keys(sessionDateWhere).length ? { date: sessionDateWhere } : {}),
      },
    }),
    db.counselingSession.count({
      where: {
        willingness: 'WILLING',
        status: { in: ['PENDING', 'FOLLOW_UP', 'CONVERTED'] },
        ...(Object.keys(sessionDateWhere).length ? { date: sessionDateWhere } : {}),
      },
    }),
    db.counselingSession.count({
      where: {
        willingness: 'NOT_WILLING',
        ...(Object.keys(sessionDateWhere).length ? { date: sessionDateWhere } : {}),
      },
    }),
    db.appointment.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: {
        patient: { select: { id: true, name: true, mrn: true, phone: true } },
        package: true,
      },
      orderBy: { time: 'asc' },
    }),
    db.counselingSession.findMany({
      where: { status: 'FOLLOW_UP' },
      include: { patient: { select: { id: true, name: true, mrn: true, phone: true } }, recommendedPackage: true },
      orderBy: { followUpDate: 'asc' },
      take: 8,
    }),
    db.counselingSession.findMany({
      include: { patient: { select: { id: true, name: true, mrn: true } }, recommendedPackage: true },
      orderBy: { date: 'desc' },
      take: 6,
    }),
    // money rollups across every non-lost session
    db.counselingSession.findMany({
      where: { status: { not: 'LOST' } },
      select: { finalAmount: true, quotedAmount: true, paidAmount: true },
    }),
    // case mix for the selected range
    db.counselingSession.findMany({
      ...(Object.keys(sessionDateWhere).length
        ? { where: { date: sessionDateWhere } }
        : {}),
      select: { procedureType: true, quotedAmount: true },
    }),
    db.patient.count({ where: { cataractEye: { not: 'NONE' } } }),
    db.patient.count({ where: { pterygiumEye: { not: 'NONE' } } }),
    // ---- all time ----
    db.counselingSession.count(),
    db.counselingSession.count({ where: { status: 'COMPLETED', surgeryDate: { not: null } } }),
    db.counselingSession.count({ where: { status: { in: ['CONVERTED', 'COMPLETED'] } } }),
    db.counselingSession.findMany({
      where: { status: { in: ['CONVERTED', 'COMPLETED'] } },
      select: { finalAmount: true },
    }),
  ])

  const revenueRange = convertedRange.reduce((s, c) => s + c.finalAmount, 0)
  const pipelineValue = await db.counselingSession
    .findMany({
      where: { status: { in: ['PENDING', 'FOLLOW_UP'] } },
      select: { quotedAmount: true },
    })
    .then((rows) => rows.reduce((s, r) => s + r.quotedAmount, 0))

  // Collected = sum of payments; Outstanding = billed (final or quoted) minus paid
  const collectedTotal = allMoneySessions.reduce((s, r) => s + (r.paidAmount ?? 0), 0)
  const outstanding = allMoneySessions.reduce((s, r) => {
    const billed = r.finalAmount > 0 ? r.finalAmount : r.quotedAmount
    return s + Math.max(0, billed - (r.paidAmount ?? 0))
  }, 0)

  // Case mix — sessions per procedure in range, largest first
  const mixMap = new Map<string, { count: number; value: number }>()
  for (const s of rangeMixSessions) {
    const cur = mixMap.get(s.procedureType) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += s.quotedAmount
    mixMap.set(s.procedureType, cur)
  }
  const procedureMix = [...mixMap.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const convertedCount = convertedRange.length
  const conversionRate = sessionsRange === 0 ? 0 : Math.round((convertedCount / sessionsRange) * 100)

  return NextResponse.json({
    range: { label, from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    totalPatients,
    todayAppointments,
    followUpsDue: pendingFollowUps.length,
    revenueRange,
    collectedTotal,
    outstanding,
    pipelineValue,
    conversionRate,
    procedureMix,
    cataractPatients,
    pterygiumPatients,
    todayList,
    followUpList,
    recentSessions,
    // range statistics block
    rangeStats: {
      label,
      counselled: sessionsRange,
      surgeriesDone: surgeriesRange,
      converted: convertedCount,
      conversionRate,
      revenue: revenueRange,
      willing: willingRange,
      notWilling: notWillingRange,
    },
    // all-time statistics block
    allTime: {
      counselled: allSessions,
      surgeriesDone: allSurgeries,
      converted: allConverted,
      revenue: allRevenueRows.reduce((s, r) => s + r.finalAmount, 0),
      patients: totalPatients,
    },
  })
}
