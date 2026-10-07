'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LensStock, LENS_TYPES, LENS_TYPE_COLOR, lensTypeLabel, fmtDate, TINT, isCatalogLens } from './types'
import { SectionHead, Button, FInput, FSelect, FTextarea, Field, Chip, Empty } from './ui-bits'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Search, Boxes, AlertTriangle, CalendarClock, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

type Draft = {
  name: string
  type: string
  manufacturer: string
  model: string
  aConstant: string
  powerSph: string
  powerCyl: string
  batchNo: string
  expiryDate: string
  quantity: string
  minStock: string
  notes: string
}

const emptyDraft: Draft = {
  name: '', type: 'MONOFOCAL', manufacturer: '', model: '', aConstant: '',
  powerSph: '', powerCyl: '', batchNo: '', expiryDate: '', quantity: '', minStock: '2', notes: '',
}

const daysTo = (d: string | null) => {
  if (!d) return null
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000)
}

function TypeChip({ type }: { type: string }) {
  const tintKey =
    type === 'MONOFOCAL' ? 'cyan' : type === 'MULTIFOCAL' ? 'yellow' : type === 'TRIFOCAL' ? 'green'
    : type === 'TORIC' ? 'pink' : type === 'BIFOCAL' ? 'orange' : 'red'
  const t = TINT[tintKey]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg, borderColor: t.br }}
    >
      {lensTypeLabel(type)}
    </span>
  )
}

export function LensView({ role }: { role?: string }) {
  const canEdit = role === 'ADMIN'
  const { toast } = useToast()
  const [lenses, setLenses] = useState<LensStock[]>([])
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/lenses')
      .then((r) => r.json())
      .then(setLenses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = typeFilter === 'ALL' ? lenses : lenses.filter((l) => l.type === typeFilter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(needle) ||
          (l.manufacturer ?? '').toLowerCase().includes(needle) ||
          (l.model ?? '').toLowerCase().includes(needle) ||
          l.batchNo.toLowerCase().includes(needle)
      )
    }
    return list
  }, [lenses, typeFilter, q])

  const summary = useMemo(() => {
    const lots = lenses.filter((l) => !isCatalogLens(l))
    const units = lots.reduce((s, l) => s + l.quantity, 0)
    const low = lots.filter((l) => l.quantity <= l.minStock).length
    const expiring = lots.filter((d) => {
      const dd = daysTo(d.expiryDate)
      return dd !== null && dd <= 90
    }).length
    return { units, models: lenses.length, low, expiring }
  }, [lenses])

  function openAdd() {
    setEditingId(null)
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  function openEdit(l: LensStock) {
    setEditingId(l.id)
    setDraft({
      name: l.name,
      type: l.type,
      manufacturer: l.manufacturer ?? '',
      model: l.model ?? '',
      aConstant: l.aConstant != null ? String(l.aConstant) : '',
      powerSph: String(l.powerSph),
      powerCyl: l.powerCyl != null ? String(l.powerCyl) : '',
      batchNo: l.batchNo,
      expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : '',
      quantity: String(l.quantity),
      minStock: String(l.minStock),
      notes: l.notes ?? '',
    })
    setFormOpen(true)
  }

  async function save() {
    if (!draft.name.trim() || draft.powerSph === '') {
      toast({ title: 'Lens name and sphere power are required', variant: 'destructive' })
      return
    }
    if (Number(draft.powerSph) !== 0 && !draft.batchNo.trim()) {
      toast({ title: 'Batch number is required for stock lots', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const res = await fetch(editingId ? `/api/lenses/${editingId}` : '/api/lenses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      toast({ title: editingId ? 'Lens updated' : 'Lens added to stock', description: draft.name })
      setFormOpen(false)
      load()
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(l: LensStock) {
    if (!window.confirm(`Delete ${l.name} (${l.batchNo}) from stock?`)) return
    const res = await fetch(`/api/lenses/${l.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Lens deleted' })
      load()
    } else {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead title="Lens Stock" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / batch…"
              className="f-input h-8 w-40 rounded-md border border-zinc-200 bg-white pl-8 pr-2 text-xs sm:w-56"
            />
          </div>
          {canEdit && (
            <Button onClick={openAdd} className="min-h-[32px] px-3 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add lens
            </Button>
          )}
        </div>
      </div>

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-3.5">
          <Boxes className="h-4.5 w-4.5 text-teal-600" />
          <div>
            <div className="font-mono text-lg font-bold text-zinc-900">{summary.units}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Units in stock</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3.5">
          <Layers className="h-4.5 w-4.5 text-zinc-500" />
          <div>
            <div className="font-mono text-lg font-bold text-zinc-900">{summary.models}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Model·power SKUs</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3.5">
          <AlertTriangle className={cn('h-4.5 w-4.5', summary.low > 0 ? 'text-orange-600' : 'text-zinc-300')} />
          <div>
            <div className="font-mono text-lg font-bold text-zinc-900">{summary.low}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Low stock</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3.5">
          <CalendarClock className={cn('h-4.5 w-4.5', summary.expiring > 0 ? 'text-red-600' : 'text-zinc-300')} />
          <div>
            <div className="font-mono text-lg font-bold text-zinc-900">{summary.expiring}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Expiring ≤ 90 days</div>
          </div>
        </div>
      </div>

      {/* type filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['ALL', ...LENS_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
              typeFilter === t
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'
            )}
          >
            {t === 'ALL' ? 'All types' : lensTypeLabel(t)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card h-48 animate-pulse bg-zinc-50" />
      ) : filtered.length === 0 ? (
        <Empty>No lenses in stock — add your first IOL lot</Empty>
      ) : (
        <>
          {/* desktop table */}
          <div className="card hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    {['Lens', 'Type', 'Power', 'A-const', 'Batch', 'Expiry', 'Qty', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((l) => {
                    const dd = daysTo(l.expiryDate)
                    const catalog = isCatalogLens(l)
                    const low = !catalog && l.quantity <= l.minStock
                    return (
                      <tr key={l.id} className="transition-colors hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-semibold text-zinc-900">{l.name}</div>
                          <div className="text-[10.5px] text-zinc-400">
                            {[l.manufacturer, l.model].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3"><TypeChip type={l.type} /></td>
                        <td className="px-4 py-3 font-mono text-[12px] font-semibold text-zinc-900">
                          {catalog ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">catalog</span>
                          ) : (
                            <>
                              {l.powerSph > 0 ? '+' : ''}{l.powerSph.toFixed(1)} D
                              {l.powerCyl != null && (
                                <span className="ml-1 text-[10px] font-medium text-pink-600">
                                  Cyl {l.powerCyl > 0 ? '+' : ''}{l.powerCyl.toFixed(2)}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-600">{l.aConstant ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-600">{l.batchNo || '—'}</td>
                        <td className={cn('px-4 py-3 font-mono text-[11px]', dd !== null && dd <= 90 ? 'font-semibold text-red-600' : 'text-zinc-600')}>
                          {l.expiryDate ? (
                            <>
                              {fmtDate(l.expiryDate)}
                              {dd !== null && dd <= 90 && dd > 0 && <span className="ml-1 text-[9px]">({dd}d)</span>}
                              {dd !== null && dd <= 0 && <span className="ml-1 text-[9px]">(expired)</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('font-mono text-[13px] font-bold', low ? 'text-orange-600' : 'text-zinc-900')}>
                            {l.quantity}
                          </span>
                          {low && <span className="ml-1.5 text-[9px] font-bold uppercase text-orange-600">low</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <span className="flex items-center justify-end gap-1">
                              <button onClick={() => openEdit(l)} title="Edit" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => remove(l)} title="Delete" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((l) => {
              const dd = daysTo(l.expiryDate)
              const catalog = isCatalogLens(l)
              const low = !catalog && l.quantity <= l.minStock
              return (
                <div key={l.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-zinc-900">{l.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <TypeChip type={l.type} />
                        <span className="font-mono text-[11px] font-semibold text-zinc-700">
                          {catalog ? 'A ' + (l.aConstant ?? '—') : `${l.powerSph > 0 ? '+' : ''}${l.powerSph.toFixed(1)} D${l.powerCyl != null ? ` · Cyl ${l.powerCyl}` : ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn('font-mono text-lg font-bold', low ? 'text-orange-600' : 'text-zinc-900')}>{l.quantity}</div>
                      <div className="text-[9px] font-semibold uppercase text-zinc-400">in stock</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] text-zinc-500">
                    <span>Batch {l.batchNo || '—'}</span>
                    <span>A-const {l.aConstant ?? '—'}</span>
                    {l.expiryDate && <span className={dd !== null && dd <= 90 ? 'font-semibold text-red-600' : ''}>Exp {fmtDate(l.expiryDate)}</span>}
                  </div>
                  {canEdit && (
                    <div className="mt-3 flex justify-end gap-2 border-t border-zinc-100 pt-2.5">
                      <Button variant="outline" onClick={() => openEdit(l)} className="min-h-[28px] px-2.5 py-1 text-[11px]">
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => remove(l)} className="min-h-[28px] px-2.5 py-1 text-[11px]">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* add / edit dialog — admin only */}
      <Dialog open={formOpen && canEdit} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-xl bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-zinc-100 px-5 py-4">
            <DialogTitle className="text-[15px] font-semibold text-zinc-900">
              {editingId ? 'Edit lens lot' : 'Add lens to stock'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              IOL inventory — model, type, power, A-constant, batch and expiry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lens name *">
                <FInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. AcrySof IQ" />
              </Field>
              <Field label="Type">
                <FSelect value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  {LENS_TYPES.map((t) => <option key={t} value={t}>{lensTypeLabel(t)}</option>)}
                </FSelect>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacturer">
                <FInput value={draft.manufacturer} onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })} placeholder="Alcon / Zeiss / J&J" />
              </Field>
              <Field label="Model">
                <FInput value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="SN60WF" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sphere power (D) *">
                <FInput type="number" step="0.5" value={draft.powerSph} onChange={(e) => setDraft({ ...draft, powerSph: e.target.value })} placeholder="22.0" />
              </Field>
              <Field label="Cyl power (toric)">
                <FInput type="number" step="0.25" value={draft.powerCyl} onChange={(e) => setDraft({ ...draft, powerCyl: e.target.value })} placeholder="—" />
              </Field>
              <Field label="A-constant">
                <FInput type="number" step="0.01" value={draft.aConstant} onChange={(e) => setDraft({ ...draft, aConstant: e.target.value })} placeholder="118.9" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Batch no *">
                <FInput value={draft.batchNo} onChange={(e) => setDraft({ ...draft, batchNo: e.target.value })} placeholder="LOT-2026-A17" />
              </Field>
              <Field label="Expiry date">
                <FInput type="date" value={draft.expiryDate} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <FInput type="number" min="0" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Low-stock alert at">
                <FInput type="number" min="0" value={draft.minStock} onChange={(e) => setDraft({ ...draft, minStock: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <FTextarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Storage notes, supplier…" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3.5">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{editingId ? 'Save changes' : 'Add to stock'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
