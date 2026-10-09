// Verify the Supabase-direct data layer exactly as the browser shim uses it:
// auth sign-in, RLS (anon locked out), patient CRUD, embeds, ilike search.
// Env: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
//      FCX_ADMIN_PASSWORD / FCX_STAFF_PASSWORD
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const ADMIN_PW = process.env.FCX_ADMIN_PASSWORD!
const STAFF_PW = process.env.FCX_STAFF_PASSWORD!
if (!URL || !KEY || !ADMIN_PW) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, FCX_ADMIN_PASSWORD')
  process.exit(1)
}

let pass = 0, fail = 0
const ok = (m: string) => { console.log(`  ✓ ${m}`); pass++ }
const bad = (m: string) => { console.log(`  ✗ ${m}`); fail++ }

const admin = createClient(URL, KEY, { auth: { persistSession: false } })

console.log('== auth ==')
const { data: aIn, error: aErr } = await admin.auth.signInWithPassword({
  email: 'preethikaeyecare@gmail.com', password: ADMIN_PW,
})
if (aErr || !aIn.session) bad(`admin sign-in: ${aErr?.message}`)
else {
  ok(`admin sign-in (${aIn.user.email}, role=${(aIn.user.user_metadata as any)?.role})`)
  const token = aIn.session.access_token
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  payload.role === 'authenticated'
    ? ok(`JWT role = authenticated (RLS policies will apply)`)
    : bad(`JWT role = ${payload.role}`)
}

console.log('== RLS: anon locked out ==')
const anon = createClient(URL, KEY, { auth: { persistSession: false } })
const { data: anonRows } = await anon.from('Patient').select('*')
anonRows?.length === 0 ? ok('anon SELECT Patient → [] (RLS filters all)') : bad(`anon SELECT → ${JSON.stringify(anonRows)?.slice(0, 80)}`)
const { error: anonIns } = await anon.from('Patient').insert({ id: 'x', mrn: 'X-1', name: 'x', age: 1, updatedAt: new Date().toISOString() })
anonIns ? ok(`anon INSERT blocked (${anonIns.message.slice(0, 40)}…)`) : bad('anon INSERT succeeded — RLS HOLE!')

console.log('== authenticated CRUD (as the shim does) ==')
const now = new Date().toISOString()
const row = {
  id: `pt_verify_${Date.now().toString(36)}`, mrn: 'PEC-9901', name: 'VERIFY SB TEST', age: 50,
  gender: 'MALE', cataractEye: 'OD', pterygiumEye: 'NONE', pterygiumGrade: 'G1',
  diabetes: false, hypertension: false, referredBy: 'DIRECT',
  k1OD: 44.25, k2OD: 43.75, axialLengthOD: 23.52, updatedAt: now, createdAt: now,
}
const ins = await admin.from('Patient').insert(row).select().single()
!ins.error ? ok(`INSERT patient ${ins.data.mrn}`) : bad(`INSERT: ${ins.error.message}`)

const dup = await admin.from('Patient').insert({ ...row, id: row.id + '2' }).select().single()
dup.error?.code === '23505' ? ok('duplicate MRN → 23505 (shim maps to 409)') : bad(`dup insert: ${JSON.stringify(dup.error)}`)

const upd = await admin.from('Patient').update({ mrn: 'PEC-9902', k2OD: 44.0, updatedAt: now }).eq('id', row.id).select().single()
!upd.error && upd.data.mrn === 'PEC-9902' ? ok('UPDATE mrn + biometry') : bad(`UPDATE: ${upd.error?.message}`)

const { data: lensRows, error: lensErr } = await admin.from('LensStock').select('*')
!lensErr && (lensRows?.length ?? 0) >= 29 ? ok(`SELECT LensStock → ${lensRows?.length} rows`) : bad(`lenses: ${lensErr?.message}`)

console.log('== embed queries (shim select strings) ==')
const { data: sessEmb, error: sessErr } = await admin.from('CounselingSession').select(
  '*,patient:Patient!patientId(id,name,mrn),recommendedPackage:Package!recommendedPackageId(*,items:PackageItem(*)),plannedLens:LensStock!plannedLensId(*),placedLens:LensStock!placedLensId(*)',
).limit(1)
!sessErr ? ok('CounselingSession embed (patient + package + 2× LensStock)') : bad(`session embed: ${sessErr.message}`)

const { data: apptEmb, error: apptErr } = await admin.from('Appointment').select(
  '*,patient:Patient!patientId(id,name,mrn,age,phone),package:Package!packageId(*,items:PackageItem(*))',
).limit(1)
!apptErr ? ok('Appointment embed (patient + package)') : bad(`appt embed: ${apptErr.message}`)

const { data: patEmb, error: patErr } = await admin.from('Patient').select(
  '*,VisionRecord(*),CounselingSession(*),Appointment(*,patient:Patient(id,name,mrn))',
).eq('id', row.id).maybeSingle()
!patErr && patEmb ? ok('Patient detail embed (vision + sessions + appointments)') : bad(`patient embed: ${patErr ? patErr.message : 'no data'}`)

const { data: orRes, error: orErr } = await admin.from('Patient').select('id,mrn')
  .or('name.ilike.%verify%,mrn.ilike.%verify%', { referencedTable: undefined })
!orErr ? ok(`ilike OR search → ${orRes?.length} hit(s)`) : bad(`or-search: ${orErr.message}`)

console.log('== staff sign-in ==')
const staff = createClient(URL, KEY, { auth: { persistSession: false } })
const { data: sIn, error: sErr } = await staff.auth.signInWithPassword({
  email: 'eyecarepreethika@gmail.com', password: STAFF_PW,
})
!sErr && (sIn.user?.user_metadata as any)?.role === 'STAFF' ? ok('staff sign-in (role=STAFF → shim gates lenses/packages)') : bad(`staff: ${sErr?.message}`)

console.log('== cleanup ==')
const del = await admin.from('Patient').delete().eq('id', row.id)
!del.error ? ok('DELETE verify patient') : bad(`DELETE: ${del.error.message}`)
const { data: after } = await admin.from('Patient').select('id')
after?.length === 0 ? ok('registry back to 0 (real-data-only)') : bad(`leftover rows: ${after?.length}`)

console.log(`== RESULT: ${pass} passed, ${fail} failed ==`)
process.exit(fail ? 1 : 0)
