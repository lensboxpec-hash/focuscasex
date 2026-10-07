'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ACCENT, TINT, TINT_BY_HEX, EYE_COLOR, SESSION_STATUS_COLOR, APPT_STATUS_COLOR, COUNSEL_PROC_COLOR, APPT_PROC_COLOR, eyeLabel, procLabel } from './types'

// ---------- Badges (tinted, professional) ----------

export function Chip({
  children,
  bg = ACCENT.white,
  className,
  title,
}: {
  children: React.ReactNode
  bg?: string
  className?: string
  title?: string
}) {
  const t = TINT_BY_HEX[bg] ?? TINT.gray
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.br }}
    >
      {children}
    </span>
  )
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}

export function EyeBadge({ eye, className }: { eye: string; className?: string }) {
  return (
    <Chip bg={EYE_COLOR[eye] ?? ACCENT.gray} className={className} title={eyeLabel(eye)}>
      {eye}
    </Chip>
  )
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return <Chip bg={SESSION_STATUS_COLOR[status] ?? ACCENT.gray} className={className}>{status.replaceAll('_', ' ')}</Chip>
}

export function ApptStatusChip({ status, className }: { status: string; className?: string }) {
  return <Chip bg={APPT_STATUS_COLOR[status] ?? ACCENT.gray} className={className}>{status.replaceAll('_', ' ')}</Chip>
}

export function ProcChip({ type, className }: { type: string; className?: string }) {
  return <Chip bg={COUNSEL_PROC_COLOR[type] ?? ACCENT.white} className={className}>{procLabel(type)}</Chip>
}

export function ApptProcChip({ type, className }: { type: string; className?: string }) {
  return <Chip bg={APPT_PROC_COLOR[type] ?? ACCENT.white} className={className}>{procLabel(type)}</Chip>
}

// ---------- Blocks ----------

export function StatBlock({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  accent?: string
  className?: string
}) {
  return (
    <div className={cn('card lift p-4', className)}>
      <div className="flex items-center gap-1.5">
        {accent && <Dot color={accent} />}
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
      </div>
      <div className="mt-1.5 font-mono text-xl font-semibold leading-none tracking-tight tabular-nums sm:text-2xl">{value}</div>
      {sub && <div className="mt-2 border-t border-zinc-100 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">{sub}</div>}
    </div>
  )
}

export function SectionHead({
  title,
  right,
  className,
}: {
  title: string
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900">
        <span className="inline-block h-4 w-[3px] rounded-full bg-zinc-900" aria-hidden />
        {title}
      </h2>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="f-label">{label}</label>
      {children}
    </div>
  )
}

// ---------- Form controls (native, robust) ----------

export const FInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function FInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn('f-input', className)} {...props} />
  }
)

export const FTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function FTextarea({ className, ...props }, ref) {
    return <textarea ref={ref} rows={3} className={cn('f-input resize-none', className)} {...props} />
  }
)

export function FSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('f-input f-select cursor-pointer appearance-none pr-7', className)} {...props}>
      {children}
    </select>
  )
}

// Legacy aliases (kept so any straggler import still renders correctly)
export const BrutInput = FInput
export const BrutTextarea = FTextarea
export const BrutSelect = FSelect

export function Button({
  children,
  variant = 'solid',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'ghost' | 'danger'
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:pointer-events-none disabled:opacity-40',
        variant === 'solid' && 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:translate-y-px',
        variant === 'outline' && 'border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 active:translate-y-px',
        variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        variant === 'danger' && 'border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Legacy alias
export const BrutButton = Button

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      aria-pressed={checked}
    >
      <span
        className={cn(
          'flex h-[18px] w-8 items-center rounded-full p-[2px] transition-colors',
          checked ? 'bg-emerald-600' : 'bg-zinc-300'
        )}
      >
        <span
          className={cn(
            'h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[14px]' : 'translate-x-0'
          )}
        />
      </span>
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
    </button>
  )
}

// Legacy alias
export const BrutToggle = Toggle

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 p-6 text-center text-xs font-medium text-zinc-400">
      {children}
    </div>
  )
}
