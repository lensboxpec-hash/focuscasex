'use client'

// Client-side token store + fetch auth layer.
// The preview can run inside an embedded iframe where the browser blocks
// cookies entirely — the session cookie never round-trips and login loops
// forever. sessionStorage, however, stays readable by the embedded document,
// so we keep the session token there and attach it as an Authorization
// header on every /api request via a single global fetch patch.

const TOKEN_KEY = 'fcx_token'

export function storeToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable — cookie path still works */
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearStoredToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

// Convenience fetch that always carries the stored token (if any).
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const headers = new Headers(init.headers ?? {})
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}

let installed = false

// Idempotently patch window.fetch so every existing component call site
// (patients, sessions, lenses, stats, …) automatically sends the token.
export function installAuthFetch() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('/api/')) {
      const headers = new Headers(init.headers ?? {})
      if (!headers.has('Authorization')) {
        const token = getStoredToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
          return original(input, { ...init, headers })
        }
      }
    }
    return original(input, init)
  }
}

// Ask the server who we are (cookie or stored token).
export async function fetchSessionUser(): Promise<{ id: string; name: string; email: string; role: string } | null> {
  try {
    const res = await authFetch('/api/auth/me')
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? null
  } catch {
    return null
  }
}
