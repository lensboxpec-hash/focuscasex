'use client'

// ============================================================================
// Focus CaseX — Supabase handlers: auth, patients, vision, packages, lenses
// ----------------------------------------------------------------------------
// Response shapes mirror the Next.js API routes exactly, so every component
// keeps working unchanged. Writes go to the real Supabase Postgres database.
// ============================================================================

import {
  sb, ok, err, type Ctx, type Result, type Row, type SessionUser,
  numOrNull, numOrUndefined, rid, nowIso, contains, dbError, LOGIN_ALIAS,
} from './sb-client'

/* ---------------------------------- auth ---------------------------------- */

export async function handleLogin({ body }: Ctx): Promise<Result> {
  const identifier = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')
  if (!identifier || !password) return err('Email and password are required.')
  const email = identifier.includes('@')
    ? identifier
    : (LOGIN_ALIAS[identifier.toLowerCase()] ?? `${identifier}@gmail.com`)
  const { data, error } = await sb().auth.signInWithPassword({ email, password })
  if (error || !data.session?.user) {
    return err('Invalid email or password. Tip: the short clinic name (without @gmail.com) works too.', 401)
  }
  const u = data.session.user
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  return ok({
    token: data.session.access_token,
    user: {
      id: u.id,
      name: String(meta.name ?? email),
      email: String(u.email ?? email),
      role: String(meta.role ?? 'STAFF'),
    },
  })
}

export async function handleLogout(): Promise<Result> {
  await sb().auth.signOut()
  return ok({ ok: true })
}

export async function handleMe(): Promise<Result> {
  const user = await sb().auth.getSession().then(({ data }) => {
    const u = data.session?.user
    if (!u) return null
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>
    return {
      id: u.id,
      name: String(meta.name ?? u.email ?? 'Staff'),
      email: String(u.email ?? ''),
      role: String(meta.role ?? 'STAFF'),
    } satisfies SessionUser
  })
  return user ? ok({ user }) : { status: 401, body: { user: null } }
}

/* --------------------------------- patients -------------------------------- */

const PATIENT_LIST_FIELDS = ['id', 'name', 'mrn', 'age', 'gender', 'phone', 'cataractEye', 'pterygiumEye']
const PATIENT_SNAPSHOT_FIELDS = [
  'id', 'name', 'mrn', 'age', 'phone', 'referredBy', 'cataractEye',
  'k1OD', 'k2OD', 'k1OS', 'k2OS', 'axialLengthOD', 'axialLengthOS',
]

export async function patientsList({ q }: Ctx): Promise<Result> {
  const query = (q.get('q') ?? '').trim()
  const [patients, sessions, visions, appts] = await Promise.all([
    sb().from('Patient').select('*').order('createdAt', { ascending: false }),
    sb().from('CounselingSession').select('id,patientId,date,procedureType,eye,status,quotedAmount').order('date', { ascending: false }),
    sb().from('VisionRecord').select('id,patientId,date,vaOD,vaOS,iopOD,iopOS').order('date', { ascending: false }),
    sb().from('Appointment').select('id,patientId,date,time,procedureType,eye,status').order('date', { ascending: false }),
  ])
  const e = patients.error ?? sessions.error ?? visions.error ?? appts.error
  const dbErr = dbError(e)
  if (dbErr) return dbErr

  let rows: Row[] = patients.data ?? []
  if (query) {
    rows = rows.filter((p) => contains(p.name, query) || contains(p.mrn, query) || contains(p.phone, query))
  }
  const S = sessions.data ?? []
  const V = visions.data ?? []
  const A = appts.data ?? []
  const latest = (arr: Row[], pid: string) => arr.filter((x) => x.patientId === pid).slice(0, 1)
  return ok(rows.map((p) => ({
    ...p,
    sessions: latest(S, p.id),
    visionRecords: latest(V, p.id),
    appointments: latest(A, p.id),
    _count: {
      sessions: S.filter((s) => s.patientId === p.id).length,
      visionRecords: V.filter((v) => v.patientId === p.id).length,
      appointments: A.filter((a) => a.patientId === p.id).length,
    },
  })))
}

export async function patientsCreate({ body }: Ctx): Promise<Result> {
  if (!body?.name || !body?.age) return err('Name and age are required')
  const customMrn = typeof body.mrn === 'string' ? body.mrn.trim().toUpperCase().replace(/\s+/g, ' ') : ''
  if (customMrn && (customMrn.length < 2 || customMrn.length > 20))
    return err('Patient number must be 2–20 characters.')
  const { data: existing } = await sb().from('Patient').select('mrn')
  const mrns = new Set((existing ?? []).map((r: Row) => String(r.mrn)))
  if (customMrn && mrns.has(customMrn))
    return err(`Patient number ${customMrn} is already in use.`, 409)
  let mrn = customMrn
  if (!mrn) {
    let max = 0
    for (const m of mrns) {
      if (m.startsWith('PEC-')) {
        const n = parseInt(m.slice(4), 10)
        if (!isNaN(n) && n > max) max = n
      }
    }
    mrn = `PEC-${String(max + 1).padStart(4, '0')}`
    while (mrns.has(mrn)) mrn = `PEC-${String(parseInt(mrn.slice(4), 10) + 1).padStart(4, '0')}`
  }
  const now = nowIso()
  const row = {
    id: rid('pt'), mrn, name: String(body.name).toUpperCase(), age: Number(body.age),
    gender: body.gender ?? 'MALE', phone: body.phone || null, address: body.address || null,
    cataractEye: body.cataractEye ?? 'NONE', pterygiumEye: body.pterygiumEye ?? 'NONE',
    pterygiumGrade: body.pterygiumGrade ?? 'G1', diabetes: !!body.diabetes, hypertension: !!body.hypertension,
    allergies: body.allergies || null, referredBy: body.referredBy || 'DIRECT',
    k1OD: numOrNull(body.k1OD), k2OD: numOrNull(body.k2OD), k1OS: numOrNull(body.k1OS), k2OS: numOrNull(body.k2OS),
    axialLengthOD: numOrNull(body.axialLengthOD), axialLengthOS: numOrNull(body.axialLengthOS),
    aConstant: null, plannedLensId: null, chosenLensId: null, notes: body.notes || null,
    createdAt: now, updatedAt: now,
  }
  const { data, error } = await sb().from('Patient').insert(row).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr.status === 409 ? err(`Patient number ${mrn} is already in use.`, 409) : dbErr
  return ok(data, 201)
}

export async function patientDetail(id: string): Promise<Result> {
  const { data: p, error } = await sb().from('Patient').select('*').eq('id', id).maybeSingle()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  if (!p) return err('Not found', 404)
  const [sessions, visions, appts, lenses] = await Promise.all([
    sb().from('CounselingSession').select('*').eq('patientId', id).order('date', { ascending: false }),
    sb().from('VisionRecord').select('*').eq('patientId', id).order('date', { ascending: false }),
    sb().from('Appointment').select('*,patient:Patient(id,name,mrn)').eq('patientId', id).order('date', { ascending: false }),
    sb().from('LensStock').select('id,name,type,manufacturer,aConstant,powerSph,powerCyl,batchNo,quantity,minStock'),
  ])
  const e2 = sessions.error ?? visions.error ?? appts.error ?? lenses.error
  const dbErr2 = dbError(e2)
  if (dbErr2) return dbErr2
  const L = lenses.data ?? []
  const byId = (lid: unknown) => L.find((l: Row) => l.id === lid) ?? null
  return ok({
    ...p,
    visionRecords: visions.data ?? [],
    sessions: sessions.data ?? [],
    appointments: appts.data ?? [],
    plannedLens: byId(p.plannedLensId),
    chosenLens: byId(p.chosenLensId),
  })
}

export async function patientUpdate(id: string, body: any): Promise<Result> {
  const patch: Row = {}
  let mrn: string | undefined = undefined
  if (typeof body?.mrn === 'string') {
    mrn = body.mrn.trim().toUpperCase().replace(/\s+/g, ' ')
    if (mrn && (mrn.length < 2 || mrn.length > 20))
      return err('Patient number must be 2–20 characters.')
    if (mrn) {
      const { data: dup } = await sb().from('Patient').select('id').eq('mrn', mrn).neq('id', id)
      if ((dup ?? []).length) return err(`Patient number ${mrn} is already in use.`, 409)
      patch.mrn = mrn
    }
  }
  if (body?.name !== undefined) patch.name = String(body.name).toUpperCase()
  if (body?.age !== undefined) patch.age = Number(body.age)
  if (body?.gender !== undefined) patch.gender = body.gender
  for (const k of ['phone', 'address', 'referredBy', 'allergies', 'notes'] as const) {
    if (body?.[k] !== undefined) patch[k] = body[k] || null
  }
  for (const k of ['cataractEye', 'pterygiumEye', 'pterygiumGrade'] as const) {
    if (body?.[k] !== undefined) patch[k] = body[k]
  }
  if (body?.diabetes !== undefined) patch.diabetes = !!body.diabetes
  if (body?.hypertension !== undefined) patch.hypertension = !!body.hypertension
  for (const k of ['k1OD', 'k2OD', 'k1OS', 'k2OS', 'axialLengthOD', 'axialLengthOS', 'aConstant'] as const) {
    const v = numOrUndefined(body?.[k])
    if (v !== undefined) patch[k] = v
  }
  if (body?.plannedLensId !== undefined) patch.plannedLensId = body.plannedLensId || null
  if (body?.chosenLensId !== undefined) patch.chosenLensId = body.chosenLensId || null
  if (Object.keys(patch).length === 0) return err('Nothing to update')
  patch.updatedAt = nowIso()
  const { data, error } = await sb().from('Patient').update(patch).eq('id', id).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data)
}

export async function patientDelete(id: string): Promise<Result> {
  // children cascade in the database (ON DELETE CASCADE)
  const { error } = await sb().from('Patient').delete().eq('id', id)
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

/* ---------------------------------- vision --------------------------------- */

export async function visionCreate({ body }: Ctx): Promise<Result> {
  if (!body?.patientId) return err('patientId required')
  const row = {
    id: rid('vr'), patientId: String(body.patientId),
    date: body.date ? new Date(body.date).toISOString() : nowIso(),
    vaOD: body.vaOD || null, vaOS: body.vaOS || null,
    iopOD: numOrNull(body.iopOD), iopOS: numOrNull(body.iopOS),
    sphOD: numOrNull(body.sphOD), cylOD: numOrNull(body.cylOD), axisOD: numOrNull(body.axisOD),
    sphOS: numOrNull(body.sphOS), cylOS: numOrNull(body.cylOS), axisOS: numOrNull(body.axisOS),
    notes: body.notes || null,
  }
  const { data, error } = await sb().from('VisionRecord').insert(row).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data, 201)
}

export async function visionDelete(id: string): Promise<Result> {
  const { error } = await sb().from('VisionRecord').delete().eq('id', id)
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

/* -------------------------- packages (ADMIN only) -------------------------- */

export function adminGate(user: SessionUser): Result | null {
  if (user.role !== 'ADMIN') return err('Forbidden — admin access required.', 403)
  return null
}

export async function packagesList({ q }: Ctx): Promise<Result> {
  let req = sb().from('Package').select('*,items:PackageItem(*)')
  if (q.get('category')) req = req.eq('category', q.get('category') as string)
  const { data, error } = await req
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data ?? [])
}

export async function packagesCreate({ body }: Ctx): Promise<Result> {
  if (!body?.name) return err('Package name required')
  const items: any[] = Array.isArray(body.items) ? body.items : []
  const basePrice = items.reduce((s, it) => s + (Number(it.price) || 0), 0)
  const discountPct = Number(body.discountPct) || 0
  const now = nowIso()
  const row = {
    id: rid('pkg'), name: String(body.name).toUpperCase(), category: body.category ?? 'LENS',
    description: body.description || null, basePrice, discountPct,
    finalPrice: Math.round(basePrice * (1 - discountPct / 100)),
    color: body.color ?? 'yellow', active: body.active !== undefined ? !!body.active : true,
    createdAt: now, updatedAt: now,
  }
  const { data, error } = await sb().from('Package').insert(row).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  if (items.length) {
    const ins = items
      .filter((it) => it?.name && String(it.name).trim())
      .map((it) => ({
        id: rid('pi'), packageId: row.id, name: String(it.name).toUpperCase(),
        price: Number(it.price) || 0, optional: !!it.optional,
      }))
    if (ins.length) await sb().from('PackageItem').insert(ins)
  }
  return packageWithItems(row.id, 201)
}

async function packageWithItems(id: string, status = 200): Promise<Result> {
  const { data, error } = await sb().from('Package').select('*,items:PackageItem(*)').eq('id', id).maybeSingle()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data, status)
}

export async function packageUpdate(id: string, body: any): Promise<Result> {
  const patch: Row = { updatedAt: nowIso() }
  const items: any[] = Array.isArray(body?.items) ? body.items : []
  if (items.length) {
    const basePrice = items.reduce((s, it) => s + (Number(it.price) || 0), 0)
    const discountPct = Number(body.discountPct) || 0
    patch.basePrice = basePrice
    patch.discountPct = discountPct
    patch.finalPrice = Math.round(basePrice * (1 - discountPct / 100))
  } else if (body?.discountPct !== undefined) {
    const { data: cur } = await sb().from('Package').select('basePrice').eq('id', id).maybeSingle()
    const discountPct = Number(body.discountPct) || 0
    patch.discountPct = discountPct
    patch.finalPrice = Math.round(Number(cur?.basePrice ?? 0) * (1 - discountPct / 100))
  }
  if (body?.name !== undefined) patch.name = String(body.name).toUpperCase()
  if (body?.category !== undefined) patch.category = body.category
  if (body?.description !== undefined) patch.description = body.description || null
  if (body?.color !== undefined) patch.color = body.color
  if (body?.active !== undefined) patch.active = !!body.active
  const { error } = await sb().from('Package').update(patch).eq('id', id)
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  if (items.length) {
    await sb().from('PackageItem').delete().eq('packageId', id)
    const ins = items
      .filter((it) => it?.name && String(it.name).trim())
      .map((it) => ({
        id: rid('pi'), packageId: id, name: String(it.name).toUpperCase(),
        price: Number(it.price) || 0, optional: !!it.optional,
      }))
    if (ins.length) await sb().from('PackageItem').insert(ins)
  }
  return packageWithItems(id)
}

export async function packageDelete(id: string): Promise<Result> {
  const { error } = await sb().from('Package').delete().eq('id', id)
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

/* --------------------------- lens stock (ADMIN) ---------------------------- */

export async function lensesList({ q }: Ctx): Promise<Result> {
  let req = sb().from('LensStock').select('*')
  if (q.get('type')) req = req.eq('type', q.get('type') as string)
  const { data, error } = await req
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  const rows = [...(data ?? [])].sort(
    (a, b) => String(a.type).localeCompare(String(b.type)) || Number(b.powerSph) - Number(a.powerSph),
  )
  return ok(rows)
}

export async function lensCreate({ body }: Ctx): Promise<Result> {
  if (!body?.name) return err('Lens name is required')
  const row = {
    id: rid('ls'), name: String(body.name), type: body.type ?? 'MONOFOCAL',
    manufacturer: body.manufacturer || null, model: body.model || null,
    aConstant: body.aConstant !== undefined && body.aConstant !== '' ? Number(body.aConstant) : null,
    powerSph: Number(body.powerSph) || 0,
    powerCyl: body.powerCyl !== undefined && body.powerCyl !== '' ? Number(body.powerCyl) : null,
    batchNo: String(body.batchNo ?? ''),
    expiryDate: body.expiryDate ? new Date(body.expiryDate).toISOString() : null,
    quantity: Number(body.quantity) || 0, minStock: Number(body.minStock) || 0,
    notes: body.notes || null, createdAt: nowIso(), updatedAt: nowIso(),
  }
  const { data, error } = await sb().from('LensStock').insert(row).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data, 201)
}

export async function lensUpdate(id: string, body: any): Promise<Result> {
  const patch: Row = { updatedAt: nowIso() }
  for (const k of ['name', 'type', 'batchNo'] as const) if (body?.[k] !== undefined) patch[k] = body[k]
  if (body?.manufacturer !== undefined) patch.manufacturer = body.manufacturer || null
  if (body?.model !== undefined) patch.model = body.model || null
  if (body?.aConstant !== undefined) patch.aConstant = body.aConstant === '' || body.aConstant === null ? null : Number(body.aConstant)
  if (body?.powerSph !== undefined) patch.powerSph = Number(body.powerSph) || 0
  if (body?.powerCyl !== undefined) patch.powerCyl = body.powerCyl === '' || body.powerCyl === null ? null : Number(body.powerCyl)
  if (body?.expiryDate !== undefined) patch.expiryDate = body.expiryDate ? new Date(body.expiryDate).toISOString() : null
  if (body?.quantity !== undefined) patch.quantity = Number(body.quantity) || 0
  if (body?.minStock !== undefined) patch.minStock = Number(body.minStock) || 0
  if (body?.notes !== undefined) patch.notes = body.notes || null
  const { data, error } = await sb().from('LensStock').update(patch).eq('id', id).select().single()
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok(data)
}

export async function lensDelete(id: string): Promise<Result> {
  const { error } = await sb().from('LensStock').delete().eq('id', id)
  const dbErr = dbError(error)
  if (dbErr) return dbErr
  return ok({ ok: true })
}

export { PATIENT_LIST_FIELDS, PATIENT_SNAPSHOT_FIELDS }
