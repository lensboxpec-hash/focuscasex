'use client'

import { useEffect, useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { FocusCaseXApp } from './app'
import {
  fetchSessionUser,
  installAuthFetch,
  clearStoredToken,
  appPath,
} from '@/lib/client-auth'
import { DEMO_MODE, installDemoBackend } from '@/lib/demo-backend'

type GateUser = { id: string; name: string; email: string; role: string }

// Client-side session gate. Replaces the server-side redirect so the app
// can authenticate in cookie-blocked embedded browsers via the stored
// Bearer token. Renders a branded splash while the session is resolved.
export function SessionGate() {
  const [user, setUser] = useState<GateUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // In static demo builds the /api/* calls are answered by the in-browser
    // backend — it must be installed before any session resolution runs.
    installDemoBackend()
    installAuthFetch()
    let alive = true
    fetchSessionUser().then((u) => {
      if (!alive) return
      if (u) {
        setUser(u)
        setReady(true)
      } else {
        clearStoredToken()
        window.location.replace(appPath('/login'))
      }
    })
    return () => {
      alive = false
    }
  }, [])

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-lg shadow-black/20">
          <Eye className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
          {DEMO_MODE ? 'Preparing demo workspace…' : 'Preparing your workspace…'}
        </div>
      </div>
    )
  }

  return <FocusCaseXApp user={{ name: user.name, role: user.role }} />
}
