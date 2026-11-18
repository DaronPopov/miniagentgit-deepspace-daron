import { useEffect, useRef, useState } from 'react'
import type { BrowserSession } from './contracts'
import { discoverMcp } from './mcp-discovery'
import { mcpLauncher } from './mcp-launcher'
import type { McpShell } from './mcp-launcher'
import { protectedRead } from './request-pipeline'

export function McpConnect({
  session,
  client,
}: {
  readonly session: BrowserSession
  readonly client?: 'codex' | 'claude'
}) {
  const [status, setStatus] = useState('')
  const [shell, setShell] = useState<McpShell>('bash')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  async function copyCommand(client: 'codex' | 'claude') {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    const { signal } = controller
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    setStatus('Verifying a connection token…')
    let discoveryError: number | undefined
    async function credential() {
      const exchange = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal,
      })
      if (!exchange.ok) throw new Error('Token unavailable')
      const data: unknown = await exchange.json()
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
      const discovery = await discoverMcp(token, signal)
      if (discovery.status === 'rejected') discoveryError = discovery.code
      if (
        discovery.status !== 'ok' ||
        signal.aborted ||
        session.expiresAt <= Date.now()
      )
        throw new Error('MCP discovery failed')
      return new Blob([mcpLauncher(origin, client, token, shell)], {
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
          `Command copied. Paste it into your prepared ${shell === 'bash' ? 'Bash' : 'PowerShell'} session.`,
        )
    } catch {
      setStatus(
        discoveryError
          ? `MiniAgentGit MCP rejected discovery (HTTP ${discoveryError}). No command was copied.`
          : 'Could not copy the command. Check clipboard permissions or sign in again.',
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
      {client ? (
        <h4 id="mcp-connect-heading">
          Connect {client === 'codex' ? 'Codex' : 'Claude Code'}
        </h4>
      ) : (
        <h2 id="mcp-connect-heading">Connect a coding agent</h2>
      )}
      <label>
        Terminal shell{' '}
        <select
          value={shell}
          disabled={status === 'Verifying a connection token…'}
          onChange={(event) => {
            setShell(
              event.target.value === 'powershell' ? 'powershell' : 'bash',
            )
            setStatus('')
          }}
        >
          <option value="bash">Bash (Linux or macOS)</option>
          <option value="powershell">PowerShell 7.3+ (Windows)</option>
        </select>
      </label>
      <p>
        From your project folder, start a session with{' '}
        <code>
          {shell === 'bash'
            ? 'HISTFILE=/dev/null bash --noprofile --norc'
            : 'pwsh -NoProfile -Command -'}
        </code>
        . Copy your client’s command and paste it into that session.
      </p>
      <p>
        The copied command contains a short-lived credential. Use a private
        clipboard and avoid terminals that save input history.
        {shell === 'bash'
          ? ' Clear the clipboard after pasting.'
          : ' The command clears the clipboard before launching the client.'}
      </p>
      <div className="site-actions">
        {(client ? [client] : (['codex', 'claude'] as const)).map((target) => (
          <button
            key={target}
            className="site-button site-button-secondary"
            onClick={() => void copyCommand(target)}
            disabled={status === 'Verifying a connection token…'}
            type="button"
          >
            Copy {target === 'codex' ? 'Codex' : 'Claude Code'} command
          </button>
        ))}
      </div>
      <p>
        Use the new client session opened by the command. In that session, run{' '}
        <code>/mcp</code> to check the MiniAgentGit tools.
      </p>
      <p role="status">{status}</p>
      <a href="/docs#mcp-guide">Manual MCP setup</a>
    </section>
  )
}
