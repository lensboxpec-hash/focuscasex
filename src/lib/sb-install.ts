'use client'

// ============================================================================
// Focus CaseX — static-backend fetch shim (GitHub Pages mode)
// ----------------------------------------------------------------------------
// When the app is exported for static hosting (NEXT_PUBLIC_STATIC_BACKEND=1)
// there is no Next.js server behind /api/*. This module patches window.fetch
// and answers every /api/* call from Supabase directly (Auth + PostgREST),
// preserving the exact request/response contract of the server routes.
// All data is REAL — the clinic's live Supabase project, RLS-protected.
// ============================================================================

import { STATIC_BACKEND, type Ctx, type Result, ok } from './sb-client'
import { handleLogin, handleLogout, handleMe } from './sb-handlers'
import {
  patientsList, patientsCreate, patientDetail, patientUpdate, patientDelete,
  visionCreate, visionDelete, packagesList, packagesCreate, packageUpdate, packageDelete,
  lensesList, lensCreate, lensUpdate, lensDelete, adminGate,
} from './sb-handlers'
import {
  sessionsList, sessionsCreate, sessionUpdate, sessionDelete,
  appointmentsList, appointmentsCreate, appointmentUpdate, appointmentDelete,
  statsGet, searchGet,
} from './sb-flow'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export async function handleApi(ctx: Ctx): Promise<Result> {
  const { method, path, q, body } = ctx
  const seg = path.split('/').filter(Boolean) // ['api', ...]

  // ---- auth (open) ----
  if (path === '/api/auth/login' && method === 'POST') return handleLogin(ctx)
  if (path === '/api/auth/logout' && method === 'POST') return handleLogout()
  if (path === '/api/auth/me' && method === 'GET') return handleMe()

  // ---- everything else requires a session ----
  const user = await (await import('./sb-client')).currentUser()
  if (!user) return { status: 401, body: { user: null } }

  if (path === '/api' && method === 'GET') return ok({ message: 'Hello, world!' })

  // ---- lens stock & packages are ADMIN-gated (parity with requireRole) ----
  if (seg[1] === 'lenses' || seg[1] === 'packages') {
    const denied = adminGate(user)
    if (denied) return denied
    if (seg[1] === 'lenses') {
      if (path === '/api/lenses' && method === 'GET') return lensesList(ctx)
      if (path === '/api/lenses' && method === 'POST') return lensCreate(ctx)
      if (seg[2] && method === 'PUT') return lensUpdate(seg[2], body)
      if (seg[2] && method === 'DELETE') return lensDelete(seg[2])
    } else {
      if (path === '/api/packages' && method === 'GET') return packagesList(ctx)
      if (path === '/api/packages' && method === 'POST') return packagesCreate(ctx)
      if (seg[2] && method === 'PUT') return packageUpdate(seg[2], body)
      if (seg[2] && method === 'DELETE') return packageDelete(seg[2])
    }
    return { status: 404, body: { error: `No handler for ${method} ${path}` } }
  }

  // ---- patients ----
  if (path === '/api/patients' && method === 'GET') return patientsList(ctx)
  if (path === '/api/patients' && method === 'POST') return patientsCreate(ctx)
  if (seg[1] === 'patients' && seg[2] && !seg[3]) {
    if (method === 'GET') return patientDetail(seg[2])
    if (method === 'PUT') return patientUpdate(seg[2], body)
    if (method === 'DELETE') return patientDelete(seg[2])
  }

  // ---- vision ----
  if (path === '/api/vision' && method === 'POST') return visionCreate(ctx)
  if (seg[1] === 'vision' && seg[2] && method === 'DELETE') return visionDelete(seg[2])

  // ---- counseling sessions ----
  if (path === '/api/sessions' && method === 'GET') return sessionsList(ctx)
  if (path === '/api/sessions' && method === 'POST') return sessionsCreate(ctx)
  if (seg[1] === 'sessions' && seg[2]) {
    if (method === 'PUT') return sessionUpdate(seg[2], body)
    if (method === 'DELETE') return sessionDelete(seg[2])
  }

  // ---- appointments ----
  if (path === '/api/appointments' && method === 'GET') return appointmentsList(ctx)
  if (path === '/api/appointments' && method === 'POST') return appointmentsCreate(ctx)
  if (seg[1] === 'appointments' && seg[2]) {
    if (method === 'PUT') return appointmentUpdate(seg[2], body)
    if (method === 'DELETE') return appointmentDelete(seg[2])
  }

  // ---- stats & search ----
  if (path === '/api/stats' && method === 'GET') return statsGet(ctx)
  if (path === '/api/search' && method === 'GET') return searchGet(ctx)

  return { status: 404, body: { error: `No handler for ${method} ${path}` } }
}

let installed = false

export function installSupabaseBackend() {
  if (!STATIC_BACKEND || installed || typeof window === 'undefined') return
  installed = true

  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    let url: URL
    try {
      url = new URL(rawUrl, window.location.origin)
    } catch {
      return original(input as RequestInfo, init)
    }
    let path = url.pathname
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length) || '/'
    if (!path.startsWith('/api/')) return original(input as RequestInfo, init) // Supabase & friends pass through

    let body: unknown = null
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }
    const method = (init.method ?? 'GET').toUpperCase()
    let result: Result
    try {
      result = await handleApi({
        method,
        path: path.replace(/\/+$/, '') || '/api',
        q: url.searchParams,
        body,
      })
    } catch (e) {
      console.error('SB_BACKEND_ERR', e)
      result = { status: 500, body: { error: 'Supabase backend error — check your connection.' } }
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
