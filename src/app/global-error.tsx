'use client'

/**
 * Global error boundary — replaces the dead-end "Application error" screen.
 *
 * Why it exists: after a redeploy, a browser tab holding an older cached copy
 * of the app can request JS chunks that no longer exist. Next.js surfaces that
 * as a bare "Application error: a client-side exception has occurred" page
 * with no way forward. This screen explains the situation and offers recovery:
 *
 *  - stale-chunk errors reload ONCE automatically (loop-guarded), because the
 *    fresh HTML served after the reload references the new chunk hashes;
 *  - every other error shows two manual options: retry the render, or clear
 *    the browser's caches and reload (the fix for stale deployments).
 */

const RELOAD_FLAG = 'fcx:chunk-reload-at'

function isStaleChunkError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    msg.includes('chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('networkerror')
  )
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Auto-recover exactly once for stale-chunk failures (guarded so a genuinely
  // broken build cannot put the user in a reload loop).
  if (typeof window !== 'undefined' && isStaleChunkError(error)) {
    try {
      const last = Number(window.localStorage.getItem(RELOAD_FLAG) ?? 0)
      const now = Date.now()
      if (now - last > 15_000) {
        window.localStorage.setItem(RELOAD_FLAG, String(now))
        window.location.reload()
      }
    } catch {
      // Storage unavailable — skip auto-reload, the buttons below still work.
    }
  }

  const hardReload = () => {
    try {
      window.localStorage.removeItem(RELOAD_FLAG)
      if ('caches' in window) {
        void caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
      }
    } catch {
      // Best-effort cache clear; the reload itself is the real fix.
    }
    window.location.reload()
  }

  const retry = () => {
    try {
      window.localStorage.removeItem(RELOAD_FLAG)
    } catch {
      // ignore
    }
    reset()
  }

  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafafa',
      color: '#18181b',
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 460,
      background: '#ffffff',
      border: '1px solid #e4e4e7',
      borderRadius: 6,
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      padding: '32px 28px',
    },
    badge: {
      width: 44,
      height: 44,
      borderRadius: 8,
      background: '#18181b',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      marginBottom: 18,
    },
    title: { fontSize: 20, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' },
    body: { fontSize: 14, lineHeight: 1.65, color: '#52525b', margin: '0 0 8px' },
    errBox: {
      marginTop: 16,
      padding: '10px 12px',
      background: '#fafafa',
      border: '1px solid #e4e4e7',
      borderRadius: 6,
      fontSize: 12,
      color: '#71717a',
      wordBreak: 'break-word',
      maxHeight: 96,
      overflow: 'auto',
      margin: '16px 0 0',
    },
    actions: { display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' },
    primary: {
      flex: '1 1 auto',
      background: '#18181b',
      color: '#ffffff',
      border: '1px solid #18181b',
      borderRadius: 6,
      padding: '10px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    },
    secondary: {
      flex: '1 1 auto',
      background: '#ffffff',
      color: '#18181b',
      border: '1px solid #d4d4d8',
      borderRadius: 6,
      padding: '10px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    },
    hint: { fontSize: 12, color: '#a1a1aa', marginTop: 18, lineHeight: 1.6 },
  }

  return (
    <html lang="en">
      <body style={styles.page}>
        <main style={styles.card}>
          <div style={styles.badge} aria-hidden="true">
            &#9678;
          </div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.body}>
            The app hit an unexpected error while loading. This usually happens when the
            browser is holding an older cached copy after an update — a quick reload
            normally fixes it.
          </p>
          <div style={styles.errBox}>{message}</div>
          <div style={styles.actions}>
            <button type="button" style={styles.primary} onClick={retry}>
              Try again
            </button>
            <button type="button" style={styles.secondary} onClick={hardReload}>
              Clear cache &amp; reload
            </button>
          </div>
          <p style={styles.hint}>
            Still stuck? Hard-refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).
            Your data is safe — everything is stored in the clinic&apos;s Supabase
            database.
          </p>
        </main>
      </body>
    </html>
  )
}
