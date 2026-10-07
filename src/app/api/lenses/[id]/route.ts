import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

import { requireRole } from '@/lib/auth'

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const { id } = await ctx.params
  const body = await req.json()
  const lens = await db.lensStock.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      manufacturer: body.manufacturer !== undefined ? body.manufacturer || null : undefined,
      model: body.model !== undefined ? body.model || null : undefined,
      aConstant:
        body.aConstant !== undefined
          ? body.aConstant === '' || body.aConstant === null
            ? null
            : Number(body.aConstant)
          : undefined,
      powerSph: body.powerSph !== undefined ? Number(body.powerSph) || 0 : undefined,
      powerCyl:
        body.powerCyl !== undefined
          ? body.powerCyl === '' || body.powerCyl === null
            ? null
            : Number(body.powerCyl)
          : undefined,
      batchNo: body.batchNo,
      expiryDate:
        body.expiryDate !== undefined
          ? body.expiryDate
            ? new Date(body.expiryDate)
            : null
          : undefined,
      quantity: body.quantity !== undefined ? Number(body.quantity) || 0 : undefined,
      minStock: body.minStock !== undefined ? Number(body.minStock) || 2 : undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
  })
  return NextResponse.json(lens)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const { id } = await ctx.params
  await db.lensStock.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
