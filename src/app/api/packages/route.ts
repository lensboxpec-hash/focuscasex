import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const category = req.nextUrl.searchParams.get('category')
  const packages = await db.package.findMany({
    where: category ? { category } : undefined,
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(packages)
}

type ItemInput = { name?: string; price?: number | string; optional?: boolean }

export async function POST(req: NextRequest) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'Package name required' }, { status: 400 })
  }
  const items: ItemInput[] = Array.isArray(body.items) ? body.items : []
  const basePrice = items.reduce((s: number, it: ItemInput) => s + (Number(it.price) || 0), 0)
  const discountPct = Number(body.discountPct) || 0
  const finalPrice = Math.round(basePrice * (1 - discountPct / 100))
  const pkg = await db.package.create({
    data: {
      name: String(body.name).toUpperCase(),
      category: body.category ?? 'LENS',
      description: body.description || null,
      basePrice,
      discountPct,
      finalPrice,
      color: body.color ?? 'yellow',
      active: body.active !== undefined ? !!body.active : true,
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
  return NextResponse.json(pkg, { status: 201 })
}
