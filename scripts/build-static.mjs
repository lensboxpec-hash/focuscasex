#!/usr/bin/env node
// Build Focus CaseX as a fully static site for GitHub Pages.
//
//   node scripts/build-static.mjs [basePath]
//
// Example: node scripts/build-static.mjs /focuscasex
//
// What it does:
//   1. Temporarily moves src/app/api away (route handlers can't be exported;
//      the browser demo backend answers /api/* instead).
//   2. Runs `next build` with STATIC_EXPORT=1 and NEXT_PUBLIC_DEMO_MODE=1 so
//      next.config.ts switches to output:'export' + basePath + trailingSlash.
//   3. Always restores src/app/api, even when the build fails.
//   4. Adds a .nojekyll file to out/ so GitHub Pages serves the _next/ folder.
import { execSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const stash = resolve(root, '.static-export-stash')
const apiDir = resolve(root, 'src/app/api')
const apiStash = resolve(stash, 'api')

const rawBase = (process.argv[2] ?? '').trim()
const basePath = rawBase
  ? rawBase.startsWith('/')
    ? rawBase.replace(/\/+$/, '')
    : `/${rawBase.replace(/\/+$/, '')}`
  : ''

async function main() {
console.log(`→ Static export build (basePath: '${basePath || '/'}')`)

// 1. stash the API route handlers
mkdirSync(stash, { recursive: true })
if (existsSync(apiDir)) {
  cpSync(apiDir, apiStash, { recursive: true })
  rmSync(apiDir, { recursive: true, force: true })
  console.log('→ Stashed src/app/api (restored automatically after the build)')
}

try {
  // 2. run the export build with demo-mode env inlined
  const res = spawnSync('bun', ['x', 'next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      STATIC_EXPORT: '1',
      NEXT_PUBLIC_DEMO_MODE: '1',
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  })
  if (res.status !== 0) {
    console.error(`✗ next build failed (exit ${res.status})`)
    process.exitCode = 1
    return
  }

  // 3. post-process out/
  const outDir = resolve(root, 'out')
  if (!existsSync(outDir)) {
    console.error('✗ out/ missing after build — export did not run?')
    process.exitCode = 1
    return
  }
  writeFileSync(resolve(outDir, '.nojekyll'), '')
  // project-site root redirect helper is not needed (Next writes out/index.html)

  const files = execSync(`find "${outDir}" -type f | wc -l`).toString().trim()
  console.log(`✓ Static export ready in out/ (${files} files, incl. .nojekyll)`)
} finally {
  // always restore the API routes
  if (existsSync(apiStash)) {
    rmSync(apiDir, { recursive: true, force: true })
    cpSync(apiStash, apiDir, { recursive: true })
    rmSync(stash, { recursive: true, force: true })
    console.log('→ Restored src/app/api')
  }
}
}

main()
