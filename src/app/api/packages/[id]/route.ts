import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }
type ItemInput = { name?: string; price?: number | string; optional?: boolean }

import { requireRole } from '@/lib/auth'

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const { id } = await ctx.params
  const body = await req.json()
  const items: ItemInput[] = Array.isArray(body.items) ? body.items : []
  const basePrice = items.reduce((s: number, it: ItemInput) => s + (Number(it.price) || 0), 0)
  const discountPct = Number(body.discountPct) || 0
  const finalPrice = Math.round(basePrice * (1 - discountPct / 100))

  // Replace strategy: delete items and recreate
  await db.packageItem.deleteMany({ where: { packageId: id } })
  const pkg = await db.package.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name).toUpperCase() : undefined,
      category: body.category,
      description: body.description !== undefined ? body.description || null : undefined,
      basePrice,
      discountPct,
      finalPrice,
      color: body.color,
      active: body.active !== undefined ? !!body.active : undefined,
      items: {
        create: items
          .filter((it: ItemInput) => it.name && String(it.name).trim())
          .map((it: ItemInput) => ({
            name: String(it.name).toUpperCase(),
            price: Number(it.price) || 0,
            optional: !!it.optional,
          })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json(pkg)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const { id } = await ctx.params
  await db.package.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
