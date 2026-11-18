// Test-only managed-auth upstream. The built Worker still verifies the real JWT.
import { randomUUID } from 'node:crypto'
import { identityFixture } from '../tests/identity-fixture.ts'

const upstream = 'https://browser-identity.invalid'
const subject = 'local-browser-owner'

export async function localBrowserIdentity() {
  const keys = await identityFixture()
  const sessionToken = randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
  let active = false
  return {
    env: { ...keys.env, AUTH_WORKER_URL: upstream },
    async fetch(request) {
      const url = new URL(request.url)
      if (url.origin !== upstream) return new Response(null, { status: 502 })
      const authenticated =
        active &&
        (request.headers.get('cookie') ?? '')
          .split(';')
          .some(
            (cookie) =>
              cookie.trim() ===
              `__Secure-better-auth.session_token=${sessionToken}`,
          )
      switch (url.pathname) {
        case '/api/auth/exchange-code': {
          const body = await request.json()
          if (body.code !== 'pass11a-local-browser')
            return new Response(null, { status: 401 })
          active = true
          return Response.json({ sessionToken })
        }
        case '/api/auth/get-session':
          return Response.json(
            authenticated
              ? {
                  user: { id: subject },
                  session: { id: 'local-session', expiresAt },
                }
              : null,
          )
        case '/api/auth/token':
          return authenticated
            ? Response.json({ token: await keys.token(subject) })
            : new Response(null, { status: 401 })
        case '/api/auth/sign-out':
          active = false
          return Response.json({ success: true })
        default:
          return new Response(null, { status: 404 })
      }
    },
  }
}
