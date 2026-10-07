import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

import { requireAuth } from '@/lib/auth'

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAuth()
  if (denied) return denied
  const { id } = await ctx.params
  await db.visionRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
