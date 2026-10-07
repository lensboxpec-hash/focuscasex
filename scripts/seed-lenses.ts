/* Seed the clinic's GIVEN lens catalog — Focus CaseX (replaces all mock lots)
   Source: lens list provided by Preethika Eye Care (name + A-constant per manufacturer).
   Each entry is a catalog row: power 0 / no batch / qty 0 until real stock lots are added. */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// [name, manufacturer, type, aConstant]  (null A-constant = clinic to supply later)
const CATALOG: [string, string, string, number | null][] = [
  // APPASAMY
  ['NASPRO', 'APPASAMY', 'MONOFOCAL', 118],
  ['SUPRAPHOB', 'APPASAMY', 'MONOFOCAL', 119.1],
  ['SUPRAPHOB TORIC', 'APPASAMY', 'TORIC', 119.1],
  // ALCON
  ['ACRYSOF SP', 'ALCON', 'MONOFOCAL', 118.3],
  ['ALCON IQ', 'ALCON', 'MONOFOCAL', 118.7],
  ['CLAREON', 'ALCON', 'MONOFOCAL', 118.8],
  ['PANOPTIX', 'ALCON', 'TRIFOCAL', 118.7],
  ['VIVITY (EDOF)', 'ALCON', 'EDOF', 118.8],
  ['PANOPTIX TORIC', 'ALCON', 'TORIC', 118.7],
  ['VIVITY TORIC (EDOF)', 'ALCON', 'TORIC', 118.8],
  ['CLAREON TORIC', 'ALCON', 'TORIC', 118.8],
  ['IQ TORIC', 'ALCON', 'TORIC', 118.7],
  // BIOTECH
  ['EYECRYL NAT HD', 'BIOTECH', 'MONOFOCAL', 118.3],
  ['OPTIFLEX TRIO', 'BIOTECH', 'TRIFOCAL', 118.6],
  ['EYECRYL ACTIV', 'BIOTECH', 'MONOFOCAL', 118],
  ['OPTIFLEX TRIO TORIC', 'BIOTECH', 'TORIC', 118.6],
  ['EYECRYL ACTIV (BIFOCAL)', 'BIOTECH', 'BIFOCAL', 118],
  ['EYECRYL TORIC (MONOFOCAL)', 'BIOTECH', 'TORIC', 118.5],
  // CARE GROUP
  ['MAGNUS', 'CARE GROUP', 'MONOFOCAL', 118.4],
  ['MAGNUS TORIC BIFOCAL', 'CARE GROUP', 'TORIC', null], // replaced EYECRYL ACTIV TORIC (BIFOCAL); A-constant to be added later
  ['ACRIVISION (FOREIGN)', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['TRIPHOBIC HD (INDIAN YELLOW TRIFOCAL)', 'CARE GROUP', 'TRIFOCAL', 118.8],
  ['MAGNIFICENT (INDIAN EDOF)', 'CARE GROUP', 'EDOF', 118.8],
  ['ACRIVISION TRIFOCAL (FOREIGN)', 'CARE GROUP', 'TRIFOCAL', 118.8],
  ['ACRIOL EC', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['ACRIOL CLEAR', 'CARE GROUP', 'MONOFOCAL', 118.8],
  ['ACRIOL EC TORIC (MONOFOCAL)', 'CARE GROUP', 'TORIC', 118.8],
  // OMNI GLOW
  ['AUTOFOCUS PRO', 'OMNI GLOW', 'MONOFOCAL', 117.7],
  // HOYA
  ['VIVINEX IMPRESS B&L', 'HOYA', 'MONOFOCAL', 118.9],
]

async function main() {
  await db.lensStock.deleteMany()
  for (const [name, manufacturer, type, aConstant] of CATALOG) {
    await db.lensStock.create({
      data: {
        name,
        type,
        manufacturer,
        aConstant,
        powerSph: 0, // catalog entry — real power set when stock lots are added
        batchNo: '',
        quantity: 0,
        minStock: 0,
      },
    })
  }
  console.log(`LENS CATALOG OK — ${await db.lensStock.count()} given lenses`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
