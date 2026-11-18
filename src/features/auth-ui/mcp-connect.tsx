import { useEffect, useRef, useState } from 'react'
import type { BrowserSession } from './contracts'
import { mcpLauncher } from './mcp-launcher'
import { protectedRead } from './request-pipeline'

export function McpConnect({ session }: { readonly session: BrowserSession }) {
  const [status, setStatus] = useState('')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  async function copyCommand(client: 'codex' | 'claude') {
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
      return new Blob([mcpLauncher(origin, client, token)], {
        type: 'text/plain',
      })
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
        setStatus(
          'Command copied. Paste it into your prepared PowerShell session.',
        )
    } catch {
      setStatus(
        'Could not copy the command. Check clipboard permissions or sign in again.',
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
        From your project folder on Windows, start PowerShell 7.3+ with{' '}
        <code>pwsh -NoProfile -Command -</code>. Copy your client’s command
        below and paste it into that session.
      </p>
      <p>
        The copied command contains a short-lived credential. Use a private
        clipboard and avoid terminals that save input history. The command
        clears the clipboard and passes the credential through the client’s
        environment for this run.
      </p>
      <div className="site-actions">
        <button
          className="site-button site-button-secondary"
          onClick={() => void copyCommand('codex')}
          disabled={status === 'Verifying a connection token…'}
          type="button"
        >
          Copy Codex command
        </button>
        <button
          className="site-button site-button-secondary"
          onClick={() => void copyCommand('claude')}
          disabled={status === 'Verifying a connection token…'}
          type="button"
        >
          Copy Claude Code command
        </button>
      </div>
      <p role="status">{status}</p>
      <a href="/docs#mcp-guide">Manual MCP setup</a>
    </section>
  )
}
