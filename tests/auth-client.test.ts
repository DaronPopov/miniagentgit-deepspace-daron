import { expect, it, vi } from 'vitest'
import { createSessionClient } from '../src/features/auth-ui/session-client'
import { deferred } from './scheduler-fixture'

const alice = { subject: 'Alice', sessionId: 'session-A', expiresAt: 10000 },
  bob = { subject: 'Bob', sessionId: 'session-B', expiresAt: 10000 }
const identity = (subject: string) =>
  Response.json({ ok: true, value: { kind: 'user', subject } })
const origin = 'https://app.test'
it('never fetches without credentials and limits requests to same-origin protected reads', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => identity('Alice'))
  const getToken = vi.fn(async () => null)
  const client = createSessionClient({
    origin,
    fetch,
    getToken,
    clearToken: vi.fn(),
    now: () => 1,
  })
  expect(await client.read('/api/me')).toEqual({ status: 'signed-out' })
  client.update(alice)
  for (const path of [
    'https://elsewhere.test/api/me',
    '//elsewhere.test/api/me',
    '/api/auth/token',
    '/api/repositories/../auth/token',
    '/api/me#secret',
    '/api/me\\x',
  ])
    expect(await client.read(path)).toEqual({ status: 'invalid' })
  expect(await client.read('/api/me')).toEqual({ status: 'unavailable' })
  expect(fetch).not.toHaveBeenCalled()
})
it('verifies the API principal before repository data and rejects identity mismatch/expired sessions', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => identity('Bob'))
  let time = 1
  const client = createSessionClient({
    origin,
    fetch,
    getToken: async () => 'opaque-credential',
    clearToken: vi.fn(),
    now: () => time,
  })
  client.update(alice)
  expect(await client.read('/api/repositories/repo_abcdefghijklmnop')).toEqual({
    status: 'unavailable',
  })
  expect(fetch).toHaveBeenCalledOnce()
  expect(await client.read('/api/me')).toEqual({ status: 'signed-out' })
  client.update(alice)
  time = 10001
  expect(await client.read('/api/me')).toEqual({ status: 'expired' })
})
it('cancels account switching immediately and discards noncooperative late responses', async () => {
  const gate = deferred<Response>(),
    started = deferred<void>()
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    started.resolve()
    return gate.promise
  })
  const client = createSessionClient({
    origin,
    fetch,
    getToken: async () => 'opaque-credential',
    clearToken: vi.fn(),
    now: () => 1,
  })
  client.update(alice)
  const old = client.read('/api/repositories/repo_abcdefghijklmnop')
  await started.promise
  client.update(bob)
  expect(await old).toEqual({ status: 'cancelled' })
  gate.resolve(identity('Alice'))
  await gate.promise
  await Promise.resolve()
  expect(fetch).toHaveBeenCalledOnce()
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  client.invalidate()
  expect(await client.read('/api/me')).toEqual({ status: 'signed-out' })
})
it('does not release noncooperative execution slots early and bounds network deadlines', async () => {
  vi.useFakeTimers()
  const gate = deferred<Response>()
  const client = createSessionClient({
    origin,
    fetch: async () => gate.promise,
    getToken: async () => 'opaque-credential',
    clearToken: vi.fn(),
    now: () => 1,
    deadlineMs: 100,
  })
  try {
    client.update(alice)
    for (let n = 0; n < 4; n++) {
      const work = client.read('/api/me')
      await vi.advanceTimersByTimeAsync(100)
      expect(await work).toEqual({ status: 'cancelled' })
    }
    expect(await client.read('/api/me')).toEqual({ status: 'unavailable' })
    gate.resolve(identity('Alice'))
  } finally {
    client.invalidate()
    vi.useRealTimers()
  }
})
it('treats expired JWT responses as expired and never exposes errors or the token in results', async () => {
  const secret = 'private-api-credential'
  const client = createSessionClient({
    origin,
    fetch: async () => new Response(null, { status: 401 }),
    getToken: async () => secret,
    clearToken: vi.fn(),
    now: () => 1,
  })
  client.update(alice)
  const result = await client.read('/api/me')
  expect(result).toEqual({ status: 'expired' })
  expect(JSON.stringify(result)).not.toContain(secret)
  expect(await client.read('/api/me')).toEqual({ status: 'signed-out' })
})
it('coalesces a pending credential only within the same session during effect recreation', async () => {
  const token = deferred<string | null>()
  const getToken = vi.fn(() => token.promise)
  const client = createSessionClient({
    origin,
    fetch: async () => identity('Alice'),
    getToken,
    clearToken: vi.fn(),
    now: () => 1,
  })
  client.update(alice)
  const old = client.read('/api/me')
  client.invalidate()
  client.update(alice)
  const current = client.read('/api/me')
  token.resolve('opaque-credential')
  expect(await old).toEqual({ status: 'cancelled' })
  expect(await current).toEqual({
    status: 'ok',
    value: { kind: 'user', subject: 'Alice' },
  })
  expect(getToken).toHaveBeenCalledOnce()
  client.invalidate()
})
it('discards data if the browser session expires while the API response is pending', async () => {
  let time = 1
  const started = deferred<void>(),
    response = deferred<Response>()
  const client = createSessionClient({
    origin,
    fetch: async () => {
      started.resolve()
      return response.promise
    },
    getToken: async () => 'opaque-credential',
    clearToken: vi.fn(),
    now: () => time,
  })
  client.update(alice)
  const work = client.read('/api/me')
  await started.promise
  time = 10001
  response.resolve(identity('Alice'))
  expect(await work).toEqual({ status: 'expired' })
  client.invalidate()
})
