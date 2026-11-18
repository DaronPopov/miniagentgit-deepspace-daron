export async function discoverMcp(token: string, signal: AbortSignal) {
  const discovery = await fetch('/_deepspace/agent/mcp', {
    method: 'POST',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    cache: 'no-store',
    redirect: 'error',
    signal,
  })
  if (!discovery.ok)
    return { status: 'rejected', code: discovery.status } as const
  const body: unknown = await discovery.json()
  const result =
    body && typeof body === 'object' && 'result' in body && !('error' in body)
      ? body.result
      : null
  if (
    signal.aborted ||
    !result ||
    typeof result !== 'object' ||
    !('tools' in result) ||
    !Array.isArray(result.tools) ||
    result.tools.length === 0
  )
    return { status: 'unavailable' } as const
  return { status: 'ok' } as const
}
