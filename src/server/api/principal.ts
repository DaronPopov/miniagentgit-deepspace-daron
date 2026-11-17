import { Hono } from 'hono'
import { authenticate } from '../deepspace/auth'
import type { AuthEnvironment } from '../deepspace/auth'

export function createPrincipalRoutes() {
  const routes = new Hono<{ Bindings: AuthEnvironment }>()
  routes.get('/me', async (c) => {
    const result = await authenticate(c.req.raw, c.env)
    if (!result.ok)
      return c.json(result, result.error.code === 'UNAVAILABLE' ? 503 : 401)
    return c.json(result)
  })
  return routes
}
