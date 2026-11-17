import { expect, it, vi } from 'vitest'
import { clearAuthToken, getAuthToken } from 'deepspace'
import { createSessionClient } from '../src/features/auth-ui/session-client'
import { createPrincipalRoutes } from '../src/server/api/principal'
import { identityFixture } from './identity-fixture'
import { deferred } from './scheduler-fixture'

it('uses the actual SDK cookie-to-token method and real SDK server verification, fencing an obsolete credential', async () => {
  const identity = await identityFixture(),
    old = deferred<Response>(),
    started = deferred<void>()
  const bob = await identity.token('Bob'),
    alice = await identity.token('Alice')
  const tokenFetch = vi.fn<typeof fetch>(async () => {
    if (tokenFetch.mock.calls.length === 1) {
      started.resolve()
      return old.promise
    }
    return Response.json({ token: bob })
  })
  const api = createPrincipalRoutes()
  const protectedFetch = vi.fn<typeof fetch>(async (input, init) => {
    expect(String(input)).toBe('http://localhost/api/me')
    return api.request('/me', init, identity.env)
  })
  vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
  vi.stubGlobal('fetch', tokenFetch)
  clearAuthToken()
  const client = createSessionClient({
    origin: 'http://localhost',
    getToken: getAuthToken,
    clearToken: clearAuthToken,
    fetch: protectedFetch,
  })
  const session = (subject: string) => ({
    subject,
    sessionId: subject,
    expiresAt: Date.now() + 60000,
  })
  try {
    client.update(session('Alice'))
    const first = client.read('/api/me')
    await started.promise
    client.update(session('Bob'))
    expect(await first).toEqual({ status: 'cancelled' })
    expect(await client.read('/api/me')).toEqual({ status: 'unavailable' })
    expect(protectedFetch).not.toHaveBeenCalled()
    old.resolve(Response.json({ token: alice }))
    await old.promise
    await Promise.resolve()
    await Promise.resolve()
    // Wait for the real SDK to consume its response before admitting another acquisition.
    await vi.waitFor(async () =>
      expect(await client.read('/api/me')).toEqual({
        status: 'ok',
        value: { kind: 'user', subject: 'Bob' },
      }),
    )
    expect(tokenFetch).toHaveBeenLastCalledWith('/api/auth/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(protectedFetch).toHaveBeenCalledOnce()
    const options = protectedFetch.mock.calls[0]?.[1]
    expect(options).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    })
    expect(options?.headers).toEqual({ authorization: `Bearer ${bob}` })
  } finally {
    old.resolve(Response.json({ token: alice }))
    client.invalidate()
    clearAuthToken()
    vi.unstubAllGlobals()
  }
})
it('fails closed on SDK token errors and never fetches protected resources', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = createSessionClient({
    origin: 'https://app.test',
    fetch,
    getToken: async () => {
      throw new Error('SDK internal secret')
    },
    clearToken: vi.fn(),
  })
  client.update({
    subject: 'Alice',
    sessionId: 'session',
    expiresAt: Date.now() + 60000,
  })
  expect(await client.read('/api/me')).toEqual({ status: 'unavailable' })
  expect(fetch).not.toHaveBeenCalled()
})
