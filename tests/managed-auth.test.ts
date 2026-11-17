import { afterEach, expect, it, vi } from 'vitest'
import { createManagedAuthRoutes } from '../src/server/deepspace/managed-auth'
import { SESSION_COOKIE } from 'deepspace/worker'
import { managedSignIn } from '../src/features/auth-ui/sdk'

const app = createManagedAuthRoutes()
const env = { AUTH_WORKER_URL: 'https://managed.example' }
afterEach(() => vi.unstubAllGlobals())
it('fails closed and limits managed routes, providers and request origins', async () => {
  expect((await app.request('/get-session', {}, {})).status).toBe(503)
  expect(
    (await app.request('/social-redirect?provider=other', {}, env)).status,
  ).toBe(400)
  expect((await app.request('/token', { method: 'POST' }, env)).status).toBe(
    403,
  )
  expect((await app.request('/unknown', {}, env)).status).toBe(404)
  const res = await app.request('/social-redirect?provider=github', {}, env)
  const target = new URL(res.headers.get('location')!)
  expect(target.origin).toBe('https://managed.example')
  expect(target.searchParams.get('returnTo')).toBe('http://localhost')
  expect(target.searchParams.get('provider')).toBe('github')
})
it('exchanges official one-time codes and sets only an HttpOnly app cookie', async () => {
  const upstream = vi.fn<typeof fetch>(async (input, init) => {
    expect(String(input)).toBe('https://managed.example/api/auth/exchange-code')
    expect(JSON.parse(String(init?.body))).toEqual({ code: 'one-time-code' })
    return Response.json({ sessionToken: 'opaque-session' })
  })
  vi.stubGlobal('fetch', upstream)
  const res = await app.request('/oauth-complete?code=one-time-code', {}, env)
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe('http://localhost/dashboard')
  expect(res.headers.get('set-cookie')).toBe(
    `${SESSION_COOKIE}=opaque-session; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
  )
  expect(await res.text()).not.toContain('opaque-session')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ sessionToken: 123 })),
  )
  expect(
    (await app.request('/oauth-complete?code=x', {}, env)).headers.get(
      'set-cookie',
    ),
  ).toBeNull()
})
it('proxies the SDK session/token endpoints with bounded bodies and app-scoped cookies', async () => {
  const upstream = vi.fn<typeof fetch>(
    async () =>
      new Response('{}', {
        headers: { 'set-cookie': 'a=b; Domain=managed.example; Secure' },
      }),
  )
  vi.stubGlobal('fetch', upstream)
  const response = await app.request('/get-session', {}, env)
  expect(response.headers.get('set-cookie')).toBe('a=b; Secure')
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(
    (
      await app.request(
        '/token',
        {
          method: 'POST',
          headers: { origin: 'http://localhost' },
          body: 'x'.repeat(8193),
        },
        env,
      )
    ).status,
  ).toBe(413)
  expect(upstream).toHaveBeenCalledTimes(1)
})
it('expires the app session on sign-out even when upstream fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('private upstream detail')
    }),
  )
  const response = await app.request(
    '/sign-out',
    {
      method: 'POST',
      headers: { origin: 'http://localhost' },
    },
    env,
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  expect(await response.text()).toBe('{"success":true}')
})

it('uses the installed SDK overlay managed redirect without sending credentials', async () => {
  const assign = vi.fn()
  const network = vi.fn()
  vi.stubGlobal('window', { location: { assign } })
  vi.stubGlobal('fetch', network)
  await managedSignIn('google')
  expect(assign).toHaveBeenCalledWith(
    '/api/auth/social-redirect?provider=google',
  )
  expect(network).not.toHaveBeenCalled()
})
