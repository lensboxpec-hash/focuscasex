'use client'

// ============================================================================
// Focus CaseX — Supabase client + shared helpers for the static backend.
// ----------------------------------------------------------------------------
// In static deployments (GitHub Pages) there is no Next.js server: the browser
// talks to Supabase directly (Auth + PostgREST). This module owns the single
// supabase-js client and the small helpers every handler group shares.
// ============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** True when the bundle was built for static hosting (shim install expected). */
export const STATIC_BACKEND = process.env.NEXT_PUBLIC_STATIC_BACKEND === '1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

let client: SupabaseClient | null = null

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true, // localStorage — refresh-safe
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

/** Short sign-in aliases (parity with the server login route). */
export const LOGIN_ALIAS: Record<string, string> = {
  admin: 'preethikaeyecare@gmail.com',
  staff: 'eyecarepreethika@gmail.com',
}

export type SessionUser = { id: string; name: string; email: string; role: string }
export type Ctx = { method: string; path: string; q: URLSearchParams; body: any }
export type Result = { status: number; body: unknown }

export const ok = (body: unknown, status = 200): Result => ({ status, body })
export const err = (error: string, status = 400): Result => ({ status, body: { error } })

export const numOrNull = (v: unknown) =>
  v === null || v === undefined || v === '' ? null : Number(v)

/** undefined → keep existing; null/'' → null; else Number */
export const numOrUndefined = (v: unknown) =>
  v === undefined ? undefined : v === null || v === '' ? null : Number(v)

export const rid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const nowIso = () => new Date().toISOString()

export const contains = (v: unknown, q: string) =>
  String(v ?? '').toLowerCase().includes(q.toLowerCase())

export type Row = Record<string, any>

/** Who is signed in (from the supabase-js session + user_metadata). */
export async function currentUser(): Promise<SessionUser | null> {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) return null
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  return {
    id: u.id,
    name: String(meta.name ?? u.email ?? 'Staff'),
    email: String(u.email ?? ''),
    role: String(meta.role ?? 'STAFF'),
  }
}

/** Map a supabase-js error to an API result (unique violations → 409). */
export function dbError(e: { code?: string; message?: string } | null): Result | null {
  if (!e) return null
  if (e.code === '23505') return err('That value is already in use.', 409)
  return err(e.message ?? 'Database error', 400)
}
