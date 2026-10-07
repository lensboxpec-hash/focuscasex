// Removes browser-test artifacts created during self-verification
async function j(url: string) {
  const r = await fetch(url)
  return r.json()
}
const BASE = 'http://localhost:3000/api'

const sessions = await j(`${BASE}/sessions`)
for (const s of sessions) {
  if ((s.notes ?? '').includes('BROWSER TEST')) {
    await fetch(`${BASE}/sessions/${s.id}`, { method: 'DELETE' })
    console.log('deleted session', s.id)
  }
}

const packages = await j(`${BASE}/packages`)
for (const p of packages) {
  if (p.name === 'MACULAR EDEMA PLAN') {
    await fetch(`${BASE}/packages/${p.id}`, { method: 'DELETE' })
    console.log('deleted package', p.id)
  }
}

const appts = await j(`${BASE}/appointments?from=2026-09-01&to=2026-11-30`)
for (const a of appts) {
  if ((a.notes ?? '').includes('BROWSER TEST')) {
    await fetch(`${BASE}/appointments/${a.id}`, { method: 'DELETE' })
    console.log('deleted appointment', a.id)
  }
}

const patients = await j(`${BASE}/patients?q=`)
for (const p of patients) {
  const detail = await j(`${BASE}/patients/${p.id}`)
  for (const v of detail.visionRecords ?? []) {
    if ((v.notes ?? '').includes('BROWSER TEST')) {
      await fetch(`${BASE}/vision/${v.id}`, { method: 'DELETE' })
      console.log('deleted vision record', v.id)
    }
  }
}
console.log('CLEANUP DONE')
