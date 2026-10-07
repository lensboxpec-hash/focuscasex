'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CounselingSession, LensStock, SurgeryStage, surgeryStage, SURGERY_STAGE_COLOR,
  isCatalogLens, lensOptionLabel, lensShortLabel,
  SURGERY_STAGE_LABEL, WILLINGNESS_COLOR, fmtDate, fmtINR, EYES, TINT,
} from './types'
import { SectionHead, Button, FInput, FSelect, Field, EyeBadge, Empty, Toggle } from './ui-bits'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Stethoscope, CalendarCheck, CheckCircle2, Search, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGES: SurgeryStage[] = ['PLANNED', 'WORKUP', 'PREOP', 'SCHEDULED', 'DONE']

type PreopDraft = {
  workupDone: boolean
  bp: string
  bs: string
  axialLength: string
  k1: string
  k2: string
  iolPower: string
  plannedLensId: string
  surgeryDate: string
  eye: string
}

const emptyPreop: PreopDraft = {
  workupDone: false, bp: '', bs: '', axialLength: '', k1: '', k2: '', iolPower: '',
  plannedLensId: '', surgeryDate: '', eye: 'OD',
}

export function SurgeryView() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<CounselingSession[]>([])
  const [lenses, setLenses] = useState<LensStock[]>([])
  const [stageFilter, setStageFilter] = useState<'ALL' | SurgeryStage>('ALL')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PreopDraft>(emptyPreop)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/sessions').then((r) => r.json()),
      fetch('/api/lenses').then((r) => r.json()),
    ])
      .then(([s, l]) => {
        setSessions(s)
        setLenses(l)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // surgical candidates: any session with surgery tracking or a surgical procedure
  const cases = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.surgeryDate != null ||
          ['CATARACT', 'PTERYGIUM', 'LASIK', 'CORNEA', 'SQUINT'].includes(s.procedureType)
      ),
    [sessions]
  )

  const staged = useMemo(
    () => cases.map((s) => ({ s, stage: surgeryStage(s) })),
    [cases]
  )

  const filtered = useMemo(() => {
    let list = stageFilter === 'ALL' ? staged : staged.filter((x) => x.stage === stageFilter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(
        (x) =>
          x.s.patient?.name.toLowerCase().includes(needle) ||
          x.s.patient?.mrn.toLowerCase().includes(needle) ||
          (x.s.patient?.phone ?? '').includes(needle)
      )
    }
    return list.sort((a, b) => {
      const ao = a.s.surgeryDate ? new Date(a.s.surgeryDate).getTime() : Infinity
      const bo = b.s.surgeryDate ? new Date(b.s.surgeryDate).getTime() : Infinity
      return ao - bo
    })
  }, [staged, stageFilter, q])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: staged.length }
    for (const st of STAGES) c[st] = staged.filter((x) => x.stage === st).length
    return c
  }, [staged])

  const editing = editId ? sessions.find((s) => s.id === editId) ?? null : null

  function openPreop(s: CounselingSession) {
    setEditId(s.id)
    // pre-fill workup readings from the patient's stored biometry when the
    // session has none yet — K1/K2/axial length for the session's eye
    const p = s.patient
    const od = s.eye === 'OD' || s.eye === 'OU'
    const os = s.eye === 'OS' || s.eye === 'OU'
    const pK1 = od && p?.k1OD != null ? p.k1OD : os && p?.k1OS != null ? p.k1OS : null
    const pK2 = od && p?.k2OD != null ? p.k2OD : os && p?.k2OS != null ? p.k2OS : null
    const pAL = od && p?.axialLengthOD != null ? p.axialLengthOD : os && p?.axialLengthOS != null ? p.axialLengthOS : null
    setDraft({
      workupDone: s.workupDone,
      bp: s.bp ?? '',
      bs: s.bs != null ? String(s.bs) : '',
      axialLength: s.axialLength != null ? String(s.axialLength) : pAL != null ? String(pAL) : '',
      k1: s.k1 != null ? String(s.k1) : pK1 != null ? String(pK1) : '',
      k2: s.k2 != null ? String(s.k2) : pK2 != null ? String(pK2) : '',
      iolPower: s.iolPower != null ? String(s.iolPower) : '',
      plannedLensId: s.plannedLensId ?? '',
      surgeryDate: s.surgeryDate ? s.surgeryDate.slice(0, 10) : '',
      eye: s.eye,
    })
  }

  async function savePreop() {
    if (!editId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/sessions/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Surgery plan updated' })
      setEditId(null)
      load()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  async function markDone(s: CounselingSession) {
    const lensTxt = s.plannedLens
      ? ` — ${s.plannedLens.name} ${s.plannedLens.powerSph}D (batch ${s.plannedLens.batchNo}) will be consumed from stock`
      : ''
    if (!window.confirm(`Mark surgery DONE for ${s.patient?.name} (${s.eye})?${lensTxt}`)) return
    const res = await fetch(`/api/sessions/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', placedLensId: s.plannedLensId ?? undefined }),
    })
    if (res.ok) {
      toast({
        title: 'Surgery marked done',
        description: s.plannedLens ? `${s.plannedLens.name} stock decremented` : undefined,
      })
      load()
    } else {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  async function quickWorkup(s: CounselingSession) {
    const res = await fetch(`/api/sessions/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workupDone: true }),
    })
    if (res.ok) {
      toast({ title: 'Workup marked done', description: s.patient?.name })
      load()
    }
  }

  const selectedLens = lenses.find((l) => l.id === draft.plannedLensId) ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead title="Surgery Planner" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patient / PEC no / phone…"
            className="f-input h-8 w-44 rounded-md border border-zinc-200 bg-white pl-8 pr-2 text-xs sm:w-64"
          />
        </div>
      </div>

      {/* stage filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['ALL', ...STAGES] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStageFilter(st)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
              stageFilter === st
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'
            )}
          >
            {st !== 'ALL' && (
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SURGERY_STAGE_COLOR[st] }} />
            )}
            {st === 'ALL' ? 'All cases' : SURGERY_STAGE_LABEL[st]}
            <span className={cn('font-mono text-[10px]', stageFilter === st ? 'text-zinc-300' : 'text-zinc-400')}>
              {counts[st] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card h-40 animate-pulse bg-zinc-50" />
      ) : filtered.length === 0 ? (
        <Empty>No surgical cases here — plan one from the Counseling pipeline</Empty>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map(({ s, stage }) => {
            const wTint = TINT[
              s.willingness === 'WILLING' ? 'green' : s.willingness === 'NOT_WILLING' ? 'red' : 'yellow'
            ]
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-zinc-900">{s.patient?.name ?? '—'}</span>
                      <span className="font-mono text-[10.5px] font-medium text-zinc-400">{s.patient?.mrn}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                      <EyeBadge eye={s.eye} />
                      <span className="font-medium uppercase tracking-wide">{s.procedureType.replaceAll('_', ' ')}</span>
                      {s.patient?.age != null && <span>· {s.patient.age} yrs</span>}
                      {s.patient?.phone && <span>· {s.patient.phone}</span>}
                    </div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background: stage === 'DONE' ? TINT.green.bg : TINT.gray.bg,
                      color: stage === 'DONE' ? TINT.green.fg : '#3f3f46',
                      borderColor: stage === 'DONE' ? TINT.green.br : TINT.gray.br,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: SURGERY_STAGE_COLOR[stage] }} />
                    {SURGERY_STAGE_LABEL[stage]}
                  </span>
                </div>

                {/* plan facts */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md bg-zinc-50 p-2.5 font-mono text-[10.5px] text-zinc-600 sm:grid-cols-3">
                  <span>Surgery date: <b className={s.surgeryDate ? 'text-zinc-900' : ''}>{fmtDate(s.surgeryDate)}</b></span>
                  <span>Amount: <b className="text-zinc-900">{fmtINR(s.finalAmount > 0 ? s.finalAmount : s.quotedAmount)}</b></span>
                  <span className="flex items-center gap-1.5">
                    Willing:
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: wTint.fg }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: WILLINGNESS_COLOR[s.willingness] ?? '#a1a1aa' }} />
                      {s.willingness === 'NOT_WILLING' ? 'No' : s.willingness === 'WILLING' ? 'Yes' : 'Thinking'}
                    </span>
                  </span>
                  <span className="col-span-2 sm:col-span-1">BP: <b className={s.bp ? 'text-zinc-900' : ''}>{s.bp ?? '—'}</b></span>
                  <span>BS: <b className={s.bs != null ? 'text-zinc-900' : ''}>{s.bs ?? '—'}</b></span>
                  <span>AL: <b className={s.axialLength != null ? 'text-zinc-900' : ''}>{s.axialLength ?? '—'}</b></span>
                  <span>K1/K2: <b className={s.k1 != null ? 'text-zinc-900' : ''}>{s.k1 ?? '—'}/{s.k2 ?? '—'}</b></span>
                  <span>IOL pwr: <b className={s.iolPower != null ? 'text-zinc-900' : ''}>{s.iolPower ?? '—'}</b></span>
                </div>

                {/* lens plan */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                  {s.placedLens ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Placed: {lensShortLabel(s.placedLens)}
                    </span>
                  ) : s.plannedLens ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 font-semibold text-zinc-700">
                      <Eye className="h-3.5 w-3.5 text-zinc-400" />
                      Lens: {lensShortLabel(s.plannedLens)}
                      {!isCatalogLens(s.plannedLens) && (
                        <span className={cn('font-mono', s.plannedLens.quantity <= s.plannedLens.minStock ? 'text-orange-600' : 'text-zinc-400')}>
                          ({s.plannedLens.quantity} in stock)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-zinc-400">No lens planned yet</span>
                  )}
                </div>

                {/* actions */}
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3">
                  {stage === 'PLANNED' && (
                    <>
                      <Button variant="outline" onClick={() => quickWorkup(s)} className="min-h-[30px] px-2.5 py-1 text-[11px]">
                        <Stethoscope className="h-3.5 w-3.5" /> Mark workup done
                      </Button>
                      <Button variant="outline" onClick={() => openPreop(s)} className="min-h-[30px] px-2.5 py-1 text-[11px]">
                        Pre-op & schedule
                      </Button>
                    </>
                  )}
                  {(stage === 'WORKUP' || stage === 'PREOP') && (
                    <Button variant="outline" onClick={() => openPreop(s)} className="min-h-[30px] px-2.5 py-1 text-[11px]">
                      <CalendarCheck className="h-3.5 w-3.5" /> Pre-op & schedule
                    </Button>
                  )}
                  {stage === 'SCHEDULED' && (
                    <>
                      <Button variant="outline" onClick={() => openPreop(s)} className="min-h-[30px] px-2.5 py-1 text-[11px]">
                        Edit plan
                      </Button>
                      <Button onClick={() => markDone(s)} className="min-h-[30px] px-2.5 py-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark surgery done
                      </Button>
                    </>
                  )}
                  {stage === 'DONE' && (
                    <span className="text-[11px] font-medium text-emerald-600">Completed {fmtDate(s.surgeryDate)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* pre-op + scheduling dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-xl bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-zinc-100 px-5 py-4">
            <DialogTitle className="text-[15px] font-semibold text-zinc-900">
              Pre-op & schedule — {editing?.patient?.name ?? ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Workup, biometry, lens planning and surgery date for the case.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Surgery eye">
                <FSelect value={draft.eye} onChange={(e) => setDraft({ ...draft, eye: e.target.value })}>
                  {EYES.filter((e) => e.value !== 'NA').map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </FSelect>
              </Field>
              <Field label="Surgery date">
                <FInput type="date" value={draft.surgeryDate} onChange={(e) => setDraft({ ...draft, surgeryDate: e.target.value })} />
              </Field>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Workup</span>
                <Toggle
                  checked={draft.workupDone}
                  onChange={(v) => setDraft({ ...draft, workupDone: v })}
                  label={draft.workupDone ? 'Done' : 'Pending'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="BP (mmHg)">
                  <FInput value={draft.bp} onChange={(e) => setDraft({ ...draft, bp: e.target.value })} placeholder="120/80" />
                </Field>
                <Field label="Blood sugar (mg/dL)">
                  <FInput type="number" value={draft.bs} onChange={(e) => setDraft({ ...draft, bs: e.target.value })} placeholder="110" />
                </Field>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3">
              <span className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Biometry</span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Axial length (mm)">
                  <FInput type="number" step="0.01" value={draft.axialLength} onChange={(e) => setDraft({ ...draft, axialLength: e.target.value })} placeholder="23.5" />
                </Field>
                <Field label="K1 (D)">
                  <FInput type="number" step="0.01" value={draft.k1} onChange={(e) => setDraft({ ...draft, k1: e.target.value })} placeholder="43.5" />
                </Field>
                <Field label="K2 (D)">
                  <FInput type="number" step="0.01" value={draft.k2} onChange={(e) => setDraft({ ...draft, k2: e.target.value })} placeholder="44.2" />
                </Field>
                <Field label="IOL power (D)">
                  <FInput type="number" step="0.5" value={draft.iolPower} onChange={(e) => setDraft({ ...draft, iolPower: e.target.value })} placeholder="+21.0" />
                </Field>
              </div>
            </div>

            <Field label="Plan lens (from stock)">
              <FSelect value={draft.plannedLensId} onChange={(e) => setDraft({ ...draft, plannedLensId: e.target.value })}>
                <option value="">— No lens selected —</option>
                {LENS_GROUPED(lenses).map(([type, group]) => (
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
            {selectedLens && (
              <div className="rounded-md bg-zinc-50 px-3 py-2 font-mono text-[10.5px] text-zinc-600">
                A-constant: {selectedLens.aConstant ?? '—'} · expiry {fmtDate(selectedLens.expiryDate)} · {selectedLens.quantity} in stock
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3.5">
            <Button variant="outline" onClick={() => setEditId(null)} disabled={busy}>Cancel</Button>
            <Button onClick={savePreop} disabled={busy}>Save plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
