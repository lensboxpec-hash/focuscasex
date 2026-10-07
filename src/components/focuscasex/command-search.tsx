'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Pkg } from './types'
import { EyeBadge, Chip } from './ui-bits'
import { fmtINR, fmtDate, fmtTime12 } from './types'
import { Search, User, Package, MessagesSquare, CalendarDays, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SearchResultPatient = {
  id: string; name: string; mrn: string; age: number; gender: string
  phone: string | null; cataractEye: string; pterygiumEye: string
}
export type SearchResultPackage = Pick<Pkg, 'id' | 'name' | 'category' | 'finalPrice' | 'active'>
export type SearchResultSession = {
  id: string; date: string; procedureType: string; eye: string; status: string
  quotedAmount: number; patient?: { id: string; name: string; mrn: string }
}
export type SearchResultAppointment = {
  id: string; date: string; time: string; procedureType: string; eye: string; status: string
  patient?: { id: string; name: string; mrn: string }
}
export type SearchResponse = {
  patients: SearchResultPatient[]
  packages: SearchResultPackage[]
  sessions: SearchResultSession[]
  appointments: SearchResultAppointment[]
}

export type SearchTarget =
  | { kind: 'PATIENT'; id: string }
  | { kind: 'PACKAGE'; id: string }
  | { kind: 'SESSION'; id: string }
  | { kind: 'APPOINTMENT'; id: string; date: string }

const EMPTY: SearchResponse = { patients: [], packages: [], sessions: [], appointments: [] }

export function CommandSearch({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (t: SearchTarget) => void
}) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResponse>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset query + results when the dialog opens (render-time adjustment)
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setQ('')
      setRes(EMPTY)
      setActive(0)
    }
  }

  // Debounced search
  useEffect(() => {
    if (!open) return
    const query = q.trim()
    if (query.length < 2) {
      const t = setTimeout(() => {
        setRes(EMPTY)
        setLoading(false)
      }, 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setRes(d ?? EMPTY))
        .catch(() => setRes(EMPTY))
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(t)
  }, [q, open])

  // Autofocus the input once mounted
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Flattened rows for keyboard navigation
  const rows = useMemo<{ key: string; group: string; target: SearchTarget; node: React.ReactNode }[]>(() => {
    const out: { key: string; group: string; target: SearchTarget; node: React.ReactNode }[] = []
    res.patients.forEach((p) =>
      out.push({
        key: `p-${p.id}`,
        group: 'Patients',
        target: { kind: 'PATIENT', id: p.id },
        node: (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-900">{p.name}</span>
              <span className="block truncate font-mono text-[10px] text-zinc-400">
                {p.mrn} · {p.age}Y {p.gender[0]} · {p.phone ?? 'no phone'}
              </span>
            </span>
            <span className="flex shrink-0 gap-1">
              {p.cataractEye !== 'NONE' && <Chip bg="#0d9488">CAT {p.cataractEye}</Chip>}
              {p.pterygiumEye !== 'NONE' && <Chip bg="#db2777">PTG {p.pterygiumEye}</Chip>}
            </span>
          </>
        ),
      })
    )
    res.packages.forEach((p) =>
      out.push({
        key: `pk-${p.id}`,
        group: 'Packages',
        target: { kind: 'PACKAGE', id: p.id },
        node: (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500">
              <Package className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-900">{p.name}</span>
              <span className="block truncate text-[10px] text-zinc-400">{p.category}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] font-semibold text-zinc-700">{fmtINR(p.finalPrice)}</span>
          </>
        ),
      })
    )
    res.sessions.forEach((s) =>
      out.push({
        key: `s-${s.id}`,
        group: 'Counseling sessions',
        target: { kind: 'SESSION', id: s.id },
        node: (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500">
              <MessagesSquare className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-900">{s.patient?.name ?? '—'}</span>
              <span className="block truncate font-mono text-[10px] text-zinc-400">
                {fmtDate(s.date)} · {s.patient?.mrn}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Chip bg="#d97706">{s.procedureType.replaceAll('_', ' ')}</Chip>
              {s.eye !== 'NA' && <EyeBadge eye={s.eye} />}
            </span>
          </>
        ),
      })
    )
    res.appointments.forEach((a) =>
      out.push({
        key: `a-${a.id}`,
        group: 'Appointments',
        target: { kind: 'APPOINTMENT', id: a.id, date: a.date },
        node: (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-900">{a.patient?.name ?? '—'}</span>
              <span className="block truncate font-mono text-[10px] text-zinc-400">
                {fmtDate(a.date)} · {fmtTime12(a.time)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Chip bg="#d97706">{a.procedureType.replaceAll('_', ' ')}</Chip>
              {a.eye !== 'NA' && <EyeBadge eye={a.eye} />}
            </span>
          </>
        ),
      })
    )
    return out
  }, [res])

  const pick = useCallback(
    (i: number) => {
      const row = rows[i]
      if (!row) return
      onOpenChange(false)
      onPick(row.target)
    },
    [rows, onOpenChange, onPick]
  )

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(active)
    }
  }

  // Scroll active row into view
  useEffect(() => {
    const el = document.getElementById('cmd-row-active')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const total = rows.length
  let lastGroup = ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[8%] max-h-[76vh] translate-y-0 gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:top-[10%] sm:max-w-xl"
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>Search patients, packages, sessions and appointments</DialogDescription>
        </DialogHeader>

        {/* INPUT */}
        <div className="flex items-center gap-2.5 border-b border-zinc-200 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            placeholder="Search patients, MRN, phone, packages…"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            aria-label="Global search"
          />
          <kbd className="hidden shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400 sm:block">
            ESC
          </kbd>
        </div>

        {/* RESULTS */}
        <div className="max-h-[54vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <div className="px-3 py-8 text-center">
              <Search className="mx-auto h-6 w-6 text-zinc-200" />
              <p className="mt-2 text-xs font-medium text-zinc-400">
                Type at least 2 characters — search across the whole clinic
              </p>
              <div className="mx-auto mt-3 grid max-w-xs grid-cols-2 gap-1.5 text-left">
                {['Try a patient name', 'Try an MRN (FC-…)', 'Try a phone number', 'Try a package name'].map((h) => (
                  <div key={h} className="rounded-md border border-zinc-100 bg-zinc-50/60 px-2 py-1.5 text-[10px] font-medium text-zinc-400">
                    {h}
                  </div>
                ))}
              </div>
            </div>
          ) : loading && total === 0 ? (
            <div className="space-y-1.5 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-md bg-zinc-50" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="px-3 py-10 text-center text-xs font-medium text-zinc-400">
              No matches for “{q.trim()}”
            </div>
          ) : (
            <div>
              {rows.map((row, i) => {
                const showGroup = row.group !== lastGroup
                lastGroup = row.group
                const isActive = i === active
                return (
                  <div key={row.key}>
                    {showGroup && (
                      <div className="px-2 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        {row.group}
                      </div>
                    )}
                    <button
                      id={isActive ? 'cmd-row-active' : undefined}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(i)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md border px-2 py-2 text-left transition-colors',
                        isActive ? 'border-zinc-200 bg-zinc-100/80' : 'border-transparent hover:bg-zinc-50'
                      )}
                    >
                      {row.node}
                      {isActive && <CornerDownLeft className="h-3 w-3 shrink-0 text-zinc-400" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* FOOTER HINTS */}
        <div className="flex items-center gap-3 border-t border-zinc-200 bg-zinc-50/60 px-4 py-2 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-zinc-200 bg-white px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-zinc-200 bg-white px-1 font-mono">↵</kbd> open
          </span>
          <span className="ml-auto hidden font-mono sm:block">{loading ? 'searching…' : `${total} result${total === 1 ? '' : 's'}`}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
