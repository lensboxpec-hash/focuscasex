// ============================================================================
// Focus CaseX — browser demo backend (GitHub Pages deployment)
// ----------------------------------------------------------------------------
// GitHub Pages serves static files only, so when the app is exported with
// NEXT_PUBLIC_DEMO_MODE=1 this module patches window.fetch and answers every
// /api/* call from a localStorage-backed database seeded with realistic
// synthetic data (NO real patient records — privacy by design).
//
// The rest of the app is untouched: components keep calling fetch('/api/…')
// exactly as they do against the real Next.js server.
//
// Reset the demo dataset from the browser console:  __FCX_DEMO_RESET__()
// ============================================================================

import { DEMO_LENS_CATALOG } from './demo-lens-catalog'

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const DB_KEY = 'fcx_demo_db_v1'
const AUTH_KEY = 'fcx_demo_auth'

/* ------------------------------ tiny helpers ------------------------------ */

type Row = Record<string, unknown>

type DemoDB = {
  seededAt: string
  patients: Row[]
  visionRecords: Row[]
  packages: Row[]
  packageItems: Row[]
  sessions: Row[]
  appointments: Row[]
  lenses: Row[]
}

const rid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const pad2 = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => d.toISOString()
const dateOnly = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// local-midnight day at offset days from today
function day(offset: number, hour = 10, minute = 0) {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset, hour, minute, 0, 0)
}

const numOrNull = (v: unknown) =>
  v === null || v === undefined || v === '' ? null : Number(v)

const numOrUndefined = (v: unknown) =>
  v === undefined ? undefined : v === null || v === '' ? null : Number(v)

/* --------------------------------- seed ----------------------------------- */

function seedDB(): DemoDB {
  const nowIso = iso(new Date())

  const patients: Row[] = [
    { id: 'pt1', mrn: 'PEC-0101', name: 'MUTHULAKSHMI R', age: 68, gender: 'FEMALE', phone: '9842311201', address: '14, Kamarajar Salai, Madurai', cataractEye: 'OD', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: true, hypertension: false, allergies: null, referredBy: 'CAMP', k1OD: 44.75, k2OD: 45.5, k1OS: 44.25, k2OS: 45.0, axialLengthOD: 23.12, axialLengthOS: 23.2, aConstant: 118, plannedLensId: 'lens_naspro', chosenLensId: null, notes: 'Grade II nuclear sclerosis OD.', createdAt: iso(day(-38, 9)) },
    { id: 'pt2', mrn: 'PEC-0102', name: 'KARTHIKEYAN S', age: 61, gender: 'MALE', phone: '9443122045', address: '5B, Anna Nagar, Madurai', cataractEye: 'OU', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: false, hypertension: true, allergies: null, referredBy: 'DR.RAJAN', k1OD: 43.25, k2OD: 44.0, k1OS: 43.5, k2OS: 44.25, axialLengthOD: 22.78, axialLengthOS: 22.84, aConstant: 118.7, plannedLensId: 'lens_alcon_iq', chosenLensId: null, notes: null, createdAt: iso(day(-31, 11)) },
    { id: 'pt3', mrn: 'PEC-0103', name: 'MEENAKSHI AMMAL', age: 74, gender: 'FEMALE', phone: '9865733012', address: 'Thirunagar 4th St', cataractEye: 'OS', pterygiumEye: 'OD', pterygiumGrade: 'G2', diabetes: true, hypertension: false, allergies: 'Sulfa drugs', referredBy: 'DIRECT', k1OD: null, k2OD: null, k1OS: 45.0, k2OS: 45.75, axialLengthOD: null, axialLengthOS: 23.4, aConstant: null, plannedLensId: null, chosenLensId: null, notes: 'Nasal pterygium OD — recurrent rubbing.', createdAt: iso(day(-26, 15)) },
    { id: 'pt4', mrn: 'PEC-0104', name: 'SUNDARAM P', age: 57, gender: 'MALE', phone: '9751799841', address: 'Sellur, Madurai', cataractEye: 'NONE', pterygiumEye: 'OU', pterygiumGrade: 'G1', diabetes: false, hypertension: false, allergies: null, referredBy: 'OPTOMETRIST', k1OD: 43.75, k2OD: 44.25, k1OS: 43.5, k2OS: 44.0, axialLengthOD: 23.55, axialLengthOS: 23.61, aConstant: null, plannedLensId: null, chosenLensId: null, notes: 'Outdoor worker — UV advice given.', createdAt: iso(day(-22, 10)) },
    { id: 'pt5', mrn: 'PEC-0105', name: 'LAKSHMI PRASANNA', age: 45, gender: 'FEMALE', phone: '9600234517', address: 'KK Nagar, Madurai', cataractEye: 'OD', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: false, hypertension: false, allergies: null, referredBy: 'DIRECT', k1OD: 42.75, k2OD: 43.5, k1OS: 42.75, k2OS: 43.5, axialLengthOD: 24.62, axialLengthOS: 24.7, aConstant: null, plannedLensId: null, chosenLensId: null, notes: 'Early PSC OD — monitor.', createdAt: iso(day(-18, 12)) },
    { id: 'pt6', mrn: 'PEC-0106', name: 'BALAMURUGAN K', age: 66, gender: 'MALE', phone: '9842177650', address: 'Anaiyur, Madurai', cataractEye: 'OS', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: true, hypertension: true, allergies: null, referredBy: 'DR.RAJAN', k1OD: 44.0, k2OD: 44.75, k1OS: 44.5, k2OS: 45.25, axialLengthOD: 22.95, axialLengthOS: 22.9, aConstant: 119.1, plannedLensId: 'lens_supraphob', chosenLensId: null, notes: 'On metformin 500 BD. Get FBS before surgery.', createdAt: iso(day(-16, 9)) },
    { id: 'pt7', mrn: 'PEC-0107', name: 'ANITHA RANI', age: 39, gender: 'FEMALE', phone: '9884766210', address: 'Villapuram, Madurai', cataractEye: 'NONE', pterygiumEye: 'OD', pterygiumGrade: 'G3', diabetes: false, hypertension: false, allergies: null, referredBy: 'DIRECT', k1OD: 43.25, k2OD: 44.5, k1OS: 43.0, k2OS: 43.75, axialLengthOD: 23.85, axialLengthOS: 23.9, aConstant: null, plannedLensId: null, chosenLensId: null, notes: 'Fleshy G3 pterygium OD — cosmetic concern.', createdAt: iso(day(-12, 16)) },
    { id: 'pt8', mrn: 'PEC-0108', name: 'VELMURUGAN T', age: 71, gender: 'MALE', phone: '9994255318', address: 'Melur, Madurai', cataractEye: 'OU', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: false, hypertension: false, allergies: null, referredBy: 'CAMP', k1OD: 42.0, k2OD: 42.75, k1OS: 42.0, k2OS: 42.5, axialLengthOD: 25.6, axialLengthOS: 25.71, aConstant: 118.7, plannedLensId: 'lens_alcon_iq', chosenLensId: 'lens_naspro', notes: 'Axial myope — counselled on refractive outcome.', createdAt: iso(day(-9, 10)) },
    { id: 'pt9', mrn: 'PEC-0109', name: 'REVATHI DEVI', age: 52, gender: 'FEMALE', phone: '9443488207', address: 'Tallakulam, Madurai', cataractEye: 'OD', pterygiumEye: 'OS', pterygiumGrade: 'G1', diabetes: true, hypertension: false, allergies: null, referredBy: 'CAMP', k1OD: 44.25, k2OD: 45.0, k1OS: 44.0, k2OS: 44.75, axialLengthOD: 23.3, axialLengthOS: 23.28, aConstant: null, plannedLensId: null, chosenLensId: null, notes: null, createdAt: iso(day(-5, 14)) },
    { id: 'pt10', mrn: 'PEC-0110', name: 'SUBRAMANI V', age: 79, gender: 'MALE', phone: '9159234068', address: 'Usilampatti', cataractEye: 'OU', pterygiumEye: 'NONE', pterygiumGrade: 'G1', diabetes: false, hypertension: true, allergies: null, referredBy: 'DR.RAJAN', k1OD: 43.75, k2OD: 44.5, k1OS: 43.5, k2OS: 44.25, axialLengthOD: 23.05, axialLengthOS: 23.0, aConstant: 118, plannedLensId: 'lens_naspro', chosenLensId: null, notes: 'Mature cataract OU — son accompanying for counseling.', createdAt: iso(day(-2, 11)) },
  ]

  const visionRecords: Row[] = [
    { id: 'vr1', patientId: 'pt1', date: iso(day(-30, 9)), vaOD: '6/36', vaOS: '6/6', iopOD: 14, iopOS: 15, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: 'Immature cataract OD' },
    { id: 'vr2', patientId: 'pt1', date: iso(day(-10, 9)), vaOD: '6/24', vaOS: '6/6', iopOD: 15, iopOS: 14, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: 'Slight progression' },
    { id: 'vr3', patientId: 'pt2', date: iso(day(-28, 11)), vaOD: '6/60', vaOS: '6/18', iopOD: 16, iopOS: 15, sphOD: -0.5, cylOD: -1.0, axisOD: 90, sphOS: -0.25, cylOS: -0.75, axisOS: 85, notes: null },
    { id: 'vr4', patientId: 'pt3', date: iso(day(-24, 15)), vaOD: '6/9', vaOS: '6/36', iopOD: 13, iopOS: 14, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: 'Pterygium OD encroaching limbus' },
    { id: 'vr5', patientId: 'pt4', date: iso(day(-21, 10)), vaOD: '6/6', vaOS: '6/6', iopOD: 12, iopOS: 13, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: null },
    { id: 'vr6', patientId: 'pt5', date: iso(day(-17, 12)), vaOD: '6/9', vaOS: '6/6', iopOD: 14, iopOS: 14, sphOD: -0.75, cylOD: -0.5, axisOD: 180, sphOS: -0.5, cylOS: null, axisOS: null, notes: null },
    { id: 'vr7', patientId: 'pt6', date: iso(day(-15, 9)), vaOD: '6/9', vaOS: '6/36', iopOD: 17, iopOS: 16, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: 'NS III OS' },
    { id: 'vr8', patientId: 'pt7', date: iso(day(-11, 16)), vaOD: '6/6', vaOS: '6/6', iopOD: 13, iopOS: 12, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: '1.5mm from limbus OD' },
    { id: 'vr9', patientId: 'pt8', date: iso(day(-8, 10)), vaOD: '6/36', vaOS: '6/24', iopOD: 15, iopOS: 15, sphOD: -6.0, cylOD: -1.5, axisOD: 10, sphOS: -5.5, cylOS: -1.25, axisOS: 5, notes: 'High myope' },
    { id: 'vr10', patientId: 'pt9', date: iso(day(-4, 14)), vaOD: '6/12', vaOS: '6/9', iopOD: 14, iopOS: 13, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: null },
    { id: 'vr11', patientId: 'pt10', date: iso(day(-2, 11)), vaOD: 'HM+', vaOS: 'CF', iopOD: 18, iopOS: 17, sphOD: null, cylOD: null, axisOD: null, sphOS: null, cylOS: null, axisOS: null, notes: 'Mature OU — B-scan normal both eyes' },
  ]

  const packages: Row[] = [
    { id: 'pkg1', name: 'CATARACT · MONOFOCAL STANDARD', category: 'COMBO', description: 'Monofocal IOL cataract surgery, single eye', basePrice: 17000, discountPct: 0, finalPrice: 17000, color: 'yellow', active: true, createdAt: iso(day(-45, 9)), updatedAt: nowIso },
    { id: 'pkg2', name: 'CATARACT · MULTIFOCAL PREMIUM', category: 'COMBO', description: 'Premium multifocal IOL, single eye', basePrice: 65000, discountPct: 0, finalPrice: 65000, color: 'green', active: true, createdAt: iso(day(-45, 9, 30)), updatedAt: nowIso },
    { id: 'pkg3', name: 'CATARACT · TORIC (ASTIGMATISM)', category: 'COMBO', description: 'Toric IOL with corneal marking, single eye', basePrice: 42000, discountPct: 0, finalPrice: 42000, color: 'cyan', active: true, createdAt: iso(day(-45, 10)), updatedAt: nowIso },
    { id: 'pkg4', name: 'PTERYGIUM EXCISION + GRAFT', category: 'SURGERY', description: 'Conjunctival autograft, single eye', basePrice: 12000, discountPct: 0, finalPrice: 12000, color: 'orange', active: true, createdAt: iso(day(-44, 10)), updatedAt: nowIso },
    { id: 'pkg5', name: 'YAG LASER CAPSULOTOMY', category: 'LASER', description: 'Posterior capsulotomy, single eye', basePrice: 4500, discountPct: 0, finalPrice: 4500, color: 'red', active: true, createdAt: iso(day(-44, 10, 30)), updatedAt: nowIso },
    { id: 'pkg6', name: 'BILATERAL MONOFOCAL COMBO', category: 'COMBO', description: 'Both-eyes monofocal package with follow-ups', basePrice: 32000, discountPct: 6, finalPrice: 30080, color: 'yellow', active: true, createdAt: iso(day(-43, 11)), updatedAt: nowIso },
  ]
  const pkgItem = (id: string, packageId: string, name: string, price: number, optional = false) => ({ id, packageId, name, price, optional })
  const packageItems: Row[] = [
    pkgItem('pi1', 'pkg1', 'SURGEON FEE', 8000), pkgItem('pi2', 'pkg1', 'OT & CONSUMABLES', 4500), pkgItem('pi3', 'pkg1', 'NASPRO MONOFOCAL IOL', 3500), pkgItem('pi4', 'pkg1', 'POST-OP MEDICATIONS', 1000),
    pkgItem('pi5', 'pkg2', 'SURGEON FEE', 10000), pkgItem('pi6', 'pkg2', 'OT & CONSUMABLES', 5000), pkgItem('pi7', 'pkg2', 'MULTIFOCAL IOL (PANOPTIX/OPTIFLEX)', 48000), pkgItem('pi8', 'pkg2', 'POST-OP MEDICATIONS', 2000),
    pkgItem('pi9', 'pkg3', 'SURGEON FEE', 10000), pkgItem('pi10', 'pkg3', 'OT & CONSUMABLES', 5000), pkgItem('pi11', 'pkg3', 'TORIC IOL', 26000), pkgItem('pi12', 'pkg3', 'TORIC MARKING & ALIGNMENT', 1000),
    pkgItem('pi13', 'pkg4', 'SURGEON FEE', 6000), pkgItem('pi14', 'pkg4', 'OT & CONSUMABLES', 3000), pkgItem('pi15', 'pkg4', 'GRAFT & SUTURES', 2500), pkgItem('pi16', 'pkg4', 'POST-OP MEDICATIONS', 500),
    pkgItem('pi17', 'pkg5', 'LASER PROCEDURE', 4000), pkgItem('pi18', 'pkg5', 'FOLLOW-UP VISIT', 500),
    pkgItem('pi19', 'pkg6', 'BILATERAL SURGEON FEE', 16000), pkgItem('pi20', 'pkg6', '2 × NASPRO IOL', 7000), pkgItem('pi21', 'pkg6', 'OT & CONSUMABLES (BOTH EYES)', 9000, true),
  ]

  const lenses: Row[] = [
    ...DEMO_LENS_CATALOG.map((l, i) => ({
      id: l.id, name: l.name, type: l.type, manufacturer: l.manufacturer, model: l.model,
      aConstant: l.aConstant, powerSph: 0, powerCyl: null, batchNo: '', expiryDate: null,
      quantity: 0, minStock: 0, notes: null, createdAt: iso(day(-60, 9, i)), updatedAt: nowIso,
    })),
    { id: 'ls1', name: 'NASPRO', type: 'MONOFOCAL', manufacturer: 'APPASAMY', model: null, aConstant: 118, powerSph: 21.5, powerCyl: null, batchNo: 'PEC-B2411', expiryDate: '2027-06-30T00:00:00.000Z', quantity: 6, minStock: 2, notes: null, createdAt: iso(day(-40, 10)), updatedAt: nowIso },
    { id: 'ls2', name: 'NASPRO', type: 'MONOFOCAL', manufacturer: 'APPASAMY', model: null, aConstant: 118, powerSph: 22.5, powerCyl: null, batchNo: 'PEC-B2412', expiryDate: '2027-06-30T00:00:00.000Z', quantity: 4, minStock: 2, notes: null, createdAt: iso(day(-40, 10, 5)), updatedAt: nowIso },
    { id: 'ls3', name: 'SUPRAPHOB', type: 'MONOFOCAL', manufacturer: 'APPASAMY', model: null, aConstant: 119.1, powerSph: 23.0, powerCyl: null, batchNo: 'SPH-0233', expiryDate: '2027-09-30T00:00:00.000Z', quantity: 3, minStock: 2, notes: null, createdAt: iso(day(-40, 10, 10)), updatedAt: nowIso },
    { id: 'ls4', name: 'ALCON IQ', type: 'MONOFOCAL', manufacturer: 'ALCON', model: null, aConstant: 118.7, powerSph: 22.0, powerCyl: null, batchNo: 'IQ-88451', expiryDate: '2028-01-31T00:00:00.000Z', quantity: 2, minStock: 2, notes: null, createdAt: iso(day(-40, 10, 15)), updatedAt: nowIso },
    { id: 'ls5', name: 'PANOPTIX', type: 'TRIFOCAL', manufacturer: 'ALCON', model: null, aConstant: 118.7, powerSph: 25.0, powerCyl: null, batchNo: 'PX-5521', expiryDate: '2027-12-31T00:00:00.000Z', quantity: 1, minStock: 1, notes: null, createdAt: iso(day(-40, 10, 20)), updatedAt: nowIso },
    { id: 'ls6', name: 'SUPRAPHOB TORIC', type: 'TORIC', manufacturer: 'APPASAMY', model: null, aConstant: 119.1, powerSph: 24.0, powerCyl: 1.5, batchNo: 'SPT-114', expiryDate: '2027-08-31T00:00:00.000Z', quantity: 3, minStock: 2, notes: null, createdAt: iso(day(-40, 10, 25)), updatedAt: nowIso },
    { id: 'ls7', name: 'CLAREON', type: 'MONOFOCAL', manufacturer: 'ALCON', model: null, aConstant: 118.8, powerSph: 21.0, powerCyl: null, batchNo: 'CL-7712', expiryDate: '2028-03-31T00:00:00.000Z', quantity: 2, minStock: 2, notes: null, createdAt: iso(day(-40, 10, 30)), updatedAt: nowIso },
    { id: 'ls8', name: 'EYECRYL ACTIV', type: 'MONOFOCAL', manufacturer: 'BIOTECH', model: null, aConstant: 118, powerSph: 23.5, powerCyl: null, batchNo: 'EA-3312', expiryDate: '2027-05-31T00:00:00.000Z', quantity: 1, minStock: 2, notes: 'Low stock — reorder', createdAt: iso(day(-40, 10, 35)), updatedAt: nowIso },
  ]

  const sessions: Row[] = [
    { id: 'ses1', patientId: 'pt1', date: iso(day(-20, 10)), counselor: 'PRIYA', procedureType: 'CATARACT', eye: 'OD', recommendedPackageId: 'pkg1', quotedAmount: 17000, finalAmount: 17000, paidAmount: 17000, paymentMode: 'UPI', status: 'COMPLETED', willingness: 'WILLING', surgeryDate: iso(day(-12, 8, 30)), workupDone: true, plannedLensId: 'ls2', placedLensId: 'ls2', bp: '128/82', bs: 142, axialLength: 23.12, k1: 44.75, k2: 45.5, iolPower: 21.5, notes: 'Uneventful phaco. Post-op day 1 VA 6/9.', followUpDate: null, createdAt: iso(day(-20, 10)), updatedAt: nowIso },
    { id: 'ses2', patientId: 'pt2', date: iso(day(-9, 11)), counselor: 'DR.PREETHIKA', procedureType: 'CATARACT', eye: 'OU', recommendedPackageId: 'pkg6', quotedAmount: 32000, finalAmount: 32000, paidAmount: 10000, paymentMode: 'CASH', status: 'CONVERTED', willingness: 'WILLING', surgeryDate: iso(day(3, 9, 0)), workupDone: true, plannedLensId: 'ls4', placedLensId: null, bp: '134/86', bs: null, axialLength: 22.78, k1: 43.25, k2: 44.0, iolPower: 22.0, notes: 'Advance ₹10,000 received. Both-eyes combo package.', followUpDate: null, createdAt: iso(day(-9, 11)), updatedAt: nowIso },
    { id: 'ses3', patientId: 'pt3', date: iso(day(-7, 12)), counselor: 'PRIYA', procedureType: 'CATARACT', eye: 'OS', recommendedPackageId: 'pkg1', quotedAmount: 17000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'FOLLOW_UP', willingness: 'THINKING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: '126/80', bs: 138, axialLength: 23.4, k1: 45.0, k2: 45.75, iolPower: null, notes: 'Discussed premium options — to confirm with family.', followUpDate: iso(day(2, 11)), createdAt: iso(day(-7, 12)), updatedAt: nowIso },
    { id: 'ses4', patientId: 'pt3', date: iso(day(-2, 15)), counselor: 'FRONT DESK', procedureType: 'PTERYGIUM', eye: 'OD', recommendedPackageId: 'pkg4', quotedAmount: 12000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'PENDING', willingness: 'THINKING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: null, bs: null, axialLength: null, k1: null, k2: null, iolPower: null, notes: null, followUpDate: null, createdAt: iso(day(-2, 15)), updatedAt: nowIso },
    { id: 'ses5', patientId: 'pt4', date: iso(day(-14, 10)), counselor: 'PRIYA', procedureType: 'PTERYGIUM', eye: 'OU', recommendedPackageId: 'pkg4', quotedAmount: 24000, finalAmount: 24000, paidAmount: 5000, paymentMode: 'UPI', status: 'CONVERTED', willingness: 'WILLING', surgeryDate: iso(day(5, 9, 0)), workupDone: true, plannedLensId: null, placedLensId: null, bp: '122/78', bs: null, axialLength: null, k1: null, k2: null, iolPower: null, notes: 'OD first, OS after 2 weeks.', followUpDate: null, createdAt: iso(day(-14, 10)), updatedAt: nowIso },
    { id: 'ses6', patientId: 'pt5', date: iso(day(-5, 11)), counselor: 'FRONT DESK', procedureType: 'CATARACT', eye: 'OD', recommendedPackageId: 'pkg1', quotedAmount: 17000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'FOLLOW_UP', willingness: 'WILLING', surgeryDate: null, workupDone: true, plannedLensId: null, placedLensId: null, bp: '118/76', bs: null, axialLength: 24.62, k1: 42.75, k2: 43.5, iolPower: 19.5, notes: 'Workup done. Wants surgery next month (school holidays).', followUpDate: iso(day(1, 10)), createdAt: iso(day(-5, 11)), updatedAt: nowIso },
    { id: 'ses7', patientId: 'pt6', date: iso(day(-15, 9)), counselor: 'DR.PREETHIKA', procedureType: 'CATARACT', eye: 'OS', recommendedPackageId: 'pkg1', quotedAmount: 17000, finalAmount: 17000, paidAmount: 17000, paymentMode: 'CASH', status: 'COMPLETED', willingness: 'WILLING', surgeryDate: iso(day(-5, 8, 30)), workupDone: true, plannedLensId: 'ls3', placedLensId: 'ls3', bp: '136/84', bs: 156, axialLength: 22.9, k1: 44.5, k2: 45.25, iolPower: 23.0, notes: 'Sugar controlled pre-op. No complications.', followUpDate: null, createdAt: iso(day(-15, 9)), updatedAt: nowIso },
    { id: 'ses8', patientId: 'pt7', date: iso(day(-1, 16)), counselor: 'PRIYA', procedureType: 'PTERYGIUM', eye: 'OD', recommendedPackageId: 'pkg4', quotedAmount: 12000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'PENDING', willingness: 'THINKING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: null, bs: null, axialLength: null, k1: null, k2: null, iolPower: null, notes: 'Asked about recurrence rate after graft.', followUpDate: null, createdAt: iso(day(-1, 16)), updatedAt: nowIso },
    { id: 'ses9', patientId: 'pt8', date: iso(day(-11, 10)), counselor: 'PRIYA', procedureType: 'CATARACT', eye: 'OU', recommendedPackageId: 'pkg2', quotedAmount: 65000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'LOST', willingness: 'NOT_WILLING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: null, bs: null, axialLength: null, k1: null, k2: null, iolPower: null, notes: 'Cost concern — will revisit after harvest season.', followUpDate: null, createdAt: iso(day(-11, 10)), updatedAt: nowIso },
    { id: 'ses10', patientId: 'pt8', date: iso(day(-3, 11)), counselor: 'DR.PREETHIKA', procedureType: 'CATARACT', eye: 'OU', recommendedPackageId: 'pkg6', quotedAmount: 30080, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'FOLLOW_UP', willingness: 'WILLING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: '130/82', bs: null, axialLength: 25.6, k1: 42.0, k2: 42.75, iolPower: 15.0, notes: 'Offered bilateral combo — much more receptive.', followUpDate: iso(day(4, 12)), createdAt: iso(day(-3, 11)), updatedAt: nowIso },
    { id: 'ses11', patientId: 'pt9', date: iso(day(-1, 14)), counselor: 'FRONT DESK', procedureType: 'CATARACT', eye: 'OD', recommendedPackageId: 'pkg1', quotedAmount: 17000, finalAmount: 0, paidAmount: 0, paymentMode: null, status: 'PENDING', willingness: 'THINKING', surgeryDate: null, workupDone: false, plannedLensId: null, placedLensId: null, bp: null, bs: null, axialLength: null, k1: null, k2: null, iolPower: null, notes: null, followUpDate: null, createdAt: iso(day(-1, 14)), updatedAt: nowIso },
    { id: 'ses12', patientId: 'pt10', date: iso(day(-6, 10)), counselor: 'PRIYA', procedureType: 'CATARACT', eye: 'OU', recommendedPackageId: 'pkg1', quotedAmount: 34000, finalAmount: 34000, paidAmount: 8000, paymentMode: 'CASH', status: 'CONVERTED', willingness: 'WILLING', surgeryDate: iso(day(1, 8, 30)), workupDone: true, plannedLensId: 'ls1', placedLensId: null, bp: '142/88', bs: null, axialLength: 23.05, k1: 43.75, k2: 44.5, iolPower: 21.5, notes: 'Son coordinating. BP review on surgery day.', followUpDate: null, createdAt: iso(day(-6, 10)), updatedAt: nowIso },
  ]

  const appointments: Row[] = [
    { id: 'appt1', patientId: 'pt1', date: iso(day(-2, 9)), time: '09:00', duration: 15, procedureType: 'POST_OP', eye: 'OD', packageId: null, status: 'COMPLETED', notes: 'Post-op day 10 — VA 6/9', createdAt: iso(day(-12, 9)), updatedAt: nowIso },
    { id: 'appt2', patientId: 'pt2', date: iso(day(3, 9, 30)), time: '09:30', duration: 60, procedureType: 'CATARACT_SURGERY', eye: 'OU', packageId: 'pkg6', status: 'CONFIRMED', notes: 'Both eyes — first OD', createdAt: iso(day(-9, 11)), updatedAt: nowIso },
    { id: 'appt3', patientId: 'pt10', date: iso(day(1, 8, 30)), time: '08:30', duration: 60, procedureType: 'CATARACT_SURGERY', eye: 'OU', packageId: 'pkg1', status: 'SCHEDULED', notes: null, createdAt: iso(day(-6, 10)), updatedAt: nowIso },
    { id: 'appt4', patientId: 'pt5', date: iso(day(0, 10)), time: '10:00', duration: 30, procedureType: 'CONSULTATION', eye: 'OD', packageId: null, status: 'SCHEDULED', notes: null, createdAt: iso(day(-3, 10)), updatedAt: nowIso },
    { id: 'appt5', patientId: 'pt3', date: iso(day(2, 11)), time: '11:00', duration: 30, procedureType: 'FOLLOW_UP', eye: 'OS', packageId: null, status: 'CONFIRMED', notes: 'Family decision on package', createdAt: iso(day(-7, 12)), updatedAt: nowIso },
    { id: 'appt6', patientId: 'pt4', date: iso(day(5, 9)), time: '09:00', duration: 45, procedureType: 'PTERYGIUM_SURGERY', eye: 'OD', packageId: 'pkg4', status: 'SCHEDULED', notes: null, createdAt: iso(day(-14, 10)), updatedAt: nowIso },
    { id: 'appt7', patientId: 'pt7', date: iso(day(0, 9, 15)), time: '09:15', duration: 30, procedureType: 'CONSULTATION', eye: 'OD', packageId: null, status: 'SCHEDULED', notes: null, createdAt: iso(day(-1, 16)), updatedAt: nowIso },
    { id: 'appt8', patientId: 'pt9', date: iso(day(0, 12, 30)), time: '12:30', duration: 30, procedureType: 'CONSULTATION', eye: 'OD', packageId: null, status: 'SCHEDULED', notes: null, createdAt: iso(day(-1, 14)), updatedAt: nowIso },
    { id: 'appt9', patientId: 'pt6', date: iso(day(-4, 10, 15)), time: '10:15', duration: 15, procedureType: 'POST_OP', eye: 'OS', packageId: null, status: 'COMPLETED', notes: 'Doing well', createdAt: iso(day(-5, 9)), updatedAt: nowIso },
    { id: 'appt10', patientId: 'pt8', date: iso(day(6, 10, 45)), time: '10:45', duration: 30, procedureType: 'CONSULTATION', eye: 'OU', packageId: null, status: 'SCHEDULED', notes: 'Combo package discussion', createdAt: iso(day(-3, 11)), updatedAt: nowIso },
    { id: 'appt11', patientId: 'pt2', date: iso(day(-1, 11, 30)), time: '11:30', duration: 30, procedureType: 'LASER', eye: 'OU', packageId: null, status: 'COMPLETED', notes: 'Pre-op YAG not needed — cancelled, kept as visit', createdAt: iso(day(-2, 11)), updatedAt: nowIso },
    { id: 'appt12', patientId: 'pt1', date: iso(day(7, 14)), time: '14:00', duration: 30, procedureType: 'RETINA_EVAL', eye: 'OD', packageId: null, status: 'SCHEDULED', notes: 'Routine macular check', createdAt: iso(day(-2, 9)), updatedAt: nowIso },
  ]

  return { seededAt: nowIso, patients, visionRecords, packages, packageItems, sessions, appointments, lenses }
}

/* ------------------------------ storage layer ------------------------------ */

let cache: DemoDB | null = null

function db(): DemoDB {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      cache = JSON.parse(raw) as DemoDB
      return cache
    }
  } catch {
    /* corrupted store — reseed below */
  }
  cache = seedDB()
  persist()
  return cache
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch {
    /* storage full/blocked — demo keeps working in-memory */
  }
}

const isAuthed = () => {
  try {
    return localStorage.getItem(AUTH_KEY) === '1'
  } catch {
    return false
  }
}

const DEMO_USER = {
  id: 'demo_user',
  name: 'Dr. Preethika',
  email: 'demo@preethikaeyecare.in',
  role: 'ADMIN',
}

/* ------------------------------ entity lookups ----------------------------- */

const byId = (rows: Row[], id: string) => rows.find((r) => r.id === id) ?? null

function pkgWithItems(dbv: DemoDB, id: string | null): Row | null {
  if (!id) return null
  const p = byId(dbv.packages, id)
  if (!p) return null
  return { ...p, items: dbv.packageItems.filter((i) => i.packageId === id) }
}

function patientSelect(dbv: DemoDB, id: string, fields: string[]): Row | null {
  const p = byId(dbv.patients, id)
  if (!p) return null
  const out: Row = {}
  for (const f of fields) out[f] = p[f] ?? null
  return out
}

function sessionOut(dbv: DemoDB, s: Row, withPatient: 'list' | 'full' | 'none' = 'full'): Row {
  const out: Row = { ...s }
  if (withPatient === 'full') {
    out.patient = patientSelect(dbv, s.patientId as string, [
      'id', 'name', 'mrn', 'age', 'phone', 'referredBy', 'cataractEye',
      'k1OD', 'k2OD', 'k1OS', 'k2OS', 'axialLengthOD', 'axialLengthOS',
    ])
  } else if (withPatient === 'list') {
    out.patient = patientSelect(dbv, s.patientId as string, ['id', 'name', 'mrn'])
  }
  out.recommendedPackage = pkgWithItems(dbv, s.recommendedPackageId as string | null)
  out.plannedLens = byId(dbv.lenses, s.plannedLensId as string | null)
  out.placedLens = byId(dbv.lenses, s.placedLensId as string | null)
  return out
}

function appointmentOut(dbv: DemoDB, a: Row, withPatient: 'full' | 'list' = 'full'): Row {
  const out: Row = { ...a }
  out.patient = patientSelect(
    dbv, a.patientId as string,
    withPatient === 'full' ? ['id', 'name', 'mrn', 'age', 'phone'] : ['id', 'name', 'mrn'],
  )
  out.package = pkgWithItems(dbv, a.packageId as string | null)
  return out
}

function patientListItem(dbv: DemoDB, p: Row): Row {
  const sessions = dbv.sessions
    .filter((s) => s.patientId === p.id)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 1)
  const visionRecords = dbv.visionRecords
    .filter((v) => v.patientId === p.id)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 1)
  const appointments = dbv.appointments
    .filter((a) => a.patientId === p.id)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 1)
  return {
    ...p,
    sessions,
    visionRecords,
    appointments,
    _count: {
      sessions: dbv.sessions.filter((s) => s.patientId === p.id).length,
      visionRecords: dbv.visionRecords.filter((v) => v.patientId === p.id).length,
      appointments: dbv.appointments.filter((a) => a.patientId === p.id).length,
    },
  }
}

function nextMrn(dbv: DemoDB): string {
  let max = 0
  for (const p of dbv.patients) {
    const mrn = String(p.mrn ?? '')
    if (mrn.startsWith('PEC-')) {
      const n = parseInt(mrn.slice(4), 10)
      if (!isNaN(n) && n > max) max = n
    }
  }
  return `PEC-${String(max + 1).padStart(4, '0')}`
}

const inRange = (d: string, from?: Date | null, to?: Date | null) => {
  const t = new Date(d).getTime()
  if (from && t < from.getTime()) return false
  if (to && t > to.getTime()) return false
  return true
}

const contains = (v: unknown, q: string) =>
  String(v ?? '').toLowerCase().includes(q.toLowerCase())

/* --------------------------------- stats ----------------------------------- */

function computeStats(dbv: DemoDB, preset: string, fromQ: string | null, toQ: string | null): Row {
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

  const sessionsInRange = dbv.sessions.filter((s) => inRange(s.date as string, from, to))
  const convertedRange = sessionsInRange.filter((s) => s.status === 'CONVERTED' || s.status === 'COMPLETED')
  const revenueRange = convertedRange.reduce((sum, s) => sum + Number(s.finalAmount ?? 0), 0)
  const sessionsRange = sessionsInRange.length
  const convertedCount = convertedRange.length
  const conversionRate = sessionsRange === 0 ? 0 : Math.round((convertedCount / sessionsRange) * 100)

  const moneyRows = dbv.sessions.filter((s) => s.status !== 'LOST')
  const collectedTotal = moneyRows.reduce((sum, s) => sum + Number(s.paidAmount ?? 0), 0)
  const outstanding = moneyRows.reduce((sum, s) => {
    const billed = Number(s.finalAmount) > 0 ? Number(s.finalAmount) : Number(s.quotedAmount)
    return sum + Math.max(0, billed - Number(s.paidAmount ?? 0))
  }, 0)
  const pipelineValue = dbv.sessions
    .filter((s) => s.status === 'PENDING' || s.status === 'FOLLOW_UP')
    .reduce((sum, s) => sum + Number(s.quotedAmount ?? 0), 0)

  const mixMap = new Map<string, { count: number; value: number }>()
  for (const s of sessionsInRange) {
    const cur = mixMap.get(s.procedureType as string) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += Number(s.quotedAmount ?? 0)
    mixMap.set(s.procedureType as string, cur)
  }
  const procedureMix = [...mixMap.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const todayList = dbv.appointments
    .filter((a) => new Date(a.date as string) >= todayStart && new Date(a.date as string) <= todayEnd)
    .sort((a, b) => (a.time as string).localeCompare(b.time as string))
    .map((a) => appointmentOut(dbv, a))

  const followUpAll = dbv.sessions
    .filter((s) => s.status === 'FOLLOW_UP')
    .sort((a, b) => String(a.followUpDate ?? '9999').localeCompare(String(b.followUpDate ?? '9999')))

  const recentSessions = [...dbv.sessions]
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 6)

  const allConverted = dbv.sessions.filter((s) => s.status === 'CONVERTED' || s.status === 'COMPLETED')

  return {
    range: { label, from: from ? iso(from) : null, to: to ? iso(to) : null },
    totalPatients: dbv.patients.length,
    todayAppointments: todayList.length,
    followUpsDue: followUpAll.length,
    revenueRange,
    collectedTotal,
    outstanding,
    pipelineValue,
    conversionRate,
    procedureMix,
    cataractPatients: dbv.patients.filter((p) => p.cataractEye !== 'NONE').length,
    pterygiumPatients: dbv.patients.filter((p) => p.pterygiumEye !== 'NONE').length,
    todayList,
    followUpList: followUpAll.slice(0, 8).map((s) => {
      const out = sessionOut(dbv, s, 'none')
      out.patient = patientSelect(dbv, s.patientId as string, ['id', 'name', 'mrn', 'phone'])
      return out
    }),
    recentSessions: recentSessions.map((s) => sessionOut(dbv, s, 'list')),
    rangeStats: {
      label,
      counselled: sessionsRange,
      surgeriesDone: sessionsInRange.filter((s) => s.status === 'COMPLETED' && s.surgeryDate).length,
      converted: convertedCount,
      conversionRate,
      revenue: revenueRange,
      willing: sessionsInRange.filter(
        (s) => s.willingness === 'WILLING' && ['PENDING', 'FOLLOW_UP', 'CONVERTED'].includes(s.status as string),
      ).length,
      notWilling: sessionsInRange.filter((s) => s.willingness === 'NOT_WILLING').length,
    },
    allTime: {
      counselled: dbv.sessions.length,
      surgeriesDone: dbv.sessions.filter((s) => s.status === 'COMPLETED' && s.surgeryDate).length,
      converted: allConverted.length,
      revenue: allConverted.reduce((sum, s) => sum + Number(s.finalAmount ?? 0), 0),
      patients: dbv.patients.length,
    },
  }
}

/* ------------------------------ route handlers ----------------------------- */

type Ctx = { method: string; path: string; q: URLSearchParams; body: any }

function handle(ctx: Ctx): { status: number; body: unknown } {
  const dbv = db()
  const { method, path, q, body } = ctx
  const seg = path.split('/').filter(Boolean) // ['api', ...]
  const unauthorized = !isAuthed() && path !== '/api/auth/login' && path !== '/api/auth/logout'
  if (unauthorized) return { status: 401, body: { user: null } }

  // ---- auth ----
  if (path === '/api/auth/login' && method === 'POST') {
    if (!body?.email || !body?.password) return { status: 400, body: { error: 'Email and password are required.' } }
    try { localStorage.setItem(AUTH_KEY, '1') } catch { /* noop */ }
    return { status: 200, body: { token: `demo_${Date.now().toString(36)}`, user: DEMO_USER } }
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    try { localStorage.removeItem(AUTH_KEY) } catch { /* noop */ }
    return { status: 200, body: { ok: true } }
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return isAuthed() ? { status: 200, body: { user: DEMO_USER } } : { status: 401, body: { user: null } }
  }
  if (path === '/api' && method === 'GET') return { status: 200, body: { message: 'Hello, world!' } }

  // ---- patients ----
  if (path === '/api/patients' && method === 'GET') {
    const query = (q.get('q') ?? '').trim()
    let rows = [...dbv.patients].sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
    if (query) rows = rows.filter((p) => contains(p.name, query) || contains(p.mrn, query) || contains(p.phone, query))
    return { status: 200, body: rows.map((p) => patientListItem(dbv, p)) }
  }
  if (path === '/api/patients' && method === 'POST') {
    if (!body?.name || !body?.age) return { status: 400, body: { error: 'Name and age are required' } }
    const customMrn = typeof body.mrn === 'string' ? body.mrn.trim().toUpperCase().replace(/\s+/g, ' ') : ''
    if (customMrn && (customMrn.length < 2 || customMrn.length > 20))
      return { status: 400, body: { error: 'Patient number must be 2–20 characters.' } }
    if (customMrn && dbv.patients.some((p) => p.mrn === customMrn))
      return { status: 409, body: { error: `Patient number ${customMrn} is already in use.` } }
    let mrn = customMrn || nextMrn(dbv)
    while (dbv.patients.some((p) => p.mrn === mrn)) mrn = `PEC-${String(parseInt(mrn.slice(4), 10) + 1).padStart(4, '0')}`
    const patient: Row = {
      id: rid('pt'), mrn, name: String(body.name).toUpperCase(), age: Number(body.age),
      gender: body.gender ?? 'MALE', phone: body.phone || null, address: body.address || null,
      cataractEye: body.cataractEye ?? 'NONE', pterygiumEye: body.pterygiumEye ?? 'NONE',
      pterygiumGrade: body.pterygiumGrade ?? 'G1', diabetes: !!body.diabetes, hypertension: !!body.hypertension,
      allergies: body.allergies || null, referredBy: body.referredBy || 'DIRECT',
      k1OD: numOrNull(body.k1OD), k2OD: numOrNull(body.k2OD), k1OS: numOrNull(body.k1OS), k2OS: numOrNull(body.k2OS),
      axialLengthOD: numOrNull(body.axialLengthOD), axialLengthOS: numOrNull(body.axialLengthOS),
      aConstant: null, plannedLensId: null, chosenLensId: null, notes: body.notes || null,
      createdAt: iso(new Date()), updatedAt: iso(new Date()),
    }
    dbv.patients.push(patient)
    persist()
    return { status: 201, body: patient }
  }
  if (seg[1] === 'patients' && seg[2] && !seg[3]) {
    const id = seg[2]
    const p = byId(dbv.patients, id)
    if (method === 'GET') {
      if (!p) return { status: 404, body: { error: 'Not found' } }
      const sessions = dbv.sessions
        .filter((s) => s.patientId === id)
        .sort((a, b) => (b.date as string).localeCompare(a.date as string))
        .map((s) => sessionOut(dbv, s, 'none'))
      const visionRecords = dbv.visionRecords
        .filter((v) => v.patientId === id)
        .sort((a, b) => (b.date as string).localeCompare(a.date as string))
      const appointments = dbv.appointments
        .filter((a) => a.patientId === id)
        .sort((a, b) => (b.date as string).localeCompare(a.date as string))
        .map((a) => appointmentOut(dbv, a, 'list'))
      return {
        status: 200,
        body: { ...p, visionRecords, sessions, appointments, plannedLens: byId(dbv.lenses, p.plannedLensId as string | null), chosenLens: byId(dbv.lenses, p.chosenLensId as string | null) },
      }
    }
    if (method === 'PUT' && p) {
      let mrn: string | undefined = undefined
      if (typeof body?.mrn === 'string') {
        mrn = body.mrn.trim().toUpperCase().replace(/\s+/g, ' ')
        if (mrn && (mrn.length < 2 || mrn.length > 20))
          return { status: 400, body: { error: 'Patient number must be 2–20 characters.' } }
        if (mrn && dbv.patients.some((x) => x.mrn === mrn && x.id !== id))
          return { status: 409, body: { error: `Patient number ${mrn} is already in use.` } }
      }
      const assign = (key: string, v: unknown, empty = null) => {
        if (v === undefined) return
        ;(p as Row)[key] = v === null || v === '' ? empty : v
      }
      if (mrn !== undefined) p.mrn = mrn || p.mrn
      if (body.name !== undefined) p.name = String(body.name).toUpperCase()
      if (body.age !== undefined) p.age = Number(body.age)
      if (body.gender !== undefined) p.gender = body.gender
      assign('phone', body.phone)
      assign('address', body.address)
      assign('referredBy', body.referredBy)
      if (body.cataractEye !== undefined) p.cataractEye = body.cataractEye
      if (body.pterygiumEye !== undefined) p.pterygiumEye = body.pterygiumEye
      if (body.pterygiumGrade !== undefined) p.pterygiumGrade = body.pterygiumGrade
      if (body.diabetes !== undefined) p.diabetes = !!body.diabetes
      if (body.hypertension !== undefined) p.hypertension = !!body.hypertension
      assign('allergies', body.allergies)
      for (const k of ['k1OD', 'k2OD', 'k1OS', 'k2OS', 'axialLengthOD', 'axialLengthOS', 'aConstant'] as const) {
        const v = numOrUndefined(body[k])
        if (v !== undefined) p[k] = v
      }
      if (body.plannedLensId !== undefined) p.plannedLensId = body.plannedLensId || null
      if (body.chosenLensId !== undefined) p.chosenLensId = body.chosenLensId || null
      assign('notes', body.notes)
      p.updatedAt = iso(new Date())
      persist()
      return { status: 200, body: p }
    }
    if (method === 'DELETE' && p) {
      dbv.patients = dbv.patients.filter((x) => x.id !== id)
      dbv.visionRecords = dbv.visionRecords.filter((x) => x.patientId !== id)
      dbv.sessions = dbv.sessions.filter((x) => x.patientId !== id)
      dbv.appointments = dbv.appointments.filter((x) => x.patientId !== id)
      persist()
      return { status: 200, body: { ok: true } }
    }
  }

  // ---- vision ----
  if (path === '/api/vision' && method === 'POST') {
    if (!body?.patientId) return { status: 400, body: { error: 'patientId required' } }
    const record: Row = {
      id: rid('vr'), patientId: String(body.patientId),
      date: body.date ? new Date(body.date).toISOString() : iso(new Date()),
      vaOD: body.vaOD || null, vaOS: body.vaOS || null,
      iopOD: numOrNull(body.iopOD), iopOS: numOrNull(body.iopOS),
      sphOD: numOrNull(body.sphOD), cylOD: numOrNull(body.cylOD), axisOD: numOrNull(body.axisOD),
      sphOS: numOrNull(body.sphOS), cylOS: numOrNull(body.cylOS), axisOS: numOrNull(body.axisOS),
      notes: body.notes || null,
    }
    dbv.visionRecords.push(record)
    persist()
    return { status: 201, body: record }
  }
  if (seg[1] === 'vision' && seg[2] && method === 'DELETE') {
    dbv.visionRecords = dbv.visionRecords.filter((x) => x.id !== seg[2])
    persist()
    return { status: 200, body: { ok: true } }
  }

  // ---- packages ----
  if (path === '/api/packages' && method === 'GET') {
    const cat = q.get('category')
    const rows = dbv.packages
      .filter((p) => (cat ? p.category === cat : true))
      .map((p) => pkgWithItems(dbv, p.id as string))
    return { status: 200, body: rows }
  }
  const rebuildPackageItems = (packageId: string, items: any[]) => {
    dbv.packageItems = dbv.packageItems.filter((i) => i.packageId !== packageId)
    for (const it of items) {
      if (!it?.name || !String(it.name).trim()) continue
      dbv.packageItems.push({
        id: rid('pi'), packageId, name: String(it.name).toUpperCase(),
        price: Number(it.price) || 0, optional: !!it.optional,
      })
    }
  }
  if (path === '/api/packages' && method === 'POST') {
    if (!body?.name) return { status: 400, body: { error: 'Package name required' } }
    const items: any[] = Array.isArray(body.items) ? body.items : []
    const basePrice = items.reduce((s, it) => s + (Number(it.price) || 0), 0)
    const discountPct = Number(body.discountPct) || 0
    const pkg: Row = {
      id: rid('pkg'), name: String(body.name).toUpperCase(), category: body.category ?? 'LENS',
      description: body.description || null, basePrice, discountPct,
      finalPrice: Math.round(basePrice * (1 - discountPct / 100)),
      color: body.color ?? 'yellow', active: body.active !== undefined ? !!body.active : true,
      createdAt: iso(new Date()), updatedAt: iso(new Date()),
    }
    dbv.packages.push(pkg)
    rebuildPackageItems(pkg.id as string, items)
    persist()
    return { status: 201, body: pkgWithItems(dbv, pkg.id as string) }
  }
  if (seg[1] === 'packages' && seg[2]) {
    const pkg = byId(dbv.packages, seg[2])
    if (method === 'PUT' && pkg) {
      const items: any[] = Array.isArray(body?.items) ? body.items : []
      if (items.length) {
        const basePrice = items.reduce((s: number, it: any) => s + (Number(it.price) || 0), 0)
        const discountPct = Number(body.discountPct) || 0
        pkg.basePrice = basePrice
        pkg.discountPct = discountPct
        pkg.finalPrice = Math.round(basePrice * (1 - discountPct / 100))
        rebuildPackageItems(seg[2], items)
      } else if (body?.discountPct !== undefined) {
        pkg.discountPct = Number(body.discountPct) || 0
        pkg.finalPrice = Math.round(Number(pkg.basePrice) * (1 - pkg.discountPct / 100))
      }
      if (body?.name !== undefined) pkg.name = String(body.name).toUpperCase()
      if (body?.category !== undefined) pkg.category = body.category
      if (body?.description !== undefined) pkg.description = body.description || null
      if (body?.color !== undefined) pkg.color = body.color
      if (body?.active !== undefined) pkg.active = !!body.active
      pkg.updatedAt = iso(new Date())
      persist()
      return { status: 200, body: pkgWithItems(dbv, seg[2]) }
    }
    if (method === 'DELETE' && pkg) {
      dbv.packages = dbv.packages.filter((x) => x.id !== seg[2])
      dbv.packageItems = dbv.packageItems.filter((x) => x.packageId !== seg[2])
      persist()
      return { status: 200, body: { ok: true } }
    }
  }

  // ---- lenses ----
  if (path === '/api/lenses' && method === 'GET') {
    const type = q.get('type')
    const rows = dbv.lenses
      .filter((l) => (type ? l.type === type : true))
      .sort((a, b) => String(a.type).localeCompare(String(b.type)) || Number(b.powerSph) - Number(a.powerSph))
    return { status: 200, body: rows }
  }
  if (path === '/api/lenses' && method === 'POST') {
    if (!body?.name) return { status: 400, body: { error: 'Lens name is required' } }
    const lens: Row = {
      id: rid('ls'), name: String(body.name), type: body.type ?? 'MONOFOCAL',
      manufacturer: body.manufacturer || null, model: body.model || null,
      aConstant: body.aConstant !== undefined && body.aConstant !== '' ? Number(body.aConstant) : null,
      powerSph: Number(body.powerSph) || 0,
      powerCyl: body.powerCyl !== undefined && body.powerCyl !== '' ? Number(body.powerCyl) : null,
      batchNo: String(body.batchNo ?? ''), expiryDate: body.expiryDate ? new Date(body.expiryDate).toISOString() : null,
      quantity: Number(body.quantity) || 0, minStock: Number(body.minStock) || 0,
      notes: body.notes || null, createdAt: iso(new Date()), updatedAt: iso(new Date()),
    }
    dbv.lenses.push(lens)
    persist()
    return { status: 201, body: lens }
  }
  if (seg[1] === 'lenses' && seg[2]) {
    const lens = byId(dbv.lenses, seg[2])
    if (method === 'PUT' && lens) {
      for (const k of ['name', 'type', 'batchNo'] as const) if (body?.[k] !== undefined) lens[k] = body[k]
      if (body?.manufacturer !== undefined) lens.manufacturer = body.manufacturer || null
      if (body?.model !== undefined) lens.model = body.model || null
      if (body?.aConstant !== undefined) lens.aConstant = body.aConstant === '' || body.aConstant === null ? null : Number(body.aConstant)
      if (body?.powerSph !== undefined) lens.powerSph = Number(body.powerSph) || 0
      if (body?.powerCyl !== undefined) lens.powerCyl = body.powerCyl === '' || body.powerCyl === null ? null : Number(body.powerCyl)
      if (body?.expiryDate !== undefined) lens.expiryDate = body.expiryDate ? new Date(body.expiryDate).toISOString() : null
      if (body?.quantity !== undefined) lens.quantity = Number(body.quantity) || 0
      if (body?.minStock !== undefined) lens.minStock = Number(body.minStock) || 0
      if (body?.notes !== undefined) lens.notes = body.notes || null
      lens.updatedAt = iso(new Date())
      persist()
      return { status: 200, body: lens }
    }
    if (method === 'DELETE' && lens) {
      dbv.lenses = dbv.lenses.filter((x) => x.id !== seg[2])
      persist()
      return { status: 200, body: { ok: true } }
    }
  }

  // ---- counseling sessions ----
  if (path === '/api/sessions' && method === 'GET') {
    const status = q.get('status')
    const rows = dbv.sessions
      .filter((s) => (status ? s.status === status : true))
      .sort((a, b) => (b.date as string).localeCompare(a.date as string))
      .map((s) => sessionOut(dbv, s))
    return { status: 200, body: rows }
  }
  if (path === '/api/sessions' && method === 'POST') {
    if (!body?.patientId) return { status: 400, body: { error: 'patientId required' } }
    const session: Row = {
      id: rid('ses'), patientId: String(body.patientId),
      date: body.date ? new Date(body.date).toISOString() : iso(new Date()),
      counselor: body.counselor || 'FRONT DESK',
      procedureType: body.procedureType ?? 'CATARACT', eye: body.eye ?? 'OU',
      recommendedPackageId: body.recommendedPackageId || null,
      quotedAmount: Number(body.quotedAmount) || 0, finalAmount: Number(body.finalAmount) || 0,
      paidAmount: Number(body.paidAmount) || 0, paymentMode: body.paymentMode || null,
      status: body.status ?? 'PENDING', willingness: body.willingness ?? 'THINKING',
      surgeryDate: body.surgeryDate ? new Date(body.surgeryDate).toISOString() : null,
      workupDone: Boolean(body.workupDone), plannedLensId: body.plannedLensId || null, placedLensId: null,
      bp: body.bp || null,
      bs: body.bs !== undefined && body.bs !== null && body.bs !== '' ? Number(body.bs) : null,
      axialLength: body.axialLength !== undefined && body.axialLength !== null && body.axialLength !== '' ? Number(body.axialLength) : null,
      k1: body.k1 !== undefined && body.k1 !== null && body.k1 !== '' ? Number(body.k1) : null,
      k2: body.k2 !== undefined && body.k2 !== null && body.k2 !== '' ? Number(body.k2) : null,
      iolPower: body.iolPower !== undefined && body.iolPower !== null && body.iolPower !== '' ? Number(body.iolPower) : null,
      notes: body.notes || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate).toISOString() : null,
      createdAt: iso(new Date()), updatedAt: iso(new Date()),
    }
    dbv.sessions.push(session)
    persist()
    return { status: 201, body: sessionOut(dbv, session) }
  }
  if (seg[1] === 'sessions' && seg[2]) {
    const prev = byId(dbv.sessions, seg[2])
    if (method === 'PUT' && prev) {
      const nextStatus = body?.status ?? prev.status
      const placedLensId = body?.placedLensId !== undefined ? body.placedLensId || null : prev.placedLensId
      // mirror the server: decrement lens stock once on COMPLETED transition
      if (nextStatus === 'COMPLETED' && prev.status !== 'COMPLETED' && placedLensId) {
        const lens = byId(dbv.lenses, placedLensId as string)
        if (lens && Number(lens.quantity) > 0) lens.quantity = Number(lens.quantity) - 1
      }
      if (body?.counselor !== undefined) prev.counselor = body.counselor
      if (body?.procedureType !== undefined) prev.procedureType = body.procedureType
      if (body?.eye !== undefined) prev.eye = body.eye
      if (body?.recommendedPackageId !== undefined) prev.recommendedPackageId = body.recommendedPackageId || null
      if (body?.quotedAmount !== undefined) prev.quotedAmount = Number(body.quotedAmount) || 0
      if (body?.finalAmount !== undefined) prev.finalAmount = Number(body.finalAmount) || 0
      if (body?.paidAmount !== undefined) prev.paidAmount = Number(body.paidAmount) || 0
      if (body?.paymentMode !== undefined) prev.paymentMode = body.paymentMode || null
      if (body?.status !== undefined) prev.status = body.status
      if (body?.notes !== undefined) prev.notes = body.notes || null
      if (body?.followUpDate !== undefined) prev.followUpDate = body.followUpDate ? new Date(body.followUpDate).toISOString() : null
      if (body?.willingness !== undefined) prev.willingness = body.willingness
      if (body?.surgeryDate !== undefined) prev.surgeryDate = body.surgeryDate ? new Date(body.surgeryDate).toISOString() : null
      if (body?.workupDone !== undefined) prev.workupDone = Boolean(body.workupDone)
      if (body?.plannedLensId !== undefined) prev.plannedLensId = body.plannedLensId || null
      if (body?.placedLensId !== undefined) prev.placedLensId = body.placedLensId || null
      else if (nextStatus === 'COMPLETED' && placedLensId) prev.placedLensId = placedLensId
      if (body?.bp !== undefined) prev.bp = body.bp || null
      for (const k of ['bs', 'axialLength', 'k1', 'k2', 'iolPower'] as const) {
        if (body?.[k] !== undefined) prev[k] = body[k] === null || body[k] === '' ? null : Number(body[k])
      }
      prev.updatedAt = iso(new Date())
      persist()
      return { status: 200, body: sessionOut(dbv, prev) }
    }
    if (method === 'DELETE' && prev) {
      dbv.sessions = dbv.sessions.filter((x) => x.id !== seg[2])
      persist()
      return { status: 200, body: { ok: true } }
    }
  }

  // ---- appointments ----
  if (path === '/api/appointments' && method === 'GET') {
    const from = q.get('from')
    const to = q.get('to')
    const rows = dbv.appointments
      .filter((a) => {
        if (!from || !to) return true
        const t = new Date(a.date as string)
        return t >= new Date(`${from}T00:00:00`) && t <= new Date(`${to}T23:59:59`)
      })
      .sort((a, b) => (a.date as string).localeCompare(b.date as string) || (a.time as string).localeCompare(b.time as string))
      .map((a) => appointmentOut(dbv, a))
    return { status: 200, body: rows }
  }
  if (path === '/api/appointments' && method === 'POST') {
    if (!body?.patientId || !body?.date)
      return { status: 400, body: { error: 'patientId and date required' } }
    const [y, m, d] = String(body.date).split('-').map(Number)
    const appointment: Row = {
      id: rid('appt'), patientId: String(body.patientId),
      date: new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString(),
      time: body.time ?? '09:00', duration: Number(body.duration) || 30,
      procedureType: body.procedureType ?? 'CONSULTATION', eye: body.eye ?? 'NA',
      packageId: body.packageId || null, status: body.status ?? 'SCHEDULED',
      notes: body.notes || null, createdAt: iso(new Date()), updatedAt: iso(new Date()),
    }
    dbv.appointments.push(appointment)
    persist()
    return { status: 201, body: appointmentOut(dbv, appointment) }
  }
  if (seg[1] === 'appointments' && seg[2]) {
    const appt = byId(dbv.appointments, seg[2])
    if (method === 'PUT' && appt) {
      if (body?.date) {
        const [y, m, d] = String(body.date).split('-').map(Number)
        appt.date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString()
      }
      if (body?.time !== undefined) appt.time = body.time
      if (body?.duration !== undefined) appt.duration = Number(body.duration) || 30
      if (body?.procedureType !== undefined) appt.procedureType = body.procedureType
      if (body?.eye !== undefined) appt.eye = body.eye
      if (body?.packageId !== undefined) appt.packageId = body.packageId || null
      if (body?.status !== undefined) appt.status = body.status
      if (body?.notes !== undefined) appt.notes = body.notes || null
      appt.updatedAt = iso(new Date())
      persist()
      return { status: 200, body: appointmentOut(dbv, appt) }
    }
    if (method === 'DELETE' && appt) {
      dbv.appointments = dbv.appointments.filter((x) => x.id !== seg[2])
      persist()
      return { status: 200, body: { ok: true } }
    }
  }

  // ---- stats & search ----
  if (path === '/api/stats' && method === 'GET')
    return { status: 200, body: computeStats(dbv, q.get('preset') ?? 'THIS_MONTH', q.get('from'), q.get('to')) }

  if (path === '/api/search' && method === 'GET') {
    const query = (q.get('q') ?? '').trim()
    if (query.length < 2) return { status: 200, body: { patients: [], packages: [], sessions: [], appointments: [] } }
    const patients = [...dbv.patients]
      .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
      .filter((p) => contains(p.name, query) || contains(p.mrn, query) || contains(p.phone, query))
      .slice(0, 6)
      .map((p) => {
        const out: Row = {}
        for (const f of ['id', 'name', 'mrn', 'age', 'gender', 'phone', 'cataractEye', 'pterygiumEye']) out[f] = p[f] ?? null
        return out
      })
    const packages = dbv.packages
      .filter((p) => contains(p.name, query) || contains(p.category, query))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .slice(0, 4)
      .map((p) => ({ id: p.id, name: p.name, category: p.category, finalPrice: p.finalPrice, active: p.active }))
    const sessions = [...dbv.sessions]
      .sort((a, b) => (b.date as string).localeCompare(a.date as string))
      .filter((s) => {
        const p = byId(dbv.patients, s.patientId as string)
        return (
          contains(p?.name, query) || contains(p?.mrn, query) ||
          contains(s.counselor, query) || contains(s.procedureType, query)
        )
      })
      .slice(0, 5)
      .map((s) => ({
        id: s.id, date: s.date, procedureType: s.procedureType, eye: s.eye, status: s.status,
        quotedAmount: s.quotedAmount, patient: patientSelect(dbv, s.patientId as string, ['id', 'name', 'mrn']),
      }))
    const appointments = [...dbv.appointments]
      .sort((a, b) => (b.date as string).localeCompare(a.date as string))
      .filter((a) => {
        const p = byId(dbv.patients, a.patientId as string)
        return contains(p?.name, query) || contains(p?.mrn, query) || contains(a.procedureType, query)
      })
      .slice(0, 5)
      .map((a) => ({
        id: a.id, date: a.date, time: a.time, procedureType: a.procedureType, eye: a.eye, status: a.status,
        patient: patientSelect(dbv, a.patientId as string, ['id', 'name', 'mrn']),
      }))
    return { status: 200, body: { patients, packages, sessions, appointments } }
  }

  return { status: 404, body: { error: `Demo backend: no handler for ${method} ${path}` } }
}

/* ------------------------------- fetch patch ------------------------------- */

let installed = false

export function installDemoBackend() {
  if (!DEMO_MODE || installed || typeof window === 'undefined') return
  installed = true

  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    let url: URL
    try {
      url = new URL(rawUrl, window.location.origin)
    } catch {
      return original(input as RequestInfo, init)
    }
    let path = url.pathname
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length) || '/'
    if (!path.startsWith('/api/')) return original(input as RequestInfo, init)

    let body: unknown = null
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }
    const method = (init.method ?? 'GET').toUpperCase()
    let result: { status: number; body: unknown }
    try {
      result = handle({ method, path: path.replace(/\/+$/, '') || '/api', q: url.searchParams, body })
    } catch (e) {
      console.error('DEMO_BACKEND_ERR', e)
      result = { status: 500, body: { error: 'Demo backend error — try resetting via __FCX_DEMO_RESET__()' } }
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  ;(window as unknown as Record<string, unknown>).__FCX_DEMO_RESET__ = () => {
    try {
      localStorage.removeItem(DB_KEY)
      localStorage.removeItem(AUTH_KEY)
    } catch { /* noop */ }
    window.location.reload()
  }
}
