'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Patient, PTERYGIUM_GRADES } from './types'
import { Field, FInput, FSelect, FTextarea, Button, Toggle } from './ui-bits'

export type PatientDraft = {
  mrn: string
  name: string
  age: string
  gender: string
  phone: string
  referredBy: string
  address: string
  cataractEye: string
  pterygiumEye: string
  pterygiumGrade: string
  k1OD: string
  k2OD: string
  k1OS: string
  k2OS: string
  axialLengthOD: string
  axialLengthOS: string
  diabetes: boolean
  hypertension: boolean
  allergies: string
  notes: string
}

export const emptyPatient: PatientDraft = {
  mrn: '',
  name: '', age: '', gender: 'MALE', phone: '', referredBy: '', address: '',
  cataractEye: 'NONE', pterygiumEye: 'NONE', pterygiumGrade: 'G1',
  k1OD: '', k2OD: '', k1OS: '', k2OS: '', axialLengthOD: '', axialLengthOS: '',
  diabetes: false, hypertension: false, allergies: '', notes: '',
}

export function draftFromPatient(p: Patient): PatientDraft {
  return {
    mrn: p.mrn,
    name: p.name, age: String(p.age), gender: p.gender, phone: p.phone ?? '', referredBy: p.referredBy ?? '', address: p.address ?? '',
    cataractEye: p.cataractEye, pterygiumEye: p.pterygiumEye ?? 'NONE', pterygiumGrade: p.pterygiumGrade ?? 'G1',
    k1OD: p.k1OD != null ? String(p.k1OD) : '', k2OD: p.k2OD != null ? String(p.k2OD) : '',
    k1OS: p.k1OS != null ? String(p.k1OS) : '', k2OS: p.k2OS != null ? String(p.k2OS) : '',
    axialLengthOD: p.axialLengthOD != null ? String(p.axialLengthOD) : '',
    axialLengthOS: p.axialLengthOS != null ? String(p.axialLengthOS) : '',
    diabetes: p.diabetes, hypertension: p.hypertension,
    allergies: p.allergies ?? '', notes: p.notes ?? '',
  }
}

/* Section header — small uppercase label with rule, brutalist style */
function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-zinc-900 font-mono text-[9px] font-bold text-white">
          {n}
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-800">{title}</h3>
        {hint && <span className="text-[10px] font-medium tracking-wide text-zinc-400">{hint}</span>}
        <div className="h-px flex-1 bg-zinc-200" />
      </div>
      {children}
    </section>
  )
}

/* Per-eye biometry column — tinted card mirroring the LENS tab style */
function EyeColumn({
  eye, tint, k1, k2, al, onSet,
}: {
  eye: 'OD' | 'OS'
  tint: { head: string; br: string }
  k1: string; k2: string; al: string
  onSet: (k: 'k1OD' | 'k2OD' | 'k1OS' | 'k2OS' | 'axialLengthOD' | 'axialLengthOS', v: string) => void
}) {
  const isOD = eye === 'OD'
  const avg = k1 && k2 ? (Number(k1) + Number(k2)) / 2 : null
  const kField = (k: 'k1OD' | 'k2OD' | 'k1OS' | 'k2OS' | 'axialLengthOD' | 'axialLengthOS', placeholder: string, step: string, min: string, max: string) => (
    <FInput
      type="number"
      step={step}
      min={min}
      max={max}
      value={k.startsWith('axialLength') ? al : k.startsWith('k2') ? k2 : k1}
      onChange={(e) => onSet(k, e.target.value)}
      placeholder={placeholder}
    />
  )
  return (
    <div className={`overflow-hidden rounded-lg border ${tint.br}`}>
      <div className={`border-b px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${tint.head} ${tint.br}`}>
        {eye} · {isOD ? 'Right Eye' : 'Left Eye'}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {kField(isOD ? 'k1OD' : 'k1OS', '44.25', '0.01', '30', '60')}
        {kField(isOD ? 'k2OD' : 'k2OS', '43.75', '0.01', '30', '60')}
        {kField(isOD ? 'axialLengthOD' : 'axialLengthOS', 'AL mm', '0.01', '15', '40')}
        <div className="flex flex-col justify-center rounded-md bg-zinc-50 px-2.5 py-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-400">Avg K</span>
          <span className="font-mono text-[12px] font-semibold text-zinc-800">{avg != null ? avg.toFixed(2) : '—'}</span>
        </div>
      </div>
    </div>
  )
}

export function PatientFormDialog({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: (msg: string) => void
  editing: Patient | null
}) {
  const [draft, setDraft] = useState<PatientDraft>(emptyPatient)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setDraft(editing ? draftFromPatient(editing) : emptyPatient)
  }, [open, editing])

  const set = (k: keyof PatientDraft, v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }))

  const setEye = (k: 'k1OD' | 'k2OD' | 'k1OS' | 'k2OS' | 'axialLengthOD' | 'axialLengthOS', v: string) =>
    setDraft((d) => ({ ...d, [k]: v }))

  async function save() {
    if (!draft.name.trim() || !draft.age || !draft.referredBy.trim()) return
    setBusy(true)
    try {
      const payload = {
        mrn: draft.mrn.trim(),
        name: draft.name, age: Number(draft.age), gender: draft.gender, phone: draft.phone,
        referredBy: draft.referredBy,
        address: draft.address, cataractEye: draft.cataractEye,
        pterygiumEye: draft.pterygiumEye, pterygiumGrade: draft.pterygiumGrade,
        k1OD: draft.k1OD, k2OD: draft.k2OD, k1OS: draft.k1OS, k2OS: draft.k2OS,
        axialLengthOD: draft.axialLengthOD, axialLengthOS: draft.axialLengthOS,
        diabetes: draft.diabetes,
        hypertension: draft.hypertension, allergies: draft.allergies, notes: draft.notes,
      }
      const res = await fetch(editing ? `/api/patients/${editing.id}` : '/api/patients', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not save patient. Check the fields and try again.')
      }
      onSaved(editing ? 'Patient record updated' : 'Patient registered')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save patient. Check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-2xl">
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">
              {editing ? 'Edit Patient Record' : 'Register New Patient'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {editing
                ? `PEC No ${editing.mrn} — update details, eye assessment and biometry`
                : 'Identity → eye assessment & biometry → notes. Everything a counselor needs.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-5">
          {/* ── 1 · PATIENT ─────────────────────────────────────────── */}
          <Section n="1" title="Patient Details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Full Name *" className="sm:col-span-2">
                <FInput value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Patient name" />
              </Field>
              <Field label="Age *">
                <FInput type="number" min={0} max={130} value={draft.age} onChange={(e) => set('age', e.target.value)} placeholder="Years" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Gender">
                <FSelect value={draft.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </FSelect>
              </Field>
              <Field label="Phone">
                <FInput value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" />
              </Field>
              <Field label="Patient No. (PEC)" className={editing ? '' : 'sm:col-span-2'}>
                <FInput
                  value={draft.mrn}
                  onChange={(e) => set('mrn', e.target.value)}
                  placeholder={editing ? editing.mrn : 'Blank = auto (PEC-0001…)'}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Referred By *">
                <FInput value={draft.referredBy} onChange={(e) => set('referredBy', e.target.value)} placeholder="Dr. name / optometry / camp" />
              </Field>
              <Field label="Address">
                <FInput value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city" />
              </Field>
            </div>
          </Section>

          {/* ── 2 · EYE ASSESSMENT ──────────────────────────────────── */}
          <Section n="2" title="Eye Assessment & Biometry" hint="flows into counseling & surgery">
            <div className="card-flat space-y-3 rounded-lg bg-zinc-50/70 p-3.5">
              {/* diagnosis */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_0.9fr]">
                <Field label="Cataract — Which Eye?">
                  <FSelect value={draft.cataractEye} onChange={(e) => set('cataractEye', e.target.value)}>
                    <option value="NONE">No cataract</option>
                    <option value="OD">OD · Right eye</option>
                    <option value="OS">OS · Left eye</option>
                    <option value="OU">OU · Both eyes</option>
                  </FSelect>
                </Field>
                <Field label="Pterygium — Which Eye?">
                  <FSelect value={draft.pterygiumEye} onChange={(e) => set('pterygiumEye', e.target.value)}>
                    <option value="NONE">No pterygium</option>
                    <option value="OD">OD · Right eye</option>
                    <option value="OS">OS · Left eye</option>
                    <option value="OU">OU · Both eyes</option>
                  </FSelect>
                </Field>
                <Field label="Pterygium Grade">
                  <FSelect
                    value={draft.pterygiumGrade}
                    onChange={(e) => set('pterygiumGrade', e.target.value)}
                    disabled={draft.pterygiumEye === 'NONE'}
                    className={draft.pterygiumEye === 'NONE' ? 'opacity-50' : ''}
                  >
                    {PTERYGIUM_GRADES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </FSelect>
                </Field>
              </div>

              {/* biometry — per eye */}
              <div>
                <div className="f-label mb-1.5">Biometry — K readings &amp; axial length <span className="font-normal normal-case tracking-normal text-zinc-400">(optional here; editable later in the LENS tab)</span></div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <EyeColumn
                    eye="OD"
                    tint={{ head: 'bg-teal-50 text-teal-700', br: 'border-teal-200' }}
                    k1={draft.k1OD} k2={draft.k2OD} al={draft.axialLengthOD}
                    onSet={setEye}
                  />
                  <EyeColumn
                    eye="OS"
                    tint={{ head: 'bg-orange-50 text-orange-700', br: 'border-orange-200' }}
                    k1={draft.k1OS} k2={draft.k2OS} al={draft.axialLengthOS}
                    onSet={setEye}
                  />
                </div>
              </div>

              {/* systemic + allergies */}
              <div className="flex flex-wrap items-center gap-5 border-t border-dashed border-zinc-200 pt-3">
                <Toggle checked={draft.diabetes} onChange={(v) => set('diabetes', v)} label="Diabetic" />
                <Toggle checked={draft.hypertension} onChange={(v) => set('hypertension', v)} label="Hypertension" />
                <div className="min-w-[180px] flex-1">
                  <FInput value={draft.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Drug allergies — e.g. sulfa, penicillin" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── 3 · NOTES ───────────────────────────────────────────── */}
          <Section n="3" title="Clinical / Counseling Notes">
            <FTextarea
              rows={2}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observations, family decisions, budget notes…"
            />
          </Section>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={save} disabled={busy || !draft.name.trim() || !draft.age}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Register patient'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
