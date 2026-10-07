'use client'

import { useEffect, useState } from 'react'
import {
  Eye, EyeOff, Loader2, LogIn, ShieldCheck, ClipboardList,
  Users, ScanEye, MessagesSquare, CalendarDays, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  storeToken, clearStoredToken, fetchSessionUser,
} from '@/lib/client-auth'

const PORTALS: {
  icon: React.ElementType
  title: string
  tagline: string
  perks: string[]
  accent: string
}[] = [
  {
    icon: ClipboardList,
    title: 'Counseling Desk',
    tagline: 'Front office & counseling workspace',
    perks: ['Patients & vision', 'Counseling pipeline', 'Procedure calendar'],
    accent: 'text-sky-300',
  },
  {
    icon: ShieldCheck,
    title: 'Management Console',
    tagline: 'Full clinical, pricing & inventory control',
    perks: ['Everything in Counseling', 'Pricing & packages', 'Revenue analytics'],
    accent: 'text-teal-300',
  },
]

const CHIPS = [
  { icon: Users, label: 'Patient records' },
  { icon: ScanEye, label: 'Vision OD·OS·OU' },
  { icon: MessagesSquare, label: 'Counseling' },
  { icon: CalendarDays, label: 'Calendar' },
]

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already signed in (cookie or stored token)? Go straight to the app.
  useEffect(() => {
    let alive = true
    fetchSessionUser().then((u) => {
      if (alive && u) window.location.replace('/')
    })
    return () => {
      alive = false
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Sign-in failed.')
        setLoading(false)
        return
      }
      // Keep the session token for cookie-blocked embedded browsers, then
      // hard-load the app. Cookie path still works in normal browsers.
      if (typeof data.token === 'string') storeToken(data.token)
      else clearStoredToken()
      window.location.assign('/')
    } catch {
      setError('Network error — is the server running?')
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ============ LEFT — PORTAL SHOWCASE ============ */}
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col">
        {/* dot grid + concentric iris rings */}
        <div className="fcx-dotgrid absolute inset-0 opacity-60" aria-hidden />
        <div className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full border border-white/10" aria-hidden>
          <div className="absolute inset-10 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-teal-400/25" />
          <div className="absolute inset-[7.5rem] rounded-full border border-white/10" />
          <div className="absolute inset-[10.5rem] rounded-full bg-teal-400/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15 fcx-spin-slow" />
        </div>
        <div className="absolute -bottom-64 -left-52 h-[480px] w-[480px] rounded-full border border-white/[0.07]" aria-hidden>
          <div className="absolute inset-12 rounded-full border border-white/[0.07]" />
          <div className="absolute inset-28 rounded-full border border-white/[0.07]" />
        </div>

        {/* panel content */}
        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-950 shadow-lg shadow-black/40">
              <Eye className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight text-white">
                Focus <span className="text-white">CaseX</span>
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Preethika Eye Care · EHR
              </div>
            </div>
          </div>

          <div className="my-auto max-w-md py-10">
            <div className="fcx-fade-up inline-flex items-center gap-1.5 rounded-md border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300">
              <Sparkles className="h-3 w-3" strokeWidth={2.25} />
              Two portals · one record
            </div>
            <h1 className="fcx-fade-up mt-5 text-4xl font-semibold leading-[1.12] tracking-tight text-white xl:text-[42px]" style={{ animationDelay: '60ms' }}>
              Every eye. Every case.
              <br />
              <span className="text-zinc-500">One sharp record.</span>
            </h1>
            <p className="fcx-fade-up mt-4 max-w-sm text-[13.5px] leading-relaxed text-zinc-400" style={{ animationDelay: '120ms' }}>
              Cataract &amp; pterygium counseling — from first vision reading to
              package sign-off and surgery day. Sign in with your clinic account.
            </p>

            {/* portal cards — informational only, no credentials */}
            <div className="mt-8 space-y-3">
              {PORTALS.map((p, i) => (
                <div
                  key={p.title}
                  className="fcx-fade-up flex items-start gap-3.5 rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  style={{ animationDelay: `${160 + i * 70}ms` }}
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06]', p.accent)}>
                    <p.icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-zinc-100">
                      {p.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-zinc-500">{p.tagline}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                      {p.perks.map((perk) => (
                        <span key={perk} className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-teal-400/70" />
                          {perk}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="fcx-fade-up mt-7 flex flex-wrap items-center gap-4 text-[10.5px] font-medium text-zinc-500" style={{ animationDelay: '320ms' }}>
              {CHIPS.map((c) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  <c.icon className="h-3.5 w-3.5 text-zinc-600" strokeWidth={2.25} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="rounded border border-white/10 px-2 py-1">Cataract</span>
            <span className="rounded border border-white/10 px-2 py-1">Pterygium</span>
            <span className="rounded border border-white/10 px-2 py-1">OD · OS · OU</span>
            <span className="ml-auto font-mono text-[10px] normal-case tracking-normal text-zinc-600">v3.0</span>
          </div>
        </div>
      </div>

      {/* ============ RIGHT — LOGIN UI ============ */}
      <div className="relative flex flex-col bg-white">
        {/* mobile brand bar */}
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-950 text-white">
            <Eye className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-zinc-900">
              Focus <span className="font-semibold">CaseX</span>
            </div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Preethika Eye Care · EHR</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="fcx-fade-up w-full max-w-[400px]">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Focus CaseX · Sign in
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-zinc-900">
              Welcome back
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">
              Enter your clinic credentials to continue.
            </p>

            
            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="f-label">Email or short name</label>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="clinic email or short name (e.g. staff)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="f-input w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="f-label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="f-input w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 pr-10 text-sm text-zinc-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-400 transition-colors hover:text-zinc-700"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-md border-l-[3px] border-red-500 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" strokeWidth={2.25} />
                    Sign in
                  </>
                )}
              </button>
            </form>


            <p className="mt-7 text-[11px] text-zinc-400">
              Focus CaseX v3.0 — EHR · Counseling · Pricing · Calendar
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
