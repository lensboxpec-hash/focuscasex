'use client'

import { useEffect, useState } from 'react'
import { Dashboard } from './dashboard'
import { SurgeryView } from './surgery'
import { LensView } from './lenses'
import { PatientsView } from './patients'
import { CounselingView } from './counseling'
import { PackagesView } from './packages'
import { CalendarView } from './calendar'
import { CommandSearch, SearchTarget } from './command-search'
import { EYE_COLOR, ymd, parseYmd } from './types'
import { clearStoredToken } from '@/lib/client-auth'
import { LayoutDashboard, Users, MessagesSquare, Package, CalendarDays, Eye, Plus, Search, LogOut, Stethoscope, Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'DASHBOARD' | 'PATIENTS' | 'COUNSELING' | 'PACKAGES' | 'CALENDAR' | 'SURGERY' | 'LENS'

const TABS: { id: Tab; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'DASHBOARD', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { id: 'PATIENTS', label: 'Patients', short: 'Patients', icon: Users },
  { id: 'COUNSELING', label: 'Counseling', short: 'Counsel', icon: MessagesSquare },
  { id: 'SURGERY', label: 'Surgery', short: 'Surgery', icon: Stethoscope },
  { id: 'LENS', label: 'Lens Stock', short: 'Lens', icon: Boxes },
  { id: 'PACKAGES', label: 'Packages', short: 'Packages', icon: Package },
  { id: 'CALENDAR', label: 'Calendar', short: 'Cal', icon: CalendarDays },
]

const DOWS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

type SessionUser = { name: string; role: string }

export function FocusCaseXApp({ user }: { user?: SessionUser }) {
  const isAdmin = user?.role === 'ADMIN'
  const tabs = isAdmin ? TABS : TABS.filter((t) => t.id !== 'PACKAGES')
  const [tab, setTab] = useState<Tab>('DASHBOARD')
  const [openRegister, setOpenRegister] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // cross-tab focus targets (set by global search)
  const [focusPatientId, setFocusPatientId] = useState<string | null>(null)
  const [focusDate, setFocusDate] = useState<string | null>(null)

  // Global shortcut: Ctrl/Cmd + K opens search, "/" opens when not typing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === '/' && !searchOpen) {
        const el = document.activeElement
        const tag = el?.tagName?.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault()
          setSearchOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  async function handleLogout() {
    clearStoredToken()
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/login'
  }

  const handlePick = (t: SearchTarget) => {
    if (t.kind === 'PATIENT') {
      setFocusPatientId(t.id)
      setTab('PATIENTS')
    } else if (t.kind === 'PACKAGE') {
      setTab('PACKAGES')
    } else if (t.kind === 'SESSION') {
      setTab('COUNSELING')
    } else if (t.kind === 'APPOINTMENT') {
      setFocusDate(ymd(parseYmd(t.date.slice(0, 10)) ))
      setTab('CALENDAR')
    }
  }

  const now = new Date()
  const today = `${DOWS[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${MONS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div className="flex min-h-screen flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white shadow-sm">
              <Eye className="h-4.5 w-4.5" strokeWidth={2.25} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-teal-500" aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-zinc-900">
                Focus <span className="font-semibold text-zinc-900">CaseX</span> <span className="font-medium text-zinc-400">Counseling</span>
              </div>
              <div className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:block">
                Preethika Eye Care · EHR
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* GLOBAL SEARCH TRIGGER */}
            <button
              onClick={() => setSearchOpen(true)}
              title="Search everything (Ctrl K)"
              aria-label="Global search"
              className="group inline-flex min-h-[34px] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 text-xs font-medium text-zinc-400 shadow-sm transition-all hover:border-zinc-300 hover:bg-white hover:text-zinc-600 md:w-56 lg:w-72"
            >
              <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              <span className="hidden md:inline">Search patients, packages…</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-semibold text-zinc-400 md:block">
                Ctrl K
              </kbd>
            </button>
            <span className="hidden items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-500 lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {today}
            </span>
            {user && (
              <span
                title={`${user.name} · ${user.role}`}
                className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-white py-1 pl-1.5 pr-2.5 md:inline-flex"
              >
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded bg-zinc-900 text-[10px] font-bold text-white">
                  {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate text-[11.5px] font-semibold text-zinc-700">{user.name}</span>
                <span
                  className="rounded px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider"
                  style={
                    isAdmin
                      ? { background: '#ecfdf5', color: '#047857' }
                      : { background: '#eff6ff', color: '#1d4ed8' }
                  }
                >
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </span>
            )}
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex min-h-[34px] items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-zinc-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
            <button
              onClick={() => {
                setTab('PATIENTS')
                setOpenRegister(true)
              }}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 active:translate-y-px"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">New patient</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* TAB NAV — full width, equal segments */}
      <nav className="sticky top-14 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md" role="tablist" aria-label="Modules">
        <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(({ id, label, short, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex min-h-[44px] items-center justify-center gap-1.5 px-1 text-[12px] transition-colors sm:text-[13px]',
                  active ? 'tab-indicator font-semibold text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* CONTENT */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 sm:px-6 sm:py-7">
        {tab === 'DASHBOARD' && (
          <Dashboard
            role={user?.role}
            onGoPatients={() => setTab('PATIENTS')}
            onGoCounseling={() => setTab('COUNSELING')}
            onGoCalendar={() => setTab('CALENDAR')}
          />
        )}
        {tab === 'PATIENTS' && (
          <PatientsView
            openRegister={openRegister}
            onConsumeRegister={() => setOpenRegister(false)}
            focusPatientId={focusPatientId}
            onConsumeFocus={() => setFocusPatientId(null)}
          />
        )}
        {tab === 'COUNSELING' && <CounselingView />}
        {tab === 'SURGERY' && <SurgeryView />}
        {tab === 'LENS' && <LensView role={user?.role} />}
        {tab === 'PACKAGES' && <PackagesView />}
        {tab === 'CALENDAR' && <CalendarView focusDate={focusDate} onConsumeFocus={() => setFocusDate(null)} />}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="text-[11px] font-medium text-zinc-400">
            Focus CaseX v3.0 — Preethika Eye Care · EHR / Counseling / Surgery / Lens Stock / Pricing / Calendar
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border" style={{ background: EYE_COLOR.OD, borderColor: '#99f6e4' }} /> OD Right
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border" style={{ background: EYE_COLOR.OS, borderColor: '#fed7aa' }} /> OS Left
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border" style={{ background: EYE_COLOR.OU, borderColor: '#18181b' }} /> OU Both
            </span>
          </div>
        </div>
      </footer>

      {/* GLOBAL SEARCH */}
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} onPick={handlePick} />
    </div>
  )
}
