'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CounselingSession, Pkg, Patient, LensStock, SESSION_STATUSES, COUNSEL_PROCEDURES, EYES, PAYMENT_MODES, SESSION_STATUS_COLOR, TINT, fmtDate, fmtINR, daysUntil, sessionBase, sessionBalance, WILLINGNESS, WILLINGNESS_COLOR, isCatalogLens, lensOptionLabel, lensShortLabel, eyeLabel } from './types'
import {
  Chip, Dot, EyeBadge, StatusChip, ProcChip, SectionHead, Button, FInput, FSelect, FTextarea, Field, Empty,
} from './ui-bits'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, IndianRupee, Search, Table2, Columns3, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

type Draft = {
  patientId: string
  counselor: string
  procedureType: string
  eye: string
  recommendedPackageId: string
  quotedAmount: string
  finalAmount: string
  paidAmount: string
  paymentMode: string
  status: string
  followUpDate: string
  notes: string
  willingness: string
  surgeryDate: string
  plannedLensId: string
}

const emptyDraft: Draft = {
  patientId: '', counselor: 'ANITHA R', procedureType: 'CATARACT', eye: 'OU',
  recommendedPackageId: '', quotedAmount: '', finalAmount: '', paidAmount: '', paymentMode: '',
  status: 'PENDING', followUpDate: '', notes: '',
  willingness: 'THINKING', surgeryDate: '', plannedLensId: '',
}

/* Compact patient context strip for the counseling form — identity, diagnosis,
   biometry (K + axial length) and systemic flags, so the counselor talks numbers
   with the family without leaving the dialog. Eye columns highlight when the
   session's "Which Eye" selection matches. */
function PatientSnapshot({ patient, eye }: { patient: Patient; eye: string }) {
  const hasBio =
    patient.k1OD != null || patient.k2OD != null || patient.axialLengthOD != null ||
    patient.k1OS != null || patient.k2OS != null || patient.axialLengthOS != null
  const flags = [
    patient.diabetes && 'DIABETIC',
    patient.hypertension && 'HTN',
    patient.allergies && `ALLERGY: ${patient.allergies}`,
  ].filter(Boolean) as string[]

  const eyeCard = (e: 'OD' | 'OS') => {
    const k1 = e === 'OD' ? patient.k1OD : patient.k1OS
    const k2 = e === 'OD' ? patient.k2OD : patient.k2OS
    const al = e === 'OD' ? patient.axialLengthOD : patient.axialLengthOS
    const avg = k1 != null && k2 != null ? (k1 + k2) / 2 : null
    const t = e === 'OD' ? TINT.cyan : TINT.orange
    const active = eye === e || eye === 'OU'
    return (
      <div
        className="overflow-hidden rounded-md border"
        style={{ borderColor: active ? t.br : undefined, opacity: eye === e || eye === 'OU' ? 1 : 0.55 }}
      >
        <div
          className="border-b px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
        >
          {e} · {eyeLabel(e)}{eye === e ? ' ◂ this eye' : ''}
        </div>
        <div className="space-y-0.5 p-2 font-mono text-[10.5px] font-medium">
          <div className="flex justify-between gap-2"><span className="text-zinc-400">K1 / K2</span><span className="text-zinc-800">{k1 != null ? k1.toFixed(2) : '—'} / {k2 != null ? k2.toFixed(2) : '—'}</span></div>
          <div className="flex justify-between gap-2"><span className="text-zinc-400">Avg K</span><span className="text-zinc-800">{avg != null ? avg.toFixed(2) + ' D' : '—'}</span></div>
          <div className="flex justify-between gap-2"><span className="text-zinc-400">Axial len</span><span className="text-zinc-800">{al != null ? al.toFixed(2) + ' mm' : '—'}</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] font-bold text-zinc-900">{patient.mrn}</span>
        <span className="text-[12px] font-semibold text-zinc-800">{patient.name}</span>
        <span className="font-mono text-[10.5px] text-zinc-500">{patient.age}y · {patient.gender.toLowerCase()}</span>
        {patient.cataractEye !== 'NONE' && (
          <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-700">
            cataract {patient.cataractEye}
          </span>
        )}
        {patient.pterygiumEye !== 'NONE' && (
          <span className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-rose-700">
            pterygium {patient.pterygiumEye} · {patient.pterygiumGrade}
          </span>
        )}
        {flags.map((f) => (
          <span key={f} className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600">{f}</span>
        ))}
      </div>
      {hasBio ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {eyeCard('OD')}
          {eyeCard('OS')}
        </div>
      ) : (
        <div className="mt-2 font-mono text-[10.5px] text-zinc-400">
          No biometry on file yet — capture K readings &amp; axial length in the patient’s LENS tab.
        </div>
      )}
    </div>
  )
}

export function CounselingView() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<CounselingSession[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [lenses, setLenses] = useState<LensStock[]>([])
  const [view, setView] = useState<'PIPELINE' | 'REGISTER'>('PIPELINE')
  const [filter, setFilter] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CounselingSession | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/sessions').then((r) => r.json()),
      fetch('/api/patients').then((r) => r.json()),
      fetch('/api/packages').then((r) => r.json()),
      fetch('/api/lenses').then((r) => r.json()),
    ])
      .then(([s, p, pk, l]) => {
        setSessions(s)
        setPatients(p)
        setPackages(pk)
        setLenses(l)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: sessions.length }
    for (const s of SESSION_STATUSES) c[s] = 0
    sessions.forEach((s) => {
      c[s.status] = (c[s.status] ?? 0) + 1
    })
    return c
  }, [sessions])

  const filtered = useMemo(() => {
    let list = filter === 'ALL' ? sessions : sessions.filter((s) => s.status === filter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter((s) => {
        const hay = [
          s.patient?.name,
          s.patient?.mrn,
          s.counselor,
          s.procedureType,
          s.recommendedPackage?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    return list
  }, [sessions, filter, q])

  function openNew() {
    setEditing(null)
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  function openEdit(s: CounselingSession) {
    setEditing(s)
    setDraft({
      patientId: s.patientId,
      counselor: s.counselor,
      procedureType: s.procedureType,
      eye: s.eye,
      recommendedPackageId: s.recommendedPackageId ?? '',
      quotedAmount: s.quotedAmount ? String(s.quotedAmount) : '',
      finalAmount: s.finalAmount ? String(s.finalAmount) : '',
      paidAmount: s.paidAmount ? String(s.paidAmount) : '',
      paymentMode: s.paymentMode ?? '',
      status: s.status,
      followUpDate: s.followUpDate ? new Date(s.followUpDate).toISOString().slice(0, 10) : '',
      notes: s.notes ?? '',
      willingness: s.willingness ?? 'THINKING',
      surgeryDate: s.surgeryDate ? s.surgeryDate.slice(0, 10) : '',
      plannedLensId: s.plannedLensId ?? '',
    })
    setFormOpen(true)
  }

  async function save() {
    if (!draft.patientId) return
    setBusy(true)
    try {
      const res = await fetch(editing ? `/api/sessions/${editing.id}` : '/api/sessions', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          quotedAmount: Number(draft.quotedAmount) || 0,
          finalAmount: Number(draft.finalAmount) || 0,
          paidAmount: Number(draft.paidAmount) || 0,
          paymentMode: draft.paymentMode || null,
          followUpDate: draft.followUpDate || null,
          recommendedPackageId: draft.recommendedPackageId || null,
          willingness: draft.willingness,
          surgeryDate: draft.surgeryDate || null,
          plannedLensId: draft.plannedLensId || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: editing ? 'Session updated' : 'Counseling session logged' })
      setFormOpen(false)
      load()
    } catch {
      alert('Could not save the session.')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(s: CounselingSession, status: string) {
    await fetch(`/api/sessions/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, finalAmount: status === 'COMPLETED' && !s.finalAmount ? s.quotedAmount : undefined }),
    })
    toast({ title: `Status → ${status.replaceAll('_', ' ')}` })
    load()
  }

  async function remove(s: CounselingSession) {
    if (!confirm(`Delete counseling session for ${s.patient?.name}?`)) return
    await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' })
    toast({ title: 'Session deleted' })
    load()
  }

  function pickPackage(id: string) {
    setDraft((d) => {
      const pkg = packages.find((p) => p.id === id)
      return {
        ...d,
        recommendedPackageId: id,
        quotedAmount: pkg && !d.quotedAmount ? String(pkg.finalPrice) : d.quotedAmount || (pkg ? String(pkg.finalPrice) : ''),
      }
    })
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Counseling Pipeline"
        right={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New session
          </Button>
        }
      />

      {/* SEARCH */}
      <div className="card flex items-center gap-2 px-3 py-1">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter pipeline — patient, MRN, counselor, procedure…"
          className="w-full bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* STATUS FILTERS */}
      <div className="flex flex-wrap gap-1.5">
        {(['ALL', ...SESSION_STATUSES] as string[]).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={cn(
              'inline-flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all',
              filter === st
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            {filter !== st && st !== 'ALL' && <Dot color={SESSION_STATUS_COLOR[st] ?? '#a1a1aa'} />}
            {st === 'ALL' ? 'All' : st.replaceAll('_', ' ')}
            <span
              className={cn(
                'rounded px-1 font-mono text-[10px]',
                filter === st ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
              )}
            >
              {counts[st] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* VIEW TOGGLE */}
      <div className="flex w-fit gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {([['PIPELINE', 'Pipeline', Columns3], ['REGISTER', 'Register', Table2]] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-semibold transition-all',
              view === v ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* PIPELINE */}
      {loading ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-zinc-50" />
          ))}
        </div>
      ) : view === 'PIPELINE' ? (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {SESSION_STATUSES.map((st) => {
            const col = filtered.filter((s) => s.status === st)
            return (
              <div key={st} className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-100/50 p-2">
                <div className="mb-2 flex items-center justify-between px-1 py-0.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                    <Dot color={SESSION_STATUS_COLOR[st]} />
                    {st.replaceAll('_', ' ')}
                  </span>
                  <span className="rounded bg-white px-1.5 font-mono text-[10px] font-semibold text-zinc-500 shadow-sm">
                    {col.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {col.length === 0 && (
                    <div className="rounded-md border border-dashed border-zinc-300/70 p-4 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                      Empty
                    </div>
                  )}
                  {col.map((s) => (
                    <SessionCard key={s.id} s={s} onEdit={openEdit} onStatus={setStatus} onDelete={remove} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <RegisterTable sessions={filtered} onEdit={openEdit} />
      )}

      {/* FORM DIALOG */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-xl">
          <div className="border-b border-zinc-200 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">
                {editing ? 'Update Counseling Session' : 'Log Counseling Session'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Procedure · eye · package · amount · follow-up
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Patient *">
                <FSelect value={draft.patientId} onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))}>
                  <option value="">— Select patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>
                  ))}
                </FSelect>
              </Field>
              <Field label="Counselor">
                <FInput value={draft.counselor} onChange={(e) => setDraft((d) => ({ ...d, counselor: e.target.value }))} placeholder="Name" />
              </Field>
            </div>

            {(() => {
              const selected = patients.find((p) => p.id === draft.patientId)
              return selected ? <PatientSnapshot patient={selected} eye={draft.eye} /> : null
            })()}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Procedure">
                <FSelect value={draft.procedureType} onChange={(e) => setDraft((d) => ({ ...d, procedureType: e.target.value }))}>
                  {COUNSEL_PROCEDURES.map((p) => (
                    <option key={p} value={p}>{p.replaceAll('_', ' ')}</option>
                  ))}
                </FSelect>
              </Field>
              <Field label="Which Eye">
                <FSelect value={draft.eye} onChange={(e) => setDraft((d) => ({ ...d, eye: e.target.value }))}>
                  {EYES.filter((e) => e.value !== 'NA').map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </FSelect>
              </Field>
              <Field label="Status">
                <FSelect value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                  {SESSION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                  ))}
                </FSelect>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Willingness (counseling outcome)">
                <FSelect value={draft.willingness} onChange={(e) => setDraft((d) => ({ ...d, willingness: e.target.value }))}>
                  {WILLINGNESS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </FSelect>
              </Field>
              <Field label="Planned surgery date">
                <FInput type="date" value={draft.surgeryDate} onChange={(e) => setDraft((d) => ({ ...d, surgeryDate: e.target.value }))} />
              </Field>
            </div>

            <Field label="Recommended Package">
              <FSelect value={draft.recommendedPackageId} onChange={(e) => pickPackage(e.target.value)}>
                <option value="">— No package —</option>
                {packages.filter((p) => p.active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {fmtINR(p.finalPrice)}</option>
                ))}
              </FSelect>
            </Field>

            <Field label="Plan lens (from stock)">
              <FSelect value={draft.plannedLensId} onChange={(e) => setDraft((d) => ({ ...d, plannedLensId: e.target.value }))}>
                <option value="">— No lens planned —</option>
                {LENS_GROUPS(lenses).map(([type, group]) => (
                  <optgroup key={type} label={type.replaceAll('_', ' ')}>
                    {group.map((l) => (
                      <option key={l.id} value={l.id} disabled={!isCatalogLens(l) && l.quantity <= 0}>
                        {lensOptionLabel(l)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </FSelect>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quoted Amount (₹)">
                <FInput type="number" min={0} value={draft.quotedAmount} onChange={(e) => setDraft((d) => ({ ...d, quotedAmount: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Final / Closed (₹)">
                <FInput type="number" min={0} value={draft.finalAmount} onChange={(e) => setDraft((d) => ({ ...d, finalAmount: e.target.value }))} placeholder="0" />
              </Field>
            </div>

            {/* PAYMENT BLOCK */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="f-label mb-0">Payment</div>
                {(() => {
                  const base = Number(draft.finalAmount) || Number(draft.quotedAmount) || 0
                  const paid = Number(draft.paidAmount) || 0
                  const bal = Math.max(0, base - paid)
                  if (base <= 0) return null
                  return (
                    <span className={cn('font-mono text-[11px] font-semibold', bal <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {bal <= 0 ? 'FULLY PAID' : `BALANCE ${fmtINR(bal)}`}
                    </span>
                  )
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount Paid (₹)">
                  <FInput type="number" min={0} value={draft.paidAmount} onChange={(e) => setDraft((d) => ({ ...d, paidAmount: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="Payment Mode">
                  <FSelect value={draft.paymentMode} onChange={(e) => setDraft((d) => ({ ...d, paymentMode: e.target.value }))}>
                    <option value="">— Not paid yet —</option>
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </FSelect>
                </Field>
              </div>
            </div>

            <Field label="Follow-up Date">
              <FInput type="date" value={draft.followUpDate} onChange={(e) => setDraft((d) => ({ ...d, followUpDate: e.target.value }))} />
            </Field>

            <Field label="Counseling Notes">
              <FTextarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="What was discussed, objections, decision…" />
            </Field>

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy || !draft.patientId}>
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Log session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SessionCard({
  s,
  onEdit,
  onStatus,
  onDelete,
}: {
  s: CounselingSession
  onEdit: (s: CounselingSession) => void
  onStatus: (s: CounselingSession, st: string) => void
  onDelete: (s: CounselingSession) => void
}) {
  const du = daysUntil(s.followUpDate)
  const overdue = du !== null && du < 0 && s.status === 'FOLLOW_UP'
  const nextOptions = SESSION_STATUSES.filter((x) => x !== s.status)
  const base = sessionBase(s)
  const bal = sessionBalance(s)
  const partial = (s.paidAmount ?? 0) > 0 && bal > 0
  return (
    <div
      className={cn('card lift cursor-pointer p-3', overdue && 'border-red-200 bg-red-50/40')}
      onClick={() => onEdit(s)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-zinc-900">{s.patient?.name ?? '—'}</div>
          <div className="font-mono text-[10px] font-medium text-zinc-400">{s.patient?.mrn} · {s.counselor}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(s)
          }}
          className="shrink-0 rounded p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <ProcChip type={s.procedureType} />
        <EyeBadge eye={s.eye} />
      </div>

      {s.recommendedPackage && (
        <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {s.recommendedPackage.name}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between font-mono text-[11px] font-semibold">
        <span className="flex items-center text-zinc-900"><IndianRupee className="h-3 w-3" />{base.toLocaleString('en-IN')}</span>
        {bal <= 0 && base > 0 ? (
          <span className="text-emerald-600">✓ PAID</span>
        ) : (s.paidAmount ?? 0) > 0 ? (
          <span className="text-amber-600">{s.paidAmount.toLocaleString('en-IN')} paid</span>
        ) : s.finalAmount > 0 ? (
          <span className="text-emerald-600">✓ {s.finalAmount.toLocaleString('en-IN')}</span>
        ) : null}
      </div>
      {partial && (
        <div className="mt-0.5 text-right font-mono text-[10px] font-semibold text-red-500">
          Balance {fmtINR(bal)}{s.paymentMode ? ` · paid via ${s.paymentMode}` : ''}
        </div>
      )}

      {s.followUpDate && (
        <div className={cn('mt-1.5 text-[10px] font-semibold uppercase tracking-wide', overdue ? 'text-red-600' : 'text-zinc-400')}>
          F/U: {fmtDate(s.followUpDate)} {overdue ? '· Overdue' : ''}
        </div>
      )}

      {s.notes && (
        <div className="mt-1.5 line-clamp-2 border-t border-dashed border-zinc-200 pt-1.5 text-[10px] leading-relaxed text-zinc-500">
          {s.notes}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-100 pt-2" onClick={(e) => e.stopPropagation()}>
        {nextOptions.slice(0, 4).map((st) => {
          const t = TINT_BY_KEY(st)
          return (
            <button
              key={st}
              onClick={() => onStatus(s, st)}
              className="rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-75"
              style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
              title={`Set ${st.replaceAll('_', ' ')}`}
            >
              → {st.replaceAll('_', ' ')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TINT_BY_KEY(status: string) {
  const key: Record<string, string> = {
    PENDING: 'yellow', FOLLOW_UP: 'orange', CONVERTED: 'cyan', COMPLETED: 'green', LOST: 'red',
  }
  return TINT[key[status] ?? 'gray']
}


function LENS_GROUPS(lenses: LensStock[]): [string, LensStock[]][] {
  const map = new Map<string, LensStock[]>()
  for (const l of lenses) {
    const arr = map.get(l.type) ?? []
    arr.push(l)
    map.set(l.type, arr)
  }
  return [...map.entries()]
}

// ---- Counseling Register: the printable-style case register ----
function RegisterTable({
  sessions,
  onEdit,
}: {
  sessions: CounselingSession[]
  onEdit: (s: CounselingSession) => void
}) {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  if (ordered.length === 0) return <Empty>No counseling cases match the current filter</Empty>
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {['S.No', 'Date', 'PEC No (MRD)', 'Patient', 'Age', 'Referred by', 'Phone', 'Procedure', 'Surgery eye', 'Workup', 'Amount', 'Lens', 'Willing', 'Status'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ordered.map((s, i) => {
              const wKey = s.willingness === 'WILLING' ? 'green' : s.willingness === 'NOT_WILLING' ? 'red' : 'yellow'
              const wTint = TINT[wKey]
              return (
                <tr key={s.id} className="cursor-pointer transition-colors hover:bg-zinc-50" onClick={() => onEdit(s)}>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-400">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-zinc-500">{fmtDate(s.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-medium text-zinc-600">{s.patient?.mrn}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-zinc-900">{s.patient?.name}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-600">{s.patient?.age ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[11.5px] text-zinc-600">{s.patient?.referredBy || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-zinc-600">{s.patient?.phone ?? '—'}</td>
                  <td className="px-3 py-2.5"><ProcChip type={s.procedureType} /></td>
                  <td className="px-3 py-2.5"><EyeBadge eye={s.eye} /></td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      s.workupDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                    )}>
                      <Stethoscope className="h-3 w-3" />
                      {s.workupDone ? 'Done' : 'Pending'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11.5px] font-semibold text-zinc-900">{fmtINR(sessionBase(s))}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-zinc-600">
                    {(s.placedLens ?? s.plannedLens) ? lensShortLabel(s.placedLens ?? s.plannedLens!) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: wTint.bg, color: wTint.fg, borderColor: wTint.br }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: WILLINGNESS_COLOR[s.willingness] ?? '#a1a1aa' }} />
                      {s.willingness === 'NOT_WILLING' ? 'Not willing' : s.willingness === 'WILLING' ? 'Willing' : 'Thinking'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={s.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}