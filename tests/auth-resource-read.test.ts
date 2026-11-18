import { expect, it, vi } from 'vitest'
import { createSessionClient } from '../src/features/auth-ui/session-client'
import { deferred } from './scheduler-fixture'

const alice = { subject: 'Alice', sessionId: 'session-A', expiresAt: 10000 }
const identity = (subject: string) =>
  Response.json({ ok: true, value: { kind: 'user', subject } })
const origin = 'https://app.test'

it('aborts an obsolete resource while a newer response gets the decoded envelope', async () => {
  const started = deferred<void>(),
    stale = deferred<Response>()
  const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
    const path = new URL(String(url)).pathname
    if (path === '/api/me') return identity('Alice')
    if (path.endsWith('/old')) {
      started.resolve()
      return stale.promise
    }
    return Response.json({ ok: true, value: 'new result' })
  })
  const client = createSessionClient({
    origin,
    fetch,
    getToken: async () => 'opaque-credential',
    clearToken: vi.fn(),
    now: () => 1,
  })
  client.update(alice)
  const controller = new AbortController()
  const old = client.read('/api/repositories/old', controller.signal)
  await started.promise
  controller.abort()
  expect(await old).toEqual({ status: 'cancelled' })
  expect(await client.read('/api/repositories/new')).toEqual({
    status: 'ok',
    value: 'new result',
  })
  stale.resolve(Response.json({ ok: true, value: 'old result' }))
  client.invalidate()
})
