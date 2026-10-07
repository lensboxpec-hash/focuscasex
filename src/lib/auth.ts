import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'fcx_session'
const SESSION_DAYS = 7

// ---- Password hashing (scrypt, no external deps) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

// ---- Session lifecycle ----

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })

  // Detect public HTTPS (behind the preview/proxy layer). When served over
  // HTTPS the app may be viewed inside an embedded iframe — a SameSite=Lax
  // cookie is dropped there, causing a login → bounced-back-to-login loop.
  // For HTTPS we emit a cross-site-capable cookie (SameSite=None; Secure;
  // Partitioned) which works both embedded (CHIPS) and in a standalone tab.
  const h = await headers()
  const xfProto = (h.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase()
  const isHttps =
    xfProto === 'https' || h.get('x-forwarded-ssl') === 'on'

  const jar = await cookies()
  if (isHttps) {
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      partitioned: true,
      path: '/',
      expires: expiresAt,
    })
  } else {
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires: expiresAt,
    })
  }
  return token
}

export type AuthUser = { id: string; name: string; email: string; role: string }

// Resolve the session token from (1) Authorization: Bearer header or
// (2) the fcx_session cookie. The Bearer path keeps the app usable in
// embedded browsers that block cookies entirely (preview iframes).
export async function getSessionToken(): Promise<string | null> {
  const h = await headers()
  const auth = h.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const t = auth.slice(7).trim()
    if (t) return t
  }
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? null
}

// Validate the request token against the DB. Returns the user or null.
export async function getSessionUser(): Promise<AuthUser | null> {
  const token = await getSessionToken()
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export async function destroySession(): Promise<void> {
  const token = await getSessionToken()
  if (token) await db.session.deleteMany({ where: { token } })
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

// ---- API guard: call at the top of every protected route handler ----
// `const denied = await requireAuth(); if (denied) return denied;`

export async function requireAuth(): Promise<NextResponse | null> {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 })
  }
  return null
}

// Role-scoped guard, e.g. `const denied = await requireRole('ADMIN')`
export async function requireRole(...roles: string[]): Promise<NextResponse | null> {
  const denied = await requireAuth()
  if (denied) return denied
  const user = await getSessionUser()
  if (!user || !roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden — admin access required.' }, { status: 403 })
  }
  return null
}
