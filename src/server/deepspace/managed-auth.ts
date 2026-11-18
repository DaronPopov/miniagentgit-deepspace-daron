import { Hono } from 'hono'
import {
  authWorkerFetch,
  BodyTooLargeError,
  readBoundedBodyText,
  SESSION_COOKIE,
} from 'deepspace/worker'

export interface ManagedAuthEnvironment {
  readonly AUTH_WORKER_URL?: string
}
/** Browser-only subset of the official 0.44.2 scaffold's managed auth bridge. */
export function createManagedAuthRoutes() {
  const app = new Hono<{ Bindings: ManagedAuthEnvironment }>()
  app.use('*', async (c, next) => {
    if (!c.env.AUTH_WORKER_URL)
      return c.json({ error: 'auth_unavailable' }, 503)
    c.header('Cache-Control', 'no-store')
    if (
      c.req.method !== 'GET' &&
      c.req.header('origin') !== new URL(c.req.url).origin
    )
      return c.json({ error: 'invalid_origin' }, 403)
    await next()
  })
  app.get('/social-redirect', (c) => {
    const provider = c.req.query('provider')
    if (provider !== 'github' && provider !== 'google')
      return c.json({ error: 'invalid_provider' }, 400)
    const target = new URL('/login/social', c.env.AUTH_WORKER_URL)
    target.searchParams.set('provider', provider)
    target.searchParams.set('returnTo', new URL(c.req.url).origin)
    return c.redirect(target.href)
  })
  app.get('/oauth-complete', async (c) => {
    const home = new URL('/', c.req.url).href
    const code = c.req.query('code')
    if (!code || code.length > 2048) return c.redirect(home)
    try {
      const response = await authWorkerFetch(c.env, '/api/auth/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) return c.redirect(home)
      const data: unknown = await response.json()
      if (
        typeof data !== 'object' ||
        data === null ||
        !('sessionToken' in data) ||
        typeof data.sessionToken !== 'string' ||
        !data.sessionToken ||
        data.sessionToken.length > 8192
      )
        return c.redirect(home)
      return new Response(null, {
        status: 302,
        headers: {
          Location: home,
          'Cache-Control': 'no-store',
          'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(data.sessionToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      })
    } catch {
      return c.redirect(home)
    }
  })
  app.post('/sign-out', async (c) => {
    try {
      await authWorkerFetch(c.env, '/api/auth/sign-out', {
        method: 'POST',
        headers: c.req.raw.headers,
      })
    } catch {
      // Expire the app cookie even when the managed service is unavailable.
    }
    return c.json({ success: true }, 200, {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    })
  })
  app.get('/ok', (c) => c.json({ ok: true }))
  app.on(['GET', 'POST'], '/:operation', async (c) => {
    const operation = c.req.param('operation')
    if (
      !(
        (operation === 'get-session' && c.req.method === 'GET') ||
        (operation === 'token' && c.req.method === 'POST')
      )
    )
      return c.json({ error: 'not_found' }, 404)
    try {
      const body =
        c.req.method === 'POST'
          ? await readBoundedBodyText(c.req.raw, 8192)
          : undefined
      const response = await authWorkerFetch(c.env, `/api/auth/${operation}`, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body,
      })
      const headers = new Headers(response.headers)
      const cookies = headers.getSetCookie()
      headers.delete('set-cookie')
      for (const cookie of cookies)
        headers.append('set-cookie', cookie.replace(/;\s*Domain=[^;]*/gi, ''))
      headers.set('Cache-Control', 'no-store')
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      return c.json(
        { error: 'auth_unavailable' },
        error instanceof BodyTooLargeError ? 413 : 503,
      )
    }
  })
  return app
}
