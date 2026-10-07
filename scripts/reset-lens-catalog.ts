/* One-off: wipe LensStock entirely, then re-seed the canonical 29-lens catalog
   with deterministic ids (matches supabase/seed.sql). */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const CATALOG: [string, string, string, number | null][] = [
  ['NASPRO', 'APPASAMY', 'MONOFOCAL', 118],
  ['SUPRAPHOB', 'APPASAMY', 'MONOFOCAL', 119.1],
  ['SUPRAPHOB TORIC', 'APPASAMY', 'TORIC', 119.1],
  ['ACRYSOF SP', 'ALCON', 'MONOFOCAL', 118.3],
  ['ALCON IQ', 'ALCON', 'MONOFOCAL', 118.7],
  ['CLAREON', 'ALCON', 'MONOFOCAL', 118.8],
  ['PANOPTIX', 'ALCON', 'TRIFOCAL', 118.7],
  ['VIVITY (EDOF)', 'ALCON', 'EDOF', 118.8],
  ['PANOPTIX TORIC', 'ALCON', 'TORIC', 118.7],
  ['VIVITY TORIC (EDOF)', 'ALCON', 'TORIC', 118.8],
  ['CLAREON TORIC', 'ALCON', 'TORIC', 118.8],
  ['IQ TORIC', 'ALCON', 'TORIC', 118.7],
  ['EYECRYL NAT HD', 'BIOTECH', 'MONOFOCAL', 118.3],
  ['OPTIFLEX TRIO', 'BIOTECH', 'TRIFOCAL', 118.6],
  ['EYECRYL ACTIV', 'BIOTECH', 'MONOFOCAL', 118],
  ['OPTIFLEX TRIO TORIC', 'BIOTECH', 'TORIC', 118.6],
  ['EYECRYL ACTIV (BIFOCAL)', 'BIOTECH', 'BIFOCAL', 118],
  ['EYECRYL TORIC (MONOFOCAL)', 'BIOTECH', 'TORIC', 118.5],
  ['MAGNUS', 'CARE GROUP', 'MONOFOCAL', 118.4],
  ['MAGNUS TORIC BIFOCAL', 'CARE GROUP', 'TORIC', null],
  ['ACRIVISION (FOREIGN)', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['TRIPHOBIC HD (INDIAN YELLOW TRIFOCAL)', 'CARE GROUP', 'TRIFOCAL', 118.8],
  ['MAGNIFICENT (INDIAN EDOF)', 'CARE GROUP', 'EDOF', 118.8],
  ['ACRIVISION TRIFOCAL (FOREIGN)', 'CARE GROUP', 'TRIFOCAL', 118.8],
  ['ACRIOL EC', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['ACRIOL CLEAR', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['ACRIOL EC TORIC (MONOFOCAL)', 'CARE GROUP', 'TORIC', 118.8],
  ['AUTOFOCUS PRO', 'OMNI GLOW', 'MONOFOCAL', 117.7],
  ['VIVINEX IMPRESS B&L', 'HOYA', 'MONOFOCAL', 118.9],
]

async function main() {
  const gone = await db.lensStock.deleteMany({})
  for (const [name, manufacturer, type, aConstant] of CATALOG) {
    const slug = `lens_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    await db.lensStock.create({
      data: { id: slug, name, manufacturer, type, aConstant, powerSph: 0, batchNo: '', quantity: 0, minStock: 0 },
    })
  }
  console.log(`wiped ${gone.count} rows → recreated ${await db.lensStock.count()} catalog lenses (deterministic ids)`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
