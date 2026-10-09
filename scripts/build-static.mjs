#!/usr/bin/env node
// ============================================================================
// Focus CaseX — static export build (GitHub Pages, Supabase-direct mode)
// ----------------------------------------------------------------------------
//   NEXT_PUBLIC_BASE_PATH=/focuscasex node scripts/build-static.mjs
//
// Stashes the server-only API route handlers while `next build` runs with
// STATIC_EXPORT=1 (output: 'export'), then restores them. Produces out/ ready
// for GitHub Pages (with .nojekyll).
// ============================================================================
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname ?? '.', '..')
const apiDir = resolve(root, 'src/app/api')
const stashDir = resolve(root, '.api-stash')
const outDir = resolve(root, 'out')

if (!existsSync(apiDir)) {
  console.error('src/app/api not found — run from the project root.')
  process.exit(1)
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
console.log(`[static] basePath=${basePath || '(none)'} — stashing src/app/api …`)

renameSync(apiDir, stashDir)
let failed = false
try {
  execSync('bunx next build', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      STATIC_EXPORT: '1',
      NEXT_PUBLIC_STATIC_BACKEND: '1',
      NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
} catch {
  failed = true
} finally {
  if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true })
  renameSync(stashDir, apiDir)
  console.log('[static] src/app/api restored')
}

if (failed) {
  console.error('[static] build FAILED')
  process.exit(1)
}
if (!existsSync(outDir)) {
  console.error('[static] build succeeded but out/ is missing')
  process.exit(1)
}

writeFileSync(resolve(outDir, '.nojekyll'), '')
console.log(`[static] DONE — out/ ready (deploy: push out/ to gh-pages)`)
