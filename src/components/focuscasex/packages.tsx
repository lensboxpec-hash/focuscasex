'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pkg, TINT, PACKAGE_CATEGORIES, PACKAGE_COLORS, ACCENT, fmtINR } from './types'
import { SectionHead, Button, FInput, FSelect, FTextarea, Field, Toggle, Empty } from './ui-bits'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Pencil, CheckCircle2, XCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type ItemDraft = { name: string; price: string; optional: boolean }
type Draft = {
  name: string
  category: string
  description: string
  color: string
  active: boolean
  discountPct: string
  items: ItemDraft[]
}

const emptyDraft: Draft = {
  name: '', category: 'LENS', description: '', color: 'cyan', active: true, discountPct: '0',
  items: [{ name: '', price: '', optional: false }],
}

export function PackagesView() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<Pkg[]>([])
  const [catFilter, setCatFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/packages')
      .then((r) => r.json())
      .then(setPackages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = catFilter === 'ALL' ? packages : packages.filter((p) => p.category === catFilter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.description ?? '').toLowerCase().includes(needle) ||
          p.items.some((it) => it.name.toLowerCase().includes(needle))
      )
    }
    return list
  }, [packages, catFilter, q])

  const subtotal = useMemo(
    () => draft.items.reduce((s, it) => s + (Number(it.price) || 0), 0),
    [draft.items]
  )
  const finalPrice = Math.round(subtotal * (1 - (Number(draft.discountPct) || 0) / 100))

  function openNew() {
    setEditingId(null)
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  function openEdit(p: Pkg) {
    setEditingId(p.id)
    setDraft({
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      color: p.color,
      active: p.active,
      discountPct: String(p.discountPct),
      items: p.items.length ? p.items.map((it) => ({ name: it.name, price: String(it.price), optional: it.optional })) : [{ name: '', price: '', optional: false }],
    })
    setFormOpen(true)
  }

  async function save() {
    if (!draft.name.trim()) return
    setBusy(true)
    try {
      const res = await fetch(editingId ? `/api/packages/${editingId}` : '/api/packages', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          discountPct: Number(draft.discountPct) || 0,
          items: draft.items.filter((it) => it.name.trim()),
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: editingId ? 'Package updated' : 'Package created' })
      setFormOpen(false)
      load()
    } catch {
      alert('Could not save the package.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(p: Pkg) {
    await fetch(`/api/packages/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    })
    load()
  }

  async function remove(p: Pkg) {
    if (!confirm(`Delete package ${p.name}? Linked sessions will lose the reference.`)) return
    await fetch(`/api/packages/${p.id}`, { method: 'DELETE' })
    toast({ title: 'Package deleted' })
    load()
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Packages & Pricing"
        right={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Create package
          </Button>
        }
      />

      <div className="card flex items-center gap-2 px-3 py-1">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search packages, descriptions, components…"
          className="w-full bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['ALL', ...PACKAGE_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={cn(
              'inline-flex min-h-[32px] items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all',
              catFilter === c
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            {c === 'ALL' ? 'All' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-56 animate-pulse bg-zinc-50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>No packages in this category — create your first pricing package</Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const t = TINT[p.color] ?? TINT.cyan
            return (
              <div key={p.id} className={cn('card lift flex flex-col overflow-hidden p-0', !p.active && 'opacity-55')}>
                <div
                  className="flex items-start justify-between gap-2 border-b px-4 py-3"
                  style={{ backgroundColor: t.bg, borderColor: t.br }}
                >
                  <div>
                    <div className="flex items-center gap-2 text-[15px] font-semibold leading-tight text-zinc-900">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT[p.color] ?? ACCENT.cyan }} />
                      {p.name}
                    </div>
                    <span
                      className="mt-1.5 inline-flex items-center rounded border bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                      style={{ color: t.fg, borderColor: t.br }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} title="Edit" className="rounded border border-zinc-200 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:text-zinc-900">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(p)} title="Delete" className="rounded border border-zinc-200 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  {p.description && (
                    <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">{p.description}</p>
                  )}

                  <div className="mb-3 space-y-1.5">
                    {p.items.map((it) => (
                      <div key={it.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                        <span className={it.optional ? 'text-zinc-400' : 'text-zinc-600'}>
                          {it.name}{it.optional ? ' (opt)' : ''}
                        </span>
                        <span className="whitespace-nowrap font-mono font-medium text-zinc-800">{fmtINR(it.price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto space-y-1 border-t border-zinc-100 pt-3">
                    <div className="flex justify-between font-mono text-[11px] font-medium text-zinc-400">
                      <span>Subtotal</span>
                      <span className={p.discountPct > 0 ? 'line-through' : ''}>{fmtINR(p.basePrice)}</span>
                    </div>
                    {p.discountPct > 0 && (
                      <div className="flex justify-between font-mono text-[11px] font-medium text-red-600">
                        <span>Discount {p.discountPct}%</span>
                        <span>-{fmtINR(p.basePrice - p.finalPrice)}</span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Final price</span>
                      <span className="font-mono text-lg font-semibold tracking-tight text-zinc-900">{fmtINR(p.finalPrice)}</span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-zinc-100 pt-2.5">
                    <Toggle checked={p.active} onChange={() => toggleActive(p)} label={p.active ? 'Active — shows in counseling' : 'Inactive — hidden'} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* BUILDER DIALOG */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-xl sm:max-w-2xl">
          <div className="border-b border-zinc-200 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-900">
                {editingId ? 'Edit Package' : 'Build a Package'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Components + pricing — totals compute automatically
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Package Name *">
                <FInput value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Multifocal Premium" />
              </Field>
              <Field label="Category">
                <FSelect value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
                  {PACKAGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </FSelect>
              </Field>
            </div>

            <Field label="Description">
              <FTextarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="What the patient gets — used during counseling" />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="f-label mb-0">Components / Price Heads</div>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { name: '', price: '', optional: false }] }))}
                  className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
                >
                  <Plus className="h-3 w-3" /> Add component
                </button>
              </div>
              <div className="space-y-1.5">
                {draft.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_96px_40px] items-center gap-1.5">
                    <FInput
                      value={it.name}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        }))
                      }
                      placeholder="Component name"
                    />
                    <FInput
                      type="number"
                      min={0}
                      value={it.price}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                        }))
                      }
                      placeholder="₹"
                    />
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, items: d.items.map((x, j) => (j === i ? { ...x, optional: !x.optional } : x)) }))
                        }
                        title="Mark optional"
                        className={cn(
                          'rounded border p-1 transition-colors',
                          it.optional
                            ? 'border-teal-200 bg-teal-50 text-teal-600'
                            : 'border-zinc-200 bg-white text-zinc-300 hover:text-zinc-500'
                        )}
                      >
                        {it.optional ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}
                        title="Remove"
                        className="rounded border border-zinc-200 bg-white p-1 text-zinc-300 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Discount %">
                <FInput type="number" min={0} max={100} value={draft.discountPct} onChange={(e) => setDraft((d) => ({ ...d, discountPct: e.target.value }))} />
              </Field>
              <Field label="Tag Color">
                <div className="flex gap-1.5 pt-0.5">
                  {PACKAGE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={cn(
                        'h-8 w-8 rounded-md border transition-all',
                        draft.color === c
                          ? 'border-zinc-900 ring-2 ring-zinc-900/20 ring-offset-1'
                          : 'border-zinc-200 hover:border-zinc-400'
                      )}
                      style={{ backgroundColor: ACCENT[c] }}
                      title={c.toUpperCase()}
                    />
                  ))}
                </div>
              </Field>
            </div>

            {/* PRICE SUMMARY */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
              <div className="flex justify-between font-mono text-xs font-medium text-zinc-500">
                <span>Subtotal</span><span className="text-zinc-800">{fmtINR(subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between font-mono text-xs font-medium text-red-600">
                <span>Discount {draft.discountPct || 0}%</span>
                <span>-{fmtINR(subtotal - finalPrice)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-zinc-200 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Final patient price</span>
                <span className="font-mono text-xl font-semibold tracking-tight text-zinc-900">{fmtINR(finalPrice)}</span>
              </div>
            </div>

            <Toggle checked={draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} label="Active — available in counseling" />

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy || !draft.name.trim()}>
                {busy ? 'Saving…' : editingId ? 'Save package' : 'Create package'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
