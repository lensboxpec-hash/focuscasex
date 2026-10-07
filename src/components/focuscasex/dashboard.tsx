'use client'

import { useEffect, useState } from 'react'
import { Stats, fmtINR, fmtTime12, fmtDate, ACCENT, daysUntil, COUNSEL_PROC_COLOR } from './types'
import {
  StatBlock, SectionHead, EyeBadge, ApptStatusChip, ApptProcChip, StatusChip, ProcChip, Chip, Empty, Button,
} from './ui-bits'
import { CalendarDays, Users, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dashboard({
  onGoPatients,
  onGoCounseling,
  onGoCalendar,
  role,
}: {
  onGoPatients: () => void
  onGoCounseling: () => void
  onGoCalendar: () => void
  role?: string
}) {
  const showMoney = role !== 'STAFF'
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME' | 'CUSTOM'>('THIS_MONTH')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    let live = true
    const params = new URLSearchParams({ preset })
    if (preset === 'CUSTOM') {
      if (customFrom) params.set('from', customFrom)
      if (customTo) params.set('to', customTo)
    }
    fetch(`/api/stats?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => live && setStats(d))
      .catch(() => {})
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [preset, customFrom, customTo])

  const rangeLabel: Record<string, string> = {
    THIS_MONTH: 'This month',
    LAST_MONTH: 'Last month',
    ALL_TIME: 'All time',
    CUSTOM: 'Custom range',
  }

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-[96px] animate-pulse bg-zinc-50" />
        ))}
      </div>
    )
  }

  const today = new Date()
  const mixMax = Math.max(1, ...stats.procedureMix.map((m) => m.count))

  return (
    <div className="space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatBlock label="Total Patients" value={stats.totalPatients} sub={`${stats.cataractPatients} cataract · ${stats.pterygiumPatients} pterygium`} />
        <StatBlock label="Today's Schedule" value={stats.todayAppointments} accent={ACCENT.cyan} sub={fmtDate(today)} />
        <StatBlock label="Follow-ups Due" value={stats.followUpsDue} accent={stats.followUpsDue > 0 ? ACCENT.orange : undefined} sub="Counseling pipeline" />
        <StatBlock label="Conversion" value={`${stats.conversionRate}%`} sub="In selected range" />
        {showMoney && (
          <>
            <StatBlock label="Revenue" value={fmtINR(stats.revenueRange)} accent={ACCENT.green} sub="Closed in range" />
            <StatBlock label="Collected" value={fmtINR(stats.collectedTotal)} accent={ACCENT.green} sub="Payments received" />
            <StatBlock label="Outstanding" value={fmtINR(stats.outstanding)} accent={stats.outstanding > 0 ? ACCENT.red : undefined} sub="Balance to collect" />
            <StatBlock label="Pipeline Value" value={fmtINR(stats.pipelineValue)} accent={ACCENT.yellow} sub="Pending + follow-up" />
          </>
        )}
      </div>

      {/* RANGE STATISTICS */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHead title="Counseling Statistics" />
          <div className="flex flex-wrap items-center gap-1.5">
            {(['THIS_MONTH', 'LAST_MONTH', 'ALL_TIME', 'CUSTOM'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                  preset === p
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'
                )}
              >
                {p === 'THIS_MONTH' ? 'This month' : p === 'LAST_MONTH' ? 'Last month' : p === 'ALL_TIME' ? 'All time' : 'Custom'}
              </button>
            ))}
            {preset === 'CUSTOM' && (
              <span className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="f-input h-8 rounded-md border border-zinc-200 px-2 text-[11px]"
                />
                <span className="text-[10px] font-semibold uppercase text-zinc-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="f-input h-8 rounded-md border border-zinc-200 px-2 text-[11px]"
                />
              </span>
            )}
          </div>
        </div>
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <StatBlock label="Cases counselled" value={stats.rangeStats.counselled} accent={ACCENT.cyan} sub={rangeLabel[stats.rangeStats.label]} />
              <StatBlock label="Surgeries done" value={stats.rangeStats.surgeriesDone} accent={ACCENT.green} sub={rangeLabel[stats.rangeStats.label]} />
              <StatBlock label="Converted" value={stats.rangeStats.converted} accent={ACCENT.yellow} sub={`${stats.rangeStats.conversionRate}% conversion`} />
              <StatBlock label="Willing (open)" value={stats.rangeStats.willing} accent={ACCENT.green} sub="Awaiting closure" />
              <StatBlock label="Not willing" value={stats.rangeStats.notWilling} accent={ACCENT.red} sub="Declined in range" />
              {showMoney ? (
                <StatBlock label="Revenue" value={fmtINR(stats.rangeStats.revenue)} accent={ACCENT.green} sub="Closed amount in range" />
              ) : (
                <StatBlock label="Closed" value={stats.rangeStats.converted} accent={ACCENT.green} sub="Cases closed in range" />
              )}
            </div>
            {/* all-time strip */}
            <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 font-mono text-[11px] text-zinc-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">All time:</span>
              <span>patients <b className="text-zinc-900">{stats.allTime.patients}</b></span>
              <span>counselled <b className="text-zinc-900">{stats.allTime.counselled}</b></span>
              <span>surgeries <b className="text-zinc-900">{stats.allTime.surgeriesDone}</b></span>
              <span>converted <b className="text-zinc-900">{stats.allTime.converted}</b></span>
              {showMoney && <span>revenue <b className="text-zinc-900">{fmtINR(stats.allTime.revenue)}</b></span>}
            </div>
          </>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* TODAY'S SCHEDULE */}
        <section className="space-y-3">
          <SectionHead
            title="Today's Schedule"
            right={
              <Button variant="outline" onClick={onGoCalendar} className="min-h-[30px] px-2 py-1 text-[11px]">
                <CalendarDays className="h-3.5 w-3.5" /> Calendar
              </Button>
            }
          />
          {stats.todayList.length === 0 ? (
            <Empty>No appointments today — the OT is cold</Empty>
          ) : (
            <div className="card divide-y divide-zinc-100 overflow-hidden p-0">
              {stats.todayList.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 p-3 transition-colors hover:bg-zinc-50">
                  <div className="w-[76px] shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-center font-mono text-[11px] font-semibold text-white">
                    {fmtTime12(a.time)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-zinc-900">{a.patient?.name ?? '—'}</div>
                    <div className="font-mono text-[10px] font-medium text-zinc-400">{a.patient?.mrn}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ApptProcChip type={a.procedureType} />
                    {a.eye !== 'NA' && <EyeBadge eye={a.eye} />}
                    <ApptStatusChip status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOLLOW-UPS DUE */}
        <section className="space-y-3">
          <SectionHead
            title="Counseling Follow-ups"
            right={
              <Button variant="outline" onClick={onGoCounseling} className="min-h-[30px] px-2 py-1 text-[11px]">
                <ArrowRight className="h-3.5 w-3.5" /> Pipeline
              </Button>
            }
          />
          {stats.followUpList.length === 0 ? (
            <Empty>No pending follow-ups — pipeline is clear</Empty>
          ) : (
            <div className="space-y-2">
              {stats.followUpList.map((s) => {
                const du = daysUntil(s.followUpDate)
                const overdue = du !== null && du < 0
                return (
                  <div
                    key={s.id}
                    className={`card lift flex flex-wrap items-center gap-2 p-3 ${overdue ? 'border-red-200 bg-red-50/40' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-zinc-900">{s.patient?.name ?? '—'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <ProcChip type={s.procedureType} />
                        <EyeBadge eye={s.eye} />
                        {s.recommendedPackage && <Chip>{s.recommendedPackage.name}</Chip>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono text-[11px] font-semibold ${overdue ? 'text-red-600' : 'text-zinc-700'}`}
                      >
                        {overdue ? 'Overdue' : du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : fmtDate(s.followUpDate)}
                      </div>
                      {showMoney && <div className="font-mono text-[10px] font-medium text-zinc-400">{fmtINR(s.quotedAmount)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* CASE MIX */}
      <section className="space-y-3">
        <SectionHead title="Case Mix — This Month" />
        {stats.procedureMix.length === 0 ? (
          <Empty>No counseling sessions logged this month yet</Empty>
        ) : (
          <div className="card space-y-2.5 p-4">
            {stats.procedureMix.map((m) => {
              const color = COUNSEL_PROC_COLOR[m.type] ?? ACCENT.gray
              return (
                <div key={m.type} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 sm:w-28">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {m.type.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-sm bg-zinc-100">
                    <div
                      className="flex h-full items-center justify-end rounded-sm pr-1.5 transition-all"
                      style={{ width: `${Math.max(8, (m.count / mixMax) * 100)}%`, backgroundColor: color }}
                    >
                      <span className="font-mono text-[9px] font-bold text-white/95">{m.count}</span>
                    </div>
                  </div>
                  {showMoney && (
                    <div className="w-20 shrink-0 text-right font-mono text-[10px] font-medium text-zinc-400">
                      {fmtINR(m.value)}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 font-mono text-[10px] font-medium text-zinc-400">
              <span>Bar = sessions{showMoney ? ' · right = quoted value' : ''}</span>
              <span>{stats.procedureMix.reduce((s, m) => s + m.count, 0)} sessions MTD</span>
            </div>
          </div>
        )}
      </section>

      {/* RECENT COUNSELING */}
      <section className="space-y-3">
        <SectionHead
          title="Recent Counseling Sessions"
          right={
            <Button variant="outline" onClick={onGoPatients} className="min-h-[30px] px-2 py-1 text-[11px]">
              <Users className="h-3.5 w-3.5" /> All patients
            </Button>
          }
        />
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Patient</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Procedure</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Eye</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Package</th>
                  {showMoney && (
                    <>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Billed</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Paid</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stats.recentSessions.map((s) => {
                  const bal = Math.max(0, (s.finalAmount > 0 ? s.finalAmount : s.quotedAmount) - (s.paidAmount ?? 0))
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-zinc-500">{fmtDate(s.date)}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-zinc-900">{s.patient?.name}</td>
                      <td className="px-4 py-3"><ProcChip type={s.procedureType} /></td>
                      <td className="px-4 py-3"><EyeBadge eye={s.eye} /></td>
                      <td className="px-4 py-3 text-zinc-600">{s.recommendedPackage?.name ?? '—'}</td>
                      {showMoney && (
                        <>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] font-semibold text-zinc-900">{fmtINR(s.finalAmount > 0 ? s.finalAmount : s.quotedAmount)}</td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] font-semibold ${bal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {fmtINR(s.paidAmount ?? 0)}{bal > 0 ? ' ←' : ' ✓'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3"><StatusChip status={s.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* LEGEND */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.yellow }} /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.orange }} /> Follow-up</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.cyan }} /> Converted / Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.green }} /> Completed / Paid</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.red }} /> Lost / Due</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ACCENT.pink }} /> Pterygium</span>
      </div>
    </div>
  )
}
