'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Appointment, Pkg, Patient, APPT_PROCEDURES, APPT_STATUSES, EYES, APPT_STATUS_COLOR, APPT_PROC_COLOR, TINT, fmtDate, fmtTime12, ymd, parseYmd } from './types'
import {
  Chip, EyeBadge, ApptStatusChip, ApptProcChip, SectionHead, Button, FInput, FSelect, FTextarea, Field, Empty,
} from './ui-bits'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type Draft = {
  patientId: string
  date: string
  time: string
  procedureType: string
  eye: string
  packageId: string
  status: string
  notes: string
}

export function CalendarView({
  focusDate,
  onConsumeFocus,
}: {
  focusDate?: string | null
  onConsumeFocus?: () => void
}) {
  const { toast } = useToast()
  const [cursor, setCursor] = useState(() => (focusDate ? parseYmd(focusDate) : new Date()))
  const [selected, setSelected] = useState(() => focusDate ?? ymd(new Date()))
  const [appts, setAppts] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)

  // Jump to a date chosen via global search (render-time adjustment — local state only)
  const [lastFocus, setLastFocus] = useState<string | null | undefined>(focusDate)
  if (focusDate !== lastFocus) {
    setLastFocus(focusDate)
    if (focusDate) {
      const d = parseYmd(focusDate)
      setCursor(d)
      setSelected(ymd(d))
    }
  }

  // Clear the parent's focus flag after consuming it (parent update from effect is safe)
  useEffect(() => {
    if (focusDate) onConsumeFocus?.()
  }, [focusDate, onConsumeFocus])

  // Month range for fetch (Mon-Sun grid can span 6 weeks; pad by a week on both sides)
  const range = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(start.getDate() - 7)
    const end = new Date(first)
    end.setMonth(end.getMonth() + 1)
    end.setDate(end.getDate() + 7)
    return { from: ymd(start), to: ymd(end) }
  }, [cursor])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/appointments?from=${range.from}&to=${range.to}`).then((r) => r.json()),
      fetch('/api/patients').then((r) => r.json()),
      fetch('/api/packages').then((r) => r.json()),
    ])
      .then(([a, p, pk]) => {
        setAppts(a)
        setPatients(p)
        setPackages(pk)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  // Build Mon-Sun month grid
  const grid = useMemo(() => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const first = new Date(y, m, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday = 0
    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(y, m, 1 - (startOffset - i))
      cells.push({ date: d, inMonth: false })
    }
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), inMonth: true })
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      const d = new Date(last)
      d.setDate(d.getDate() + 1)
      cells.push({ date: d, inMonth: false })
    }
    return cells
  }, [cursor])

  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    appts.forEach((a) => {
      const k = ymd(new Date(a.date))
      ;(map[k] ??= []).push(a)
    })
    Object.values(map).forEach((list) => list.sort((x, z) => x.time.localeCompare(z.time)))
    return map
  }, [appts])

  const dayList = byDay[selected] ?? []

  function openNew(date?: string) {
    setEditing(null)
    setDraft({
      patientId: '', date: date ?? selected, time: '09:00', procedureType: 'CONSULTATION',
      eye: 'NA', packageId: '', status: 'SCHEDULED', notes: '',
    })
    setFormOpen(true)
  }

  function openEdit(a: Appointment) {
    setEditing(a)
    setDraft({
      patientId: a.patientId, date: ymd(new Date(a.date)), time: a.time, procedureType: a.procedureType,
      eye: a.eye, packageId: a.packageId ?? '', status: a.status, notes: a.notes ?? '',
    })
    setFormOpen(true)
  }

  async function save() {
    if (!draft || !draft.patientId) return
    try {
      const res = await fetch(editing ? `/api/appointments/${editing.id}` : '/api/appointments', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, packageId: draft.packageId || null }),
      })
      if (!res.ok) throw new Error()
      toast({ title: editing ? 'Appointment updated' : 'Appointment booked' })
      setFormOpen(false)
      load()
    } catch {
      alert('Could not save the appointment.')
    }
  }

  async function setStatus(a: Appointment, status: string) {
    await fetch(`/api/appointments/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    toast({ title: `Appointment → ${status.replaceAll('_', ' ')}` })
    load()
  }

  async function remove(a: Appointment) {
    if (!confirm(`Delete appointment for ${a.patient?.name} on ${fmtDate(a.date)}?`)) return
    await fetch(`/api/appointments/${a.id}`, { method: 'DELETE' })
    toast({ title: 'Appointment deleted' })
    load()
  }

  const todayKey = ymd(new Date())

  return (
    <div className="space-y-4">
      <SectionHead
        title="Calendar & Procedures"
        right={
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> Book appointment
          </Button>
        }
      />

      {/* MONTH NAV */}
      <div className="card flex flex-wrap items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold tracking-tight text-zinc-900 sm:text-base">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
          <div className="font-mono text-[10px] font-medium text-zinc-400">
            {Object.keys(byDay).filter((k) => k.startsWith(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)).length} active days ·{' '}
            {appts.length} appointments in range
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={selected}
            onChange={(e) => {
              if (!e.target.value) return
              const d = parseYmd(e.target.value)
              setCursor(d)
              setSelected(ymd(d))
            }}
            aria-label="Jump to date"
            title="Jump to date"
            className="f-input h-[30px] w-[130px] cursor-pointer py-0 text-[11px]"
          />
          <Button variant="outline" className="hidden sm:inline-flex" onClick={() => { setCursor(new Date()); setSelected(todayKey) }}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* MONTH GRID */}
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {DOW.map((d) => (
              <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map(({ date, inMonth }, i) => {
              const k = ymd(date)
              const list = byDay[k] ?? []
              const isSel = k === selected
              const isToday = k === todayKey
              return (
                <button
                  key={i}
                  onClick={() => setSelected(k)}
                  onDoubleClick={() => openNew(k)}
                  className={cn(
                    'relative min-h-[64px] border-b border-r border-zinc-100 p-1.5 text-left transition-colors sm:min-h-[92px]',
                    (i + 1) % 7 === 0 ? 'border-r-0' : '',
                    isSel
                      ? 'bg-white ring-2 ring-inset ring-zinc-900'
                      : inMonth
                        ? 'bg-white hover:bg-zinc-50'
                        : 'bg-zinc-50/60 text-zinc-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[11px] font-semibold',
                        isToday ? 'bg-zinc-900 text-white' : inMonth ? 'text-zinc-700' : 'text-zinc-300'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {list.length > 0 && (
                      <span className="rounded bg-zinc-100 px-1 font-mono text-[9px] font-semibold text-zinc-500">{list.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((a) => {
                      const t = TINT_BY_PROC(a.procedureType)
                      return (
                        <div
                          key={a.id}
                          className="hidden truncate rounded-sm border px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide sm:block"
                          style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
                        >
                          {a.time} {a.procedureType.replaceAll('_', ' ')}
                        </div>
                      )
                    })}
                    {list.length > 3 && (
                      <div className="hidden text-[8px] font-semibold text-zinc-400 sm:block">+{list.length - 3} more</div>
                    )}
                    {/* mobile dots */}
                    <div className="flex gap-0.5 sm:hidden">
                      {list.slice(0, 5).map((a) => (
                        <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: APPT_PROC_COLOR[a.procedureType] ?? '#a1a1aa' }} />
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* DAY AGENDA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900">
              <span className="inline-block h-4 w-[3px] rounded-full bg-zinc-900" aria-hidden />
              <span className="font-mono text-[13px]">{fmtDate(selected)}</span>
            </h3>
            <Button variant="ghost" className="min-h-[28px] px-2 py-1 text-[11px]" onClick={() => openNew(selected)}>
              <Plus className="h-3.5 w-3.5" /> Book
            </Button>
          </div>
          {dayList.length === 0 ? (
            <Empty>No appointments on this day</Empty>
          ) : (
            <div className="space-y-2">
              {dayList.map((a) => (
                <div key={a.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="rounded-md bg-zinc-900 px-2 py-1 font-mono text-[11px] font-semibold text-white">{fmtTime12(a.time)}</div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} title="Edit" className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(a)} title="Delete" className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-zinc-900">{a.patient?.name ?? '—'}</div>
                  <div className="font-mono text-[10px] font-medium text-zinc-400">
                    {a.patient?.mrn} · {a.duration} min
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ApptProcChip type={a.procedureType} />
                    {a.eye !== 'NA' && <EyeBadge eye={a.eye} />}
                    {a.package && <Chip>{a.package.name}</Chip>}
                    <ApptStatusChip status={a.status} />
                  </div>
                  {a.notes && <div className="mt-2 border-t border-dashed border-zinc-200 pt-1.5 text-[11px] text-zinc-500">{a.notes}</div>}
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-100 pt-2">
                    {APPT_STATUSES.filter((st) => st !== a.status).map((st) => {
                      const t = TINT_BY_APPT_STATUS(st)
                      return (
                        <button
                          key={st}
                          onClick={() => setStatus(a, st)}
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
              ))}
            </div>
          )}

          {/* LEGEND */}
          <div className="card space-y-1.5 p-3.5">
            <div className="f-label mb-1">Procedure Colors</div>
            {Object.entries(APPT_PROC_COLOR).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span className="inline-block h-2.5 w-6 rounded-full" style={{ backgroundColor: v }} />
                {k.replaceAll('_', ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOOKING DIALOG */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-xl">
          <div className="border-b border-zinc-200 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">
                {editing ? 'Edit Appointment' : 'Book Appointment'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Procedure · which eye · package · slot
              </DialogDescription>
            </DialogHeader>
          </div>
          {draft && (
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Patient *">
                  <FSelect value={draft.patientId} onChange={(e) => setDraft({ ...draft, patientId: e.target.value })}>
                    <option value="">— Select patient —</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>
                    ))}
                  </FSelect>
                </Field>
                <Field label="Procedure">
                  <FSelect value={draft.procedureType} onChange={(e) => setDraft({ ...draft, procedureType: e.target.value })}>
                    {APPT_PROCEDURES.map((p) => (
                      <option key={p} value={p}>{p.replaceAll('_', ' ')}</option>
                    ))}
                  </FSelect>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Date">
                  <FInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </Field>
                <Field label="Time">
                  <FInput type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                </Field>
                <Field label="Which Eye">
                  <FSelect value={draft.eye} onChange={(e) => setDraft({ ...draft, eye: e.target.value })}>
                    {EYES.map((e) => (
                      <option key={e.value} value={e.value}>{e.value}</option>
                    ))}
                  </FSelect>
                </Field>
                <Field label="Status">
                  <FSelect value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                    {APPT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                    ))}
                  </FSelect>
                </Field>
              </div>

              <Field label="Link Package (optional)">
                <FSelect value={draft.packageId} onChange={(e) => setDraft({ ...draft, packageId: e.target.value })}>
                  <option value="">— No package —</option>
                  {packages.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · ₹{p.finalPrice.toLocaleString('en-IN')}</option>
                  ))}
                </FSelect>
              </Field>

              <Field label="Notes / Prep Instructions">
                <FTextarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Fasting, admission time, dilation…" />
              </Field>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={!draft.patientId}>
                  {editing ? 'Save changes' : 'Book appointment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TINT_BY_PROC(type: string) {
  const key: Record<string, string> = {
    CONSULTATION: 'gray', CATARACT_SURGERY: 'yellow', PTERYGIUM_SURGERY: 'pink', FOLLOW_UP: 'orange',
    POST_OP: 'cyan', LASER: 'red', RETINA_EVAL: 'green',
  }
  return TINT[key[type] ?? 'gray']
}

function TINT_BY_APPT_STATUS(status: string) {
  const key: Record<string, string> = {
    SCHEDULED: 'yellow', CONFIRMED: 'cyan', COMPLETED: 'green', CANCELLED: 'red', NO_SHOW: 'gray',
  }
  return TINT[key[status] ?? 'gray']
}
