'use client'

// ============================================================================
// Focus CaseX — Supabase handlers: counseling sessions, appointments, stats,
// global search. Response shapes mirror the Next.js API routes exactly.
// ============================================================================

import {
  sb, ok, err, type Ctx, type Result, type Row,
  numOrNull, rid, nowIso, contains,
} from './sb-client'
import { PATIENT_SNAPSHOT_FIELDS } from './sb-handlers'

const SESSION_EMBED = `*,patient:Patient!patientId(${PATIENT_SNAPSHOT_FIELDS.join(',')}),recommendedPackage:Package!recommendedPackageId(*,items:PackageItem(*)),plannedLens:LensStock!plannedLensId(*),placedLens:LensStock!placedLensId(*)`
const APPT_EMBED = `*,patient:Patient!patientId(id,name,mrn,age,phone),package:Package!packageId(*,items:PackageItem(*))`
const APPT_EMBED_LIST = `*,patient:Patient!patientId(id,name,mrn),package:Package!packageId(*,items:PackageItem(*))`

/* ------------------------------ counseling sessions ----------------------- */

export async function sessionsList({ q }: Ctx): Promise<Result> {
  let req = sb().from('CounselingSession').select(SESSION_EMBED).order('date', { ascending: false })
  if (q.get('status')) req = req.eq('status', q.get('status') as string)
  const { data, error } = await req
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok(data ?? [])
}

export async function sessionsCreate({ body }: Ctx): Promise<Result> {
  if (!body?.patientId) return err('patientId required')
  const row = {
    id: rid('ses'), patientId: String(body.patientId),
    date: body.date ? new Date(body.date).toISOString() : nowIso(),
    counselor: body.counselor || 'FRONT DESK',
    procedureType: body.procedureType ?? 'CATARACT', eye: body.eye ?? 'OU',
    recommendedPackageId: body.recommendedPackageId || null,
    quotedAmount: Number(body.quotedAmount) || 0, finalAmount: Number(body.finalAmount) || 0,
    paidAmount: Number(body.paidAmount) || 0, paymentMode: body.paymentMode || null,
    status: body.status ?? 'PENDING', willingness: body.willingness ?? 'THINKING',
    surgeryDate: body.surgeryDate ? new Date(body.surgeryDate).toISOString() : null,
    workupDone: Boolean(body.workupDone), plannedLensId: body.plannedLensId || null, placedLensId: null,
    bp: body.bp || null,
    bs: numOrNull(body.bs), axialLength: numOrNull(body.axialLength),
    k1: numOrNull(body.k1), k2: numOrNull(body.k2), iolPower: numOrNull(body.iolPower),
    notes: body.notes || null,
    followUpDate: body.followUpDate ? new Date(body.followUpDate).toISOString() : null,
    createdAt: nowIso(), updatedAt: nowIso(),
  }
  const { data, error } = await sb().from('CounselingSession').insert(row).select(SESSION_EMBED).single()
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok(data, 201)
}

export async function sessionUpdate(id: string, body: any): Promise<Result> {
  const { data: prev, error: fetchErr } = await sb().from('CounselingSession').select('*').eq('id', id).maybeSingle()
  const dbErr0 = dbErrorLocal(fetchErr)
  if (dbErr0) return dbErr0
  if (!prev) return err('Not found', 404)

  const nextStatus = body?.status ?? prev.status
  const placedLensId = body?.placedLensId !== undefined ? body.placedLensId || null : prev.placedLensId

  // mirror the server: decrement lens stock once on COMPLETED transition
  if (nextStatus === 'COMPLETED' && prev.status !== 'COMPLETED' && placedLensId) {
    const { data: lens } = await sb().from('LensStock').select('quantity').eq('id', placedLensId).maybeSingle()
    if (lens && Number(lens.quantity) > 0) {
      await sb().from('LensStock').update({ quantity: Number(lens.quantity) - 1, updatedAt: nowIso() }).eq('id', placedLensId)
    }
  }

  const patch: Row = { updatedAt: nowIso() }
  if (body?.counselor !== undefined) patch.counselor = body.counselor
  if (body?.procedureType !== undefined) patch.procedureType = body.procedureType
  if (body?.eye !== undefined) patch.eye = body.eye
  if (body?.recommendedPackageId !== undefined) patch.recommendedPackageId = body.recommendedPackageId || null
  if (body?.quotedAmount !== undefined) patch.quotedAmount = Number(body.quotedAmount) || 0
  if (body?.finalAmount !== undefined) patch.finalAmount = Number(body.finalAmount) || 0
  if (body?.paidAmount !== undefined) patch.paidAmount = Number(body.paidAmount) || 0
  if (body?.paymentMode !== undefined) patch.paymentMode = body.paymentMode || null
  if (body?.status !== undefined) patch.status = body.status
  if (body?.notes !== undefined) patch.notes = body.notes || null
  if (body?.followUpDate !== undefined) patch.followUpDate = body.followUpDate ? new Date(body.followUpDate).toISOString() : null
  if (body?.willingness !== undefined) patch.willingness = body.willingness
  if (body?.surgeryDate !== undefined) patch.surgeryDate = body.surgeryDate ? new Date(body.surgeryDate).toISOString() : null
  if (body?.workupDone !== undefined) patch.workupDone = Boolean(body.workupDone)
  if (body?.plannedLensId !== undefined) patch.plannedLensId = body.plannedLensId || null
  if (body?.placedLensId !== undefined) patch.placedLensId = body.placedLensId || null
  if (body?.bp !== undefined) patch.bp = body.bp || null
  for (const k of ['bs', 'axialLength', 'k1', 'k2', 'iolPower'] as const) {
    if (body?.[k] !== undefined) patch[k] = numOrNull(body[k])
  }
  const { data, error } = await sb().from('CounselingSession').update(patch).eq('id', id).select(SESSION_EMBED).single()
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok(data)
}

export async function sessionDelete(id: string): Promise<Result> {
  const { error } = await sb().from('CounselingSession').delete().eq('id', id)
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

/* -------------------------------- appointments ----------------------------- */

export async function appointmentsList({ q }: Ctx): Promise<Result> {
  const from = q.get('from')
  const to = q.get('to')
  let req = sb().from('Appointment').select(APPT_EMBED)
  if (from && to) {
    req = req.gte('date', `${from}T00:00:00`).lte('date', `${to}T23:59:59.999`)
  }
  const { data, error } = await req
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  const rows = [...(data ?? [])].sort(
    (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)),
  )
  return ok(rows)
}

export async function appointmentsCreate({ body }: Ctx): Promise<Result> {
  if (!body?.patientId || !body?.date) return err('patientId and date required')
  const [y, m, d] = String(body.date).split('-').map(Number)
  const row = {
    id: rid('appt'), patientId: String(body.patientId),
    date: new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString(),
    time: body.time ?? '09:00', duration: Number(body.duration) || 30,
    procedureType: body.procedureType ?? 'CONSULTATION', eye: body.eye ?? 'NA',
    packageId: body.packageId || null, status: body.status ?? 'SCHEDULED',
    notes: body.notes || null, createdAt: nowIso(), updatedAt: nowIso(),
  }
  const { data, error } = await sb().from('Appointment').insert(row).select(APPT_EMBED).single()
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok(data, 201)
}

export async function appointmentUpdate(id: string, body: any): Promise<Result> {
  const patch: Row = { updatedAt: nowIso() }
  if (body?.date) {
    const [y, m, d] = String(body.date).split('-').map(Number)
    patch.date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString()
  }
  if (body?.time !== undefined) patch.time = body.time
  if (body?.duration !== undefined) patch.duration = Number(body.duration) || 30
  if (body?.procedureType !== undefined) patch.procedureType = body.procedureType
  if (body?.eye !== undefined) patch.eye = body.eye
  if (body?.packageId !== undefined) patch.packageId = body.packageId || null
  if (body?.status !== undefined) patch.status = body.status
  if (body?.notes !== undefined) patch.notes = body.notes || null
  const { data, error } = await sb().from('Appointment').update(patch).eq('id', id).select(APPT_EMBED).single()
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok(data)
}

export async function appointmentDelete(id: string): Promise<Result> {
  const { error } = await sb().from('Appointment').delete().eq('id', id)
  const dbErr = dbErrorLocal(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

/* ----------------------------------- stats --------------------------------- */

const inRange = (d: string, from: Date | null, to: Date | null) => {
  const t = new Date(d).getTime()
  if (from && t < from.getTime()) return false
  if (to && t > to.getTime()) return false
  return true
}

export async function statsGet({ q }: Ctx): Promise<Result> {
  const preset = q.get('preset') ?? 'THIS_MONTH'
  const fromQ = q.get('from')
  const toQ = q.get('to')
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  let from: Date | null = null
  let to: Date | null = null
  let label = 'THIS_MONTH'
  if (preset === 'CUSTOM' && (fromQ || toQ)) {
    from = fromQ ? new Date(`${fromQ}T00:00:00`) : null
    to = toQ ? new Date(`${toQ}T23:59:59.999`) : null
    label = 'CUSTOM'
  } else if (preset === 'LAST_MONTH') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    label = 'LAST_MONTH'
  } else if (preset === 'ALL_TIME') {
    label = 'ALL_TIME'
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const [sessionsRes, patientsRes, todayRes, followRes, recentRes] = await Promise.all([
    sb().from('CounselingSession').select('*'),
    sb().from('Patient').select('id,cataractEye,pterygiumEye'),
    sb().from('Appointment').select(APPT_EMBED)
      .gte('date', todayStart.toISOString()).lte('date', todayEnd.toISOString()),
    sb().from('CounselingSession').select('*,patient:Patient!patientId(id,name,mrn,phone)').eq('status', 'FOLLOW_UP'),
    sb().from('CounselingSession').select('*,patient:Patient!patientId(id,name,mrn)').order('date', { ascending: false }).limit(6),
  ])
  const e = sessionsRes.error ?? patientsRes.error ?? todayRes.error ?? followRes.error ?? recentRes.error
  const dbErr = dbErrorLocal(e)
  if (dbErr) return dbErr

  const sessions: Row[] = sessionsRes.data ?? []
  const patients: Row[] = patientsRes.data ?? []
  const todayList: Row[] = [...(todayRes.data ?? [])].sort((a, b) => String(a.time).localeCompare(String(b.time)))
  const followUpAll: Row[] = [...(followRes.data ?? [])].sort((a, b) =>
    String(a.followUpDate ?? '9999').localeCompare(String(b.followUpDate ?? '9999')))
  const recentSessions: Row[] = recentRes.data ?? []

  const sessionsInRange = sessions.filter((s) => inRange(s.date, from, to))
  const convertedRange = sessionsInRange.filter((s) => s.status === 'CONVERTED' || s.status === 'COMPLETED')
  const revenueRange = convertedRange.reduce((sum, s) => sum + Number(s.finalAmount ?? 0), 0)
  const sessionsRange = sessionsInRange.length
  const convertedCount = convertedRange.length
  const conversionRate = sessionsRange === 0 ? 0 : Math.round((convertedCount / sessionsRange) * 100)

  const moneyRows = sessions.filter((s) => s.status !== 'LOST')
  const collectedTotal = moneyRows.reduce((sum, s) => sum + Number(s.paidAmount ?? 0), 0)
  const outstanding = moneyRows.reduce((sum, s) => {
    const billed = Number(s.finalAmount) > 0 ? Number(s.finalAmount) : Number(s.quotedAmount)
    return sum + Math.max(0, billed - Number(s.paidAmount ?? 0))
  }, 0)
  const pipelineValue = sessions
    .filter((s) => s.status === 'PENDING' || s.status === 'FOLLOW_UP')
    .reduce((sum, s) => sum + Number(s.quotedAmount ?? 0), 0)

  const mixMap = new Map<string, { count: number; value: number }>()
  for (const s of sessionsInRange) {
    const cur = mixMap.get(s.procedureType) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += Number(s.quotedAmount ?? 0)
    mixMap.set(s.procedureType, cur)
  }
  const procedureMix = [...mixMap.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const allConverted = sessions.filter((s) => s.status === 'CONVERTED' || s.status === 'COMPLETED')

  return ok({
    range: { label, from: from ? from.toISOString() : null, to: to ? to.toISOString() : null },
    totalPatients: patients.length,
    todayAppointments: todayList.length,
    followUpsDue: followUpAll.length,
    revenueRange,
    collectedTotal,
    outstanding,
    pipelineValue,
    conversionRate,
    procedureMix,
    cataractPatients: patients.filter((p) => p.cataractEye !== 'NONE').length,
    pterygiumPatients: patients.filter((p) => p.pterygiumEye !== 'NONE').length,
    todayList,
    followUpList: followUpAll.slice(0, 8),
    recentSessions,
    rangeStats: {
      label,
      counselled: sessionsRange,
      surgeriesDone: sessionsInRange.filter((s) => s.status === 'COMPLETED' && s.surgeryDate).length,
      converted: convertedCount,
      conversionRate,
      revenue: revenueRange,
      willing: sessionsInRange.filter(
        (s) => s.willingness === 'WILLING' && ['PENDING', 'FOLLOW_UP', 'CONVERTED'].includes(s.status),
      ).length,
      notWilling: sessionsInRange.filter((s) => s.willingness === 'NOT_WILLING').length,
    },
    allTime: {
      counselled: sessions.length,
      surgeriesDone: sessions.filter((s) => s.status === 'COMPLETED' && s.surgeryDate).length,
      converted: allConverted.length,
      revenue: allConverted.reduce((sum, s) => sum + Number(s.finalAmount ?? 0), 0),
      patients: patients.length,
    },
  })
}

/* ----------------------------------- search -------------------------------- */

const sanitize = (q: string) => q.replace(/[,()%]/g, ' ').trim()

export async function searchGet({ q }: Ctx): Promise<Result> {
  const raw = (q.get('q') ?? '').trim()
  if (raw.length < 2) return ok({ patients: [], packages: [], sessions: [], appointments: [] })
  const like = `%${sanitize(raw)}%`

  const [patientsRes, packagesRes, sessionsRes, apptsRes] = await Promise.all([
    sb().from('Patient').select('id,name,mrn,age,gender,phone,cataractEye,pterygiumEye')
      .or(`name.ilike.${like},mrn.ilike.${like},phone.ilike.${like}`)
      .order('createdAt', { ascending: false })
      .limit(6),
    sb().from('Package').select('id,name,category,finalPrice,active')
      .or(`name.ilike.${like},category.ilike.${like}`)
      .order('name').limit(4),
    sb().from('CounselingSession').select('id,date,procedureType,eye,status,quotedAmount,patient:Patient!patientId(id,name,mrn)')
      .order('date', { ascending: false }).limit(100),
    sb().from('Appointment').select('id,date,time,procedureType,eye,status,patient:Patient!patientId(id,name,mrn)')
      .order('date', { ascending: false }).limit(100),
  ])
  const e = patientsRes.error ?? packagesRes.error ?? sessionsRes.error ?? apptsRes.error
  const dbErr = dbErrorLocal(e)
  if (dbErr) return dbErr

  const sessions = (sessionsRes.data ?? [])
    .filter((s: Row) => contains(s.patient?.name, raw) || contains(s.patient?.mrn, raw) ||
      contains(s.counselor, raw) || contains(s.procedureType, raw))
    .slice(0, 5)
  const appointments = (apptsRes.data ?? [])
    .filter((a: Row) => contains(a.patient?.name, raw) || contains(a.patient?.mrn, raw) || contains(a.procedureType, raw))
    .slice(0, 5)

  return ok({
    patients: patientsRes.data ?? [],
    packages: packagesRes.data ?? [],
    sessions,
    appointments,
  })
}

/* ------------------------------ local dbError ------------------------------ */

function dbErrorLocal(e: { code?: string; message?: string } | null): Result | null {
  if (!e) return null
  return err(e.message ?? 'Database error', 400)
}
