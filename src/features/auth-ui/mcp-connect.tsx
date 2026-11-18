import { useEffect, useRef, useState } from 'react'
import type { BrowserSession } from './contracts'
import { mcpLauncher } from './mcp-launcher'
import { protectedRead } from './request-pipeline'

export function McpConnect({ session }: { readonly session: BrowserSession }) {
  const [status, setStatus] = useState('')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  function download(client: 'codex' | 'claude') {
    const script = mcpLauncher(window.location.origin, client)
    const url = URL.createObjectURL(new Blob([script], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `minigit-connect-${client}.ps1`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function copyToken() {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    const { signal } = controller
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    setStatus('Verifying a connection token…')
    async function credential() {
      const result = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal,
      })
      if (!result.ok) throw new Error('Token unavailable')
      const data: unknown = await result.json()
      const token =
        data && typeof data === 'object' && 'token' in data ? data.token : null
      if (
        typeof token !== 'string' ||
        token.length > 8192 ||
        !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)
      )
        throw new Error('Invalid credential')
      const origin = window.location.origin
      const verified = await protectedRead(
        { fetch: (...args) => fetch(...args), origin },
        new URL('/api/me', origin),
        session,
        token,
        signal,
      )
      if (
        signal.aborted ||
        verified.status !== 'ok' ||
        session.expiresAt <= Date.now()
      )
        throw new Error('Session unavailable')
      return new Blob([token], { type: 'text/plain' })
    }
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined')
        throw new Error('Clipboard unavailable')
      const text = credential()
      // Some browsers deny clipboard access before consuming the item.
      void text.catch(() => {})
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': text }),
      ])
      if (!signal.aborted)
        setStatus('Token copied. Run the downloaded launcher.')
    } catch {
      setStatus(
        'Could not copy a token. Check clipboard permissions or sign in again.',
      )
    } finally {
      controller.abort()
      clearTimeout(timeout)
      pending.current = null
    }
  }

  if (typeof window === 'undefined' || window.location.protocol !== 'https:')
    return null

  return (
    <section aria-labelledby="mcp-connect-heading">
      <h2 id="mcp-connect-heading">Connect a coding agent</h2>
      <p>
        In PowerShell 7.3+ on Windows, run the downloaded launcher from your
        project folder with <code>pwsh -File</code> and the script path. Copy a
        fresh token first. The launcher clears the clipboard and passes the
        token to the client for this run. Use a private clipboard and copy a new
        token when yours expires.
      </p>
      <div className="site-actions">
        <button
          className="site-button site-button-secondary"
          onClick={() => download('codex')}
          type="button"
        >
          Download Codex launcher
        </button>
        <button
          className="site-button site-button-secondary"
          onClick={() => download('claude')}
          type="button"
        >
          Download Claude Code launcher
        </button>
        <button
          className="site-button site-button-primary"
          onClick={() => void copyToken()}
          disabled={status === 'Verifying a connection token…'}
          type="button"
        >
          Copy connection token
        </button>
      </div>
      <p role="status">{status}</p>
      <a href="/docs#mcp-guide">Manual MCP setup</a>
    </section>
  )
}
