/* Seed the REAL baseline for Focus CaseX — no mock/demo data.
   Seeds ONLY:
     1. The two clinic login accounts (see password policy below)
     2. The clinic's given 29-lens IOL catalog (upsert by name — safe to re-run)
   Patients / vision / sessions / appointments / packages are NOT touched:
   the clinic enters those live from the UI.

   PASSWORD POLICY (public repo — never hardcode real passwords):
     · set ADMIN_PASSWORD / STAFF_PASSWORD env vars to create or RESET a login
     · without env vars, existing accounts are left untouched and a new account
       gets a generated one-time password printed to the console */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

const USERS = [
  { name: 'Dr. Preethika', email: 'preethikaeyecare@gmail.com', username: 'admin', envVar: 'ADMIN_PASSWORD', role: 'ADMIN' },
  { name: 'PEC Staff', email: 'eyecarepreethika@gmail.com', username: 'staff', envVar: 'STAFF_PASSWORD', role: 'STAFF' },
]

// The clinic's GIVEN lens catalog — [name, manufacturer, type, aConstant]
// (null A-constant = clinic to supply later)
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
  for (const u of USERS) {
    const envPassword = process.env[u.envVar]
    const existing = await db.user.findUnique({ where: { email: u.email } })
    if (existing) {
      // never silently reset a password — password change requires the env var
      await db.user.update({
        where: { email: u.email },
        data: {
          name: u.name, role: u.role, username: u.username,
          ...(envPassword ? { passwordHash: hashPassword(envPassword) } : {}),
        },
      })
    } else {
      const generated = randomBytes(9).toString('base64url')
      const password = envPassword || generated
      await db.user.create({
        data: { email: u.email, passwordHash: hashPassword(password), name: u.name, role: u.role, username: u.username },
      })
      if (!envPassword) console.log(`  ${u.username} first-time password: ${password}  (set ${u.envVar} to choose your own)`)
    }
  }
  console.log(`USERS OK: ${USERS.map((u) => u.email).join(', ')}`)

  for (const [name, manufacturer, type, aConstant] of CATALOG) {
    const slug = `lens_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    const existing = await db.lensStock.findFirst({ where: { name } })
    if (existing) {
      // keep the row (and its id) — refresh catalog fields only
      await db.lensStock.update({
        where: { id: existing.id },
        data: { manufacturer, type, aConstant },
      })
    } else {
      await db.lensStock.create({
        data: {
          id: slug,
          name, manufacturer, type, aConstant,
          powerSph: 0, // catalog row — real power set when stock lots are added
          batchNo: '',
          quantity: 0,
          minStock: 0,
        },
      })
    }
  }
  console.log(`LENS CATALOG OK: ${await db.lensStock.count()} lenses (real clinic catalog only)`)
  console.log('No mock data seeded — patients/sessions/appointments are entered live.')
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
