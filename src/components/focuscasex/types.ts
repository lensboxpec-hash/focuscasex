// ---- Shared types for Focus CaseX ----

export type Patient = {
  id: string
  mrn: string
  name: string
  age: number
  gender: string
  phone: string | null
  address: string | null
  cataractEye: string
  pterygiumEye: string
  pterygiumGrade: string
  diabetes: boolean
  hypertension: boolean
  allergies: string | null
  referredBy: string
  // lens details — biometry & IOL plan
  k1OD: number | null
  k2OD: number | null
  k1OS: number | null
  k2OS: number | null
  axialLengthOD: number | null
  axialLengthOS: number | null
  aConstant: number | null
  plannedLensId: string | null
  plannedLens?: LensStock | null
  chosenLensId: string | null
  chosenLens?: LensStock | null
  notes: string | null
  createdAt: string
  updatedAt: string
  visionRecords?: VisionRecord[]
  sessions?: CounselingSession[]
  appointments?: Appointment[]
  _count?: { sessions: number; visionRecords: number; appointments: number }
}

export type VisionRecord = {
  id: string
  patientId: string
  date: string
  vaOD: string | null
  vaOS: string | null
  iopOD: number | null
  iopOS: number | null
  sphOD: number | null
  cylOD: number | null
  axisOD: number | null
  sphOS: number | null
  cylOS: number | null
  axisOS: number | null
  notes: string | null
}

export type PackageItem = {
  id: string
  packageId: string
  name: string
  price: number
  optional: boolean
}

export type Pkg = {
  id: string
  name: string
  category: string
  description: string | null
  basePrice: number
  discountPct: number
  finalPrice: number
  color: string
  active: boolean
  items: PackageItem[]
}

export type CounselingSession = {
  id: string
  patientId: string
  date: string
  counselor: string
  procedureType: string
  eye: string
  recommendedPackageId: string | null
  recommendedPackage: Pkg | null
  quotedAmount: number
  finalAmount: number
  paidAmount: number
  paymentMode: string | null
  status: string
  // counseling outcome
  willingness: string // WILLING | NOT_WILLING | THINKING
  // surgery planning & workup
  surgeryDate: string | null
  workupDone: boolean
  plannedLensId: string | null
  placedLensId: string | null
  plannedLens: LensStock | null
  placedLens: LensStock | null
  // pre-op readings
  bp: string | null
  bs: number | null
  axialLength: number | null
  k1: number | null
  k2: number | null
  iolPower: number | null
  notes: string | null
  followUpDate: string | null
  patient?: {
    id: string
    name: string
    mrn: string
    age: number
    phone: string | null
    referredBy?: string
    // biometry snapshot for workup pre-fill
    cataractEye: string
    k1OD: number | null
    k2OD: number | null
    k1OS: number | null
    k2OS: number | null
    axialLengthOD: number | null
    axialLengthOS: number | null
  }
}

export type LensStock = {
  id: string
  name: string
  type: string // MONOFOCAL | MULTIFOCAL | TRIFOCAL | TORIC | BIFOCAL | EDOF
  manufacturer: string | null
  model: string | null
  aConstant: number | null
  powerSph: number
  powerCyl: number | null
  batchNo: string
  expiryDate: string | null
  quantity: number
  minStock: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type Appointment = {
  id: string
  patientId: string
  date: string
  time: string
  duration: number
  procedureType: string
  eye: string
  packageId: string | null
  package: Pkg | null
  status: string
  notes: string | null
  patient?: { id: string; name: string; mrn: string; age: number; phone: string | null }
}

export type RangeStats = {
  label: string
  counselled: number
  surgeriesDone: number
  converted: number
  conversionRate: number
  revenue: number
  willing: number
  notWilling: number
}

export type Stats = {
  totalPatients: number
  todayAppointments: number
  followUpsDue: number
  revenueRange: number
  collectedTotal: number
  outstanding: number
  pipelineValue: number
  conversionRate: number
  procedureMix: { type: string; count: number; value: number }[]
  cataractPatients: number
  pterygiumPatients: number
  todayList: Appointment[]
  followUpList: CounselingSession[]
  recentSessions: CounselingSession[]
  rangeStats: RangeStats
  allTime: {
    counselled: number
    surgeriesDone: number
    converted: number
    revenue: number
    patients: number
  }
}

// ---- Constants ----

export const EYES = [
  { value: 'OD', label: 'OD · RIGHT' },
  { value: 'OS', label: 'OS · LEFT' },
  { value: 'OU', label: 'OU · BOTH' },
  { value: 'NA', label: 'N/A' },
] as const

export const COUNSEL_PROCEDURES = [
  'CATARACT', 'PTERYGIUM', 'GLAUCOMA', 'LASIK', 'RETINA', 'CORNEA', 'SQUINT', 'GENERAL',
] as const

export const APPT_PROCEDURES = [
  'CONSULTATION', 'CATARACT_SURGERY', 'PTERYGIUM_SURGERY', 'FOLLOW_UP', 'POST_OP', 'LASER', 'RETINA_EVAL',
] as const

export const PTERYGIUM_GRADES = [
  { value: 'G1', label: 'Grade 1 · Mild (< 2 mm)' },
  { value: 'G2', label: 'Grade 2 · Moderate (2–3 mm)' },
  { value: 'G3', label: 'Grade 3 · Fleshy / advanced' },
] as const

export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'INSURANCE', 'CHEQUE'] as const

export const SESSION_STATUSES = ['PENDING', 'FOLLOW_UP', 'CONVERTED', 'COMPLETED', 'LOST'] as const

export const APPT_STATUSES = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const

export const PACKAGE_CATEGORIES = ['LENS', 'SURGERY', 'LASER', 'TREATMENT', 'COMBO'] as const

export const PACKAGE_COLORS = ['yellow', 'green', 'cyan', 'orange', 'red'] as const

export const WILLINGNESS = [
  { value: 'WILLING', label: 'Willing' },
  { value: 'NOT_WILLING', label: 'Not willing' },
  { value: 'THINKING', label: 'Thinking' },
] as const

export const LENS_TYPES = ['MONOFOCAL', 'MULTIFOCAL', 'TRIFOCAL', 'TORIC', 'BIFOCAL', 'EDOF'] as const

export const lensTypeLabel = (t: string) => t.replaceAll('_', ' ')

// A catalog entry = lens model from the clinic's given list (no power/batch/stock yet).
// Stock lots carry a real sphere power + batch number.
export const isCatalogLens = (l: { powerSph: number; batchNo: string }) =>
  l.powerSph === 0 && !l.batchNo

// Full label for picker <option>s (grouped lists)
export function lensOptionLabel(l: LensStock): string {
  if (isCatalogLens(l)) return `${l.name} · A ${l.aConstant ?? '—'}`
  return `${l.name} · ${l.powerSph > 0 ? '+' : ''}${l.powerSph}D${l.powerCyl != null ? ` cyl ${l.powerCyl}` : ''} · ${l.batchNo} · ${l.quantity} left`
}

// Compact label for chips / table cells
export function lensShortLabel(l: LensStock): string {
  if (isCatalogLens(l)) return `${l.name} · A ${l.aConstant ?? '—'}`
  return `${l.name} ${l.powerSph > 0 ? '+' : ''}${l.powerSph}D${l.powerCyl != null ? ` cyl ${l.powerCyl}` : ''} · ${l.batchNo}`
}

// ---- Color maps (professional clinical palette) ----

export const ACCENT: Record<string, string> = {
  yellow: '#d97706', // amber-600
  green: '#059669', // emerald-600
  cyan: '#0d9488', // teal-600
  orange: '#ea580c', // orange-600
  red: '#dc2626', // red-600
  pink: '#db2777', // pink-600 — pterygium
  black: '#18181b', // zinc-900
  gray: '#a1a1aa', // zinc-400
  white: '#ffffff',
}

export const WILLINGNESS_COLOR: Record<string, string> = {
  WILLING: ACCENT.green,
  NOT_WILLING: ACCENT.red,
  THINKING: ACCENT.yellow,
}

export const LENS_TYPE_COLOR: Record<string, string> = {
  MONOFOCAL: ACCENT.cyan,
  MULTIFOCAL: ACCENT.yellow,
  TRIFOCAL: ACCENT.green,
  TORIC: ACCENT.pink,
  BIFOCAL: ACCENT.orange,
  EDOF: ACCENT.red,
}

// Soft tinted badge styles — the professional way to show status
export type Tint = { bg: string; fg: string; br: string }

export const TINT: Record<string, Tint> = {
  yellow: { bg: '#fffbeb', fg: '#b45309', br: '#fde68a' },
  green: { bg: '#ecfdf5', fg: '#047857', br: '#a7f3d0' },
  cyan: { bg: '#f0fdfa', fg: '#0f766e', br: '#99f6e4' },
  orange: { bg: '#fff7ed', fg: '#c2410c', br: '#fed7aa' },
  red: { bg: '#fef2f2', fg: '#b91c1c', br: '#fecaca' },
  pink: { bg: '#fdf2f8', fg: '#be185d', br: '#fbcfe8' },
  gray: { bg: '#fafafa', fg: '#52525b', br: '#e4e4e7' },
  white: { bg: '#ffffff', fg: '#3f3f46', br: '#e4e4e7' },
  black: { bg: '#18181b', fg: '#fafafa', br: '#18181b' },
}

export const TINT_BY_HEX: Record<string, Tint> = Object.fromEntries(
  Object.entries(ACCENT).map(([k, v]) => [v, TINT[k]])
)

export const SESSION_STATUS_COLOR: Record<string, string> = {
  PENDING: ACCENT.yellow,
  FOLLOW_UP: ACCENT.orange,
  CONVERTED: ACCENT.cyan,
  COMPLETED: ACCENT.green,
  LOST: ACCENT.red,
}

export const APPT_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: ACCENT.yellow,
  CONFIRMED: ACCENT.cyan,
  COMPLETED: ACCENT.green,
  CANCELLED: ACCENT.red,
  NO_SHOW: ACCENT.gray,
}

export const APPT_PROC_COLOR: Record<string, string> = {
  CONSULTATION: ACCENT.white,
  CATARACT_SURGERY: ACCENT.yellow,
  PTERYGIUM_SURGERY: ACCENT.pink,
  FOLLOW_UP: ACCENT.orange,
  POST_OP: ACCENT.cyan,
  LASER: ACCENT.red,
  RETINA_EVAL: ACCENT.green,
}

export const COUNSEL_PROC_COLOR: Record<string, string> = {
  CATARACT: ACCENT.yellow,
  PTERYGIUM: ACCENT.pink,
  GLAUCOMA: ACCENT.orange,
  LASIK: ACCENT.cyan,
  RETINA: ACCENT.green,
  CORNEA: ACCENT.red,
  SQUINT: ACCENT.gray,
  GENERAL: ACCENT.white,
}

export const EYE_COLOR: Record<string, string> = {
  OD: ACCENT.cyan,
  OS: ACCENT.orange,
  OU: ACCENT.black,
  NA: ACCENT.gray,
}

// ---- Formatting helpers ----

export const fmtINR = (n: number) =>
  '\u20B9' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const pad = (n: number) => String(n).padStart(2, '0')

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Parse "YYYY-MM-DD" as a local date (new Date(str) would treat it as UTC)
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export function fmtTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${pad(m || 0)} ${ampm}`
}

export function daysUntil(value: string | null): number | null {
  if (!value) return null
  const target = new Date(value)
  const now = new Date()
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((a - b) / 86400000)
}

export const eyeLabel = (eye: string) =>
  eye === 'OD' ? 'RIGHT EYE' : eye === 'OS' ? 'LEFT EYE' : eye === 'OU' ? 'BOTH EYES' : 'N/A'

export const procLabel = (p: string) => p.replaceAll('_', ' ')

export const pterygiumGradeLabel = (g: string) =>
  g === 'G2' ? 'GRADE 2' : g === 'G3' ? 'GRADE 3' : 'GRADE 1'

// Contract value + outstanding balance for a counseling session
export const sessionBase = (s: { finalAmount: number; quotedAmount: number }) =>
  s.finalAmount > 0 ? s.finalAmount : s.quotedAmount

export const sessionBalance = (s: { finalAmount: number; quotedAmount: number; paidAmount: number }) =>
  Math.max(0, sessionBase(s) - (s.paidAmount ?? 0))

// Surgery pipeline stage derived from session fields
export type SurgeryStage = 'PLANNED' | 'WORKUP' | 'PREOP' | 'SCHEDULED' | 'DONE'

export function surgeryStage(s: {
  status: string
  workupDone: boolean
  bp: string | null
  axialLength: number | null
  surgeryDate: string | null
}): SurgeryStage {
  if (s.status === 'COMPLETED') return 'DONE'
  if (s.surgeryDate) return 'SCHEDULED'
  if (s.workupDone && (s.bp || s.axialLength != null)) return 'PREOP'
  if (s.workupDone) return 'WORKUP'
  return 'PLANNED'
}

export const SURGERY_STAGE_COLOR: Record<SurgeryStage, string> = {
  PLANNED: ACCENT.yellow,
  WORKUP: ACCENT.orange,
  PREOP: ACCENT.cyan,
  SCHEDULED: ACCENT.black,
  DONE: ACCENT.green,
}

export const SURGERY_STAGE_LABEL: Record<SurgeryStage, string> = {
  PLANNED: 'Planned',
  WORKUP: 'Workup done',
  PREOP: 'Pre-op recorded',
  SCHEDULED: 'Scheduled',
  DONE: 'Surgery done',
}
