'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Patient, VisionRecord, LensStock, fmtDate, fmtINR, TINT, eyeLabel, pterygiumGradeLabel, sessionBase, sessionBalance,
  isCatalogLens, lensOptionLabel, lensShortLabel,
} from './types'
import {
  Chip, EyeBadge, StatusChip, ProcChip, ApptStatusChip, ApptProcChip,
  Field, FInput, FSelect, FTextarea, Button, Empty,
} from './ui-bits'
import { Trash2, Plus, Pencil, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

type DetailTab = 'OVERVIEW' | 'VISION' | 'LENS' | 'COUNSELING' | 'APPOINTMENTS'

export function PatientDetailSheet({
  patientId,
  open,
  onClose,
  onEdit,
  onChanged,
}: {
  patientId: string | null
  open: boolean
  onClose: () => void
  onEdit: (p: Patient) => void
  onChanged: (msg: string) => void
}) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [tab, setTab] = useState<DetailTab>('OVERVIEW')
  const [visionOpen, setVisionOpen] = useState(false)
  const [lensOpen, setLensOpen] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  const load = useCallback(() => {
    if (!patientId) return
    fetch(`/api/patients/${patientId}`)
      .then((r) => r.json())
      .then(setPatient)
      .catch(() => {})
  }, [patientId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Reset tab each time the sheet opens (render-time adjustment)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setTab('OVERVIEW')
  }

  async function deletePatient() {
    if (!patient) return
    if (!confirm(`Delete ${patient.name} (${patient.mrn}) and all linked records? This cannot be undone.`)) return
    await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' })
    onChanged('Patient record deleted')
  }

  const tabs: DetailTab[] = ['OVERVIEW', 'VISION', 'LENS', 'COUNSELING', 'APPOINTMENTS']

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          className="flex w-full flex-col gap-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-0 sm:max-w-2xl"
        >
          {/* HEADER — always mounted so the sheet always has an accessible title */}
          <SheetHeader className="shrink-0 space-y-0 border-b border-zinc-200 bg-white p-0">
            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg font-semibold tracking-tight text-zinc-900">
                  {patient ? patient.name : 'Loading…'}
                </SheetTitle>
                {patient && (
                  <div className="mt-0.5 font-mono text-xs font-medium text-zinc-400">
                    MRN {patient.mrn} · {patient.age}Y · {patient.gender}
                  </div>
                )}
              </div>
              {patient && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => onEdit(patient)}
                    title="Edit patient"
                    className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={deletePatient}
                    title="Delete patient"
                    className="rounded-md border border-red-200 bg-white p-1.5 text-red-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {patient && (
              <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3.5 pt-2.5">
                <Chip bg={patient.cataractEye === 'NONE' ? '#a1a1aa' : '#0d9488'}>
                  {patient.cataractEye === 'NONE' ? 'No cataract' : `Cataract ${patient.cataractEye}`}
                </Chip>
                {patient.pterygiumEye !== 'NONE' && (
                  <Chip bg="#db2777">
                    Pterygium {patient.pterygiumEye} · {pterygiumGradeLabel(patient.pterygiumGrade)}
                  </Chip>
                )}
                {patient.diabetes && <Chip bg="#dc2626">Diabetic</Chip>}
                {patient.hypertension && <Chip bg="#d97706">Hypertension</Chip>}
                {patient.allergies && <Chip bg="#ea580c">Allergy: {patient.allergies}</Chip>}
              </div>
            )}
          </SheetHeader>

          {patient && (
            <>
              {/* TABS */}
              <div className="sticky top-0 z-20 flex min-h-[41px] shrink-0 overflow-x-auto border-b border-zinc-200 bg-white px-2">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'relative min-h-[40px] shrink-0 px-3.5 text-xs font-medium tracking-wide transition-colors',
                      tab === t ? 'tab-indicator font-semibold text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
                    )}
                  >
                    {t}
                    {t === 'VISION' && patient.visionRecords ? ` (${patient.visionRecords.length})` : ''}
                    {t === 'COUNSELING' && patient.sessions ? ` (${patient.sessions.length})` : ''}
                    {t === 'APPOINTMENTS' && patient.appointments ? ` (${patient.appointments.length})` : ''}
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-4 p-5">
                {tab === 'OVERVIEW' && <Overview p={patient} />}
                {tab === 'VISION' && (
                  <VisionTab patient={patient} onAdd={() => setVisionOpen(true)} onDeleted={load} />
                )}
                {tab === 'LENS' && <LensTab patient={patient} onEdit={() => setLensOpen(true)} />}
                {tab === 'COUNSELING' && <CounselingTab patient={patient} />}
                {tab === 'APPOINTMENTS' && <AppointmentsTab patient={patient} />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <VisionRecordDialog
        open={visionOpen}
        onClose={() => setVisionOpen(false)}
        patientId={patientId}
        onSaved={(m) => {
          setVisionOpen(false)
          load()
          onChanged(m)
        }}
      />

      {patient && (
        <LensDetailsDialog
          open={lensOpen}
          onClose={() => setLensOpen(false)}
          patient={patient}
          onSaved={(m) => {
            setLensOpen(false)
            load()
            onChanged(m)
          }}
        />
      )}
    </>
  )
}

// ---------------- OVERVIEW ----------------

function Overview({ p }: { p: Patient }) {
  const latest = p.visionRecords?.[0]
  return (
    <div className="space-y-4">
      {p.phone && (
        <div className="card flex items-center gap-2 p-3 text-[13px] font-medium text-zinc-700">
          <Phone className="h-4 w-4 text-zinc-400" /> {p.phone}
        </div>
      )}
      {p.address && (
        <div className="card p-3">
          <div className="f-label mb-1">Address</div>
          <div className="text-xs text-zinc-600">{p.address}</div>
        </div>
      )}

      {latest && (
        <div className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="f-label mb-0">Latest Vision — {fmtDate(latest.date)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['OD', 'OS'] as const).map((eye) => (
              <div key={eye} className="rounded-md border border-zinc-200 bg-zinc-50/50 p-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <EyeBadge eye={eye} />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{eyeLabel(eye)}</span>
                </div>
                <div className="font-mono text-[13px] font-semibold text-zinc-900">
                  VA {eye === 'OD' ? latest.vaOD ?? '—' : latest.vaOS ?? '—'} · IOP{' '}
                  {eye === 'OD' ? latest.iopOD ?? '—' : latest.iopOS ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.notes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="f-label mb-1 text-amber-700">Counseling / Clinical Notes</div>
          <div className="text-xs leading-relaxed text-amber-900">{p.notes}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="font-mono text-xl font-semibold text-zinc-900">{p.visionRecords?.length ?? 0}</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-400">Vision</div>
        </div>
        <div className="card p-3 text-center">
          <div className="font-mono text-xl font-semibold text-zinc-900">{p.sessions?.length ?? 0}</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-400">Counselings</div>
        </div>
        <div className="card p-3 text-center">
          <div className="font-mono text-xl font-semibold text-zinc-900">{p.appointments?.length ?? 0}</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-400">Appointments</div>
        </div>
      </div>
    </div>
  )
}

// ---------------- VISION TAB ----------------

function VisionTab({
  patient,
  onAdd,
  onDeleted,
}: {
  patient: Patient
  onAdd: () => void
  onDeleted: () => void
}) {
  const records = patient.visionRecords ?? []
  return (
    <div className="space-y-3">
      <Button onClick={onAdd} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" /> Add vision record
      </Button>

      {records.length === 0 ? (
        <Empty>No vision records yet — add the first refraction / VA entry</Empty>
      ) : (
        records.map((v) => (
          <div key={v.id} className="card p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] font-semibold text-zinc-500">
                {fmtDate(v.date)}
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Delete this vision record?')) return
                  await fetch(`/api/vision/${v.id}`, { method: 'DELETE' })
                  onDeleted()
                }}
                className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Delete record"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EyeColumn eye="OD" rec={v} />
              <EyeColumn eye="OS" rec={v} />
            </div>
            {v.notes && (
              <div className="mt-2.5 border-t border-dashed border-zinc-200 pt-2 text-[11px] text-zinc-500">
                {v.notes}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function EyeColumn({ eye, rec }: { eye: 'OD' | 'OS'; rec: VisionRecord }) {
  const iop = eye === 'OD' ? rec.iopOD : rec.iopOS
  const iopHigh = iop !== null && iop > 21
  const va = eye === 'OD' ? rec.vaOD : rec.vaOS
  const sph = eye === 'OD' ? rec.sphOD : rec.sphOS
  const cyl = eye === 'OD' ? rec.cylOD : rec.cylOS
  const axis = eye === 'OD' ? rec.axisOD : rec.axisOS
  const t = eye === 'OD' ? TINT.cyan : TINT.orange
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200">
      <div
        className="border-b px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
      >
        {eye} · {eyeLabel(eye)}
      </div>
      <div className="space-y-1 p-2.5 font-mono text-[11px] font-medium">
        <div className="flex justify-between"><span className="text-zinc-400">VA</span><span className="text-zinc-800">{va ?? '—'}</span></div>
        <div className="flex justify-between">
          <span className="text-zinc-400">IOP</span>
          <span className={iopHigh ? 'font-semibold text-red-600' : 'text-zinc-800'}>{iop ?? '—'}{iop !== null ? ' mmHg' : ''}</span>
        </div>
        <div className="flex justify-between"><span className="text-zinc-400">SPH</span><span className="text-zinc-800">{sph ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-400">CYL</span><span className="text-zinc-800">{cyl ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-400">AXIS</span><span className="text-zinc-800">{axis ?? '—'}{axis !== null ? '°' : ''}</span></div>
      </div>
    </div>
  )
}

function VisionRecordDialog({
  open,
  onClose,
  patientId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  patientId: string | null
  onSaved: (msg: string) => void
}) {
  const [f, setF] = useState({
    date: '', vaOD: '', vaOS: '', iopOD: '', iopOS: '',
    sphOD: '', cylOD: '', axisOD: '', sphOS: '', cylOS: '', axisOS: '', notes: '',
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setF({ date: new Date().toISOString().slice(0, 10), vaOD: '', vaOS: '', iopOD: '', iopOS: '', sphOD: '', cylOD: '', axisOD: '', sphOS: '', cylOS: '', axisOS: '', notes: '' })
  }, [open])

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  async function save() {
    if (!patientId) return
    setBusy(true)
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, ...f }),
      })
      if (!res.ok) throw new Error()
      onSaved('Vision record added')
    } catch {
      alert('Could not save vision record.')
    } finally {
      setBusy(false)
    }
  }

  const numField = (k: keyof typeof f, label: string, step = '0.25') => (
    <FInput type="number" step={step} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={label} />
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-2xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">Add Vision Record</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              VA · IOP · refraction — both eyes
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Date">
              <FInput type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="VA — OD (Right)">
              <FInput value={f.vaOD} onChange={(e) => set('vaOD', e.target.value)} placeholder="6/6, CF, HM" />
            </Field>
            <Field label="VA — OS (Left)">
              <FInput value={f.vaOS} onChange={(e) => set('vaOS', e.target.value)} placeholder="6/6, CF, HM" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-teal-200">
              <div className="border-b border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-teal-700">
                OD — Right Eye
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Field label="IOP (mmHg)">{numField('iopOD', '16')}</Field>
                <Field label="SPH">{numField('sphOD', '-1.00')}</Field>
                <Field label="CYL">{numField('cylOD', '-0.50')}</Field>
                <Field label="Axis (°)">
                  <FInput type="number" min={0} max={180} value={f.axisOD} onChange={(e) => set('axisOD', e.target.value)} placeholder="90" />
                </Field>
              </div>
            </div>
            <div className="rounded-lg border border-orange-200">
              <div className="border-b border-orange-100 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-orange-700">
                OS — Left Eye
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Field label="IOP (mmHg)">{numField('iopOS', '16')}</Field>
                <Field label="SPH">{numField('sphOS', '-1.00')}</Field>
                <Field label="CYL">{numField('cylOS', '-0.50')}</Field>
                <Field label="Axis (°)">
                  <FInput type="number" min={0} max={180} value={f.axisOS} onChange={(e) => set('axisOS', e.target.value)} placeholder="90" />
                </Field>
              </div>
            </div>
          </div>

          <Field label="Findings / Notes">
            <FTextarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Lens grade, media, advice…" />
          </Field>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save record'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- LENS TAB ----------------

const fmtD = (v: number | null | undefined, unit = ' D') =>
  v !== null && v !== undefined ? `${v.toFixed(2)}${unit}` : '—'

function LensTab({ patient, onEdit }: { patient: Patient; onEdit: () => void }) {
  const hasBiometry =
    patient.k1OD != null || patient.k2OD != null || patient.k1OS != null || patient.k2OS != null ||
    patient.axialLengthOD != null || patient.axialLengthOS != null
  const hasPlan = !!(patient.plannedLens || patient.chosenLens || patient.aConstant != null)

  const lensLine = (l: LensStock | null | undefined) => (l ? lensShortLabel(l) : '—')

  return (
    <div className="space-y-3">
      <Button onClick={onEdit} className="w-full sm:w-auto">
        <Pencil className="h-4 w-4" /> Edit lens details
      </Button>

      {!hasBiometry && !hasPlan && (
        <Empty>
          No K readings or lens plan recorded yet — add biometry &amp; IOL plan via “Edit lens details”
        </Empty>
      )}

      {/* Biometry — K readings + axial length, per eye */}
      <div className="card p-3.5">
        <div className="f-label mb-2">Biometry · Keratometry &amp; Axial Length</div>
        <div className="grid grid-cols-2 gap-2">
          {(['OD', 'OS'] as const).map((eye) => {
            const k1 = eye === 'OD' ? patient.k1OD : patient.k1OS
            const k2 = eye === 'OD' ? patient.k2OD : patient.k2OS
            const al = eye === 'OD' ? patient.axialLengthOD : patient.axialLengthOS
            const avg = k1 != null && k2 != null ? (k1 + k2) / 2 : null
            const t = eye === 'OD' ? TINT.cyan : TINT.orange
            return (
              <div key={eye} className="overflow-hidden rounded-md border border-zinc-200">
                <div
                  className="border-b px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
                >
                  {eye} · {eyeLabel(eye)}
                </div>
                <div className="space-y-1 p-2.5 font-mono text-[11px] font-medium">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">K1 (flat)</span>
                    <span className="text-zinc-800">{fmtD(k1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">K2 (steep)</span>
                    <span className="text-zinc-800">{fmtD(k2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-zinc-200 pt-1">
                    <span className="text-zinc-400">Avg K</span>
                    <span className="text-zinc-800">{fmtD(avg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Axial length</span>
                    <span className="text-zinc-800">{fmtD(al, ' mm')}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lens plan */}
      {hasPlan && (
        <div className="card p-3.5">
          <div className="f-label mb-2">Lens Plan</div>
          <div className="space-y-1 font-mono text-[11px] font-medium">
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-zinc-400">Lens planned</span>
              <span className="text-right text-zinc-800">{lensLine(patient.plannedLens)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-zinc-400">A-constant</span>
              <span className="text-zinc-800">{fmtD(patient.aConstant, '') || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-zinc-400">Lens chosen</span>
              <span className="text-right text-zinc-800">{lensLine(patient.chosenLens)}</span>
            </div>
          </div>
          {patient.plannedLens?.aConstant != null && patient.aConstant == null && (
            <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 font-mono text-[10.5px] text-zinc-600">
              Stock A-constant for planned lens: {patient.plannedLens.aConstant}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LensDetailsDialog({
  open,
  onClose,
  patient,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  patient: Patient
  onSaved: (msg: string) => void
}) {
  const [f, setF] = useState({
    k1OD: '', k2OD: '', k1OS: '', k2OS: '',
    axialLengthOD: '', axialLengthOS: '',
    plannedLensId: '', aConstant: '', chosenLensId: '',
  })
  const [lenses, setLenses] = useState<LensStock[]>([])
  const [busy, setBusy] = useState(false)

  // fill the form from the patient each time the dialog opens
  useEffect(() => {
    if (!open) return
    setF({
      k1OD: patient.k1OD != null ? String(patient.k1OD) : '',
      k2OD: patient.k2OD != null ? String(patient.k2OD) : '',
      k1OS: patient.k1OS != null ? String(patient.k1OS) : '',
      k2OS: patient.k2OS != null ? String(patient.k2OS) : '',
      axialLengthOD: patient.axialLengthOD != null ? String(patient.axialLengthOD) : '',
      axialLengthOS: patient.axialLengthOS != null ? String(patient.axialLengthOS) : '',
      plannedLensId: patient.plannedLensId ?? '',
      aConstant: patient.aConstant != null ? String(patient.aConstant) : '',
      chosenLensId: patient.chosenLensId ?? '',
    })
  }, [open, patient])

  useEffect(() => {
    if (open) {
      fetch('/api/lenses')
        .then((r) => r.json())
        .then(setLenses)
        .catch(() => {})
    }
  }, [open])

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  function pickPlanned(id: string) {
    const lens = lenses.find((l) => l.id === id)
    setF((s) => ({
      ...s,
      plannedLensId: id,
      aConstant: lens?.aConstant != null ? String(lens.aConstant) : s.aConstant,
    }))
  }

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      if (!res.ok) throw new Error()
      onSaved('Lens details updated')
    } catch {
      alert('Could not save lens details.')
    } finally {
      setBusy(false)
    }
  }

  const kField = (k: keyof typeof f, label: string) => (
    <FInput
      type="number"
      step="0.01"
      min={30}
      max={60}
      value={f[k]}
      onChange={(e) => set(k, e.target.value)}
      placeholder={label}
    />
  )

  const plannedLens = lenses.find((l) => l.id === f.plannedLensId) ?? null

  const lensOptions = (value: string, onPick: (id: string) => void) => (
    <FSelect value={value} onChange={(e) => onPick(e.target.value)}>
      <option value="">— No lens selected —</option>
      {LENS_GROUPED(lenses).map(([type, group]) => (
        <optgroup key={type} label={type.replaceAll('_', ' ')}>
          {group.map((l) => (
            <option key={l.id} value={l.id}>
              {lensOptionLabel(l)}
            </option>
          ))}
        </optgroup>
      ))}
    </FSelect>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-2xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">Lens Details</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              K readings · planned lens · A-constant · chosen lens
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-teal-200">
              <div className="border-b border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-teal-700">
                OD — Right Eye
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Field label="K1 flat (D)">{kField('k1OD', '44.25')}</Field>
                <Field label="K2 steep (D)">{kField('k2OD', '43.75')}</Field>
                <Field label="Axial length (mm)" className="col-span-2">
                  <FInput type="number" step="0.01" min={15} max={40} value={f.axialLengthOD} onChange={(e) => set('axialLengthOD', e.target.value)} placeholder="e.g. 23.52" />
                </Field>
              </div>
            </div>
            <div className="rounded-lg border border-orange-200">
              <div className="border-b border-orange-100 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-orange-700">
                OS — Left Eye
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Field label="K1 flat (D)">{kField('k1OS', '44.25')}</Field>
                <Field label="K2 steep (D)">{kField('k2OS', '43.75')}</Field>
                <Field label="Axial length (mm)" className="col-span-2">
                  <FInput type="number" step="0.01" min={15} max={40} value={f.axialLengthOS} onChange={(e) => set('axialLengthOS', e.target.value)} placeholder="e.g. 23.48" />
                </Field>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Lens planned (from stock)">
              {lensOptions(f.plannedLensId, pickPlanned)}
            </Field>
            <Field label="Lens chosen">
              {lensOptions(f.chosenLensId, (id) => set('chosenLensId', id))}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="A-constant">
              <FInput
                type="number"
                step="0.01"
                value={f.aConstant}
                onChange={(e) => set('aConstant', e.target.value)}
                placeholder="118.4"
              />
            </Field>
            {plannedLens && (
              <div className="self-end rounded-md bg-zinc-50 px-3 py-2 font-mono text-[10.5px] text-zinc-600">
                {isCatalogLens(plannedLens)
                  ? `Catalog A-constant: ${plannedLens.aConstant ?? '—'}`
                  : `Stock A-constant: ${plannedLens.aConstant ?? '—'} · ${plannedLens.quantity} in stock`}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save lens details'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// group lens stock by type for the optgroups
function LENS_GROUPED(lenses: LensStock[]): [string, LensStock[]][] {
  const map = new Map<string, LensStock[]>()
  for (const l of lenses) {
    const arr = map.get(l.type) ?? []
    arr.push(l)
    map.set(l.type, arr)
  }
  return [...map.entries()]
}

// ---------------- COUNSELING TAB ----------------

function CounselingTab({ patient }: { patient: Patient }) {
  const sessions = patient.sessions ?? []
  if (sessions.length === 0) return <Empty>No counseling sessions — start one from the Counseling tab</Empty>
  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const bal = sessionBalance(s)
        const base = sessionBase(s)
        return (
          <div key={s.id} className="card p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[10px] font-medium text-zinc-400">{fmtDate(s.date)} · {s.counselor}</div>
              <StatusChip status={s.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <ProcChip type={s.procedureType} />
              <EyeBadge eye={s.eye} />
              {s.recommendedPackage && <Chip>{s.recommendedPackage.name}</Chip>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-[11px] font-medium">
              <span className="text-zinc-500">Billed: <span className="text-zinc-900">{fmtINR(base)}</span></span>
              <span className="text-zinc-500">Paid: <span className="text-emerald-600">{fmtINR(s.paidAmount ?? 0)}</span></span>
              {bal > 0 ? (
                <span className="text-red-500">Balance: {fmtINR(bal)}</span>
              ) : (
                <span className="text-emerald-600">Fully paid</span>
              )}
              {s.paymentMode && <span className="text-zinc-400">via {s.paymentMode}</span>}
              {s.followUpDate && <span className="text-red-500">F/U: {fmtDate(s.followUpDate)}</span>}
            </div>
            {s.notes && <div className="mt-2 border-t border-dashed border-zinc-200 pt-1.5 text-[11px] text-zinc-500">{s.notes}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ---------------- APPOINTMENTS TAB ----------------

function AppointmentsTab({ patient }: { patient: Patient }) {
  const appts = patient.appointments ?? []
  if (appts.length === 0) return <Empty>No appointments — book from the Calendar tab</Empty>
  return (
    <div className="space-y-2">
      {appts.map((a) => (
        <div key={a.id} className="card flex flex-wrap items-center gap-2 p-3.5">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] font-semibold text-zinc-500">{fmtDate(a.date)}</div>
          <div className="font-mono text-xs font-semibold text-zinc-900">{a.time}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ApptProcChip type={a.procedureType} />
            {a.eye !== 'NA' && <EyeBadge eye={a.eye} />}
            {a.package && <Chip>{a.package.name}</Chip>}
            <ApptStatusChip status={a.status} />
          </div>
        </div>
      ))}
    </div>
  )
}
