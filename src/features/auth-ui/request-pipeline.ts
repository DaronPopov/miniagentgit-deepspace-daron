import type { BrowserSession, ProtectedResult } from './contracts'

export interface RequestDependencies {
  readonly origin: string
  readonly fetch: typeof fetch
}
function principal(
  value: unknown,
  subject: string,
): value is {
  readonly ok: true
  readonly value: { readonly kind: 'user'; readonly subject: string }
} {
  if (
    !value ||
    typeof value !== 'object' ||
    !('ok' in value) ||
    value.ok !== true ||
    !('value' in value)
  )
    return false
  const identity = value.value
  return (
    !!identity &&
    typeof identity === 'object' &&
    'kind' in identity &&
    identity.kind === 'user' &&
    'subject' in identity &&
    identity.subject === subject
  )
}
export function protectedUrl(path: string, origin: string): URL | null {
  try {
    if (path.length > 2048 || !path.startsWith('/api/') || path.includes('\\'))
      return null
    const url = new URL(path, origin)
    if (url.origin !== origin || url.hash || url.username || url.password)
      return null
    if (
      url.pathname !== '/api/me' &&
      !url.pathname.startsWith('/api/repositories/')
    )
      return null
    if (url.pathname !== path.split('?')[0]) return null
    return url
  } catch {
    return null
  }
}
/** No JWT decoding, cache, token output or ownership decision in the client. */
export async function protectedRead(
  deps: RequestDependencies,
  url: URL,
  session: BrowserSession,
  token: string,
  signal: AbortSignal,
): Promise<ProtectedResult> {
  const options = {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
    signal,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  } as const
  if (signal.aborted) return { status: 'cancelled' }
  const identity = await deps.fetch(new URL('/api/me', deps.origin), options)
  if (identity.status === 401) return { status: 'expired' }
  if (!identity.ok) return { status: 'unavailable' }
  const verified: unknown = await identity.json()
  if (signal.aborted) return { status: 'cancelled' }
  if (!principal(verified, session.subject)) return { status: 'unavailable' }
  if (url.pathname === '/api/me') return { status: 'ok', value: verified.value }
  const response = await deps.fetch(url, options)
  if (response.status === 401) return { status: 'expired' }
  if (response.status === 403) return { status: 'forbidden' }
  if (!response.ok) return { status: 'error' }
  const value: unknown = await response.json()
  return { status: 'ok', value }
}
