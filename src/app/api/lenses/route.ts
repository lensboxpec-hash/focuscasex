import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const denied = await requireAuth()
  if (denied) return denied
  const type = req.nextUrl.searchParams.get('type')
  const lenses = await db.lensStock.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: 'asc' }, { powerSph: 'desc' }],
  })
  return NextResponse.json(lenses)
}

export async function POST(req: NextRequest) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied
  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'Lens name is required' }, { status: 400 })
  }
  const lens = await db.lensStock.create({
    data: {
      name: String(body.name),
      type: body.type ?? 'MONOFOCAL',
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      aConstant: body.aConstant !== undefined && body.aConstant !== '' ? Number(body.aConstant) : null,
      powerSph: Number(body.powerSph) || 0,
      powerCyl: body.powerCyl !== undefined && body.powerCyl !== '' ? Number(body.powerCyl) : null,
      batchNo: String(body.batchNo ?? ''), // '' = catalog entry without a stock lot
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      quantity: Number(body.quantity) || 0,
      minStock: Number(body.minStock) || 0,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(lens, { status: 201 })
}
