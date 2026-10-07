import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

// Forgiving identifier resolution — the clinic can sign in with any of:
//   1. full email                → name@clinic.com
//   2. bare short name           → staff  /  admin
//   3. short name with domain    → staff@clinic.com
//   4. gmail local part          → the email's local part
async function resolveUser(identifier: string) {
  const direct = await db.user.findUnique({ where: { email: identifier } })
  if (direct) return direct

  if (!identifier.includes('@')) {
    const asGmail = await db.user.findUnique({
      where: { email: `${identifier}@gmail.com` },
    })
    if (asGmail) return asGmail
  }

  const byUsername = await db.user.findUnique({ where: { username: identifier } })
  if (byUsername) return byUsername

  if (identifier.includes('@')) {
    const local = identifier.split('@')[0]
    const byLocal = await db.user.findUnique({ where: { username: local } })
    if (byLocal) return byLocal
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifier = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await resolveUser(identifier)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid email or password. Tip: the short clinic name (without @gmail.com) works too.' },
        { status: 401 },
      )
    }

    const sessionToken = await createSession(user.id)
    // token is also returned in the body so cookie-blocked embedded browsers
    // can keep it in sessionStorage and use Authorization: Bearer instead.
    return NextResponse.json({
      token: sessionToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (e) {
    console.error('LOGIN_ERR', e)
    return NextResponse.json({ error: 'Sign-in failed. Try again.' }, { status: 500 })
  }
}
