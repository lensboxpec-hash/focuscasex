'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Patient, fmtDate } from './types'
import { Chip, EyeBadge, SectionHead, Button, Empty } from './ui-bits'
import { PatientFormDialog } from './patient-form'
import { PatientDetailSheet } from './patient-detail'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, FolderOpen } from 'lucide-react'

export function PatientsView({
  openRegister,
  onConsumeRegister,
  focusPatientId,
  onConsumeFocus,
}: {
  openRegister: boolean
  onConsumeRegister: () => void
  focusPatientId?: string | null
  onConsumeFocus?: () => void
}) {
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [lastRegister, setLastRegister] = useState(false)

  const load = useCallback((query: string) => {
    setLoading(true)
    fetch(`/api/patients?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(q), q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, load])

  // Open the register dialog when the parent quick-action fires (render-time adjustment — local state only)
  if (openRegister !== lastRegister) {
    setLastRegister(openRegister)
    if (openRegister) {
      setEditing(null)
      setFormOpen(true)
    }
  }

  // Clear the parent's register flag after consuming it (parent update from effect is safe)
  useEffect(() => {
    if (openRegister) onConsumeRegister?.()
  }, [openRegister, onConsumeRegister])

  // Open a patient detail sheet when a global-search pick lands on this tab
  // (render-time adjustment — local state only)
  const [lastFocus, setLastFocus] = useState<string | null>(null)
  if (focusPatientId !== lastFocus) {
    setLastFocus(focusPatientId ?? null)
    if (focusPatientId) {
      setDetailId(focusPatientId)
    }
  }

  // Clear the parent's focus flag after consuming it (parent update from effect is safe)
  useEffect(() => {
    if (focusPatientId) onConsumeFocus?.()
  }, [focusPatientId, onConsumeFocus])

  const refresh = useCallback(() => load(q), [load, q])

  const cataractCount = useMemo(
    () => patients.filter((p) => p.cataractEye !== 'NONE').length,
    [patients]
  )
  const pterygiumCount = useMemo(
    () => patients.filter((p) => p.pterygiumEye !== 'NONE').length,
    [patients]
  )

  return (
    <div className="space-y-4">
      <SectionHead
        title={`Patient Registry — ${patients.length}`}
        right={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Register patient
          </Button>
        }
      />

      <div className="card flex items-center gap-2 px-3 py-1">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, MRN or phone…"
          className="w-full bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        {cataractCount > 0 && (
          <Chip bg="#0d9488" className="hidden shrink-0 sm:inline-flex">{cataractCount} cataract</Chip>
        )}
        {pterygiumCount > 0 && (
          <Chip bg="#db2777" className="hidden shrink-0 sm:inline-flex">{pterygiumCount} pterygium</Chip>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-zinc-50" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Empty>No patients found — register the first patient</Empty>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="card hidden overflow-hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">MRN</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Name</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Age / Sex</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Phone</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Cataract</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pterygium</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Last Visit</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Records</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-zinc-50"
                      onClick={() => setDetailId(p.id)}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-zinc-500">{p.mrn}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-zinc-900">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{p.age} / {p.gender[0]}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-600">{p.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.cataractEye === 'NONE' ? (
                          <span className="text-zinc-300">—</span>
                        ) : (
                          <EyeBadge eye={p.cataractEye} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.pterygiumEye === 'NONE' ? (
                          <span className="text-zinc-300">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Chip bg="#db2777">{p.pterygiumEye}</Chip>
                            <span className="font-mono text-[10px] font-medium text-zinc-400">{p.pterygiumGrade}</span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-zinc-500">
                        {p.appointments?.[0] ? fmtDate(p.appointments[0].date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-zinc-500">
                        <span className="mr-1.5">{p._count?.visionRecords ?? 0}V</span>
                        <span className="mr-1.5">{p._count?.sessions ?? 0}C</span>
                        <span>{p._count?.appointments ?? 0}A</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FolderOpen className="ml-auto h-4 w-4 text-zinc-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setDetailId(p.id)}
                className="card lift p-3.5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[10px] font-semibold text-zinc-400">{p.mrn}</div>
                  <div className="flex gap-1">
                    {p.cataractEye !== 'NONE' && <EyeBadge eye={p.cataractEye} />}
                    {p.pterygiumEye !== 'NONE' && <Chip bg="#db2777">PTG {p.pterygiumEye}</Chip>}
                  </div>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-zinc-900">{p.name}</div>
                <div className="mt-1 text-[11px] font-medium text-zinc-500">
                  {p.age}Y · {p.gender} · {p.phone ?? 'No phone'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Chip>{p._count?.visionRecords ?? 0} Vision</Chip>
                  <Chip>{p._count?.sessions ?? 0} Counsel</Chip>
                  <Chip>{p._count?.appointments ?? 0} Appts</Chip>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <PatientFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={(msg) => {
          setFormOpen(false)
          toast({ title: msg })
          refresh()
        }}
      />

      <PatientDetailSheet
        patientId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onEdit={(p) => {
          setDetailId(null)
          setEditing(p)
          setFormOpen(true)
        }}
        onChanged={(msg) => {
          toast({ title: msg })
          refresh()
        }}
      />
    </div>
  )
}
